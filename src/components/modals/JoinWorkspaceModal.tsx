import { useState } from 'react';
import { X, Upload, ArrowRight } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { joinWorkspace } from '@/lib/firebase/database';

interface JoinWorkspaceModalProps {
  onClose: () => void;
}

export default function JoinWorkspaceModal({ onClose }: JoinWorkspaceModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setIsLoading(true);
    try {
      // Join the workspace
      const workspaceId = await joinWorkspace(inviteCode.trim(), user.uid);
      
      // Get the workspace details to find the general channel
      const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
      const channelsSnapshot = await get(channelsRef);
      
      if (!channelsSnapshot.exists()) {
        throw new Error('No channels found in workspace');
      }

      const channels = channelsSnapshot.val();
      const generalChannel = Object.entries(channels).find(
        ([_, channel]: [string, any]) => channel.name === 'general'
      );
      const channelId = generalChannel ? generalChannel[0] : Object.keys(channels)[0];

      if (!channelId) {
        throw new Error('No channels available');
      }

      toast.success('Joined workspace successfully!');
      
      // Close the modal first
      onClose();

      // Wait a bit before navigation to ensure state updates are complete
      setTimeout(() => {
        router.refresh(); // Refresh to update the workspace list
        router.push(`/workspace/${workspaceId}/channel/${channelId}`);
      }, 100);
    } catch (error) {
      console.error('Error joining workspace:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md transform transition-all">
        <div className="relative bg-[#1E1F22]/90 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          {/* Header with gradient border */}
          <div className="p-6 border-b border-[#ffffff1a] bg-gradient-to-r from-[#2B2D31]/50 to-[#1E1F22]/50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                Join a Workspace
              </h2>
              <button 
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors duration-200"
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Join Form */}
            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2 uppercase tracking-wider">
                  Workspace Invite Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#2B2D31]/50 text-white pl-12 pr-4 py-3 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="Enter invite code"
                    maxLength={10}
                    required
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Upload className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/50">
                  Ask your workspace admin for the invite code.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !inviteCode.trim()}
                  className="relative px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium
                           hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <span className="relative flex items-center space-x-2">
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Joining...</span>
                      </>
                    ) : (
                      <>
                        <span>Join Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 