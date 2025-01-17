import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';

interface AIAgentSettings {
  workspaces: {
    [workspaceId: string]: boolean;
  };
  channels: {
    [workspaceId: string]: {
      [channelId: string]: boolean;
    };
  };
  dmEnabled: boolean;
}

interface AIAgentContextType {
  isEnabled: boolean;
  settings: AIAgentSettings;
  toggleWorkspace: (workspaceId: string) => Promise<void>;
  toggleDM: () => Promise<void>;
  toggleChannel: (workspaceId: string, channelId: string) => Promise<void>;
}

const defaultSettings: AIAgentSettings = {
  workspaces: {},
  channels: {},
  dmEnabled: false
};

const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

export function AIAgentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AIAgentSettings>(defaultSettings);
  const [isEnabled, setIsEnabled] = useState(false);

  // Load settings from Firebase when user changes
  useEffect(() => {
    console.log('AIAgentProvider: Loading settings for user:', user?.uid);
    
    const loadSettings = async () => {
      if (!user) {
        console.log('AIAgentProvider: No user, using default settings');
        setSettings(defaultSettings);
        setIsEnabled(false);
        return;
      }

      try {
        const settingsRef = ref(db, `users/${user.uid}/aiAgentSettings`);
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
          const savedSettings = snapshot.val();
          console.log('AIAgentProvider: Loaded settings:', savedSettings);
          // Ensure channels object exists
          savedSettings.channels = savedSettings.channels || {};
          setSettings(savedSettings);
          // Check if any workspace is enabled or DMs are enabled
          const enabled = savedSettings.dmEnabled || 
            Object.values(savedSettings.workspaces || {}).some(enabled => enabled);
          console.log('AIAgentProvider: Setting isEnabled to:', enabled);
          setIsEnabled(enabled);
        } else {
          console.log('AIAgentProvider: No saved settings found');
        }
      } catch (error) {
        console.error('Error loading AI agent settings:', error);
      }
    };

    loadSettings();
  }, [user]);

  const saveSettings = async (newSettings: AIAgentSettings) => {
    if (!user) return;
    
    try {
      console.log('AIAgentProvider: Saving new settings:', newSettings);
      await set(ref(db, `users/${user.uid}/aiAgentSettings`), newSettings);
      console.log('AIAgentProvider: Settings saved successfully');
    } catch (error) {
      console.error('Error saving AI agent settings:', error);
    }
  };

  const toggleWorkspace = async (workspaceId: string) => {
    console.log('AIAgentProvider: Toggling workspace:', workspaceId);
    const newEnabled = !settings.workspaces[workspaceId];
    
    const newSettings = {
      ...settings,
      workspaces: {
        ...settings.workspaces,
        [workspaceId]: newEnabled
      },
      channels: {
        ...settings.channels,
        [workspaceId]: newEnabled 
          ? settings.channels[workspaceId] || {} // Keep existing channel settings if enabling
          : {} // Clear channel settings if disabling
      }
    };
    
    setSettings(newSettings);
    const enabled = newSettings.dmEnabled || Object.values(newSettings.workspaces).some(enabled => enabled);
    console.log('AIAgentProvider: Setting isEnabled to:', enabled);
    setIsEnabled(enabled);
    await saveSettings(newSettings);
  };

  const toggleDM = async () => {
    console.log('AIAgentProvider: Toggling DM');
    const newEnabled = !settings.dmEnabled;
    
    const newSettings = {
      ...settings,
      dmEnabled: newEnabled
    };
    
    setSettings(newSettings);
    const enabled = newSettings.dmEnabled || Object.values(newSettings.workspaces).some(enabled => enabled);
    console.log('AIAgentProvider: Setting isEnabled to:', enabled);
    setIsEnabled(enabled);
    await saveSettings(newSettings);
  };

  const toggleChannel = async (workspaceId: string, channelId: string) => {
    console.log('AIAgentProvider: Toggling channel:', { workspaceId, channelId });
    
    // Only allow toggling if workspace is enabled
    if (!settings.workspaces[workspaceId]) {
      console.log('AIAgentProvider: Cannot toggle channel in disabled workspace');
      return;
    }

    const newSettings = {
      ...settings,
      channels: {
        ...settings.channels,
        [workspaceId]: {
          ...settings.channels[workspaceId],
          [channelId]: !settings.channels[workspaceId]?.[channelId]
        }
      }
    };
    
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  console.log('AIAgentProvider: Current state:', { isEnabled, settings });

  return (
    <AIAgentContext.Provider value={{ isEnabled, settings, toggleWorkspace, toggleDM, toggleChannel }}>
      {children}
    </AIAgentContext.Provider>
  );
}

export function useAIAgent() {
  const context = useContext(AIAgentContext);
  if (context === undefined) {
    throw new Error('useAIAgent must be used within an AIAgentProvider');
  }
  return context;
} 