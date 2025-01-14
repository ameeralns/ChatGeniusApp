import { NextResponse } from 'next/server';
import { migrateMessagesWithUserProfiles } from '@/lib/firebase/database';

export async function POST() {
  try {
    const totalUpdated = await migrateMessagesWithUserProfiles();
    return NextResponse.json({ success: true, totalUpdated });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
} 