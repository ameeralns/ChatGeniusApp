'use client';

import { useState } from 'react';
import { usePresence } from '@/lib/hooks/usePresence';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const statusOptions = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'away', label: 'Away', color: 'bg-yellow-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-400' },
] as const;

export function UserStatusSelector() {
  const { updateStatus, currentUserPresence } = usePresence();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!currentUserPresence) return null;

  const handleStatusUpdate = async (status: 'online' | 'away' | 'offline') => {
    try {
      setIsUpdating(true);
      await updateStatus(status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <h3 className="text-sm font-medium text-gray-400 px-2">Set Status</h3>
      <div className="space-y-1">
        {statusOptions.map((option) => {
          const isSelected = currentUserPresence.status === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleStatusUpdate(option.value)}
              disabled={isUpdating}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                isSelected
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
                isUpdating && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full', option.color)} />
              <span className="flex-1 text-left">{option.label}</span>
              {isUpdating && isSelected && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
} 