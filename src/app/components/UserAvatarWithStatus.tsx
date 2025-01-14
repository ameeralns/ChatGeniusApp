'use client';

import { useUserData } from '@/lib/hooks/useUserData';
import { UserStatusBubble } from './UserStatusBubble';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

type UserAvatarWithStatusProps = {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
};

const statusSizeClasses = {
  sm: 'h-3 w-3 -bottom-0.5 -right-0.5',
  md: 'h-3.5 w-3.5 -bottom-1 -right-1',
  lg: 'h-4 w-4 -bottom-1 -right-1'
};

export function UserAvatarWithStatus({ 
  userId, 
  size = 'md',
  showStatus = true,
  className
}: UserAvatarWithStatusProps) {
  const { displayName, photoURL, loading } = useUserData(userId);

  if (loading) {
    return (
      <div className="relative inline-block">
        <Skeleton className={cn(
          'rounded-full',
          sizeClasses[size],
          className
        )} />
        {showStatus && (
          <Skeleton className={cn(
            'absolute rounded-full',
            statusSizeClasses[size]
          )} />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div className={cn(
        'relative rounded-full overflow-hidden bg-[#313338]',
        sizeClasses[size],
        className
      )}>
        {photoURL ? (
          <Image
            src={photoURL}
            alt={displayName || 'User avatar'}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            {displayName?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>
      {showStatus && (
        <UserStatusBubble 
          userId={userId} 
          className={statusSizeClasses[size]}
        />
      )}
    </div>
  );
} 