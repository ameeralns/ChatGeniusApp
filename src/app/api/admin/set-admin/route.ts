import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase/setupAdmin';
import { ref, update, get, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';

export async function POST(request: Request) {
  try {
    console.log('Starting sync process in API'); // Debug log

    // Get all authenticated users
    const admin = initAdmin();
    const { users } = await admin.auth().listUsers();
    console.log('Found auth users:', users.length);

    // Get existing users from database
    const dbSnapshot = await get(ref(db, 'users'));
    const existingUsers = dbSnapshot.val() || {};
    console.log('Existing database users:', Object.keys(existingUsers).length);

    let newUsersCount = 0;
    const updates: { [key: string]: any } = {};

    // Check each auth user
    for (const authUser of users) {
      console.log('Checking user:', authUser.email);
      
      // If user doesn't exist in database
      if (!existingUsers[authUser.uid]) {
        console.log('Creating user:', authUser.email);
        
        updates[`users/${authUser.uid}`] = {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName || '',
          photoURL: authUser.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
          provider: authUser.providerData[0]?.providerId || 'unknown'
        };
        newUsersCount++;
      }
    }

    // If we have users to add
    if (newUsersCount > 0) {
      console.log(`Creating ${newUsersCount} new users...`);
      
      // Use update instead of set to preserve existing data
      await update(ref(db), updates);
      console.log('Users created successfully');
    } else {
      console.log('No new users to create');
    }

    // Verify the update
    const finalSnapshot = await get(ref(db, 'users'));
    const finalUsers = finalSnapshot.val() || {};

    const result = {
      success: true,
      message: `Created ${newUsersCount} new user accounts`,
      details: {
        authUsersCount: users.length,
        existingUsersCount: Object.keys(existingUsers).length,
        newUsersCount,
        finalUsersCount: Object.keys(finalUsers).length
      }
    };

    console.log('Returning result:', result); // Debug log
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in sync process:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 