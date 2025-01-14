import { useState } from 'react';
import { X, Upload, Plus, ArrowRight } from 'lucide-react';
import { ref, push, set, get } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { joinWorkspace } from '@/lib/firebase/database';

interface CreateWorkspaceModalProps {
  onClose: () => void;
}

type ModalView = 'select' | 'create' | 'join';

interface WorkspaceData {
  members?: {
    [key: string]: {
      role: string;
      joinedAt: number;
    };
  };
  inviteCode: string;
}

export default function CreateWorkspaceModal({ onClose }: CreateWorkspaceModalProps) {
  const [view, setView] = useState<ModalView>('select');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workspaceName.trim()) return;

    setIsLoading(true);
    try {
      // Create new workspace
      const workspacesRef = ref(db, 'workspaces');
      const newWorkspaceRef = push(workspacesRef);
      const workspaceId = newWorkspaceRef.key;

      // Set workspace data
      await set(newWorkspaceRef, {
        name: workspaceName,
        createdBy: user.uid,
        createdAt: Date.now(),
        members: {
          [user.uid]: {
            role: 'admin',
            joinedAt: Date.now()
          }
        }
      });

      // Add workspace to user's workspaces
      await set(ref(db, `users/${user.uid}/workspaces/${workspaceId}`), {
        role: 'admin',
        joinedAt: Date.now()
      });

      // Create default general channel
      const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
      const generalChannelRef = push(channelsRef);
      await set(generalChannelRef, {
        name: 'general',
        type: 'text',
        createdBy: user.uid,
        createdAt: Date.now()
      });

      toast.success('Workspace created successfully!');
      router.push(`/workspace/${workspaceId}/channel/${generalChannelRef.key}`);
      onClose();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error('Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

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
                {view === 'select' ? 'Add a Workspace' : 
                 view === 'create' ? 'Create a Workspace' : 
                 'Join a Workspace'}
              </h2>
              <button 
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {view === 'select' ? (
              <div className="space-y-4">
                <button
                  onClick={() => setView('create')}
                  className="w-full group relative px-6 py-4 bg-gradient-to-r from-[#2B2D31]/50 to-[#1E1F22]/50 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Plus className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-white font-medium">Create a New Workspace</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white transition-colors duration-200" />
                  </div>
                </button>

                <button
                  onClick={() => setView('join')}
                  className="w-full group relative px-6 py-4 bg-gradient-to-r from-[#2B2D31]/50 to-[#1E1F22]/50 rounded-lg border border-white/10 hover:border-blue-500/50 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Upload className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-white font-medium">Join an Existing Workspace</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white transition-colors duration-200" />
                  </div>
                </button>
              </div>
            ) : view === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 uppercase tracking-wider">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-[#2B2D31]/50 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    placeholder="Enter workspace name"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setView('select')}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !workspaceName.trim()}
                    className="relative px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium
                             hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <span className="relative">
                      {isLoading ? 'Creating...' : 'Create Workspace'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 uppercase tracking-wider">
                    Workspace Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full bg-[#2B2D31]/50 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="Enter invite code"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setView('select')}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !inviteCode.trim()}
                    className="relative px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium
                             hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <span className="relative">
                      {isLoading ? 'Joining...' : 'Join Workspace'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 