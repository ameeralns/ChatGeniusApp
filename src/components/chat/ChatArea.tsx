'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Paperclip, X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { sendMessage, subscribeToMessages } from '@/lib/firebase/database';
import { useMessageSync } from '@/lib/hooks/useMessageSync';
import { MessageBubble } from './MessageBubble';
import { storage } from '@/lib/firebase/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useMessageSync(workspaceId || '', channelId || '');

  useEffect(() => {
    if (!channelId || !workspaceId) {
      setMessages([]);
      setLoading(false);
      return;
    }

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

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging if we're dragging files
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only hide if we're leaving the drop zone
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!channelId || !workspaceId || !user?.uid || isUploading) {
      toast.error('Unable to upload file at this time');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    if (!(file instanceof File)) {
      toast.error('Invalid file type');
      return;
    }

    await handleFileUpload(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (!e.target.files || !channelId || !workspaceId || !user?.uid || isUploading) {
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    await handleFileUpload(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleFileUpload = async (file: File) => {
    if (!channelId || !workspaceId || !user?.uid) {
      toast.error('Unable to upload file at this time');
      return;
    }

    setIsUploading(true);
    setSelectedFile(file);
    const toastId = toast.loading('Uploading file...');

    try {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size should be less than 50MB');
      }

      // Create a unique file path
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const path = `workspaces/${workspaceId}/channels/${channelId}/files/${uniqueFileName}`;
      const fileRef = storageRef(storage, path);

      // Upload to Firebase Storage
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);

      // Send message with file data
      await sendMessage(
        channelId,
        workspaceId,
        '', // Empty content for file messages
        user.uid,
        'file',
        {
          fileName: file.name,
          fileType: file.type,
          url
        }
      );

      toast.success('File uploaded successfully', { id: toastId });
      setSelectedFile(null);
      scrollToBottom();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file', { id: toastId });
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
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
      toast.error('Failed to send message');
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
    <div 
      ref={dropZoneRef}
      className="flex-1 flex flex-col relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
          <div className="flex-1 flex items-center gap-2 bg-gray-700 rounded-lg px-4 py-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isUploading ? "Uploading file..." : "Type a message..."}
              className="flex-1 bg-transparent text-white focus:outline-none"
              disabled={isUploading}
            />
            {selectedFile && !isUploading && (
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-600 rounded-lg">
                <span className="text-sm text-white truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isUploading}
            className="p-2 text-purple-500 hover:text-purple-400 disabled:text-gray-500 disabled:hover:text-gray-500 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <div className="bg-[#1E1F22] rounded-xl p-8 border-2 border-dashed border-purple-500/50 flex flex-col items-center gap-4 max-w-md w-full mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Paperclip className="w-8 h-8 text-purple-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-white mb-2">Drop to upload</h3>
                  <p className="text-white/60">Files up to 50MB are supported</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 