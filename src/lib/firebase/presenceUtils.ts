import { ref, onValue, set, onDisconnect, serverTimestamp, get, update } from 'firebase/database';
import { db, auth } from './firebase';
import { getUserProfile } from './database';

export type UserPresence = {
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
  displayName: string | null;
  photoURL: string | null;
  photoURLUpdatedAt: number | null;
};

const PRESENCE_REF = 'userPresence/v1';

const getUserPresenceRef = (userId: string) => ref(db, `${PRESENCE_REF}/${userId}`);

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

export const setUserPresence = async (
  userId: string,
  data: Partial<UserPresence>
) => {
  try {
    const currentUser = ensureAuth();
    if (currentUser.uid !== userId) {
      throw new Error('Can only update your own presence');
    }

    const presenceRef = getUserPresenceRef(userId);
    
    // Get user profile data
    const userProfile = await getUserProfile(userId);
    
    const snapshot = await get(presenceRef);
    const existingData = snapshot.val() || {};
    
    // Determine the correct status to use
    const statusToUse = data.status || getStoredStatus(userId) || existingData.status || 'offline';
    
    const timestamp = Date.now();
    
    // Create the presence data with all required fields
    const currentData: UserPresence = {
      status: statusToUse,
      lastSeen: timestamp,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      photoURLUpdatedAt: userProfile.photoURLUpdatedAt || timestamp
    };
    
    // Save to localStorage if not offline
    if (typeof window !== 'undefined' && currentData.status !== 'offline') {
      localStorage.setItem(`userStatus_${userId}`, currentData.status);
    }
    
    // Set the presence data
    await set(presenceRef, currentData);

    // Handle disconnect state
    if (currentData.status !== 'offline') {
      const offlineData: UserPresence = {
        ...currentData,
        status: currentData.status === 'away' ? 'away' : 'offline',
        lastSeen: timestamp
      };
      await onDisconnect(presenceRef).set(offlineData);
    } else {
      await onDisconnect(presenceRef).cancel();
    }

    return currentData;
  } catch (error) {
    console.error('Error setting presence:', error);
    throw error;
  }
};

export const setupPresenceHandlers = async (
  userId: string
) => {
  try {
    const currentUser = ensureAuth();
    if (currentUser.uid !== userId) {
      throw new Error('Can only setup presence for yourself');
    }

    // Get user profile data
    const userProfile = await getUserProfile(userId);
    const timestamp = Date.now();

    const presenceRef = getUserPresenceRef(userId);
    const connectedRef = ref(db, '.info/connected');

    // Get stored status or default to offline
    const storedStatus = getStoredStatus(userId) || 'offline';

    // Set initial presence
    const initialPresence: UserPresence = {
      status: storedStatus,
      lastSeen: timestamp,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      photoURLUpdatedAt: userProfile.photoURLUpdatedAt || timestamp
    };

    await set(presenceRef, initialPresence);

    // Monitor connection state
    onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() === true) {
        try {
          const latestProfile = await getUserProfile(userId);
          const reconnectStatus = getStoredStatus(userId) || 'offline';
          
          await setUserPresence(userId, {
            status: reconnectStatus,
            lastSeen: Date.now(),
            displayName: latestProfile.displayName,
            photoURL: latestProfile.photoURL,
            photoURLUpdatedAt: latestProfile.photoURLUpdatedAt
          });
        } catch (error) {
          console.error('Error updating presence on reconnect:', error);
        }
      }
    });

    return initialPresence;
  } catch (error) {
    console.error('Error setting up presence handlers:', error);
    throw error;
  }
};

export const updateUserStatus = async (
  userId: string, 
  status: 'online' | 'offline' | 'away'
) => {
  try {
    const currentUser = ensureAuth();
    if (currentUser.uid !== userId) {
      throw new Error('Can only update your own status');
    }

    // Get latest user profile data
    const userProfile = await getUserProfile(userId);
    const timestamp = Date.now();

    // Update presence with new status
    const updatedPresence: UserPresence = {
      status,
      lastSeen: timestamp,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      photoURLUpdatedAt: userProfile.photoURLUpdatedAt || timestamp
    };

    // Store status in localStorage if not offline
    if (typeof window !== 'undefined' && status !== 'offline') {
      localStorage.setItem(`userStatus_${userId}`, status);
    }

    // Update presence in database
    const presenceRef = getUserPresenceRef(userId);
    await set(presenceRef, updatedPresence);

    return updatedPresence;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

export const listenToUserPresence = (
  userId: string,
  callback: (presence: UserPresence | null) => void
) => {
  const presenceRef = getUserPresenceRef(userId);
  
  return onValue(presenceRef, 
    (snapshot) => {
      const presence = snapshot.val();
      callback(presence);
    },
    (error) => {
      console.error('Error listening to presence:', error);
      callback(null);
    }
  );
};

export const listenToAllPresence = (
  callback: (presences: Record<string, UserPresence>) => void
) => {
  const presenceRef = ref(db, PRESENCE_REF);
  
  return onValue(presenceRef, 
    (snapshot) => {
      const presences = snapshot.val() || {};
      callback(presences);
    },
    (error) => {
      console.error('Error listening to all presences:', error);
      callback({});
    }
  );
};

export const setAllUsersOffline = async () => {
  try {
    const presenceRef = ref(db, PRESENCE_REF);
    const snapshot = await get(presenceRef);
    
    if (!snapshot.exists()) {
      console.log('No presence records found');
      return;
    }

    const presences = snapshot.val();
    const updates: { [key: string]: UserPresence } = {};
    const timestamp = Date.now();

    // Process each user's presence
    Object.entries(presences).forEach(([userId, presence]: [string, any]) => {
      if (presence.status !== 'offline') {
        updates[`${PRESENCE_REF}/${userId}`] = {
          status: 'offline',
          lastSeen: timestamp,
          displayName: presence.displayName,
          photoURL: presence.photoURL,
          photoURLUpdatedAt: presence.photoURLUpdatedAt
        };
      }
    });

    // Apply all updates in a single batch if there are any
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
      console.log(`Set ${Object.keys(updates).length} users to offline status`);
    } else {
      console.log('All users are already offline');
    }

    return Object.keys(updates).length;
  } catch (error) {
    console.error('Error setting all users offline:', error);
    throw error;
  }
}; 