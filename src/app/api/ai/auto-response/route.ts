import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';
import { queryUserContext } from '@/lib/vectordb/ai-agent-operations';

export async function POST(req: Request) {
  try {
    const { channelId, userId } = await req.json();

    if (!channelId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Firebase Admin and get database instance
    initializeFirebaseAdmin();
    const adminDb = getAdminDb();

    // Get relevant context from Pinecone
    const relevantContext = await queryUserContext(userId, channelId);

    // Format the context for the prompt
    const contextString = relevantContext
      .map(ctx => `${ctx.messageType === 'bio' ? 'Bio' : 'Message'}: ${ctx.content}`)
      .join('\n');

    // Generate response using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping to generate responses based on user context. Here is the relevant context about the user:\n${contextString}`
          },
          {
            role: 'user',
            content: 'Generate a natural response that would be appropriate for this context.'
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate response from OpenAI');
    }

    const data = await response.json();
    const generatedResponse = data.choices[0].message.content;

    return NextResponse.json({ response: generatedResponse });
  } catch (error) {
    console.error('Error in auto-response:', error);
    return NextResponse.json(
      { error: 'Failed to generate auto-response' },
      { status: 500 }
    );
  }
} 