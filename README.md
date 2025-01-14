# ChatGenius

ChatGenius is a modern AI-powered chat application built with Next.js 14, TypeScript, and Firebase. It provides real-time messaging capabilities with AI assistance, user presence, and thread-based conversations.

## Features

- 🤖 AI-powered chat assistance
- 💬 Real-time messaging
- 🧵 Thread-based conversations
- 👥 User presence indicators
- 🎨 Modern UI with Tailwind CSS
- 🔒 Firebase Authentication
- 📱 Responsive design
- 🎵 Text-to-Speech for AI messages
- 😄 Message reactions
- 🔍 Message search

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Firebase (Auth, Realtime Database, Storage)
- Tailwind CSS
- Vercel AI SDK
- OpenAI API
- Anthropic API (Claude)
- Replicate API
- Deepgram API

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/ameeralns/ChatGeniusAppAi.git
cd ChatGeniusAppAi
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file in the root directory and add your API keys:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url

OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
REPLICATE_API_KEY=your_replicate_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js pages and API routes
- `/src/components` - React components
- `/src/lib` - Utility functions, hooks, and contexts
  - `/firebase` - Firebase configuration and utilities
  - `/contexts` - React contexts (Auth, Deepgram)
  - `/hooks` - Custom React hooks
  - `/types` - TypeScript type definitions

## Features in Detail

### AI Integration
- OpenAI integration for chat assistance
- Claude (Anthropic) for alternative AI responses
- Stable Diffusion (Replicate) for image generation
- Deepgram for real-time audio transcription

### Chat Features
- Real-time messaging with Firebase
- Thread-based conversations
- Message reactions and replies
- User presence indicators
- Text-to-speech for AI messages

### Authentication
- Firebase Authentication
- Protected routes
- User profiles

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
