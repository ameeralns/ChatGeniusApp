import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { getAdminDb } from '@/lib/firebase/admin';
import { db } from '../firebase/firebase';
import { ref, set, get } from 'firebase/database';
import OpenAI from 'openai';

// Initialize clients lazily
let embeddings: OpenAIEmbeddings | null = null;
let aiAgentIndex: ReturnType<Pinecone['index']> | null = null;

function initializeClients() {
  console.log('Initializing AI Agent clients...');
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }

  if (!process.env.PINECONE_API_KEY) {
    throw new Error('Missing PINECONE_API_KEY environment variable');
  }

  if (!process.env.PINECONE_AI_AGENT_INDEX) {
    throw new Error('Missing PINECONE_AI_AGENT_INDEX environment variable');
  }

  if (!embeddings) {
    console.log('Initializing OpenAI embeddings...');
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002',
      batchSize: 512, // Process more texts in parallel
      stripNewLines: true // Clean text before embedding
    });
  }

  if (!aiAgentIndex) {
    console.log('Initializing Pinecone client with index:', process.env.PINECONE_AI_AGENT_INDEX);
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Ensure we're using the AI Agent specific index
    aiAgentIndex = pinecone.index(process.env.PINECONE_AI_AGENT_INDEX);
  }

  return { embeddings, aiAgentIndex };
}

interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  role?: string;
  lastSeen?: number;
  status?: string;
}

export interface UserMessageVector {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  context: string;
  messageType: 'message' | 'bio';
  userProfile: UserProfile | null;
}

