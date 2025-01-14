import * as admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been initialized
export function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
  }
  return admin;
}

// Add the setupAdmin function that was missing
export async function setupAdmin() {
  try {
    const app = initAdmin();
    return {
      success: true,
      message: 'Admin SDK initialized successfully'
    };
  } catch (error) {
    console.error('Setup admin error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize Admin SDK'
    };
  }
} 