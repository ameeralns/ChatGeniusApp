import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import { pineconeIndex } from './pinecone-client';

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

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
  console.log('Creating embedding for message:', {
    content: message.content,
    workspaceId: message.workspaceId,
    timestamp: message.timestamp
  });
  
  const embedding = await embeddings.embedQuery(message.content);
  
  // Flatten user profile for Pinecone metadata
  const userProfileMetadata = message.userProfile ? {
    userDisplayName: message.userProfile.displayName || '',
    userEmail: message.userProfile.email || '',
    userPhotoURL: message.userProfile.photoURL || '',
    userBio: message.userProfile.bio || '',
    userRole: message.userProfile.role || '',
    userStatus: message.userProfile.status || '',
    userLastSeen: message.userProfile.lastSeen || 0,
  } : {
    userDisplayName: '',
    userEmail: '',
    userPhotoURL: '',
    userBio: '',
    userRole: '',
    userStatus: '',
    userLastSeen: 0,
  };

  // Ensure timestamp is a number and not null
  const timestamp = typeof message.timestamp === 'number' ? 
    message.timestamp : 
    typeof message.timestamp === 'string' ?
      new Date(message.timestamp).getTime() :
      Date.now();
  
  const metadata = {
    id: message.id,
    workspaceId: message.workspaceId,
    channelId: message.channelId,
    content: message.content,
    userId: message.userId,
    timestamp,
    ...userProfileMetadata
  };

  console.log('Upserting to Pinecone with metadata:', metadata);
  
  await pineconeIndex.upsert([{
    id: message.id,
    values: embedding,
    metadata
  }]);
}

export async function queryMessages(query: string, workspaceId: string, limit: number = 5) {
  if (!workspaceId) {
    console.error('workspaceId is required for querying messages');
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
    filter: { workspaceId },
    topK: limit,
    includeMetadata: true,
  });

  console.log('Raw Pinecone results:', results.matches);

  // Filter again on the client side to be extra safe
  const workspaceMessages = results.matches
    .filter(match => match.metadata?.workspaceId === workspaceId)
    .map(match => {
      const metadata = match.metadata;
      return {
        id: metadata?.id as string,
        workspaceId: metadata?.workspaceId as string,
        channelId: metadata?.channelId as string,
        content: metadata?.content as string,
        score: match.score,
        userId: metadata?.userId as string,
        timestamp: metadata?.timestamp as number,
        userProfile: metadata ? {
          displayName: metadata.userDisplayName as string,
          email: metadata.userEmail as string,
          photoURL: metadata.userPhotoURL as string,
          bio: metadata.userBio as string,
          role: metadata.userRole as string,
          status: metadata.userStatus as string,
          lastSeen: metadata.userLastSeen as number
        } : null
      };
    });

  return workspaceMessages;
}

export async function deleteWorkspaceMessages(workspaceId: string) {
  await pineconeIndex.deleteMany({
    filter: { workspaceId },
  });
} 