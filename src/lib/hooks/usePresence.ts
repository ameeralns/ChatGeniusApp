'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  UserPresence,
  setupPresenceHandlers,
  updateUserStatus,
  listenToAllPresence,
  listenToUserPresence,
} from '../firebase/presenceUtils';

export function usePresence() {
  const { user } = useAuth();
  const [allPresence, setAllPresence] = useState<Record<string, UserPresence>>({});
  const [currentUserPresence, setCurrentUserPresence] = useState<UserPresence | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const unsubscribeRef = useRef<(() => void)[]>([]);

  // Clean up function to remove all listeners
  const cleanup = useCallback(() => {
    unsubscribeRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribeRef.current = [];
  }, []);

  // Set up presence system
  useEffect(() => {
    if (!user?.uid) return;
    
    let isMounted = true;
    
    const initializePresence = async () => {
      try {
        cleanup();

        // Initialize presence handlers
        const initialPresence = await setupPresenceHandlers(user.uid);

        if (!isMounted) return;

        // Set initial presence
        setCurrentUserPresence(initialPresence);

        // Listen to current user's presence
        const unsubscribeUser = listenToUserPresence(user.uid, (presence) => {
          if (presence && isMounted) {
            setCurrentUserPresence(presence);
            setAllPresence(prev => ({
              ...prev,
              [user.uid]: presence
            }));
          }
        });

        // Listen to all users' presence
        const unsubscribeAll = listenToAllPresence((presences) => {
          if (isMounted) {
            setAllPresence(presences);
          }
        });

        // Store unsubscribe functions
        unsubscribeRef.current = [unsubscribeUser, unsubscribeAll];
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing presence:', error);
        if (isMounted) {
          setIsInitialized(false);
        }
      }
    };

    initializePresence();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [user, cleanup]);

  // Update user status
  const updateStatus = useCallback(async (status: 'online' | 'offline' | 'away') => {
    if (!user?.uid) return;
    
    try {
      const updatedPresence = await updateUserStatus(user.uid, status);

      // Immediately update local state
      setCurrentUserPresence(updatedPresence);
      setAllPresence(prev => ({
        ...prev,
        [user.uid]: updatedPresence
      }));

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
    isInitialized,
  };
} 