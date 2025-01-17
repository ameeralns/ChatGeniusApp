import { Pinecone } from '@pinecone-database/pinecone';

// Debug all environment variables
console.log('All env vars:', {
  ...process.env,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '[HIDDEN]' : undefined
});

console.log('Checking specific Pinecone env vars:', {
  apiKey: !!process.env.PINECONE_API_KEY,
  index: 'chatgeniusapp-index', // Hardcoded for AI Assistant
  rawIndex: 'chatgeniusapp-index', // See the raw value
});

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing PINECONE_API_KEY environment variable');
}

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Use the specific index for AI Assistant
export const pineconeIndex = pinecone.index('chatgeniusapp-index'); 