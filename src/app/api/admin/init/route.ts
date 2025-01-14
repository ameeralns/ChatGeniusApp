import { NextResponse } from 'next/server';
import { setInitialAdmin } from '@/lib/firebase/firebaseUtils';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request
) {
  try {
    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const result = await setInitialAdmin(uid);
    
    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: 'Admin initialized successfully' 
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Failed to set admin status' 
    }, { status: 500 });

  } catch (error) {
    console.error('Admin initialization error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 