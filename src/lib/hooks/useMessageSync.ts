'use client';

import { useEffect } from 'react';
import { ref, onChildAdded, get } from 'firebase/database';
import { db } from '../firebase/firebase';
import type { MessageVector } from '../vectordb/vector-operations';

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
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    
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

async function syncToVectorDB(messageVector: MessageVector) {
  const response = await fetch('/api/vectordb/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageVector),
  });

  if (!response.ok) {
    throw new Error('Failed to sync with vector database');
  }
}

export function useMessageSync(workspaceId: string, channelId: string) {
  useEffect(() => {
    if (!workspaceId || !channelId) return;

    const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
    
    const unsubscribe = onChildAdded(messagesRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const message = snapshot.val();
      const messageId = snapshot.key;

      // Only process text messages
      if (message.type === 'text') {
        try {
          // Fetch user profile for the message sender
          const userProfile = await getUserProfile(message.userId);
          
          const messageVector: MessageVector = {
            id: messageId!,
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

          await syncToVectorDB(messageVector);
          console.log(`Synced message ${messageId} to vector database with user profile`);
        } catch (error) {
          console.error(`Error syncing message ${messageId}:`, error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [workspaceId, channelId]);
} 