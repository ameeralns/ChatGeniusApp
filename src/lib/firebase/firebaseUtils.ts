import { ref, push, get, set, remove, update, serverTimestamp } from 'firebase/database';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { initAdmin } from './setupAdmin';

// Database functions
export const addDocument = (collectionName: string, data: any) =>
  push(ref(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const snapshot = await get(ref(db, collectionName));
  return snapshot.val();
};

export const getDocument = async (collectionName: string, id: string) => {
  const snapshot = await get(ref(db, `${collectionName}/${id}`));
  return snapshot.val();
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  set(ref(db, `${collectionName}/${id}`), data);

export const deleteDocument = (collectionName: string, id: string) =>
  remove(ref(db, `${collectionName}/${id}`));

// Add new function to create/update user in database
export const createUserInDatabase = async (user: User) => {
  try {
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
      status: 'active',
      provider: user.providerData[0]?.providerId || 'unknown'
    };

    if (!snapshot.exists()) {
      // Create new user entry
      await set(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
      console.log('Created new user in database:', user.uid);
    } else {
      // Update existing user's data
      await update(userRef, userData);
      console.log('Updated user in database:', user.uid);
    }

    return true;
  } catch (error) {
    console.error('Error creating/updating user in database:', error);
    throw error;
  }
};

// Add function to check if user exists
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const snapshot = await get(ref(db, `users/${uid}`));
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw error;
  }
};

// Function to check if a user is an admin
export const isUserAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      return userData.role === 'admin';
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Function to set a user as admin
export const setUserAsAdmin = async (uid: string) => {
  try {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, {
      role: 'admin',
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    throw error;
  }
};

// Update this function to be properly exported
export const setInitialAdmin = async (uid: string) => {
  try {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, {
      role: 'admin',
      isAdmin: true,
      updatedAt: serverTimestamp()
    });
    
    // Also update the user's status
    await update(ref(db, `status/${uid}`), {
      isAdmin: true,
      lastUpdated: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error setting initial admin:', error);
    return false;
  }
};

// Update the syncAllUsers function with better error handling and logging
export const syncAllUsers = async () => {
  try {
    const response = await fetch('/api/admin/set-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to sync users');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error syncing users:', error);
    throw error;
  }
};
