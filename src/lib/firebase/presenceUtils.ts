import { ref, onValue, set, onDisconnect, serverTimestamp, get, update, DatabaseReference } from 'firebase/database';
import { db, auth } from './firebase';

export type UserPresence = {
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
};

const PRESENCE_REF = 'userPresence/v1';

const getUserPresenceRef = (userId: string): DatabaseReference => ref(db, `${PRESENCE_REF}/${userId}`);

const ensureAuth = () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to manage presence');
  }
  return currentUser;
};

const getStoredStatus = (userId: string): 'online' | 'offline' | 'away' | null => {
  if (typeof window === 'undefined') return null;
  
  const storedStatus = localStorage.getItem(`userStatus_${userId}`);
  if (storedStatus && ['online', 'offline', 'away'].includes(storedStatus)) {
    return storedStatus as 'online' | 'offline' | 'away';
  }
  return null;
};

const updatePresenceInDatabase = async (
  updates: Record<string, any>,
  offlineData?: UserPresence
): Promise<void> => {
  try {
    // First update the presence data
    await update(ref(db), updates);

    if (offlineData) {
      const promises = Object.keys(updates).map(path => 
        onDisconnect(ref(db, path)).set(offlineData)
      );
      await Promise.all(promises);
    }
  } catch (error) {
    console.error('Error updating presence in database:', error);
    throw error;
  }
};

export const setUserPresence = async (
  userId: string,
  data: Partial<UserPresence>
): Promise<UserPresence> => {
  try {
    const currentUser = ensureAuth();
    if (currentUser.uid !== userId) {
      throw new Error('Can only update your own presence');
    }

    const timestamp = Date.now();
    const presenceData: UserPresence = {
      status: data.status || 'online',
      lastSeen: timestamp
    };

    const updates = {
      [`${PRESENCE_REF}/${userId}`]: presenceData
    };

    const offlineData: UserPresence = {
      status: 'offline',
      lastSeen: timestamp
    };

    await updatePresenceInDatabase(updates, offlineData);

    // Store status in localStorage for persistence
    localStorage.setItem(`userStatus_${userId}`, presenceData.status);

    return presenceData;
  } catch (error) {
    console.error('Error setting user presence:', error);
    throw error;
  }
};

export const listenToUserPresence = (userId: string, callback: (presence: UserPresence | null) => void): () => void => {
  const presenceRef = getUserPresenceRef(userId);
  
  const unsubscribe = onValue(presenceRef, (snapshot) => {
    const presence = snapshot.val() as UserPresence | null;
    callback(presence);
  });

  return unsubscribe;
};

export const listenToAllPresence = (callback: (presences: Record<string, UserPresence>) => void): () => void => {
  const presenceRef = ref(db, PRESENCE_REF);
  
  const unsubscribe = onValue(presenceRef, (snapshot) => {
    const presences = snapshot.val() as Record<string, UserPresence> | null;
    callback(presences || {});
  });

  return unsubscribe;
};

export const setupPresenceHandlers = async (userId: string): Promise<UserPresence> => {
  try {
    const storedStatus = getStoredStatus(userId);
    const presenceRef = getUserPresenceRef(userId);
    const connectedRef = ref(db, '.info/connected');

    // Set up connection monitoring
    onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() === true) {
        // We're connected (or reconnected)!
        // Set up presence and handle disconnection
        const presence: UserPresence = {
          status: storedStatus || 'online',
          lastSeen: Date.now()
        };

        // When I disconnect, update the last time I was seen online
        const offlineData: UserPresence = {
          status: 'offline',
          lastSeen: Date.now()
        };

        await set(presenceRef, presence);
        await onDisconnect(presenceRef).set(offlineData);
      }
    });

    // Return initial presence state
    return setUserPresence(userId, { status: storedStatus || 'online' });
  } catch (error) {
    console.error('Error setting up presence handlers:', error);
    throw error;
  }
}; 