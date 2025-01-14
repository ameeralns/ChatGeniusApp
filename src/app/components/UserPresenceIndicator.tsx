import { UserPresence } from '@/lib/firebase/presenceUtils';
import { cn } from '@/lib/utils';

type UserPresenceIndicatorProps = {
  presence: UserPresence | null;
  showLabel?: boolean;
  className?: string;
};

export function UserPresenceIndicator({ 
  presence, 
  showLabel = false,
  className 
}: UserPresenceIndicatorProps) {
  if (!presence) return null;

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500'
  };

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    away: 'Away'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span 
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          statusColors[presence.status]
        )} 
      />
      {showLabel && (
        <span className="text-sm text-gray-600">
          {statusLabels[presence.status]}
        </span>
      )}
    </div>
  );
} 