async function createEmbeddingWithRetry(content: string, maxRetries = 3): Promise<number[]> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1} to create embedding for content length: ${content.length}`);
      const { embeddings } = initializeClients();
      if (!embeddings) throw new Error('Embeddings not initialized');
      
      // Clean and prepare the text
      const cleanedContent = content
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .slice(0, 8000); // Limit text length to avoid token limits
      
      const embedding = await embeddings.embedQuery(cleanedContent);
      if (!embedding || embedding.length !== 1536) {
        throw new Error(`Invalid embedding length: ${embedding?.length}`);
      }
      return embedding;
    } catch (error) {
      console.error(`Embedding attempt ${i + 1} failed:`, error);
      lastError = error;
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function upsertUserData(data: UserMessageVector) {
  console.log('Creating embedding for user data:', {
    userId: data.userId,
    messageType: data.messageType,
    contentLength: data.content.length
  });

  try {
    const embedding = await createEmbeddingWithRetry(data.content);
    const { aiAgentIndex } = initializeClients();
    if (!aiAgentIndex) throw new Error('AI Agent index not initialized');

    // Prepare metadata, ensuring all values are strings or numbers
    const metadata = {
      id: data.id,
      userId: data.userId,
      content: data.content.slice(0, 1000), // Limit content length in metadata
      timestamp: data.timestamp,
      context: data.context,
      messageType: data.messageType,
      source: 'ai-agent',
      userDisplayName: data.userProfile?.displayName || '',
      userEmail: data.userProfile?.email || '',
      userPhotoURL: data.userProfile?.photoURL || '',
      userBio: data.userProfile?.bio || '',
      userRole: data.userProfile?.role || '',
      userStatus: data.userProfile?.status || '',
      userLastSeen: data.userProfile?.lastSeen || 0
    };

    await aiAgentIndex.upsert([{
      id: data.id,
      values: embedding,
      metadata
    }]);

    console.log('Successfully upserted user data:', {
      userId: data.userId,
      messageType: data.messageType,
      id: data.id
    });
  } catch (error) {
    console.error('Failed to upsert user data:', error);
    throw error;
  }
}

export async function migrateAllUsersToAIAgent() {
  try {
    console.log('Starting migration of all users to AI Agent...');
    const { aiAgentIndex } = initializeClients();
    if (!aiAgentIndex) throw new Error('AI Agent index not initialized');

    // Get admin database instance
    const adminDb = getAdminDb();

    // First, clear existing AI Agent data to prevent duplicates
    try {
      console.log('Clearing existing AI Agent data...');
      await aiAgentIndex.deleteAll();
      console.log('Successfully cleared existing AI Agent data');
    } catch (error) {
      console.warn('Warning: Could not clear existing AI Agent data:', error);
    }

    // Get all users
    console.log('Fetching all users...');
    const usersSnapshot = await adminDb.ref('users').get();
    const users = usersSnapshot.val();

    if (!users) {
      console.log('No users found');
      return { success: false, message: 'No users found' };
    }

    console.log(`Found ${Object.keys(users).length} users to process`);

    let totalProcessed = 0;
    let totalMessages = 0;
    let totalBios = 0;
    let skippedMessages = 0;
    const errors: string[] = [];

    for (const userId of Object.keys(users)) {
      try {
        const userProfile = users[userId];
        console.log(`Processing user ${userProfile.email || userId} (${totalProcessed + 1}/${Object.keys(users).length})`);

        // Store user bio if available
        if (userProfile.bio) {
          await upsertUserData({
            id: `bio_${userId}`,
            userId,
            content: userProfile.bio,
            timestamp: Date.now(),
            context: 'bio',
            messageType: 'bio',
            userProfile
          });
          totalBios++;
        }

        // Get user's workspaces
        const userWorkspacesRef = adminDb.ref(`users/${userId}/workspaces`);
        const workspacesSnapshot = await userWorkspacesRef.get();
        const workspaces = workspacesSnapshot.val();

        if (workspaces) {
          for (const workspaceId of Object.keys(workspaces)) {
            // Get workspace channels
            const channelsRef = adminDb.ref(`workspaces/${workspaceId}/channels`);
            const channelsSnapshot = await channelsRef.get();
            const channels = channelsSnapshot.val();

            if (channels) {
              for (const channelId of Object.keys(channels)) {
                // Get messages in channel
                const messagesRef = adminDb.ref(`workspaces/${workspaceId}/channels/${channelId}/messages`);
                const messagesSnapshot = await messagesRef.get();
                const messages = messagesSnapshot.val();

                if (messages) {
                  for (const messageId of Object.keys(messages)) {
                    const message = messages[messageId];
                    if (message.userId === userId && message.type === 'text') {
                      try {
                        await upsertUserData({
                          id: messageId,
                          userId,
                          content: message.content,
                          timestamp: message.timestamp,
                          context: `workspace:${workspaceId}/channel:${channelId}`,
                          messageType: 'message',
                          userProfile
                        });
                        totalMessages++;
                      } catch (error) {
                        console.error(`Error processing message ${messageId}:`, error);
                        skippedMessages++;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        totalProcessed++;
      } catch (error: any) {
        console.error(`Error processing user ${userId}:`, error);
        errors.push(`User ${userId}: ${error?.message || 'Unknown error'}`);
      }
    }

    console.log('Migration completed:', {
      totalUsers: totalProcessed,
      totalMessages,
      totalBios,
      skippedMessages,
      errors: errors.length
    });

    return {
      success: true,
      stats: {
        totalUsers: totalProcessed,
        totalMessages,
        totalBios,
        skippedMessages,
        errors: errors.length
      }
    };
  } catch (error: any) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }
}

export async function queryUserContext(userId: string, query: string, limit = 5) {
  console.log('Querying user context:', { userId, query });
  
  try {
    const embedding = await createEmbeddingWithRetry(query);
    const { aiAgentIndex } = initializeClients();
    if (!aiAgentIndex) throw new Error('AI Agent index not initialized');

    const results = await aiAgentIndex.query({
      vector: embedding,
      filter: { userId },
      topK: limit,
      includeMetadata: true
    });

    return results.matches.map(match => ({
      id: match.metadata?.id || '',
      content: match.metadata?.content || '',
      timestamp: match.metadata?.timestamp || 0,
      context: match.metadata?.context || '',
      messageType: match.metadata?.messageType || 'message',
      score: match.score || 0
    }));
  } catch (error) {
    console.error('Failed to query user context:', error);
    throw error;
  }
}

export async function deleteUserData(userId: string) {
  console.log('Deleting user data:', { userId });
  
  try {
    const { aiAgentIndex } = initializeClients();
    if (!aiAgentIndex) throw new Error('AI Agent index not initialized');

    await aiAgentIndex.deleteMany({
      filter: { userId }
    });

    console.log('Successfully deleted user data');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete user data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateUserPersonaSummary(userId: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // First try to get messages from Firebase
    const userMessagesRef = ref(db, `workspaces`);
    const snapshot = await get(userMessagesRef);
    const workspaces = snapshot.val();
    
    const userMessages: string[] = [];

    // Collect messages from all workspaces
    if (workspaces) {
      for (const workspaceId in workspaces) {
        const channels = workspaces[workspaceId].channels;
        if (channels) {
          for (const channelId in channels) {
            const messages = channels[channelId].messages;
            if (messages) {
              for (const messageId in messages) {
                const message = messages[messageId];
                if (message.userId === userId && message.type === 'text') {
                  userMessages.push(message.content);
                }
              }
            }
          }
        }
      }
    }

    // If no messages found in Firebase, try Pinecone
    if (userMessages.length === 0) {
      const { aiAgentIndex } = initializeClients();
      if (!aiAgentIndex) throw new Error('AI Agent index not initialized');

      const queryResponse = await aiAgentIndex.query({
        vector: Array(1536).fill(0),
        filter: { userId, messageType: 'message' },
        topK: 100,
        includeMetadata: true
      });

      if (queryResponse.matches) {
        queryResponse.matches.forEach(match => {
          if (match.metadata?.content) {
            userMessages.push(String(match.metadata.content));
          }
        });
      }
    }

    if (userMessages.length === 0) {
      return "Not enough data to generate a persona summary. Start chatting to build your persona!";
    }

    // Generate summary using OpenAI
    const prompt = `Based on the following user messages and interactions, create a concise summary of their persona, communication style, and typical behavior. Focus on patterns, preferences, and characteristic traits.

User Messages:
${userMessages.slice(0, 30).map(msg => String(msg)).join('\n')}

Generate a natural, conversational summary that captures the essence of this user's persona. If you notice any particular patterns in their communication style, work habits, or interests, highlight those.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing communication patterns and creating insightful persona summaries. Keep the summary concise but meaningful, focusing on the user's unique traits and patterns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = response.choices[0].message.content;
    if (!summary) {
      throw new Error('Failed to generate summary');
    }

    // Store the summary in Firebase
    const userPersonaRef = ref(db, `users/${userId}/personaSummary`);
    await set(userPersonaRef, {
      summary,
      lastUpdated: Date.now(),
    });

    return summary;
  } catch (error) {
    console.error('Error generating persona summary:', error);
    throw error;
  }
}

export async function getUserPersonaSummary(userId: string): Promise<{ summary: string; lastUpdated: number } | null> {
  try {
    const userPersonaRef = ref(db, `users/${userId}/personaSummary`);
    const snapshot = await get(userPersonaRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching persona summary:', error);
    throw error;
  }
} 