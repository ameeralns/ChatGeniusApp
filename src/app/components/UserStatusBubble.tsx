'use client';

import { usePresence } from '@/lib/hooks/usePresence';
import { cn } from '@/lib/utils';

type UserStatusBubbleProps = {
  userId: string;
  className?: string;
};

export function UserStatusBubble({ userId, className }: UserStatusBubbleProps) {
  const { allPresence } = usePresence();
  const presence = allPresence[userId];

  if (!presence) return null;

  const statusMessages = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline'
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400'
  };

  return (
    <div 
      className={cn(
        'absolute -bottom-1 -right-1 group z-10',
        className
      )}
    >
      <div className={cn(
        'h-3.5 w-3.5 rounded-full border-2 border-[#1E1F22]',
        statusColors[presence.status]
      )}>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-50">
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
            {statusMessages[presence.status]}
          </div>
        </div>
      </div>
    </div>
  );
} 