'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase/firebase';
import { ref, onValue, push, set, get, Unsubscribe, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/hooks/useAuth';
import { Hash, Smile, Paperclip, Gift, Plus, Send, Bell, Settings, MessageSquare, X, Reply, User, Bot, Play, Square } from 'lucide-react';
import Image from 'next/image';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';
import ChannelSidebar from '@/components/layout/ChannelSidebar';
import UserProfileSlideOver from '@/components/layout/UserProfileSlideOver';
import CreateChannelModal from '@/components/modals/CreateChannelModal';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { addReaction, removeReaction, getOrCreateDMChannel, subscribeToThread, Message as DBMessage, subscribeToMessages } from '@/lib/firebase/database';
import { useChat } from 'ai/react';
import AIPreferencesModal from '@/components/modals/AIPreferencesModal';
import { defaultPreferences } from '@/lib/types/aiAssistant';

// Local interface for messages that includes typing state
interface ReactionData {
  emoji: string;
  users: {
    [userId: string]: {
      createdAt: number;
    };
  };
}

interface BaseMessage extends Omit<DBMessage, 'id' | 'type' | 'reactions'> {
  id: string;
  timestamp?: number;
  createdAt: number;
  reactions?: {
    [reactionId: string]: ReactionData;
  };
}

interface TextMessage extends BaseMessage {
  type: 'text' | 'file';
}

interface TypingMessage extends BaseMessage {
  type: 'typing';
}

type Message = TextMessage | TypingMessage;

interface Channel {
  name: string;
  description?: string;
  type?: 'text' | 'dm' | 'ai';
  participants?: {
    [userId: string]: boolean;
  };
}

interface ReactionTooltipProps {
  reaction: {
    emoji: string;
    users: {
      [userId: string]: {
        createdAt: number;
      };
    };
  };
  messages: Message[];
}

interface Member {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  status?: 'online' | 'offline' | 'idle' | 'dnd';
  lastOnline?: number;
}

interface Props {
  params: {
    workspaceId: string;
    channelId: string;
  };
}

const ReactionTooltip = ({ reaction, messages }: ReactionTooltipProps) => {
  if (!reaction?.users) return null;
  
  const userIds = Object.keys(reaction.users);
  const userNames = userIds.map(userId => {
    const message = messages.find((m: Message) => m.userId === userId);
    return message?.userProfile?.displayName || 'Unknown User';
  });
  
  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap z-50">
      {userNames.join(', ')}
    </div>
  );
};

