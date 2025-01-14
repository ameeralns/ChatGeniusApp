import { useState, useEffect } from 'react';
import { getUserProfile } from '@/lib/firebase/database';
import { listenToUserPresence } from '@/lib/firebase/presenceUtils';

interface UserData {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  photoURLUpdatedAt?: number;
  status?: string;
  loading: boolean;
}

export function useUserData(userId: string): UserData {
  const [userData, setUserData] = useState<UserData>({
    id: userId,
    displayName: null,
    photoURL: null,
    loading: true
  });

  useEffect(() => {
    // First get the user profile
    getUserProfile(userId)
      .then((profile) => {
        setUserData({
          id: userId,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          photoURLUpdatedAt: profile.photoURLUpdatedAt,
          loading: false
        });
      })
      .catch((error) => {
        console.error('Error getting user profile:', error);
        setUserData(prev => ({ ...prev, loading: false }));
      });

    // Then listen for presence updates
    const unsubscribe = listenToUserPresence(userId, (presence) => {
      if (presence) {
        setUserData((prev) => ({
          ...prev,
          id: userId,
          displayName: presence.displayName || prev.displayName,
          photoURL: presence.photoURL || prev.photoURL,
          photoURLUpdatedAt: presence.photoURLUpdatedAt || prev.photoURLUpdatedAt,
          status: presence.status,
          loading: false
        }));
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return userData;
} 