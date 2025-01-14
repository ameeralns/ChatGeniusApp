import { NextResponse } from 'next/server';
import { setInitialAdmin } from '@/lib/firebase/firebaseUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();
    if (!uid) return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    const result = await setInitialAdmin(uid);
    return NextResponse.json({ success: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}