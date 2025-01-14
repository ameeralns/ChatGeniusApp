'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Plus, Smile } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { db } from '@/lib/firebase/firebase';
import { ref, onValue, push, serverTimestamp, off, get } from 'firebase/database';
import Image from 'next/image';

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

interface Channel {
  id: string | null;
  name: string;
  createdBy: string;
  createdAt: number;
}

interface ChatAreaProps {
  workspaceId?: string;
  channelId: string | null;
  channelName?: string;
}

export default function ChatArea({ workspaceId, channelId, channelName = 'general' }: ChatAreaProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userCache, setUserCache] = useState<{ [key: string]: any }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Memoize fetchUserData
  const fetchUserData = useCallback(async (userId: string) => {
    if (userCache[userId]) return userCache[userId];

    try {
      const userRef = ref(db, `users/${userId}/profile`);
      const snapshot = await get(userRef);
      const userData = snapshot.val() || {
        displayName: 'Unknown User',
        email: null,
        photoURL: null
      };

      setUserCache(prev => ({
        ...prev,
        [userId]: userData
      }));

      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return {
        displayName: 'Unknown User',
        email: null,
        photoURL: null
      };
    }
  }, [userCache]);

  useEffect(() => {
    if (!channelId || !workspaceId || !user) return;

    // Subscribe to messages in the channel
    const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
    
    const handleMessages = async (snapshot: any) => {
      const messageData: Message[] = [];
      const promises: Promise<any>[] = [];

      snapshot.forEach((child: any) => {
        const message = {
          id: child.key,
          ...child.val()
        };
        messageData.push(message);
        promises.push(fetchUserData(message.userId));
      });

      // Wait for all user data to be fetched
      const userData = await Promise.all(promises);

      // Update messages with user data
      const messagesWithUsers = messageData.map((message, index) => ({
        ...message,
        user: userData[index]
      }));

      setMessages(messagesWithUsers);
      scrollToBottom();
    };

    onValue(messagesRef, handleMessages);

    return () => {
      off(messagesRef);
    };
  }, [channelId, workspaceId, user, fetchUserData]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId || !workspaceId || !user) return;

    try {
      const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
      await push(messagesRef, {
        content: newMessage,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!channelId || !workspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#949BA4]">
        Select a channel to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#313338]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-4 hover:bg-[#2E3035] rounded px-4 py-1 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {message.userProfile?.photoURL ? (
                <Image
                  src={message.userProfile.photoURL}
                  alt={message.userProfile.displayName || 'User'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#5865F2] flex items-center justify-center text-white text-lg font-medium">
                  {(message.userProfile?.displayName?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="font-medium text-white hover:underline cursor-pointer">
                  {message.userProfile?.displayName || 'Unknown User'}
                </span>
                <span className="text-xs text-[#949BA4]">
                  {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>
              <p className="text-[#DBDEE1] break-words">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-4 py-4">
        <form onSubmit={sendMessage} className="relative">
          <div className="flex items-center space-x-2 bg-[#383A40] rounded-lg px-4 py-2.5">
            <button
              type="button"
              className="p-1 hover:bg-[#404249] rounded-lg text-[#B8B9BF] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${channelName}`}
              className="flex-1 bg-transparent text-[#DBDEE1] placeholder-[#949BA4] focus:outline-none text-base"
            />
            <button
              type="button"
              className="p-1 hover:bg-[#404249] rounded-lg text-[#B8B9BF] transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
            {newMessage.trim() && (
              <button
                type="submit"
                className="p-1 hover:bg-[#404249] rounded-lg text-[#B8B9BF] transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 