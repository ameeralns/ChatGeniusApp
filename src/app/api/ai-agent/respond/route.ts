import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { userId, message, context } = await request.json();

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an AI agent that responds on behalf of a user. You should mimic their communication style and personality based on their past messages and bio.

Here is the relevant context from their past messages and bio:
${context || 'No context available'}

Use this context to inform your response style, tone, and personality. The response should feel natural and consistent with how the user typically communicates.`
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

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in AI agent response:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 