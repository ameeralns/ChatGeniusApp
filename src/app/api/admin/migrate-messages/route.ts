import { NextResponse } from 'next/server';
import { migrateAllWorkspaces } from '@/lib/vectordb/migrate-messages';

export async function POST() {
  try {
    await migrateAllWorkspaces();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: 'Failed to migrate messages' },
      { status: 500 }
    );
  }
} 