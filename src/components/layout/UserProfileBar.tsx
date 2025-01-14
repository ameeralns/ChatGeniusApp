'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';
import { X, Settings, LogOut, User as UserIcon, Mail, Calendar, Shield, Star } from 'lucide-react';
import { ref, get, onValue } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import type { User } from 'firebase/auth';
import { getUserProfile } from '@/lib/firebase/database';

interface UserProfileBarProps {
  userId?: string;
  onClose?: () => void;
}

interface UserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function UserProfileBar({ userId, onClose }: UserProfileBarProps) {
  const { user, signOut } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (userId) {
        try {
          setIsLoading(true);
          setImageError(false);
          console.log('Fetching user profile for:', userId);
          
          // Set up real-time listener for user profile
          const userRef = ref(db, `users/${userId}`);
          const unsubscribe = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const profile = snapshot.val() as UserProfile;
              console.log('Real-time profile update:', profile);
              setSelectedUser(profile);
            } else {
              console.log('No profile found for user:', userId);
              setSelectedUser(null);
            }
            setIsLoading(false);
          }, (error) => {
            console.error('Error fetching profile:', error);
            setIsLoading(false);
          });

          return () => unsubscribe();
        } catch (error) {
          console.error('Error setting up profile listener:', error);
          setIsLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [userId]);

  // If no userId is provided and no user profile is being viewed, don't render
  if (!userId && !isVisible) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Use selectedUser data if userId is provided, otherwise use current user data
  const displayUser = userId ? selectedUser : user;
  console.log('Display user:', displayUser);
  const isCurrentUser = !userId || userId === user?.uid;

  // Helper function to get creation time
  const getCreationTime = (user: UserProfile | User | null) => {
    if (!user) return Date.now();
    if ('createdAt' in user) return user.createdAt;
    return user.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now();
  };

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="w-80 bg-[#1E1F22]/90 backdrop-blur-xl border-l border-white/10 flex flex-col items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-white/10 rounded-full" />
          <div className="h-4 w-32 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  const renderAvatar = () => {
    if (!displayUser?.photoURL || imageError) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          {displayUser?.displayName ? (
            <span className="text-xl font-semibold text-white">
              {displayUser.displayName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          ) : (
            <span className="text-xl font-semibold text-white">
              {displayUser?.email ? displayUser.email[0].toUpperCase() : 'U'}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="relative w-24 h-24">
        <Image
          src={displayUser.photoURL}
          alt={displayUser.displayName || 'User'}
          width={96}
          height={96}
          className="rounded-full object-cover"
          priority
          unoptimized
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  return (
    <div className="w-80 bg-[#1E1F22]/90 backdrop-blur-xl border-l border-white/10 flex flex-col">
      {/* Header with gradient border */}
      <div className="h-16 border-b border-[#ffffff1a] bg-gradient-to-r from-[#2B2D31]/50 to-[#1E1F22]/50 px-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
          User Profile
        </h3>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="p-2 hover:bg-white/5 rounded-full transition-colors duration-200"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* User Info */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Profile Banner */}
          <div className="relative w-full h-24 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg mb-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
            
            {/* Profile Picture */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
              <div className="relative w-24 h-24 rounded-full border-4 border-[#1E1F22] group">
                {renderAvatar()}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1E1F22]" />
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="text-center mb-8">
            <h4 className="text-xl font-semibold text-white">
              {displayUser?.displayName || displayUser?.email?.split('@')[0] || 'User'}
            </h4>
            <p className="text-sm text-white/50 mt-1">{displayUser?.email}</p>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 rounded-lg p-4 text-center group hover:bg-white/10 transition-colors duration-200">
              <Star className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
              <div className="text-lg font-semibold text-white">Pro</div>
              <div className="text-xs text-white/50">Status</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center group hover:bg-white/10 transition-colors duration-200">
              <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-lg font-semibold text-white">
                {new Date(getCreationTime(displayUser)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
              <div className="text-xs text-white/50">Joined</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center group hover:bg-white/10 transition-colors duration-200">
              <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-lg font-semibold text-white">Verified</div>
              <div className="text-xs text-white/50">Account</div>
            </div>
          </div>

          {/* Actions - Only show for current user */}
          {isCurrentUser && (
            <div className="space-y-2">
              <button className="w-full group px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors duration-200">
                  <Settings className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-white font-medium">User Settings</span>
              </button>
              
              <button 
                onClick={handleSignOut}
                className="w-full group px-4 py-3 rounded-lg bg-white/5 hover:bg-red-500/10 transition-all duration-200 flex items-center space-x-3"
              >
                <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors duration-200">
                  <LogOut className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-red-400 font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 