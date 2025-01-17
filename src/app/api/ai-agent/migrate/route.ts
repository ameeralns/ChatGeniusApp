import { NextResponse } from 'next/server';
import { migrateAllUsersToAIAgent } from '@/lib/vectordb/ai-agent-operations';

export async function POST(request: Request) {
  try {
    const result = await migrateAllUsersToAIAgent();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in migrate-ai-agent route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 