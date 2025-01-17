import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import type { RecordMetadata } from '@pinecone-database/pinecone';

// Initialize clients lazily
let embeddings: OpenAIEmbeddings | null = null;
let aiAgentIndex: ReturnType<Pinecone['index']> | null = null;

function initializeClients() {
  // Always reinitialize embeddings to ensure we use the latest API key
  embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
    batchSize: 512,
    stripNewLines: true
  });

  // Always reinitialize Pinecone to ensure we use the latest configuration
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
  });

  const indexName = process.env.PINECONE_AI_AGENT_INDEX;
  if (!indexName) {
    throw new Error('PINECONE_AI_AGENT_INDEX is not defined');
  }
  
  console.log('Using Pinecone index:', indexName);
  aiAgentIndex = pinecone.index(indexName);

  return { embeddings, aiAgentIndex };
}

async function createEmbedding(content: string): Promise<number[]> {
  const { embeddings } = initializeClients();
  if (!embeddings) throw new Error('Embeddings not initialized');
  
  const cleanedContent = content
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 8000);
  
  return await embeddings.embedQuery(cleanedContent);
}

interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  role?: string;
  status?: string;
  lastSeen?: number;
}

function createMetadata(
  userId: string,
  content: string,
  timestamp: number,
  context: string,
  messageType: 'message' | 'bio',
  userProfile: UserProfile
): RecordMetadata {
  return {
    userId: userId,
    content: content.slice(0, 1000),
    timestamp: timestamp,
    context: context,
    messageType: messageType,
    userDisplayName: userProfile.displayName || '',
    userEmail: userProfile.email || '',
    userPhotoURL: userProfile.photoURL || '',
    userBio: userProfile.bio || '',
    userRole: userProfile.role || '',
    userStatus: userProfile.status || '',
    userLastSeen: userProfile.lastSeen || 0,
    source: 'ai_agent',
    vectorLength: 1536
  };
}

export async function POST(request: Request) {
  try {
    console.log('Starting AI Agent migration process...');
    
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    
    // Load environment variables directly from process.env
    const envVars = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PINECONE_API_KEY: process.env.PINECONE_API_KEY,
      PINECONE_AI_AGENT_INDEX: process.env.PINECONE_AI_AGENT_INDEX,
    };

    // Debug: Print environment variables
    console.log('Environment variables:', {
      OPENAI_API_KEY: envVars.OPENAI_API_KEY?.substring(0, 10) + '...',
      PINECONE_API_KEY: envVars.PINECONE_API_KEY ? '[HIDDEN]' : 'undefined',
      PINECONE_AI_AGENT_INDEX: envVars.PINECONE_AI_AGENT_INDEX || 'undefined',
    });

    // Validate environment variables
    if (!envVars.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY is not set',
        details: { source: '.env.local check' }
      }, { status: 500 });
    }

    if (!envVars.PINECONE_API_KEY?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'PINECONE_API_KEY is not set',
        details: { source: '.env.local check' }
      }, { status: 500 });
    }

    if (!envVars.PINECONE_AI_AGENT_INDEX?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'PINECONE_AI_AGENT_INDEX is not set',
        details: { source: '.env.local check' }
      }, { status: 500 });
    }

    // Initialize Firebase Admin and get database
    const adminDb = getAdminDb();

    // Initialize OpenAI embeddings with validated key
    console.log('Initializing OpenAI embeddings with key:', envVars.OPENAI_API_KEY.substring(0, 10) + '...');
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: envVars.OPENAI_API_KEY.trim(),
      modelName: 'text-embedding-ada-002',
      batchSize: 512,
      stripNewLines: true
    });

    // Initialize Pinecone with validated values
    console.log('Initializing Pinecone with index:', envVars.PINECONE_AI_AGENT_INDEX);
    const pinecone = new Pinecone({
      apiKey: envVars.PINECONE_API_KEY.trim(),
    });

    aiAgentIndex = pinecone.index(envVars.PINECONE_AI_AGENT_INDEX.trim());

    // Clear existing data
    try {
      await aiAgentIndex.deleteAll();
      console.log('Cleared existing AI Agent data');
    } catch (error) {
      console.warn('Warning: Could not clear existing AI Agent data:', error);
    }

    // Get all users
    const usersSnapshot = await adminDb.ref('users').get();
    const users = usersSnapshot.val() as Record<string, UserProfile>;

    if (!users) {
      return NextResponse.json({ 
        success: false, 
        message: 'No users found' 
      });
    }

    let totalProcessed = 0;
    let totalMessages = 0;
    let totalBios = 0;
    const errors: string[] = [];

    for (const userId of Object.keys(users)) {
      try {
        const userProfile = users[userId];
        
        // Process bio
        if (userProfile?.bio?.trim()) {
          const embedding = await createEmbedding(userProfile.bio);
          await aiAgentIndex.upsert([{
            id: `bio-${userId}`,
            values: embedding,
            metadata: createMetadata(
              userId,
              userProfile.bio,
              Date.now(),
              'bio',
              'bio',
              userProfile
            )
          }]);
          totalBios++;
        }

        // Get user's workspaces
        const workspacesSnapshot = await adminDb.ref(`users/${userId}/workspaces`).get();
        const workspaces = workspacesSnapshot.val();

        if (workspaces) {
          for (const workspaceId of Object.keys(workspaces)) {
            const channelsSnapshot = await adminDb.ref(`workspaces/${workspaceId}/channels`).get();
            const channels = channelsSnapshot.val();

            if (channels) {
              for (const channelId of Object.keys(channels)) {
                // Process messages
                const messagesSnapshot = await adminDb.ref(`workspaces/${workspaceId}/channels/${channelId}/messages`).get();
                const messages = messagesSnapshot.val();

                if (messages) {
                  for (const messageId of Object.keys(messages)) {
                    const message = messages[messageId];
                    if (message.userId === userId && message.type === 'text' && message.content?.trim()) {
                      const embedding = await createEmbedding(message.content);
                      await aiAgentIndex.upsert([{
                        id: messageId,
                        values: embedding,
                        metadata: createMetadata(
                          userId,
                          message.content,
                          message.timestamp,
                          `workspace:${workspaceId}/channel:${channelId}`,
                          'message',
                          userProfile
                        )
                      }]);
                      totalMessages++;
                    }
                  }
                }

                // Process thread messages
                const threadsSnapshot = await adminDb.ref(`workspaces/${workspaceId}/channels/${channelId}/threads`).get();
                const threads = threadsSnapshot.val();

                if (threads) {
                  for (const threadId of Object.keys(threads)) {
                    const thread = threads[threadId];
                    if (thread.messages) {
                      for (const messageId of Object.keys(thread.messages)) {
                        const message = thread.messages[messageId];
                        if (message.userId === userId && message.type === 'text' && message.content?.trim()) {
                          const embedding = await createEmbedding(message.content);
                          await aiAgentIndex.upsert([{
                            id: `thread-${messageId}`,
                            values: embedding,
                            metadata: createMetadata(
                              userId,
                              message.content,
                              message.timestamp,
                              `workspace:${workspaceId}/channel:${channelId}/thread:${threadId}`,
                              'message',
                              userProfile
                            )
                          }]);
                          totalMessages++;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        totalProcessed++;
      } catch (error) {
        const errorMessage = `Error processing user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Migration completed with errors: ${errors.length} users failed`,
        message: errors.join('\n')
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalProcessed,
        totalMessages,
        totalBios
      }
    });
  } catch (error) {
    console.error('Error in migrate-ai-agent route:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 