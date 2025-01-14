'use client';

import { X, User, Shield, Clock, Mail, Hash, Edit2, Check } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePresence } from '@/lib/hooks/usePresence';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/firebase';
import { ref, get, set } from 'firebase/database';
import { UserAvatarWithStatus } from '@/app/components/UserAvatarWithStatus';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface UserProfileSlideOverProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileSlideOver({
  userId,
  userName,
  userAvatar,
  isOpen,
  onClose
}: UserProfileSlideOverProps) {
  const { user, signOut } = useAuth();
  const { allPresence } = usePresence();
  const isCurrentUser = user?.uid === userId;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userName);
  const [bio, setBio] = useState('');
  const userPresence = allPresence[userId];

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        const userRef = ref(db, `users/${userId}/email`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          setUserEmail(snapshot.val());
        } else if (isCurrentUser && user?.email) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchUserEmail();
    }
  }, [userId, isOpen, isCurrentUser, user?.email]);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setBio(userData.bio || '');
          setEditedName(userData.displayName || userName);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading user profile:', error);
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [userId, userName]);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      const userRef = ref(db, `users/${userId}`);
      await set(userRef, {
        displayName: editedName,
        photoURL: userAvatar,
        // preserve other user data
        uid: userId,
      });
      
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (!isOpen) return null;

  // Get status display information
  const getStatusDisplay = () => {
    if (!userPresence) return { color: 'text-gray-400', text: 'Offline' };
    
    switch (userPresence.status) {
      case 'online':
        return { color: 'text-green-400', text: 'Online' };
      case 'away':
        return { color: 'text-yellow-400', text: 'Away' };
      case 'offline':
        return { color: 'text-gray-400', text: 'Offline' };
      default:
        return { color: 'text-gray-400', text: 'Offline' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 h-full w-80 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border-l border-white/10 shadow-2xl"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 flex justify-between items-center border-b border-white/10 bg-white/5">
                <motion.h2 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white font-medium"
                >
                  User Profile
                </motion.h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Profile Content */}
              <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center"
                >
                  {/* Avatar */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full blur-lg opacity-50" />
                    <UserAvatarWithStatus
                      userId={userId}
                      size="lg"
                      className="!h-24 !w-24 relative z-10"
                    />
                  </motion.div>

                  {/* Name */}
                  <motion.h3 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 text-white font-medium text-lg"
                  >
                    {editedName}
                  </motion.h3>

                  {/* User Presence */}
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`text-sm mt-1 ${statusDisplay.color}`}
                  >
                    {statusDisplay.text}
                  </motion.p>

                  {/* Email */}
                  {!isLoading && userEmail && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mt-1 flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      {userEmail}
                    </motion.p>
                  )}

                  {/* First Divider */}
                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

                  {/* Bio Section */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="w-full bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white/60">Bio</div>
                        <div className="text-white mt-1">
                          {bio || `${editedName} doesn't have a bio yet`}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* User ID */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-full mt-4 bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                        <Hash className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white/60">User ID</div>
                        <div className="text-white font-mono text-xs mt-1">{userId.slice(0, 12)}...</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Account Type */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="w-full mt-4 bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white/60">Account Type</div>
                        <div className="text-white mt-1">{isCurrentUser ? 'You' : 'Member'}</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Last Seen */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="w-full mt-4 bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white/60">Last Seen</div>
                        <div className="text-white mt-1">
                          {userPresence?.lastSeen ? new Date(userPresence.lastSeen).toLocaleString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Second Divider */}
                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

                  {/* Sign Out Button */}
                  {isCurrentUser && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      className="w-full"
                    >
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={signOut}
                        className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all text-sm font-medium shadow-lg"
                      >
                        Sign Out
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 