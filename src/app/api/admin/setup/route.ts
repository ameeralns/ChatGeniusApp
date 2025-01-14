import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase/setupAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();
    
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const admin = initAdmin();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin SDK initialized successfully' 
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to initialize admin SDK' 
    }, { status: 500 });
  }
} 