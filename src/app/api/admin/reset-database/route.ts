import { NextResponse } from 'next/server';
import { resetDatabase } from '@/lib/firebase/resetDatabase';
import { auth } from '@/lib/firebase/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  try {
    // Check for admin secret in headers
    const authHeader = request.headers.get('x-admin-secret');
    
    if (!ADMIN_SECRET || authHeader !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sign in as admin if credentials are provided
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      } catch (error) {
        console.error('Error signing in as admin:', error);
        return NextResponse.json(
          { error: 'Admin authentication failed' },
          { status: 401 }
        );
      }
    }

    await resetDatabase();
    
    return NextResponse.json(
      { message: 'Database reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in reset-database route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 