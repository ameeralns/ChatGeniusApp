import { useState } from 'react';
import { X, Hash, ChevronRight, Loader2 } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface CreateChannelModalProps {
  workspaceId: string;
  onClose: () => void;
}

export default function CreateChannelModal({ workspaceId, onClose }: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !channelName.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
      const newChannelRef = push(channelsRef);
      
      await set(newChannelRef, {
        name: channelName.toLowerCase().replace(/\s+/g, '-'),
        type: 'text',
        createdBy: user.uid,
        createdAt: Date.now(),
      });

      toast.success('Channel created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating channel:', error);
      toast.error('Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
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
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                    <Hash className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Create Text Channel</h2>
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
                  <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Channel Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="Enter channel&apos;s name"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-white"
                      maxLength={32}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                    <div className="absolute inset-0 rounded-lg pointer-events-none border border-gray-700/50 border-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                  </div>
                  <p className="text-sm text-gray-400">
                    Channel names can't contain spaces. Use dashes instead.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !channelName.trim()}
                    className="group relative px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium text-white hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
                  >
                    <span className="flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Channel
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 rounded-lg pointer-events-none border border-white/10" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 