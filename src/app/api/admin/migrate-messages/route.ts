import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const adminDb = getAdminDb();

    // Rest of your code...
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in migrate messages:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 