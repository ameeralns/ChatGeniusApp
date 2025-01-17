'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  UserPresence,
  setupPresenceHandlers,
  setUserPresence,
  listenToAllPresence,
} from '../firebase/presenceUtils';

export function usePresence() {
  const { user } = useAuth();
  const [allPresence, setAllPresence] = useState<Record<string, UserPresence>>({});
  const [currentUserPresence, setCurrentUserPresence] = useState<UserPresence | null>(null);

  // Set up presence system
  useEffect(() => {
    if (!user?.uid) return;
    
    let isMounted = true;

    const initializePresence = async () => {
      try {
        // Initialize presence handlers
        const initialPresence = await setupPresenceHandlers(user.uid);
        if (!isMounted) return;
        setCurrentUserPresence(initialPresence);
      } catch (error) {
        console.error('Error initializing presence:', error);
      }
    };

    // Listen to all users' presence
    const unsubscribe = listenToAllPresence((presences) => {
      if (isMounted) {
        setAllPresence(presences);
        if (user.uid in presences) {
          setCurrentUserPresence(presences[user.uid]);
        }
      }
    });

    initializePresence();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  // Update user status
  const updateStatus = useCallback(async (status: 'online' | 'offline' | 'away') => {
    if (!user?.uid) return null;
    
    try {
      const updatedPresence = await setUserPresence(user.uid, { status });
      return updatedPresence;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }, [user]);

  return {
    allPresence,
    updateStatus,
    currentUserPresence,
  };
} 