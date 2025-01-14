import { NextResponse } from 'next/server';
import { queryMessages, upsertMessage } from '@/lib/vectordb/vector-operations';
import type { MessageVector } from '@/lib/vectordb/vector-operations';

export async function POST(req: Request) {
  try {
    const { userId, userProfile } = await req.json();
    
    // Find all messages by this user in Pinecone
    const userMessages = await queryMessages('', '', 1000);
    const userSpecificMessages = userMessages.filter(msg => msg.userId === userId);

    // Update each message with the new user profile
    for (const message of userSpecificMessages) {
      const messageVector: MessageVector = {
        id: message.id,
        workspaceId: message.workspaceId,
        channelId: message.channelId,
        content: message.content,
        userId: message.userId,
        timestamp: message.timestamp,
        userProfile: userProfile
      };

      await upsertMessage(messageVector);
    }

    return NextResponse.json({ 
      success: true, 
      updatedCount: userSpecificMessages.length 
    });
  } catch (error) {
    console.error('User profile sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync user profile updates' },
      { status: 500 }
    );
  }
} 