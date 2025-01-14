import { ref, set, get } from 'firebase/database';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Initial database structure with empty data
const initialDatabaseStructure = {
  users: {},
  workspaces: {},
  messages: {},
  channels: {},
};

/**
 * Resets the entire database to its initial structure
 * This will remove all data but keep the structure intact
 */
export async function resetDatabase() {
  try {
    // First, try to read the database to check permissions
    const snapshot = await get(ref(db, '/'));
    if (!snapshot.exists()) {
      console.log('Database is already empty');
      return true;
    }

    // Set the root reference to the initial structure
    await set(ref(db, '/'), initialDatabaseStructure);
    console.log('Database reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
} 