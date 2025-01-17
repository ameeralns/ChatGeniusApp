import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getAdminDb } from '@/lib/firebase/admin';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const adminDb = getAdminDb();

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const index = pinecone.index(process.env.PINECONE_AI_AGENT_INDEX!);

    // First, get the user's bio
    const bioQuery = await index.query({
      vector: Array(1536).fill(0), // Using a zero vector since we're relying on metadata filtering
      filter: { 
        userId,
        messageType: 'bio'
      },
      topK: 1,
      includeMetadata: true
    });

    let userBio = '';
    if (bioQuery.matches && bioQuery.matches[0]?.metadata?.content) {
      userBio = bioQuery.matches[0].metadata.content as string;
    }

    // Then, get the user's messages
    const messagesQuery = await index.query({
      vector: Array(1536).fill(0), // Using a zero vector since we're relying on metadata filtering
      filter: { 
        userId,
        messageType: 'message'
      },
      topK: 100,
      includeMetadata: true
    });

    const userMessages: string[] = [];
    if (messagesQuery.matches) {
      messagesQuery.matches.forEach(match => {
        if (match.metadata?.content) {
          userMessages.push(match.metadata.content as string);
        }
      });
    }

    if (userMessages.length === 0 && !userBio) {
      return NextResponse.json({
        summary: "Not enough data to generate a persona summary. Start chatting to build your persona!"
      });
    }

    // Generate summary using OpenAI
    const prompt = `Based on the following user information, create a concise summary of their persona, communication style, and typical behavior. Focus on patterns, preferences, and characteristic traits.

${userBio ? `User Bio:\n${userBio}\n\n` : ''}
User Messages:
${userMessages.slice(0, 30).join('\n')}

Generate a natural, conversational summary that captures the essence of this user's persona. Consider:
1. Their communication style and tone
2. Common topics or interests they discuss
3. How they interact with others
4. Any notable expertise or knowledge areas
5. Personality traits that come through in their messages

Keep the summary concise but insightful, highlighting what makes this user unique.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing communication patterns and creating insightful persona summaries. Focus on creating a meaningful, nuanced portrait of the user's personality and communication style."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = response.choices[0].message.content;
    if (!summary) {
      throw new Error('Failed to generate summary');
    }

    // Store the summary in Firebase under the user's persona parameter
    const userRef = adminDb.ref(`users/${userId}`);
    await userRef.update({
      persona: {
        summary,
        lastUpdated: Date.now(),
      }
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating persona:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 