import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIAgentSettings {
  dmEnabled: boolean;
  workspaces: {
    [workspaceId: string]: boolean;
  };
}

export async function POST(request: Request) {
  try {
    const { message, channelId, workspaceId, isDM } = await request.json();
    
    if (!message || !channelId || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Firebase Admin and get admin DB reference
    initializeFirebaseAdmin();
    const adminDb = getAdminDb();

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const aiAgentIndex = pinecone.index(process.env.PINECONE_AI_AGENT_INDEX!);

    // Get channel data first
    const channelSnapshot = await adminDb.ref(`workspaces/${workspaceId}/channels/${channelId}`).get();
    const channelData = channelSnapshot.val();

    if (!channelData) {
      console.error('Channel not found:', { workspaceId, channelId });
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Get members based on channel type
    let channelUsers: string[] = [];
    if (isDM) {
      // For DM channels, get members from the channel
      const membersSnapshot = await adminDb.ref(`workspaces/${workspaceId}/channels/${channelId}/members`).get();
      const membersData = membersSnapshot.val() || {};
      channelUsers = Object.values(membersData);
    } else {
      // For text channels, get all workspace members
      const workspaceMembersSnapshot = await adminDb.ref(`workspaces/${workspaceId}/members`).get();
      const workspaceMembersData = workspaceMembersSnapshot.val() || {};
      channelUsers = Object.keys(workspaceMembersData);
    }

    console.log('Processing auto-response for channel:', {
      workspaceId,
      channelId,
      isDM,
      userCount: channelUsers.length,
      users: channelUsers,
      channelType: channelData.type,
      membersSource: isDM ? 'channel' : 'workspace'
    });

    // For each user in the channel, check their AI agent settings
    const autoResponsePromises = channelUsers.map(async (userId) => {
      try {
        // Get user's AI agent settings
        const aiAgentSettingsRef = adminDb.ref(`users/${userId}/aiAgentSettings`);
        const aiAgentSettingsSnapshot = await aiAgentSettingsRef.get();
        let aiAgentSettings = aiAgentSettingsSnapshot.val();

        console.log('Raw AI agent settings from DB:', {
          userId,
          settings: aiAgentSettings
        });

        // If no settings exist, initialize with defaults
        if (!aiAgentSettings) {
          aiAgentSettings = {
            dmEnabled: false,
            workspaces: {}
          };
          // Save default settings
          await aiAgentSettingsRef.set(aiAgentSettings);
        }

        console.log('Evaluating response conditions:', {
          userId,
          isDM,
          channelType: channelData.type,
          dmEnabled: aiAgentSettings.dmEnabled,
          dmEnabledType: typeof aiAgentSettings.dmEnabled,
          rawSettings: aiAgentSettings
        });

        // Check conditions for auto-response:
        // 1. For DMs: dmEnabled must be true
        // 2. For workspace channels: must be text channel and workspace must be enabled
        const shouldRespond = isDM ? 
          Boolean(aiAgentSettings.dmEnabled) === true : 
          channelData.type === 'text' && Boolean(aiAgentSettings.workspaces?.[workspaceId]) === true;

        console.log('Response decision:', {
          userId,
          isDM,
          shouldRespond,
          channelType: channelData.type,
          dmEnabled: aiAgentSettings.dmEnabled,
          condition: isDM ? 'checking dmEnabled' : 'checking workspace and channel type',
          workspaceSettings: aiAgentSettings.workspaces?.[workspaceId]
        });

        if (!shouldRespond) {
          console.log('Auto-response disabled for user:', { userId, isDM });
          return null;
        }

        // Get user's persona
        const userSnapshot = await adminDb.ref(`users/${userId}`).get();
        const user = userSnapshot.val();
        const persona = user?.persona?.summary || '';

        console.log('Generating auto-response for user:', { 
          userId,
          hasPersona: !!persona
        });

        // Query Pinecone for relevant context about this user
        const queryResponse = await aiAgentIndex.query({
          vector: Array(1536).fill(0), // Using a zero vector since we're relying on metadata filtering
          filter: {
            userId: userId,
            messageType: { $in: ['message', 'bio'] }  // Get both messages and bio for context
          },
          topK: 10,
          includeMetadata: true
        });

        // Format the context for the prompt
        const relevantContext = queryResponse.matches
          ?.map(match => {
            const metadata = match.metadata as { content: string; messageType: string };
            return `${metadata.messageType === 'bio' ? 'Bio' : 'Past Message'}: ${metadata.content}`;
          })
          .join('\n') || '';

        console.log('Retrieved context for response:', {
          userId,
          contextCount: queryResponse.matches?.length || 0
        });

        // Generate response using OpenAI with both persona and relevant context
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: `You are an AI agent responding on behalf of a user. Here is their persona and communication style:

${persona}

Here is additional context from their past messages and bio:
${relevantContext}

Use this information to respond naturally, maintaining their communication style, personality, and contextual knowledge from their past messages.`
            },
            {
              role: "user",
              content: `Generate a response to this message: "${message}"`
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('Failed to generate response');
        }

        return {
          userId,
          response,
          channelId,
          workspaceId
        };

      } catch (error) {
        console.error('Error generating response for user:', { userId, error });
        return null;
      }
    });

    const responses = await Promise.all(autoResponsePromises);
    const validResponses = responses.filter(r => r !== null);

    console.log('Generated auto-responses:', {
      total: validResponses.length,
      channelId,
      workspaceId
    });

    return NextResponse.json({ responses: validResponses });
  } catch (error) {
    console.error('Auto-response error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 