import { useState, useEffect } from 'react';
import { getUserProfile } from '@/lib/firebase/database';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';

interface UserData {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  photoURLUpdatedAt?: number;
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
    // Get user data from users collection
    const userRef = ref(db, `users/${userId}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      const profile = snapshot.val();
      if (profile) {
        setUserData({
          id: userId,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          photoURLUpdatedAt: profile.photoURLUpdatedAt,
          loading: false
        });
      } else {
        setUserData(prev => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return userData;
} 