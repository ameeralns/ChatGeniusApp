'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { UserAvatar } from './UserAvatar';
import { UserStatusSelector } from './UserStatusSelector';
import { usePresence } from '@/lib/hooks/usePresence';
import { X, Settings, User, Bell, Shield, Moon, Volume2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type UserSettingsSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function UserSettingsSidebar({ isOpen, onClose }: UserSettingsSidebarProps) {
  const { user, signOut } = useAuth();
  const { currentUserPresence } = usePresence();

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 right-0 w-80 bg-[#0A0F1C]/90 backdrop-blur-2xl border-l border-white/5 shadow-[0_0_50px_-12px] shadow-indigo-500/30"
            onClick={e => e.stopPropagation()}
          >
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
              <div className="absolute -inset-[500px] opacity-20">
                <div className="absolute inset-0 rotate-45 bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 blur-3xl animate-pulse" />
              </div>
              <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
              <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
            </div>

            <div className="relative h-full flex flex-col">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-xl opacity-50 animate-pulse" />
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 relative">
                        <div className="w-full h-full rounded-[10px] bg-[#0A0F1C] flex items-center justify-center">
                          <Settings className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                    <h2 className="text-xl font-medium bg-gradient-to-br from-white via-white to-indigo-200 bg-clip-text text-transparent">
                      User Settings
                    </h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="text-white/60 hover:text-white transition-colors relative group"
                  >
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    <X className="w-5 h-5 relative z-10" />
                  </motion.button>
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-4 relative">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full animate-pulse opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full animate-ping opacity-10" />
                    <UserAvatar 
                      userId={user.uid} 
                      size="lg" 
                      className="relative z-10 ring-2 ring-white/10 ring-offset-4 ring-offset-[#0A0F1C] transition-all duration-300 group-hover:ring-white/20 group-hover:ring-offset-8" 
                    />
                  </div>
                  <div>
                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="font-medium bg-gradient-to-r from-white via-white to-indigo-200 bg-clip-text text-transparent"
                    >
                      {currentUserPresence?.displayName || user.displayName || 'Anonymous'}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-white/40"
                    >
                      {user.email}
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent px-6">
                {/* Status Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <h4 className="text-sm font-medium text-white/40 mb-3 uppercase tracking-wider">Status</h4>
                  <UserStatusSelector />
                </motion.div>

                {/* Settings Sections */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-8"
                >
                  {/* Account Settings */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Account Settings</h4>
                    {[
                      { icon: User, label: 'My Account' },
                      { icon: Bell, label: 'Notifications' },
                      { icon: Shield, label: 'Privacy & Safety' },
                    ].map((item, index) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                        className="w-full flex items-center gap-3 p-3 text-white/60 hover:text-white rounded-xl transition-all duration-300 group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:via-indigo-500/5 transition-all duration-500" />
                        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 p-0.5 group-hover:from-indigo-500 group-hover:to-purple-600 transition-all duration-300">
                          <div className="w-full h-full rounded-[10px] bg-[#0A0F1C] flex items-center justify-center group-hover:bg-transparent transition-colors duration-300">
                            <item.icon className="w-4 h-4 text-white/70 group-hover:text-white transition-colors duration-300" />
                          </div>
                        </div>
                        <span className="text-sm relative z-10">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* App Settings */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">App Settings</h4>
                    {[
                      { icon: Moon, label: 'Appearance' },
                      { icon: Volume2, label: 'Audio & Video' },
                    ].map((item, index) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                        className="w-full flex items-center gap-3 p-3 text-white/60 hover:text-white rounded-xl transition-all duration-300 group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:via-indigo-500/5 transition-all duration-500" />
                        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 p-0.5 group-hover:from-indigo-500 group-hover:to-purple-600 transition-all duration-300">
                          <div className="w-full h-full rounded-[10px] bg-[#0A0F1C] flex items-center justify-center group-hover:bg-transparent transition-colors duration-300">
                            <item.icon className="w-4 h-4 text-white/70 group-hover:text-white transition-colors duration-300" />
                          </div>
                        </div>
                        <span className="text-sm relative z-10">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Sign Out Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="p-6 border-t border-white/5"
              >
                <motion.button
                  whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
                  onClick={signOut}
                  className="w-full flex items-center gap-3 p-3 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 group-hover:via-red-500/5 transition-all duration-500" />
                  <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 p-0.5 group-hover:from-red-500 group-hover:to-red-600 transition-all duration-300">
                    <div className="w-full h-full rounded-[10px] bg-[#0A0F1C] flex items-center justify-center group-hover:bg-transparent transition-colors duration-300">
                      <LogOut className="w-4 h-4 text-red-400/70 group-hover:text-red-300 transition-colors duration-300" />
                    </div>
                  </div>
                  <span className="text-sm relative z-10">Sign Out</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 