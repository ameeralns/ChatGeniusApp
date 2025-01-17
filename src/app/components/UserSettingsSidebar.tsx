'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { UserAvatarWithStatus } from './UserAvatarWithStatus';
import { UserStatusSelector } from './UserStatusSelector';
import { usePresence } from '@/lib/hooks/usePresence';
import { X, Settings, User, Bell, Shield, Moon, Volume2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type UserSettingsSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const UserSettingsSidebar = ({ isOpen, onClose }: UserSettingsSidebarProps) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-y-0 right-0 w-80 bg-[#1E1F22]/90 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50"
        >
          {/* Header */}
          <div className="h-16 border-b border-[#ffffff1a] bg-gradient-to-r from-[#2B2D31]/50 to-[#1E1F22]/50 px-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              User Settings
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors duration-200"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* User Profile Section */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <UserAvatarWithStatus
                  userId={user?.uid || ''}
                  size="lg"
                  className="ring-2 ring-white/10 ring-offset-4 ring-offset-[#1E1F22]"
                />
                <div className="flex-1 min-w-0">
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium bg-gradient-to-r from-white via-white to-indigo-200 bg-clip-text text-transparent"
                  >
                    {user?.displayName || 'Anonymous'}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-white/60 mt-1"
                  >
                    {user?.email}
                  </motion.p>
                  <div className="mt-3">
                    <UserStatusSelector />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Sections */}
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 rounded-lg transition-colors">
                <User className="w-5 h-5" />
                <span>Profile</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 rounded-lg transition-colors">
                <Shield className="w-5 h-5" />
                <span>Privacy</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 rounded-lg transition-colors">
                <Moon className="w-5 h-5" />
                <span>Appearance</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 rounded-lg transition-colors">
                <Volume2 className="w-5 h-5" />
                <span>Sound & Video</span>
              </button>
            </div>

            {/* Sign Out Button */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 