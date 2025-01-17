import { NextResponse } from 'next/server';
import { queryMessages, upsertMessage } from '@/lib/vectordb/vector-operations';
import type { MessageVector } from '@/lib/vectordb/vector-operations';

export async function POST(request: Request) {
  try {
    const { userId, userProfile } = await request.json();
    if (!userId || !userProfile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find all messages by this user in Pinecone
    const userMessages = await queryMessages('', '', 1000);
    const userSpecificMessages = userMessages.filter((msg) => {
      // Check if the message belongs to this user by comparing with userName
      return msg.userName === userProfile.displayName;
    });

    // Update each message with the new user profile
    for (const message of userSpecificMessages) {
      const messageVector: MessageVector = {
        id: message.id,
        workspaceId: message.workspaceId,
        channelId: message.channelId,
        content: message.content,
        userId: userId,
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
    console.error('Error syncing user profile:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 