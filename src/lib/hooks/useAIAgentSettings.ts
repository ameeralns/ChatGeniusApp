import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from './useAuth';

interface AIAgentSettings {
  dmEnabled: boolean;
  workspaces: {
    [workspaceId: string]: boolean;
  };
}

export const useAIAgentSettings = (workspaceId?: string) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AIAgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const settingsRef = ref(db, `users/${user.uid}/aiAgentSettings`);
    
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      try {
        const data = snapshot.val() || {
          dmEnabled: false,
          workspaces: {}
        };
        setSettings(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load settings'));
        setLoading(false);
      }
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const toggleDMEnabled = async () => {
    if (!user?.uid || !settings) return;
    
    try {
      const newValue = !settings.dmEnabled;
      await set(ref(db, `users/${user.uid}/aiAgentSettings/dmEnabled`), newValue);
      console.log('Updated DM auto-response setting:', newValue);
    } catch (err) {
      console.error('Failed to toggle DM auto-response:', err);
      throw err;
    }
  };

  const toggleWorkspaceAutoResponse = async (targetWorkspaceId: string) => {
    if (!user?.uid || !settings) return;
    
    try {
      const currentValue = settings.workspaces?.[targetWorkspaceId] || false;
      const newValue = !currentValue;
      
      await set(
        ref(db, `users/${user.uid}/aiAgentSettings/workspaces/${targetWorkspaceId}`),
        newValue
      );
      
      console.log('Updated workspace auto-response setting:', {
        workspaceId: targetWorkspaceId,
        value: newValue
      });
    } catch (err) {
      console.error('Failed to toggle workspace auto-response:', err);
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    toggleDMEnabled,
    toggleWorkspaceAutoResponse
  };
}; 