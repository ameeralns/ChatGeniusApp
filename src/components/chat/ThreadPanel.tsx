import { UserAvatarWithStatus } from '@/app/components/UserAvatarWithStatus';
import { FileText, Download, Smile } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useUserData } from '@/lib/hooks/useUserData';
import { addReaction, removeReaction, replyToThread, subscribeToThread } from '@/lib/firebase/database';
import type { Message } from '@/lib/firebase/database';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '@/lib/hooks/useAuth';
import FileUpload from '@/app/components/FileUpload';

interface ThreadPanelProps {
  parentMessage: Message;
  workspaceId: string;
  channelId: string;
  onClose: () => void;
}

export function ThreadPanel({ parentMessage, workspaceId, channelId, onClose }: ThreadPanelProps) {
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user } = useAuth();

  // Subscribe to thread messages
  useEffect(() => {
    if (parentMessage.threadId) {
      const unsubscribe = subscribeToThread(workspaceId, channelId, parentMessage.threadId, (messages) => {
        setThreadMessages(messages);
      });
      return () => unsubscribe();
    }
  }, [parentMessage.threadId, workspaceId, channelId]);

  const handleReactionClick = async (messageId: string | null, emoji: string) => {
    if (!messageId || !user) return;
    
    try {
      const message = threadMessages.find(m => m.id === messageId);
      const existingReaction = message?.reactions && Object.entries(message.reactions).find(
        ([_, reaction]) => reaction.emoji === emoji && reaction.userId === user.uid
      );

      if (existingReaction) {
        await removeReaction(workspaceId, channelId, messageId, existingReaction[0], user.uid);
      } else {
        await addReaction(workspaceId, channelId, messageId, user.uid, emoji);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error('Failed to update reaction');
    }
  };

  const handleFileUpload = async (fileData: { fileName: string; fileKey: string; fileType: string }) => {
    if (!user || !parentMessage.threadId) return;
    
    try {
      setIsSubmitting(true);
      await replyToThread(
        workspaceId,
        channelId,
        parentMessage.threadId,
        parentMessage.id!,
        '', // Empty content for file messages
        user.uid,
        fileData
      );
    } catch (error) {
      console.error('Error sending file in thread:', error);
      toast.error('Failed to send file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyContent.trim() || !parentMessage.threadId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await replyToThread(
        workspaceId,
        channelId,
        parentMessage.threadId,
        parentMessage.id!,
        replyContent,
        user.uid
      );
      setReplyContent('');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-800 shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Thread</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          Close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {/* Parent Message */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-start gap-3">
            <UserAvatarWithStatus 
              userId={parentMessage.userId}
              size="sm"
              className="!h-8 !w-8"
            />
            <div>
              <div className="text-sm text-gray-400">
                {parentMessage.userProfile?.displayName || 'User'}
              </div>
              <div className="mt-1 text-white">
                {parentMessage.content}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(parentMessage.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Thread Messages */}
        <div className="p-4 space-y-4">
          {threadMessages.map((message) => (
            <div 
              key={message.id} 
              className={`flex items-start gap-3 ${message.userId === user?.uid ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <UserAvatarWithStatus 
                userId={message.userId}
                size="sm"
                className="!h-8 !w-8"
              />
              <div className={`flex flex-col ${message.userId === user?.uid ? 'items-end' : 'items-start'}`}>
                <span className="text-sm text-gray-400">
                  {message.userProfile?.displayName || 'User'}
                </span>
                <div className={`mt-1 rounded-lg px-4 py-2 ${
                  message.userId === user?.uid
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  {message.type === 'file' && message.fileData ? (
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-white/80" />
                      <div>
                        <p className="text-sm font-medium">{message.fileData.fileName}</p>
                        <button className="text-xs text-white/80 hover:text-white mt-1 flex items-center gap-1">
                          <Download className="w-4 h-4" /> Download
                        </button>
                      </div>
                    </div>
                  ) : (
                    message.content
                  )}
                  <div className="text-xs text-gray-300 mt-1">
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Message Reactions */}
                <div className="flex items-center gap-1 mt-1">
                  {message.reactions && Object.entries(message.reactions).map(([reactionId, reaction]) => (
                    <button
                      key={reactionId}
                      onClick={() => handleReactionClick(message.id, reaction.emoji)}
                      className={`px-2 py-1 rounded-full text-xs ${
                        reaction.userId === user?.uid
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 rounded-full hover:bg-gray-700 text-gray-400"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute mt-8">
                      <EmojiPicker
                        onEmojiClick={(emojiData) => {
                          handleReactionClick(message.id, emojiData.emoji);
                          setShowEmojiPicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t border-gray-700">
        <FileUpload onUpload={handleFileUpload} />
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Reply in thread..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2"
            disabled={isSubmitting}
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            disabled={!replyContent.trim() || isSubmitting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Reply'}
          </button>
        </form>
      </div>
    </div>
  );
} 