import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/firebase';
import { ref, onValue, off } from 'firebase/database';
import { UserAvatarWithStatus } from './UserAvatarWithStatus';

interface UserPresence {
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
}

export default function OnlineUsersList() {
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; status: string }[]>([]);

  useEffect(() => {
    const presenceRef = ref(db, 'userPresence/v1');

    const handlePresenceChange = (snapshot: any) => {
      const presenceData = snapshot.val();
      if (!presenceData) return;

      const users = Object.entries(presenceData)
        .filter(([_, presence]: [string, any]) => presence.status === 'online')
        .map(([userId, presence]: [string, any]) => ({
          id: userId,
          status: presence.status
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      setOnlineUsers(users);
    };

    onValue(presenceRef, handlePresenceChange);

    return () => {
      off(presenceRef);
    };
  }, []);

  if (onlineUsers.length === 0) {
    return (
      <div className="p-4 text-white/60 text-sm">
        No users online
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-white/80 text-sm font-medium mb-3">Online Users</h3>
      {onlineUsers.map((user) => (
        <div key={user.id} className="flex items-center gap-3 text-white/80 hover:bg-white/5 p-2 rounded-lg">
          <UserAvatarWithStatus
            userId={user.id}
            size="sm"
            showStatus
          />
        </div>
      ))}
    </div>
  );
} 