import { getDatabase } from 'firebase-admin/database';
import { initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { upsertMessage } from './vector-operations';
import type { MessageVector } from './vector-operations';

// Initialize Firebase Admin if not already initialized
initializeFirebaseAdmin();

interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  role?: string;
  lastSeen?: number;
  status?: string;
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const adminDb = getDatabase();
    const userRef = adminDb.ref(`users/${userId}`);
    const snapshot = await userRef.get();
    
    if (!snapshot.exists()) {
      console.log(`No profile found for user ${userId}`);
      return null;
    }

    return snapshot.val();
  } catch (error) {
    console.error(`Error fetching profile for user ${userId}:`, error);
    return null;
  }
}

export async function migrateWorkspaceMessages(workspaceId: string) {
  try {
    const adminDb = getDatabase();
    const channelsRef = adminDb.ref(`workspaces/${workspaceId}/channels`);
    const channelsSnapshot = await channelsRef.get();
    
    if (!channelsSnapshot.exists()) {
      console.log(`No channels found for workspace ${workspaceId}`);
      return;
    }

    const channels = channelsSnapshot.val();
    
    for (const channelId of Object.keys(channels)) {
      const messagesRef = adminDb.ref(`workspaces/${workspaceId}/channels/${channelId}/messages`);
      const messagesSnapshot = await messagesRef.get();
      
      if (!messagesSnapshot.exists()) {
        continue;
      }

      const messages = messagesSnapshot.val();
      
      for (const messageId of Object.keys(messages)) {
        const message = messages[messageId];
        
        if (message.type === 'text') {
          // Fetch user profile for the message sender
          const userProfile = await getUserProfile(message.userId);
          
          const messageVector: MessageVector = {
            id: messageId,
            workspaceId,
            channelId,
            content: message.content,
            userId: message.userId,
            timestamp: message.timestamp,
            userProfile: userProfile ? {
              displayName: userProfile.displayName,
              email: userProfile.email,
              photoURL: userProfile.photoURL,
              bio: userProfile.bio,
              role: userProfile.role,
              status: userProfile.status,
              lastSeen: userProfile.lastSeen
            } : null
          };

          await upsertMessage(messageVector);
          console.log(`Processed message ${messageId} from channel ${channelId} with user profile`);
        }
      }
    }

    console.log(`Completed migration for workspace ${workspaceId}`);
  } catch (error) {
    console.error(`Error migrating workspace ${workspaceId}:`, error);
    throw error;
  }
}

export async function migrateAllWorkspaces() {
  try {
    const adminDb = getDatabase();
    const workspacesRef = adminDb.ref('workspaces');
    const workspacesSnapshot = await workspacesRef.get();
    
    if (!workspacesSnapshot.exists()) {
      console.log('No workspaces found');
      return;
    }

    const workspaces = workspacesSnapshot.val();
    
    for (const workspaceId of Object.keys(workspaces)) {
      await migrateWorkspaceMessages(workspaceId);
    }

    console.log('Completed migration of all workspaces');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
} 