'use client';

import FileUpload from './FileUpload';
import { useEffect, useState } from 'react';
import { subscribeToMessages, sendMessage } from '@/lib/firebase/database';
import { useAuth } from '@/lib/hooks/useAuth';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { toast } from 'react-hot-toast';

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

interface ChatProps {
  workspaceId: string;
  channelId: string;
}

export default function Chat({ workspaceId, channelId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();

  // Subscribe to messages when component mounts
  useEffect(() => {
    if (!workspaceId || !channelId) return;

    // Subscribe to real-time message updates
    const unsubscribe = subscribeToMessages(workspaceId, channelId, (newMessages) => {
      setMessages(newMessages);
    });

    // Cleanup subscription when component unmounts
    return () => unsubscribe();
  }, [workspaceId, channelId]);

  const handleFileUpload = async (fileData: { fileName: string; fileKey: string; fileType: string; url: string }) => {
    if (!user) return;
    
    try {
      console.log('Uploading file with data:', fileData);
      await sendMessage(
        channelId,
        workspaceId,
        '', // Empty content for file messages
        user.uid,
        {
          fileName: fileData.fileName,
          fileKey: fileData.fileKey,
          fileType: fileData.fileType,
          url: fileData.url
        }
      );
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error sending file message:', error);
      toast.error('Failed to upload file');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      await sendMessage(
        channelId,
        workspaceId,
        newMessage,
        user.uid
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.userId === user?.uid}
            workspaceId={workspaceId}
            channelId={channelId}
          />
        ))}
      </div>
      <div className="border-t p-4">
        <FileUpload 
          onUpload={handleFileUpload}
          path={`workspaces/${workspaceId}/channels/${channelId}/files`}
        />
        <form onSubmit={handleSendMessage} className="mt-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          />
        </form>
      </div>
    </div>
  );
} 