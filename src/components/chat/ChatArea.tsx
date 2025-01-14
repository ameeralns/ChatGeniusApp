'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Plus } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { sendMessage, subscribeToMessages } from '@/lib/firebase/database';
import { MessageBubble } from './MessageBubble';
import { ref, push, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';

interface Message {
  id: string | null;
  content: string;
  userId: string;
  createdAt: number;
  type: 'text' | 'file';
  userProfile: {
    displayName: string | null;
    photoURL: string | null;
    photoURLUpdatedAt?: number;
  };
  fileData?: {
    fileName: string;
    fileKey: string;
    fileType: string;
    url: string;
  };
  reactions?: {
    [reactionId: string]: {
      emoji: string;
      userId: string;
      createdAt: number;
    }
  };
  threadId?: string;
  parentId?: string;
  replyCount?: number;
}

interface ChatAreaProps {
  channelId: string | null;
  workspaceId?: string;
}

export default function ChatArea({ channelId, workspaceId }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!channelId || !workspaceId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    // Subscribe to messages in the channel
    const unsubscribe = subscribeToMessages(workspaceId, channelId, (messageData) => {
      setMessages(messageData as unknown as Message[]);
      setLoading(false);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [channelId, workspaceId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end',
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId || !workspaceId || !user?.uid || !newMessage.trim()) return;

    try {
      await sendMessage(channelId, workspaceId, newMessage.trim(), user.uid);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p>Select a channel to start messaging</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {workspaceId && channelId && messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.userId === user?.uid}
            workspaceId={workspaceId}
            channelId={channelId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 text-purple-500 hover:text-purple-400 disabled:text-gray-500 disabled:hover:text-gray-500 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
} 