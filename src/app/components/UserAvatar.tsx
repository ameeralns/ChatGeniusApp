import { usePresence } from '@/lib/hooks/usePresence';
import { UserPresenceIndicator } from './UserPresenceIndicator';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type UserAvatarProps = {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showPresence?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
};

export function UserAvatar({ 
  userId, 
  size = 'md',
  showPresence = true,
  className 
}: UserAvatarProps) {
  const { allPresence } = usePresence();
  const presence = allPresence[userId];

  return (
    <div className="relative inline-block">
      <div className={cn(
        'relative rounded-full overflow-hidden bg-gray-200',
        sizeClasses[size],
        className
      )}>
        {presence?.photoURL ? (
          <Image
            src={presence.photoURL}
            alt={presence.displayName || 'User avatar'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            {presence?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>
      {showPresence && (
        <div className="absolute -bottom-1 -right-1">
          <UserPresenceIndicator presence={presence} />
        </div>
      )}
    </div>
  );
} 