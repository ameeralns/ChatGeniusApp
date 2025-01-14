import OpenAI from 'openai';
import { AIAssistantPreferences } from '@/lib/types/aiAssistant';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getSystemPrompt = (preferences: AIAssistantPreferences) => {
  const { personality, tone, expertise, customInstructions } = preferences;
  
  let prompt = `You are an AI assistant with the following characteristics:
- Personality: ${personality} (be ${personality} in your responses)
- Tone: ${tone} (maintain a ${tone} tone)
- Expertise: ${expertise} (focus on ${expertise} knowledge when relevant)

Your responses should consistently reflect these characteristics while being helpful and accurate.`;

  if (customInstructions) {
    prompt += `\n\nAdditional instructions: ${customInstructions}`;
  }

  return prompt;
};

export async function POST(req: Request) {
  try {
    const { messages, preferences } = await req.json();

    // Add system message with personalized preferences
    const systemMessage = {
      role: 'system',
      content: getSystemPrompt(preferences),
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
    });

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
