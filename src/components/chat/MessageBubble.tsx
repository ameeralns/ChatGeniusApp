import React from 'react';
import { format } from 'date-fns';
import { FileIcon, Download } from 'lucide-react';
import { UserAvatar } from '@/app/components/UserAvatar';

interface MessageBubbleProps {
  message: {
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
  };
  isCurrentUser: boolean;
  workspaceId: string;
  channelId: string;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const messageTime = format(new Date(message.createdAt), 'h:mm a');
  const displayName = message.userProfile.displayName || 'Unknown User';

  const renderFilePreview = () => {
    if (!message.fileData) return null;

    const { fileName, fileType, url } = message.fileData;
    const isImage = fileType.startsWith('image/');

    return (
      <div className="mt-2">
        {isImage ? (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block"
          >
            <img 
              src={url} 
              alt={fileName} 
              className="max-w-xs rounded-lg shadow-md hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <a
            href={url}
            download={fileName}
            className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <FileIcon className="w-6 h-6 text-purple-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {fileName}
              </p>
              <p className="text-xs text-gray-400">
                {fileType}
              </p>
            </div>
            <Download className="w-5 h-5 text-gray-400" />
          </a>
        )}
      </div>
    );
  };

  return (
    <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
      <UserAvatar
        userId={message.userId}
        size="sm"
        showPresence={false}
      />
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-300">
            {displayName}
          </span>
          <span className="text-xs text-gray-500">
            {messageTime}
          </span>
        </div>
        <div
          className={`
            max-w-lg rounded-lg p-3
            ${isCurrentUser 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-100'
            }
          `}
        >
          {message.type === 'text' && (
            <p className="whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          {message.type === 'file' && renderFilePreview()}
        </div>
      </div>
    </div>
  );
} 