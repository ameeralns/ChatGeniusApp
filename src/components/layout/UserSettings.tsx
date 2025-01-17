'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { usePresence } from '@/lib/hooks/usePresence';
import { X, Check, Settings, User, Bell, Shield, Moon, Volume2, LogOut, Camera, Edit2 } from 'lucide-react';
import { UserAvatarWithStatus } from '@/app/components/UserAvatarWithStatus';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile } from 'firebase/auth';
import { updateUserProfile } from '@/lib/firebase/database';
import toast from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { storage } from '@/lib/firebase/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UserSettingsProps {
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

const statusOptions = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'away', label: 'Away', color: 'bg-yellow-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-400' },
] as const;

export default function UserSettings({ onClose, onSignOut }: UserSettingsProps) {
  const { user } = useAuth();
  const { updateStatus, currentUserPresence } = usePresence();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadUserBio = async () => {
      if (!user) return;
      try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setBio(userData.bio || '');
          setEditedBio(userData.bio || '');
        }
      } catch (error) {
        console.error('Error loading user bio:', error);
      }
    };
    loadUserBio();
  }, [user]);

  if (!user) return null;

  const handleNameChange = async () => {
    if (!newDisplayName.trim() || newDisplayName === user.displayName) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(user, {
        displayName: newDisplayName
      });
      
      await updateUserProfile(user.uid, {
        displayName: newDisplayName
      });

      // Update presence with new display name
      await updateStatus(currentUserPresence?.status || 'online');

      toast.success('Profile name updated successfully!');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating display name:', error);
      toast.error('Failed to update profile name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      const toastId = toast.loading('Uploading photo...');
      
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const path = `users/${user.uid}/profile/${uniqueFileName}`;
      console.log('Uploading to path:', path);
      
      const fileRef = storageRef(storage, path);
      
      try {
        console.log('Starting file upload...');
        await uploadBytes(fileRef, file);
        console.log('File uploaded successfully');
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast.dismiss(toastId);
        toast.error('Failed to upload photo to storage');
        return;
      }

      let photoURL;
      try {
        console.log('Getting download URL...');
        photoURL = await getDownloadURL(fileRef);
        console.log('Got download URL:', photoURL);
      } catch (urlError) {
        console.error('Error getting download URL:', urlError);
        toast.dismiss(toastId);
        toast.error('Failed to get photo URL');
        return;
      }

      try {
        console.log('Updating Firebase Auth profile...');
        await updateProfile(user, { photoURL });
        console.log('Auth profile updated');
      } catch (authError) {
        console.error('Error updating auth profile:', authError);
        // Continue anyway as this is not critical
      }
      
      try {
        console.log('Updating user profile in database...');
        await updateUserProfile(user.uid, {
          photoURL,
          photoURLKey: path
        });
        console.log('Database profile updated');
      } catch (dbError) {
        console.error('Error updating database profile:', dbError);
        toast.dismiss(toastId);
        toast.error('Failed to update profile in database');
        return;
      }

      try {
        console.log('Updating presence...');
        await updateStatus(currentUserPresence?.status || 'online');
        console.log('Presence updated');
      } catch (presenceError) {
        console.error('Error updating presence:', presenceError);
        // Continue anyway as this is not critical
      }

      toast.dismiss(toastId);
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error in photo upload process:', error);
      toast.error('Failed to update profile photo');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    handlePhotoUpload(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleStatusUpdate = async (status: 'online' | 'offline' | 'away') => {
    try {
      setIsUpdating(true);
      await updateStatus(status);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBioSave = async () => {
    if (editedBio === bio) {
      setIsEditingBio(false);
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile(user.uid, {
        bio: editedBio
      });
      setBio(editedBio);
      toast.success('Bio updated successfully!');
      setIsEditingBio(false);
    } catch (error) {
      console.error('Error updating bio:', error);
      toast.error('Failed to update bio. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
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
          className="absolute inset-y-0 right-0 w-[380px] bg-[#0A0F1C]/90 backdrop-blur-2xl border-l border-white/5 shadow-[0_0_50px_-12px] shadow-indigo-500/30"
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
              <div className="flex flex-col items-center gap-4">
                {/* Avatar Upload */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full animate-pulse opacity-30" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    ref={fileInputRef}
                    disabled={isUpdating}
                  />
                  <div 
                    onClick={() => !isUpdating && fileInputRef.current?.click()}
                    className={`relative cursor-pointer ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <UserAvatarWithStatus 
                      userId={user.uid}
                      size="lg"
                      className="relative z-10 ring-2 ring-white/10 ring-offset-4 ring-offset-[#0A0F1C] transition-all duration-300 group-hover:ring-white/20 group-hover:ring-offset-8 !h-20 !w-20" 
                    />
                    <div className={`absolute inset-0 bg-black/50 rounded-full ${isUpdating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex flex-col items-center justify-center gap-1 backdrop-blur-sm`}>
                      {isUpdating ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="text-xs text-white/90">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-white" />
                          <span className="text-xs text-white/90">Change Photo</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Name */}
                <div className="text-center w-full">
                  {isEditingName ? (
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter your name"
                        disabled={isSaving}
                        autoFocus
                      />
                      <button
                        onClick={handleNameChange}
                        disabled={isSaving}
                        className="p-2 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-lg font-medium text-white hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
                    >
                      {user.displayName || 'Add a display name'}
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Edit Buttons */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setNewDisplayName(user.displayName || '');
                      setIsEditingName(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group border border-white/10"
                  >
                    <Edit2 className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                    <span className="text-sm text-white/90 group-hover:text-white">Edit Name</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group border border-white/10"
                  >
                    <Camera className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                    <span className="text-sm text-white/90 group-hover:text-white">Change Photo</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-2" />
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
                <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Status</h4>
                <div className="space-y-2">
                  {statusOptions.map((option, index) => {
                    const isSelected = currentUserPresence?.status === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        onClick={() => handleStatusUpdate(option.value)}
                        disabled={isUpdating}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all duration-300 group relative overflow-hidden
                          ${isSelected 
                            ? 'text-white bg-gradient-to-r from-indigo-500/10 to-purple-600/10' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                          }
                          ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 p-0.5 group-hover:from-indigo-500 group-hover:to-purple-600 transition-all duration-300">
                            <div className="w-full h-full rounded-[10px] bg-[#0A0F1C] flex items-center justify-center group-hover:bg-transparent transition-colors duration-300">
                              <span className={`h-2.5 w-2.5 rounded-full ${option.color}`} />
                            </div>
                          </div>
                          {option.label}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Bio Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                <div className="text-sm text-white/60 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Bio
                </div>
                {isEditingBio ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="Write something about yourself..."
                      rows={3}
                      disabled={isSaving}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsEditingBio(false);
                          setEditedBio(bio);
                        }}
                        disabled={isSaving}
                        className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBioSave}
                        disabled={isSaving}
                        className="px-3 py-1 text-sm bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <div 
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/60 min-h-[60px] hover:text-white transition-colors cursor-pointer"
                      onClick={() => setIsEditingBio(true)}
                    >
                      {bio || 'Write something about yourself...'}
                    </div>
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="absolute top-2 right-2 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sign Out Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="p-6 border-t border-white/5"
            >
              <motion.button
                whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
                onClick={onSignOut}
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
    </AnimatePresence>
  );
} 