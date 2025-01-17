import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import { Pinecone } from '@pinecone-database/pinecone';
import { getDatabase } from 'firebase-admin/database';
import { getAdminDb } from '@/lib/firebase/admin';

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
});

// Initialize Pinecone client for AI Assistant
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// Get the index name from environment variable
const indexName = process.env.PINECONE_INDEX;
if (!indexName) {
  throw new Error('PINECONE_INDEX environment variable is not set');
}

console.log('Initializing Pinecone with index:', indexName);
export const pineconeIndex = pinecone.index(indexName);

interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  role?: string;
  lastSeen?: number;
  status?: string;
}

export interface MessageVector {
  id: string;
  workspaceId: string;
  channelId: string;
  content: string;
  userId: string;
  timestamp: number;
  userProfile: UserProfile | null;
}

export async function upsertMessage(message: MessageVector) {
  try {
    console.log(`Creating embedding for message: ${message.id}`);
    const doc = new Document({
      pageContent: message.content,
      metadata: {
        id: message.id,
        content: message.content,
        channelId: message.channelId,
        workspaceId: message.workspaceId,
        timestamp: message.timestamp,
        userName: message.userProfile?.displayName || 'Unknown User',
        source: 'ai-assistant'
      }
    });

    const embedding = await embeddings.embedDocuments([doc.pageContent]);

    await pineconeIndex.upsert([{
      id: message.id,
      values: embedding[0],
      metadata: doc.metadata
    }]);

    console.log(`Successfully stored message ${message.id} in Pinecone`);
  } catch (error) {
    console.error(`Error storing message ${message.id}:`, error);
    throw error;
  }
}

export async function migrateAllWorkspaces() {
  console.log('Starting migration of messages to AI Assistant index...');
  
  try {
    // Try to clear existing vectors, but don't fail if index doesn't exist
    try {
      await pineconeIndex.deleteAll();
      console.log('Cleared existing vectors');
    } catch (error) {
      console.warn('Warning: Could not clear existing vectors:', error);
      // Continue with migration even if clearing fails
    }

    // Get all workspaces using Admin SDK
    const adminDb = getAdminDb();
    const workspacesRef = adminDb.ref('workspaces');
    const workspacesSnapshot = await workspacesRef.get();
    const workspaces = workspacesSnapshot.val();

    if (!workspaces) {
      console.log('No workspaces found');
      return { success: false, message: 'No workspaces found' };
    }

    let totalMessages = 0;
    const errors: string[] = [];

    for (const workspaceId of Object.keys(workspaces)) {
      try {
        const workspace = workspaces[workspaceId];
        console.log(`Processing workspace: ${workspaceId}`);

        // Get all channels in workspace
        const channels = workspace.channels || {};
        
        for (const channelId of Object.keys(channels)) {
          const channel = channels[channelId];
          console.log(`Processing channel: ${channelId}`);
          const messages = channel.messages || {};
          
          for (const messageId of Object.keys(messages)) {
            const message = messages[messageId];
            
            if (message.type === 'text' && message.content) {
              try {
                // Get user profile using Admin SDK
                const userRef = adminDb.ref(`users/${message.userId}`);
                const userSnapshot = await userRef.get();
                const userProfile = userSnapshot.val();

                // Ensure timestamp is a number
                const timestamp = typeof message.timestamp === 'number' ? 
                  message.timestamp : 
                  typeof message.timestamp === 'string' ?
                    parseInt(message.timestamp, 10) :
                    Date.now();

                await upsertMessage({
                  id: messageId,
                  workspaceId,
                  channelId,
                  content: message.content,
                  userId: message.userId,
                  timestamp,
                  userProfile
                });

                totalMessages++;
                if (totalMessages % 100 === 0) {
                  console.log(`Processed ${totalMessages} messages so far...`);
                }
              } catch (error: any) {
                console.error(`Error processing message ${messageId}:`, error);
                errors.push(`Message ${messageId}: ${error?.message || 'Unknown error'}`);
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing workspace ${workspaceId}:`, error);
        errors.push(`Workspace ${workspaceId}: ${error?.message || 'Unknown error'}`);
      }
    }

    console.log(`Migration completed. Total messages processed: ${totalMessages}`);
    return {
      success: true,
      stats: {
        totalMessages,
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

export async function queryMessages(query: string, workspaceId: string | null | undefined, limit: number = 10) {
  if (!workspaceId) {
    console.debug('No workspaceId provided for message query, skipping Pinecone search');
    return [];
  }

  console.log('Creating embedding for query:', query);
  const queryEmbedding = await embeddings.embedQuery(query);
  
  console.log('Querying Pinecone with params:', {
    workspaceId,
    limit
  });

  const results = await pineconeIndex.query({
    vector: queryEmbedding,
    filter: { 
      workspaceId,
      source: 'ai-assistant'
    },
    topK: limit,
    includeMetadata: true,
  });

  console.log('Raw Pinecone results:', results.matches);

  // Map results and sort by timestamp (most recent first)
  const mappedResults = results.matches
    .filter(match => match.metadata?.content) // Only include messages with content
    .map(match => {
      const metadata = match.metadata;
      return {
        id: metadata?.id as string,
        content: metadata?.content as string,
        channelId: metadata?.channelId as string,
        workspaceId: metadata?.workspaceId as string,
        timestamp: metadata?.timestamp ? Number(metadata.timestamp) : 0,
        userName: metadata?.userName as string,
        score: match.score
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first

  console.log('Processed and sorted results:', mappedResults);
  return mappedResults;
}

export async function deleteWorkspaceMessages(workspaceId: string) {
  await pineconeIndex.deleteMany({
    filter: { workspaceId },
  });
} 