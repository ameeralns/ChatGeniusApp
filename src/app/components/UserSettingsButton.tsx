'use client';

import { Settings } from 'lucide-react';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { cn } from '@/lib/utils';

type UserSettingsButtonProps = {
  className?: string;
};

export function UserSettingsButton({ className }: UserSettingsButtonProps) {
  const { openSettings } = useSettings();

  return (
    <button
      onClick={openSettings}
      className={cn(
        'p-2 rounded-full hover:bg-gray-100 transition-colors',
        className
      )}
      aria-label="Open Settings"
    >
      <Settings className="h-5 w-5 text-gray-600" />
    </button>
  );
} 