export default function ChannelPage({ params }: Props) {
  const { workspaceId, channelId } = params;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showThread, setShowThread] = useState<string | null>(null);
  const [userContextMenu, setUserContextMenu] = useState<{ x: number; y: number; userId: string } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<{
    messageId: string;
    position: {
      x: number;
      y: number;
      placement: 'top' | 'bottom';
    };
  } | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{
    messageId: string;
    top: number;
    left: number;
    above: boolean;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [audioRef] = useState<HTMLAudioElement | null>(() => typeof Audio !== 'undefined' ? new Audio() : null);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const [aiPreferences, setAIPreferences] = useState(defaultPreferences);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);

  // Add useChat hook for AI channels
  const { messages: aiMessages, input: aiInput, handleInputChange: handleAIInputChange, handleSubmit: handleAISubmit, isLoading: isAILoading } = useChat({
    api: '/api/openai/chat',
    id: channelId, // Use channelId as the chat ID
  });

  // Load AI preferences
  useEffect(() => {
    const loadAIPreferences = async () => {
      if (!user || !channel?.type || channel.type !== 'ai') return;
      
      try {
        const prefsRef = ref(db, `workspaces/${workspaceId}/users/${user.uid}/aiPreferences`);
        const snapshot = await get(prefsRef);
        
        if (snapshot.exists()) {
          setAIPreferences(snapshot.val());
        }
      } catch (error) {
        console.error('Error loading AI preferences:', error);
      }
    };

    loadAIPreferences();
  }, [user, workspaceId, channel?.type]);

  useEffect(() => {
    if (authLoading || !user) return;

    let unsubscribeChannel: Unsubscribe | undefined;
    let unsubscribeMessages: Unsubscribe | undefined;
    let unsubscribeMembers: Unsubscribe | undefined;

    const initializeChannel = async () => {
      try {
        // Subscribe to channel details
        const channelRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}`);
        unsubscribeChannel = onValue(channelRef, (snapshot) => {
          const channelData = snapshot.val();
          if (!channelData) {
            router.push(`/workspace/${workspaceId}`);
            return;
          }
          setChannel(channelData);
          
          // Clear messages when entering an AI channel
          if (channelData.type === 'ai') {
            setMessages([]);
          }
        });

        // Only subscribe to messages for non-AI channels
        const channelSnapshot = await get(channelRef);
        const channelData = channelSnapshot.val();
        
        if (channelData && channelData.type !== 'ai') {
          const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
          unsubscribeMessages = onValue(messagesRef, (snapshot) => {
            const messagesData = snapshot.val();
            if (messagesData) {
              const messagesList = Object.entries(messagesData)
                .map(([id, data]: [string, any]) => ({
                  id,
                  ...data,
                }))
                // Only filter out replies (messages with parentId), keep parent messages
                .filter(msg => !msg.parentId)
                // Sort by timestamp first, then createdAt as fallback
                .sort((a, b) => {
                  // Use timestamp for primary sorting
                  const timestampA = a.timestamp || a.createdAt;
                  const timestampB = b.timestamp || b.createdAt;
                  return timestampA - timestampB;
                });
              setMessages(messagesList);
            } else {
              setMessages([]);
            }
          });
        }

        // Subscribe to members
        const membersRef = ref(db, `workspaces/${workspaceId}/members`);
        unsubscribeMembers = onValue(membersRef, (snapshot) => {
          const membersData = snapshot.val();
          if (membersData) {
            const membersList = Object.entries(membersData).map(([id, data]: [string, any]) => ({
              id,
              ...data,
            }));
            setMembers(membersList);
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Error initializing channel:', error);
        setLoading(false);
      }
    };

    initializeChannel();

    // Cleanup function
    return () => {
      unsubscribeChannel?.();
      unsubscribeMessages?.();
      unsubscribeMembers?.();
      // Clear messages when leaving any channel
      setMessages([]);
    };
  }, [workspaceId, channelId, user, authLoading, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!user || !messageInput.trim()) return;
    
    try {
      if (channel?.type === 'ai') {
        // For AI channels, only use local state
        const userMessage: Message = {
          id: Date.now().toString(),
          content: messageInput,
          userId: user.uid,
          createdAt: Date.now(),
          type: 'text',
          userProfile: {
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Add typing indicator message
        const typingIndicatorId = 'typing-indicator';
        const typingMessage: Message = {
          id: typingIndicatorId,
          content: '',
          userId: 'ai-assistant',
          createdAt: Date.now(),
          type: 'typing',
          userProfile: {
            displayName: 'AI Assistant',
            photoURL: null
          }
        };
        
        setMessages(prev => [...prev, typingMessage]);
        scrollToBottom();
        
        // Get AI response with preferences and workspaceId
        try {
          // Convert previous messages to OpenAI format
          const conversationHistory = messages
            .filter(msg => msg.type === 'text') // Only include text messages
            .map(msg => ({
              role: msg.userId === 'ai-assistant' ? 'assistant' : 'user',
              content: msg.content
            }));

          // Add the current message
          conversationHistory.push({ role: 'user', content: messageInput });

          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: conversationHistory,
              preferences: aiPreferences,
              workspaceId: workspaceId
            }),
          });

          if (!response.ok) throw new Error('Failed to get AI response');

          const data = await response.json();
          
          // Remove typing indicator and add AI response
          setMessages(prev => {
            const filtered = prev.filter(msg => msg.id !== typingIndicatorId);
            return [...filtered, {
              id: (Date.now() + 1).toString(),
              content: data.choices[0].message.content,
              userId: 'ai-assistant',
              createdAt: Date.now(),
              type: 'text',
              userProfile: {
                displayName: 'AI Assistant',
                photoURL: null
              }
            }];
          });
        } catch (error) {
          // Remove typing indicator on error
          setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
          console.error('Error getting AI response:', error);
          toast.error('Failed to get AI response');
        }
      } else {
        // For regular channels, use Firebase
        const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
        const newMessageRef = push(messagesRef);
        const messageData = {
          content: messageInput,
          userId: user.uid,
          createdAt: Date.now(),
          timestamp: Date.now(),
          type: 'text' as const,
          userProfile: {
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        };
        
        await set(newMessageRef, messageData);

        // Trigger auto-responses
        const message = {
          id: newMessageRef.key!,
          ...messageData
        };

        // Import the handleNewMessage function
        const { handleNewMessage } = await import('@/lib/utils/messageHandlers');
        
        // Call handleNewMessage with the appropriate parameters
        await handleNewMessage(
          message,
          workspaceId,
          channelId,
          channel?.type === 'dm'
        ).catch(error => {
          console.error('Error handling auto-responses:', error);
        });
      }

      setMessageInput('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim()) {
        if (replyingTo) {
          handleReply();
        } else {
          handleSendMessage();
        }
      }
    } else if (e.key === 'Escape') {
      // Allow escaping from reply mode
      if (replyingTo && !showThread) {
        setReplyingTo(null);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
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

      // Create message with file data
      const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
      const messageRef = push(messagesRef);
      
      if (!messageRef.key) throw new Error('Failed to generate message key');

      const messageData = {
        content: '',
        type: 'file',
        userId: user.uid,
        createdAt: Date.now(),
        fileData: {
          fileName: file.name,
          fileType: file.type,
          url
        },
        userProfile: {
          displayName: user.displayName,
          photoURL: user.photoURL,
        }
      };

      await set(messageRef, messageData);
      toast.success('File uploaded successfully', { id: toastId });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file', { id: toastId });
    } finally {
      setIsUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveReaction = async (messageId: string, reactionId: string) => {
    if (!user) return;
    try {
      await removeReaction(workspaceId, channelId, messageId, reactionId, user.uid);
      toast.success('Reaction removed');
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
    }
  };

  const handleReactionClick = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      // Find if the user has already used this emoji
      const existingReaction = message.reactions ? 
        Object.entries(message.reactions).find(
          ([_, r]) => r.emoji === emoji && r.users && r.users[user.uid]
        ) : null;

      if (existingReaction) {
        // Remove the reaction
        await removeReaction(workspaceId, channelId, messageId, existingReaction[0], user.uid);
        toast.success('Reaction removed');
      } else {
        // Add new reaction
        await addReaction(workspaceId, channelId, messageId, user.uid, emoji);
        toast.success('Reaction added');
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error('Failed to update reaction');
    }
    setShowReactionPicker(null);
  };

  // Add useEffect to handle clicking outside context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userContextMenu && !(e.target as Element).closest('.context-menu')) {
        setUserContextMenu(null);
      }
      if (emojiPickerPosition && !(e.target as Element).closest('.emoji-picker')) {
        setEmojiPickerPosition(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userContextMenu, emojiPickerPosition]);

  // Add click outside handler for both emoji pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowMessageEmojiPicker(false);
        setEmojiPickerPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMessageEmojiSelect = (emojiData: any) => {
    setMessageInput(prev => prev + emojiData.emoji);
    setShowMessageEmojiPicker(false);
  };

  const handleEmojiClick = (messageId: string, emojiData: { emoji: string }) => {
    handleReactionClick(messageId, emojiData.emoji);
    setEmojiPickerPosition(null);
  };

  // Add handler for create channel button
  const handleCreateChannel = () => {
    setShowCreateChannelModal(true);
  };

  const handleViewProfile = (userId: string) => {
    const member = members.find(m => m.id === userId);
    if (member) {
      setSelectedUser({
        id: member.id,
        name: member.name,
        avatar: member.avatar
      });
    }
    setUserContextMenu(null);
  };

  const handleNameClick = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setUserContextMenu({
      x: rect.left,
      y: rect.bottom + window.scrollY,
      userId
    });
  };

  // Add the DM handler separately
  const handleOpenDM = async (userId: string) => {
    if (!user) return;
    try {
      const dmChannelId = await getOrCreateDMChannel(workspaceId, user.uid, userId);
      router.push(`/workspace/${workspaceId}/channel/${dmChannelId}`);
    } catch (error) {
      console.error('Error opening DM:', error);
      toast.error('Failed to open direct message');
    }
    setUserContextMenu(null);
  };

  const handleReply = async () => {
    if (!user || !messageInput.trim() || !replyingTo) return;
    
    try {
      const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
      const newMessageRef = push(messagesRef);
      const messageId = newMessageRef.key;
      
      if (!messageId) {
        throw new Error('Failed to generate message ID');
      }

      // Get the parent message to check its current reply count
      const parentMessageRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages/${replyingTo.id}`);
      const parentSnapshot = await get(parentMessageRef);
      const parentMessage = parentSnapshot.val();
      const currentReplyCount = parentMessage?.replyCount || 0;

      // Create the reply message
      const replyMessage = {
        content: messageInput,
        userId: user.uid,
        createdAt: Date.now(),
        type: 'text',
        threadId: replyingTo.id, // Always use the parent message ID as threadId
        parentId: replyingTo.id,
        userProfile: {
          displayName: user.displayName,
          photoURL: user.photoURL,
          photoURLUpdatedAt: Date.now()
        }
      };

      // Update both the reply message and the parent message's reply count
      const updates: { [key: string]: any } = {
        [`workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`]: replyMessage,
        [`workspaces/${workspaceId}/channels/${channelId}/messages/${replyingTo.id}/replyCount`]: currentReplyCount + 1,
        [`workspaces/${workspaceId}/channels/${channelId}/messages/${replyingTo.id}/threadId`]: replyingTo.id
      };

      await update(ref(db), updates);

      setMessageInput('');
      // Only reset replyingTo if we're not in a thread view
      if (!showThread) {
        setReplyingTo(null);
      }
      scrollToBottom();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    }
  };

  // Add speech synthesis handler using OpenAI TTS
  const handleSpeak = async (messageId: string, text: string) => {
    if (!audioRef) return;

    if (isSpeaking === messageId) {
      // Stop speaking if already speaking this message
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsSpeaking(null);
      return;
    }

    try {
      // Stop any ongoing speech
      audioRef.pause();
      audioRef.currentTime = 0;

      // Get TTS audio from OpenAI
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Failed to generate speech');

      // Create blob URL from the audio data
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Update audio source and play
      audioRef.src = audioUrl;
      audioRef.onended = () => {
        setIsSpeaking(null);
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.onerror = () => {
        setIsSpeaking(null);
        URL.revokeObjectURL(audioUrl);
        toast.error('Failed to play audio');
      };

      setIsSpeaking(messageId);
      await audioRef.play();
    } catch (error) {
      console.error('Error playing TTS:', error);
      toast.error('Failed to generate speech');
      setIsSpeaking(null);
    }
  };

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = '';
      }
    };
  }, [audioRef]);

  // Update the handler for showing reaction picker
  const handleShowReactionPicker = (messageId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    const rect = event.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const pickerHeight = 400; // Approximate height of emoji picker
    const pickerWidth = 320; // Width of emoji picker

    // Calculate available space
    const spaceBelow = windowHeight - rect.bottom;
    const spaceRight = windowWidth - rect.left;

    // Calculate position
    let top = spaceBelow >= pickerHeight 
      ? rect.bottom + window.scrollY 
      : rect.top - pickerHeight + window.scrollY;
    
    let left = rect.left;

    // Adjust horizontal position if picker would go off-screen
    if (spaceRight < pickerWidth) {
      left = rect.right - pickerWidth;
    }

    // Ensure picker doesn't go above viewport
    if (top < 0) {
      top = window.scrollY + 10; // Add small padding from top
    }

    setEmojiPickerPosition({
      messageId,
      top,
      left,
      above: spaceBelow < pickerHeight
    });
  };

  // Add handler for starting a thread
  const handleStartThread = (message: Message) => {
    const threadId = message.threadId || message.id;
    setReplyingTo(message);
    setShowThread(threadId);
    setMessageInput(''); // Clear any existing input
  };

  // Add a new function for handling reply button clicks
  const handleReplyClick = (message: Message, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setReplyingTo(message);
    setMessageInput(''); // Clear any existing input
  };

  // Add handler for closing thread
  const handleCloseThread = () => {
    setShowThread(null);
    setReplyingTo(null);
    setMessageInput(''); // Clear any existing input
    setThreadMessages([]); // Clear thread messages
  };

  // Add cleanup effect for thread state
  useEffect(() => {
    return () => {
      // Clean up thread state when component unmounts
      setShowThread(null);
      setReplyingTo(null);
      setThreadMessages([]);
    };
  }, []);

  // Add effect to handle channel changes
  useEffect(() => {
    // Reset thread state when changing channels
    setShowThread(null);
    setReplyingTo(null);
    setThreadMessages([]);
    setMessageInput('');
  }, [channelId]);

  // Update useEffect for thread subscription
  useEffect(() => {
    if (!showThread || channel?.type === 'ai') return;

    const unsubscribe = subscribeToMessages(workspaceId, channelId, (dbMessages: DBMessage[]) => {
      // Filter messages that belong to this thread
      const threadMessages = dbMessages
        .filter((msg): msg is DBMessage & { id: string } => {
          // Only include direct replies to this thread, exclude the parent message
          return !!msg.id && msg.parentId === showThread && msg.threadId === showThread;
        })
        .map((msg): Message => {
          // Convert reactions to the correct format
          const reactions = msg.reactions ? 
            Object.entries(msg.reactions).reduce((acc, [reactionId, reaction]) => {
              acc[reactionId] = {
                emoji: reaction.emoji,
                users: {
                  [reaction.userId]: {
                    createdAt: reaction.createdAt
                  }
                }
              };
              return acc;
            }, {} as { [reactionId: string]: ReactionData }) 
            : undefined;

          return {
            ...msg,
            id: msg.id,
            type: msg.type || 'text',
            reactions
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt);

      setThreadMessages(threadMessages);
    });

    return () => {
      unsubscribe();
      setThreadMessages([]); // Clear thread messages when closing thread
    };
  }, [showThread, workspaceId, channelId, channel?.type]);

  // Add click outside handler for emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerPosition && !(event.target as Element).closest('.emoji-picker-wrapper')) {
        setEmojiPickerPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emojiPickerPosition]);

  if (loading || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-transparent border-[#5865F2] rounded-full animate-spin" />
      </div>
    );
  }

  if (!channel) {
    return null;
  }

  return (
    <div className="flex flex-1 h-screen overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81]">
      {/* Channel Sidebar */}
      <ChannelSidebar
        workspaceId={workspaceId}
        activeChannelId={channelId}
        onCreateChannel={handleCreateChannel}
        onViewProfile={(userId) => {
          const member = members.find(m => m.id === userId);
          if (member) {
            setSelectedUser({
              id: userId,
              name: member.name,
              avatar: member.avatar
            });
          }
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="h-12 min-h-[48px] px-4 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
              {channel?.type === 'ai' ? (
                <Bot className="w-3.5 h-3.5 text-white" />
              ) : channel?.type === 'dm' ? (
                <User className="w-3.5 h-3.5 text-white" />
              ) : (
                <Hash className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <span className="font-medium text-white text-sm">
              {channel?.name || 'AI Assistant'}
            </span>
            {channel?.type === 'ai' && (
              <>
                <div className="h-3 w-[1px] bg-white/20 mx-1" />
                <p className="text-xs text-white/60 truncate max-w-md">
                  Your personal AI assistant powered by OpenAI
                </p>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {channel?.type === 'ai' && (
              <button 
                onClick={() => setShowAIPreferences(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >
                <Settings className="w-4 h-4 text-white/60 hover:text-white/80" />
              </button>
            )}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
              <Bell className="w-4 h-4 text-white/60 hover:text-white/80" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Messages Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
              <div className="py-4">
                {messages.map((message) => {
                  const isAI = message.userId === 'ai-assistant';
                  const member = members.find(m => m.id === message.userId);
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group flex items-start gap-3 px-4 py-2 hover:bg-white/5 relative ${isAI ? 'bg-white/5' : ''}`}
                    >
                      {/* User/AI Avatar */}
                      <div className="relative">
                        {isAI ? (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10B981] to-[#3B82F6] flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        ) : message.userProfile?.photoURL ? (
                          <Image
                            src={message.userProfile.photoURL}
                            alt={message.userProfile.displayName || 'User'}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-medium">
                            {(message.userProfile?.displayName?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline space-x-2">
                            <button
                              onClick={(e) => handleNameClick(e, message.userId)}
                              className="font-medium text-white hover:underline"
                            >
                              {isAI ? 'AI Assistant' : message.userProfile?.displayName || 'Unknown User'}
                            </button>
                            <span className="text-xs text-white/40">
                              {formatDistanceToNow(new Date(message.timestamp || message.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          {!isAI && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                              <button
                                onClick={(e) => handleShowReactionPicker(message.id, e)}
                                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                              >
                                <Smile className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleReplyClick(message, e)}
                                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                              >
                                <Reply className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        {message.type === 'typing' ? (
                          <div className="flex items-center space-x-2 text-white/60">
                            <div className="flex space-x-1">
                              <motion.div
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.4, repeat: Infinity }}
                                className="w-2 h-2 bg-white/60 rounded-full"
                              />
                              <motion.div
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                                className="w-2 h-2 bg-white/60 rounded-full"
                              />
                              <motion.div
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                                className="w-2 h-2 bg-white/60 rounded-full"
                              />
                            </div>
                            <span className="text-sm">AI is typing...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              {message.type === 'file' && message.fileData ? (
                                <div className="flex flex-col gap-2">
                                  <a 
                                    href={message.fileData.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group max-w-md"
                                  >
                                    <Paperclip className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                                    <span className="text-white/80 group-hover:text-white truncate">
                                      {message.fileData.fileName}
                                    </span>
                                  </a>
                                  {message.fileData.fileType.startsWith('image/') && (
                                    <div className="relative max-w-md rounded-lg overflow-hidden">
                                      <Image
                                        src={message.fileData.url}
                                        alt={message.fileData.fileName}
                                        width={400}
                                        height={300}
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-white/80 whitespace-pre-wrap flex-1">{message.content}</p>
                              )}
                              {isAI && (
                                <button
                                  onClick={() => handleSpeak(message.id, message.content)}
                                  className={`text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                                    isSpeaking === message.id ? 'text-purple-400 hover:text-purple-300' : ''
                                  }`}
                                >
                                  {isSpeaking === message.id ? (
                                    <Square className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                            
                            {/* Reactions */}
                            {message.reactions && Object.entries(message.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(message.reactions).map(([reactionId, reaction]) => {
                                  const hasReacted = reaction.users && user?.uid && reaction.users[user.uid];
                                  return (
                                    <div key={reactionId} className="relative group/tooltip">
                                      <button
                                        onClick={() => handleReactionClick(message.id, reaction.emoji)}
                                        className={`px-2 py-0.5 rounded-full text-sm flex items-center gap-1 transition-colors ${
                                          hasReacted
                                            ? 'bg-purple-500/30 text-purple-200 hover:bg-purple-500/40'
                                            : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                                        }`}
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span>{Object.keys(reaction.users || {}).length}</span>
                                      </button>
                                      <div className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity">
                                        <ReactionTooltip reaction={reaction} messages={messages} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Reply count */}
                            {(message.replyCount ?? 0) > 0 && !showThread && (
                              <button
                                onClick={() => handleStartThread(message)}
                                className="mt-1 text-sm text-white/60 hover:text-white flex items-center gap-1"
                              >
                                <MessageSquare className="w-4 h-4" />
                                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-gradient-to-t from-[#0F172A] to-transparent">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                {replyingTo && !showThread && (
                  <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Reply className="w-4 h-4" />
                      <span>
                        Replying to{' '}
                        <span className="text-white">
                          {replyingTo.userProfile?.displayName || 'Unknown User'}
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-white/40 hover:text-white p-1 rounded hover:bg-white/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="px-4 py-2 flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder={
                        replyingTo
                          ? "Write a reply..."
                          : channel?.type === 'ai'
                          ? "Ask me anything..."
                          : `Message #${channel?.name || 'general'}`
                      }
                      className="w-full bg-transparent text-white placeholder-white/40 outline-none resize-none py-1 text-sm min-h-[20px] max-h-[200px]"
                      rows={1}
                      disabled={isAILoading}
                    />
                    <div className="absolute right-0 bottom-0 flex items-center space-x-1 py-0.5">
                      {!isAILoading && (
                        <>
                          <button
                            onClick={() => setShowMessageEmojiPicker(true)}
                            className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                          >
                            <Smile className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                            disabled={isUploading}
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={replyingTo ? handleReply : handleSendMessage}
                        disabled={!messageInput.trim() || isAILoading || isUploading}
                        className="text-white/60 hover:text-white disabled:opacity-30 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
            </div>
          </div>

          {/* Thread Sidebar */}
          {showThread && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="w-[300px] border-l border-white/10 bg-white/5 backdrop-blur-lg flex flex-col"
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">Thread</h3>
                  <button
                    onClick={handleCloseThread}
                    className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Original Message */}
                {messages.find(m => m.id === showThread) && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-start gap-2">
                      {(() => {
                        const originalMessage = messages.find(m => m.id === showThread);
                        return originalMessage?.userProfile?.photoURL ? (
                          <Image
                            src={originalMessage.userProfile.photoURL}
                            alt={originalMessage.userProfile.displayName || 'User'}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-medium">
                            {(originalMessage?.userProfile?.displayName?.[0] || 'U').toUpperCase()}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-medium">
                            {messages.find(m => m.id === showThread)?.userProfile?.displayName || 'Unknown User'}
                          </span>
                          <span className="text-xs text-white/40">
                            {formatDistanceToNow(messages.find(m => m.id === showThread)?.createdAt || 0, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-white/80 mt-1">
                          {messages.find(m => m.id === showThread)?.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {threadMessages.map(reply => (
                  <div key={reply.id} className="mb-4 flex items-start gap-2">
                    {reply.userProfile?.photoURL ? (
                      <Image
                        src={reply.userProfile.photoURL}
                        alt={reply.userProfile.displayName || 'User'}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {(reply.userProfile?.displayName?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-white text-sm font-medium">{reply.userProfile?.displayName || 'Unknown User'}</span>
                        <span className="text-xs text-white/40">
                          {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm mt-1">{reply.content}</p>
                      
                      {/* Add reactions to thread replies */}
                      {reply.reactions && Object.entries(reply.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(reply.reactions).map(([reactionId, reaction]) => {
                            const hasReacted = reaction.users && user?.uid && reaction.users[user.uid];
                            return (
                              <div key={reactionId} className="relative group/tooltip">
                                <button
                                  onClick={() => handleReactionClick(reply.id, reaction.emoji)}
                                  className={`px-2 py-0.5 rounded-full text-sm flex items-center gap-1 transition-colors ${
                                    hasReacted
                                      ? 'bg-purple-500/30 text-purple-200 hover:bg-purple-500/40'
                                      : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{Object.keys(reaction.users || {}).length}</span>
                                </button>
                                <div className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity">
                                  <ReactionTooltip reaction={reaction} messages={messages} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-white/10">
                <div className="bg-white/5 rounded-lg border border-white/10">
                  <div className="px-3 py-2">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Reply to thread..."
                      className="w-full bg-transparent text-white placeholder-white/40 outline-none resize-none py-1 text-sm min-h-[20px] max-h-[200px]"
                      rows={1}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* User Profile Slide-over */}
      {selectedUser && (
        <UserProfileSlideOver
          userId={selectedUser.id}
          userName={selectedUser.name}
          userAvatar={selectedUser.avatar}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Message Input Emoji Picker */}
      {showMessageEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-full right-0 mb-2 z-50"
        >
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={handleMessageEmojiSelect}
            width={320}
            height={400}
          />
        </div>
      )}

      {/* Reaction Emoji Picker */}
      {emojiPickerPosition && (
        <div
          className="fixed z-50 emoji-picker-wrapper"
          style={{
            top: emojiPickerPosition.top,
            left: emojiPickerPosition.left
          }}
        >
          <div ref={emojiPickerRef}>
            <EmojiPicker
              theme={Theme.DARK}
              onEmojiClick={(emoji) => handleEmojiClick(emojiPickerPosition.messageId, emoji)}
              width={320}
              height={400}
            />
          </div>
        </div>
      )}

      {/* User Context Menu */}
      {userContextMenu && (
        <div
          className="fixed z-50 context-menu"
          style={{ top: userContextMenu.y, left: userContextMenu.x }}
        >
          <div className="bg-[#1F2937] border border-white/10 rounded-lg shadow-lg py-1 min-w-[160px]">
            <button
              onClick={() => handleViewProfile(userContextMenu.userId)}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              View Profile
            </button>
            <button
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                if (userContextMenu) {
                  handleOpenDM(userContextMenu.userId);
                }
              }}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Send Message
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateChannelModal && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateChannelModal(false)}
        />
      )}

      {/* AI Preferences Modal */}
      <AIPreferencesModal
        isOpen={showAIPreferences}
        onClose={() => setShowAIPreferences(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
} 