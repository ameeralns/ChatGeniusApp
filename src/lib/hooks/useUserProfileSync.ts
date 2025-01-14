'use client';

import { useEffect } from 'react';
import { ref, onChildChanged } from 'firebase/database';
import { db } from '../firebase/firebase';

interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  role?: string;
  lastSeen?: number;
  status?: string;
}

async function syncUserProfileToVectorDB(userId: string, userProfile: UserProfile) {
  const response = await fetch('/api/vectordb/sync-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, userProfile }),
  });

  if (!response.ok) {
    throw new Error('Failed to sync user profile updates');
  }

  const data = await response.json();
  return data.updatedCount;
}

export function useUserProfileSync() {
  useEffect(() => {
    const usersRef = ref(db, 'users');
    
    const unsubscribe = onChildChanged(usersRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const userId = snapshot.key;
      const userProfile = snapshot.val() as UserProfile;

      try {
        const updatedCount = await syncUserProfileToVectorDB(userId!, userProfile);
        console.log(`Updated ${updatedCount} messages for user ${userId} with new profile`);
      } catch (error) {
        console.error(`Error updating messages for user ${userId}:`, error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
} 