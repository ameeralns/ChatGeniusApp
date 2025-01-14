import { Pinecone } from '@pinecone-database/pinecone';

// Debug all environment variables
console.log('All env vars:', {
  ...process.env,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '[HIDDEN]' : undefined
});

console.log('Checking specific Pinecone env vars:', {
  apiKey: !!process.env.PINECONE_API_KEY,
  index: process.env.PINECONE_INDEX,
  rawIndex: String(process.env.PINECONE_INDEX), // See the raw value
});

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing PINECONE_API_KEY environment variable');
}

if (!process.env.PINECONE_INDEX) {
  throw new Error('Missing PINECONE_INDEX environment variable');
}

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX); 