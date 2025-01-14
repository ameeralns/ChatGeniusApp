import OpenAI from 'openai';
import { AIAssistantPreferences } from '@/lib/types/aiAssistant';
import { queryMessages } from '@/lib/vectordb/vector-operations';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getSystemPrompt = (preferences: AIAssistantPreferences, relevantContext: any[] = []) => {
  const { personality, tone, expertise, customInstructions } = preferences;
  
  let prompt = `You are an AI assistant with the following characteristics:
- Personality: ${personality} (be ${personality} in your responses)
- Tone: ${tone} (maintain a ${tone} tone)
- Expertise: ${expertise} (focus on ${expertise} knowledge when relevant)

Your responses should consistently reflect these characteristics while being helpful and accurate.

IMPORTANT INSTRUCTIONS:
1. You can ONLY use information from the current workspace's context.
2. When asked about events, meetings, or details:
   - If the information exists in the context, provide the EXACT date, time, and user details
   - If the information is NOT in the context, clearly state "I don't have that information in this workspace"
3. Never make assumptions or infer details that aren't explicitly stated in the context
4. Always include the source (user and timestamp) when referencing information from the context`;

  if (customInstructions) {
    prompt += `\n\nAdditional instructions: ${customInstructions}`;
  }

  if (relevantContext.length > 0) {
    const contextStr = relevantContext
      .map(ctx => {
        const timestamp = typeof ctx.timestamp === 'number' ? 
          ctx.timestamp : 
          new Date(ctx.timestamp).getTime();
        
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        return `- [${formattedDate}] ${ctx.content} (from user: ${ctx.userProfile?.displayName || ctx.userId})`;
      })
      .join('\n');

    prompt += `\n\nHere is the relevant context from messages in the CURRENT workspace ONLY:
${contextStr}

Critical Instructions for Using Context:
1. Use ONLY the context above to provide answers about events, meetings, or details
2. If asked about something not in this context, respond with "I don't have that information in this workspace"
3. When providing information about dates and times:
   - Use the exact date and time format from the context
   - Include the user who provided the information
   - Quote the relevant part of the message if appropriate
4. Never mix information from different workspaces - only use what's provided above
5. If multiple messages mention the same topic, use the most recent information`;
  } else {
    prompt += '\n\nThere is no message context available in the current workspace. If asked about specific events, meetings, or details, inform the user that you don\'t have any context in this workspace.';
  }

  return prompt;
};

export async function POST(req: Request) {
  try {
    const { messages, preferences, workspaceId } = await req.json();

    if (!workspaceId) {
      console.error('Missing workspaceId in chat request');
      return new Response(
        JSON.stringify({ error: 'workspaceId is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the user's latest message
    const userMessage = messages[messages.length - 1].content;
    console.log('Querying Pinecone for context:', {
      userMessage,
      workspaceId
    });

    // Query relevant context from vector database with higher limit for better context
    const relevantContext = await queryMessages(userMessage, workspaceId, 10);
    console.log('Retrieved context from Pinecone:', 
      relevantContext.map(ctx => ({
        content: ctx.content,
        timestamp: ctx.timestamp,
        userId: ctx.userId,
        workspaceId: ctx.workspaceId
      }))
    );

    // Sort context by timestamp to show in chronological order
    const sortedContext = relevantContext.sort((a, b) => a.timestamp - b.timestamp);

    // Add system message with personalized preferences and context
    const systemMessage = {
      role: 'system',
      content: getSystemPrompt(preferences, sortedContext),
    };

    console.log('System prompt:', systemMessage.content);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1000,
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
