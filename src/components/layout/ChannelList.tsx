'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ref, push, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

interface ChannelListProps {
  workspaceId: string;
  onSelectChannel: (channelId: string, channelName: string) => void;
  channels: Array<{ id: string; name: string }>;
}

export default function ChannelList({ workspaceId, onSelectChannel, channels }: ChannelListProps) {
  const { user } = useAuth();
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !user) return;

    try {
      const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
      await push(channelsRef, {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      setNewChannelName('');
      setIsAddingChannel(false);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  return (
    <div className="space-y-2 px-2">
      <div className="flex items-center justify-between px-2 text-[#949BA4]">
        <span className="text-xs font-semibold uppercase">Channels</span>
        <button
          onClick={() => setIsAddingChannel(true)}
          className="hover:text-white p-1 rounded"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isAddingChannel && (
        <form onSubmit={handleAddChannel} className="px-2">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="New channel name"
            className="w-full px-2 py-1 text-sm bg-[#383A40] text-white rounded"
            autoFocus
            onBlur={() => setIsAddingChannel(false)}
          />
        </form>
      )}

      <div className="space-y-1">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onSelectChannel(channel.id, channel.name)}
            className="w-full text-left px-2 py-1 text-[#949BA4] hover:bg-[#404249] rounded"
          >
            # {channel.name}
          </button>
        ))}
      </div>
    </div>
  );
} 