import { useState } from 'react';
import { FileText, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import FileViewer from '@/app/components/FileViewer';
import { useAuth } from '@/lib/hooks/useAuth';
import { Avatar } from '@/components/ui/avatar';

interface MessageBubbleProps {
  message: {
    id: string | null;
    content: string;
    userId: string;
    createdAt: number;
    userProfile: {
      displayName: string | null;
      photoURL: string | null;
      photoURLUpdatedAt?: number;
    };
    type?: 'text' | 'file';
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
  };
  isCurrentUser: boolean;
  workspaceId: string;
  channelId: string;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user } = useAuth();

  const handleReactionClick = (emoji: string) => {
    // Handle reaction click
  };

  return (
    <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 mb-4`}>
      <Avatar 
        src={message.userProfile.photoURL} 
        alt={message.userProfile.displayName || 'User'} 
        size={32}
      />
      <div className="flex flex-col">
        <span className="text-sm text-gray-400 mb-1">
          {message.userProfile.displayName || 'Anonymous'}
        </span>
        <div
          className={`max-w-[70%] rounded-lg px-4 py-2 ${
            isCurrentUser
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-100'
          }`}
        >
          {message.type === 'file' && message.fileData ? (
            <div className="flex flex-col gap-2">
              <FileViewer
                fileKey={message.fileData.fileKey}
                fileType={message.fileData.fileType}
                fileName={message.fileData.fileName}
                url={message.fileData.url}
              />
              <p className="text-xs text-gray-300">{message.fileData.fileType}</p>
            </div>
          ) : (
            <div>{message.content}</div>
          )}
          <div className="text-xs text-gray-300 mt-1">
            {new Date(message.createdAt).toLocaleTimeString()}
          </div>
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1">
            {message.reactions && Object.entries(message.reactions).map(([reactionId, reaction]: [string, any]) => (
              <button
                key={reactionId}
                onClick={() => handleReactionClick(reaction.emoji)}
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
                    handleReactionClick(emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 