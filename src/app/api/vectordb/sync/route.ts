import { NextResponse } from 'next/server';
import { upsertMessage } from '@/lib/vectordb/vector-operations';
import type { MessageVector } from '@/lib/vectordb/vector-operations';

export async function POST(req: Request) {
  try {
    const messageVector: MessageVector = await req.json();
    console.log('Syncing message to Pinecone:', {
      id: messageVector.id,
      content: messageVector.content,
      workspaceId: messageVector.workspaceId,
      channelId: messageVector.channelId,
      timestamp: messageVector.timestamp
    });
    
    await upsertMessage(messageVector);
    console.log('Successfully synced message to Pinecone');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vector sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with vector database' },
      { status: 500 }
    );
  }
} 