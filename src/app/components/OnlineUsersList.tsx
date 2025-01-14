import { usePresence } from '@/lib/hooks/usePresence';
import { UserAvatar } from './UserAvatar';

export function OnlineUsersList() {
  const { allPresence } = usePresence();

  const onlineUsers = Object.entries(allPresence)
    .filter(([_, presence]) => presence.status === 'online')
    .sort((a, b) => {
      const nameA = a[1].displayName || '';
      const nameB = b[1].displayName || '';
      return nameA.localeCompare(nameB);
    });

  if (onlineUsers.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4">
        No users online
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        Online Users ({onlineUsers.length})
      </h3>
      {onlineUsers.map(([userId, presence]) => (
        <div key={userId} className="flex items-center gap-3">
          <UserAvatar userId={userId} size="sm" />
          <span className="text-sm">
            {presence.displayName || 'Anonymous'}
          </span>
        </div>
      ))}
    </div>
  );
} 