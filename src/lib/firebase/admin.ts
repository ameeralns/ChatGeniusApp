import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin SDK
let adminApp: App | undefined;

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    adminApp = getApps()[0];
  }
  return adminApp;
}

// Export admin services
export const getAdminAuth = () => {
  if (!adminApp) throw new Error('Firebase Admin not initialized');
  return getAuth(adminApp);
};

export const getAdminDb = () => {
  if (!adminApp) throw new Error('Firebase Admin not initialized');
  return getDatabase(adminApp);
};

export const getAdminStorage = () => {
  if (!adminApp) throw new Error('Firebase Admin not initialized');
  return getStorage(adminApp);
};

// Types
export type AdminAuth = ReturnType<typeof getAdminAuth>;
export type AdminDb = ReturnType<typeof getAdminDb>;
export type AdminStorage = ReturnType<typeof getAdminStorage>; 