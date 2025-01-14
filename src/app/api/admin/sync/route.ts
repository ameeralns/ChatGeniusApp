import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase/setupAdmin';
import { ref, set, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';

export async function POST() {
  try {
    // Get all authenticated users
    const admin = initAdmin();
    const { users } = await admin.auth().listUsers();
    console.log('Auth users:', users.length);

    // Create/update each user in the database
    let addedCount = 0;
    
    for (const authUser of users) {
      const userRef = ref(db, `users/${authUser.uid}`);
      
      // Create user data
      const userData = {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || '',
        photoURL: authUser.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        provider: authUser.providerData[0]?.providerId || 'unknown'
      };

      // Set the user data
      await set(userRef, userData);
      addedCount++;
    }

    return NextResponse.json({ 
      success: true,
      count: addedCount,
      message: `Synced ${addedCount} users`
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync users'
    }, { status: 500 });
  }
} 