import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase/setupAdmin';
import { getDatabase } from 'firebase-admin/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Initialize admin and get admin database reference
    const admin = initAdmin();
    const adminDb = getDatabase();
    
    // Get all authenticated users
    const authResult = await admin.auth().listUsers();
    const authUsers = authResult.users;
    console.log(`API: Found ${authUsers.length} users in Authentication`);
    
    // Get existing users from admin database
    const dbSnapshot = await adminDb.ref('users').get();
    const existingUsers = dbSnapshot.val() || {};
    console.log(`API: Found ${Object.keys(existingUsers).length} users in Database`);

    // Get existing presence records
    const presenceSnapshot = await adminDb.ref('userPresence/v1').get();
    const existingPresence = presenceSnapshot.val() || {};
    console.log(`API: Found ${Object.keys(existingPresence).length} users in Presence`);
    
    // Track new users
    const newUsers: Array<{ email: string; uid: string }> = [];
    const updates: { [key: string]: any } = {};
    
    // Process each auth user
    for (const authUser of authUsers) {
      const timestamp = Date.now();
      
      // Check and update user record
      if (!existingUsers[authUser.uid]) {
        console.log(`API: Creating user ${authUser.email}`);
        
        // Prepare user data for database
        updates[`users/${authUser.uid}`] = {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName || '',
          photoURL: authUser.photoURL || '',
          createdAt: admin.database.ServerValue.TIMESTAMP,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
          status: 'active',
          provider: authUser.providerData[0]?.providerId || 'unknown'
        };
        
        newUsers.push({
          email: authUser.email || 'no-email',
          uid: authUser.uid
        });
      }

      // Check and update presence record
      if (!existingPresence[authUser.uid]) {
        console.log(`API: Initializing presence for user ${authUser.email}`);
        
        // Initialize presence data
        updates[`userPresence/v1/${authUser.uid}`] = {
          status: 'offline',
          lastSeen: timestamp,
          displayName: authUser.displayName || '',
          photoURL: authUser.photoURL || '',
          photoURLUpdatedAt: timestamp
        };
      }
    }
    
    // Perform updates if we have any changes
    if (Object.keys(updates).length > 0) {
      console.log(`API: Creating ${newUsers.length} users and updating presence records`);
      await adminDb.ref().update(updates);
      console.log('API: Updates completed successfully');
    }
    
    return NextResponse.json({
      success: true,
      message: newUsers.length > 0 
        ? `Created ${newUsers.length} new user accounts and initialized presence records` 
        : 'All users are already synced',
      details: {
        authUsersCount: authUsers.length,
        existingUsersCount: Object.keys(existingUsers).length,
        existingPresenceCount: Object.keys(existingPresence).length,
        newUsersCount: newUsers.length,
        newUsers: newUsers
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { 
      status: 500 
    });
  }
} 