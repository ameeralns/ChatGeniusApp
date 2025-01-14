import { NextResponse } from 'next/server';
import { testBackendFunctionality } from '@/lib/firebase/testBackend';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

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

    const results = await testBackendFunctionality();
    
    return NextResponse.json(
      { results },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in test-backend route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 