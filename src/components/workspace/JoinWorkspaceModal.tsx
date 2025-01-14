'use client';

import { useState } from 'react';
import { joinWorkspace } from '@/lib/firebase/database';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Link, ChevronRight } from 'lucide-react';

interface JoinWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceJoined: (workspaceId: string) => void;
}

export default function JoinWorkspaceModal({ isOpen, onClose, onWorkspaceJoined }: JoinWorkspaceModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim() || isJoining) return;

    setIsJoining(true);
    try {
      const workspaceId = await joinWorkspace(inviteCode.trim().toUpperCase(), user.uid);
      toast.success('Joined workspace successfully!');
      onWorkspaceJoined(workspaceId);
      onClose();
    } catch (error) {
      console.error('Error joining workspace:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join workspace. Please check your invite code and try again.';
      toast.error(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteCode(e.target.value.toUpperCase());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg mx-4 overflow-hidden"
          >
            {/* Glass morphism background */}
            <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
              </div>

              {/* Content */}
              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">Join Workspace</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Invite Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={handleInviteCodeChange}
                        placeholder="Enter invite code..."
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-white uppercase"
                        disabled={isJoining}
                        autoFocus
                        maxLength={10}
                        required
                      />
                      <div className="absolute inset-0 rounded-lg pointer-events-none border border-gray-700/50 border-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!inviteCode.trim() || isJoining}
                      className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium text-white hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
                    >
                      <span className="flex items-center gap-2">
                        {isJoining ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            Join Workspace
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 rounded-lg pointer-events-none border border-white/10" />
                    </button>
                  </div>
                </form>

                {/* Help text */}
                <p className="mt-4 text-sm text-gray-400">
                  Ask your workspace admin for an invite code to join.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 