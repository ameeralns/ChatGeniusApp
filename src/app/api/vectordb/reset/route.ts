import { NextResponse } from 'next/server';
import { pineconeIndex } from '@/lib/vectordb/pinecone-client';

export async function POST(req: Request) {
  try {
    // Delete all vectors
    await pineconeIndex.deleteAll();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset vector database' },
      { status: 500 }
    );
  }
} 