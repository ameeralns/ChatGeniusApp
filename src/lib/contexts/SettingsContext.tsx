'use client';

import { createContext, useContext, useState } from 'react';
import { UserSettingsSidebar } from '@/app/components/UserSettingsSidebar';

type SettingsContextType = {
  openSettings: () => void;
  closeSettings: () => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const openSettings = () => setIsOpen(true);
  const closeSettings = () => setIsOpen(false);

  return (
    <SettingsContext.Provider value={{ openSettings, closeSettings }}>
      {children}
      <UserSettingsSidebar isOpen={isOpen} onClose={closeSettings} />
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 