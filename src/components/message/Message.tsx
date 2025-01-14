import { useState, useEffect } from 'react';
import { getUserProfileFromWorkspace } from '@/lib/firebase/database';
import { Avatar } from '@/components/ui/avatar';

interface MessageProps {
  message: {
    id: string;
    content: string;
    userId: string;
    createdAt: number;
    type?: 'text' | 'file';
    fileData?: {
      fileName: string;
      fileKey: string;
      fileType: string;
      url: string;
    };
  };
  workspaceId: string;
}

export const Message = ({ message, workspaceId }: MessageProps) => {
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getUserProfileFromWorkspace(workspaceId, message.userId);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [message.userId, workspaceId]);

  if (!userProfile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-start space-x-3 p-2 hover:bg-gray-50/5">
      <Avatar
        src={userProfile.photoURL}
        alt={userProfile.displayName || 'User'}
        className="h-10 w-10"
      />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{userProfile.displayName}</span>
          <span className="text-xs text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm text-gray-300">{message.content}</p>
        {message.type === 'file' && message.fileData && (
          <div className="mt-2">
            <a
              href={message.fileData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {message.fileData.fileName}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}; 