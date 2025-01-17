'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, get, push, set } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePresence } from '@/lib/hooks/usePresence';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Plus, Bot } from 'lucide-react';
import UserSettings from './UserSettings';
import WorkspaceContextMenu from './WorkspaceContextMenu';
import { CreateWorkspaceModal } from '@/app/components/modals/CreateWorkspaceModal';
import JoinWorkspaceModal from '../workspace/JoinWorkspaceModal';
import WorkspaceActionMenu from '../workspace/WorkspaceActionMenu';
import { UserAvatarWithStatus } from '@/app/components/UserAvatarWithStatus';
import AIAgentButton from '../workspace/AIAgentButton';
import { useAIAgent } from '@/lib/contexts/AIAgentContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AIAgentContextMenu from './AIAgentContextMenu';
import { cn } from '@/lib/utils';
import ViewPersonaModal from '../modals/ViewPersonaModal';

interface Workspace {
  id: string;
  name: string;
  icon?: string;
}

interface WorkspaceSidebarProps {
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
  onWorkspaceSelect?: (workspaceId: string) => void;
  onNavigationStart?: () => void;
  onNavigationEnd?: () => void;
}

export default function WorkspaceSidebar({ 
  workspaces: propWorkspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onNavigationStart,
  onNavigationEnd
}: WorkspaceSidebarProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspaceId: string } | null>(null);
  const [aiAgentContextMenu, setAIAgentContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const { user, signOut } = useAuth();
  const { toggleWorkspace, settings } = useAIAgent();
  const router = useRouter();
  const params = useParams();
  const currentWorkspaceId = activeWorkspaceId || (params?.workspaceId as string);

  useEffect(() => {
    if (propWorkspaces) {
      setWorkspaces(propWorkspaces);
      return;
    }

    if (!user) return;

    const userWorkspacesRef = ref(db, `users/${user.uid}/workspaces`);
    
    const unsubscribe = onValue(userWorkspacesRef, async (snapshot) => {
      const workspacesData = snapshot.val();
      if (!workspacesData) return;

      const workspacePromises = Object.keys(workspacesData).map(async (workspaceId) => {
        const workspaceRef = ref(db, `workspaces/${workspaceId}`);
        const workspaceSnapshot = await get(workspaceRef);
        const workspaceData = workspaceSnapshot.val();
        return {
          id: workspaceId,
          name: workspaceData.name,
          icon: workspaceData.icon
        };
      });

      const workspacesList = await Promise.all(workspacePromises);
      setWorkspaces(workspacesList);
    });

    return () => unsubscribe();
  }, [user, propWorkspaces]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserSettings(false);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const handleWorkspaceClick = async (workspaceId: string) => {
    try {
      onNavigationStart?.();

      // First verify the workspace exists
      const workspaceRef = ref(db, `workspaces/${workspaceId}`);
      const workspaceSnapshot = await get(workspaceRef);
      
      if (!workspaceSnapshot.exists()) {
        toast.error('Workspace not found');
        onNavigationEnd?.();
        return;
      }

      // Get the channels for this workspace
      const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
      const channelsSnapshot = await get(channelsRef);
      const channels = channelsSnapshot.val();

      // If there are no channels, create a general channel
      if (!channels) {
        // Create a general channel
        const generalChannelRef = ref(db, `workspaces/${workspaceId}/channels`);
        const newChannelRef = push(generalChannelRef);
        const timestamp = Date.now();
        
        await set(newChannelRef, {
          name: 'general',
          createdBy: user?.uid,
          createdAt: timestamp,
          type: 'text',
          isDefault: true
        });

        // Navigate to the new general channel
        router.push(`/workspace/${workspaceId}/channel/${newChannelRef.key}`);
        return;
      }

      // Find the general channel
      let generalChannelId = Object.entries(channels).find(
        ([_, channel]) => (channel as any).name === 'general'
      )?.[0];

      // If no general channel exists, use the first channel
      if (!generalChannelId) {
        generalChannelId = Object.keys(channels)[0];
      }

      // Navigate to the workspace's general channel
      if (generalChannelId) {
        router.push(`/workspace/${workspaceId}/channel/${generalChannelId}`);
      } else {
        // Create a general channel if none exists
        const generalChannelRef = ref(db, `workspaces/${workspaceId}/channels`);
        const newChannelRef = push(generalChannelRef);
        const timestamp = Date.now();
        
        await set(newChannelRef, {
          name: 'general',
          createdBy: user?.uid,
          createdAt: timestamp,
          type: 'text',
          isDefault: true
        });

        // Navigate to the new general channel
        router.push(`/workspace/${workspaceId}/channel/${newChannelRef.key}`);
      }
    } catch (error) {
      console.error('Error navigating to workspace:', error);
      toast.error('Failed to navigate to workspace. Please try again.');
    } finally {
      onNavigationEnd?.();
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenuPosition({
      x: rect.right + 10,
      y: rect.top,
    });
    setShowActionMenu(true);
  };

  const handleCreateWorkspace = () => {
    setShowCreateModal(true);
  };

  const handleJoinWorkspace = () => {
    setShowJoinModal(true);
  };

  const handleContextMenu = (e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      workspaceId
    });
  };

  const handleAIAgentClick = async () => {
    if (activeWorkspaceId) {
      await toggleWorkspace(activeWorkspaceId);
      toast.success(settings.workspaces[activeWorkspaceId] ? 'AI Agent activated' : 'AI Agent deactivated');
    }
  };

  const handleAIAgentContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setAIAgentContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <>
      <div className="w-[72px] bg-[#0A0F1C]/90 backdrop-blur-xl flex flex-col items-center py-3 space-y-2 relative border-r border-white/5">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
          <div className="absolute -inset-[500px] opacity-10">
            <div className="absolute inset-0 rotate-45 bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 blur-3xl animate-pulse" />
          </div>
          <div className="absolute right-0 w-px h-full bg-gradient-to-b from-transparent via-indigo-500 to-transparent opacity-20" />
        </div>

        {/* Add/Join Workspace Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePlusClick}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 p-0.5 group relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
          <div className="w-full h-full rounded-[14px] bg-[#0A0F1C] flex items-center justify-center group-hover:bg-transparent transition-colors relative z-10">
            <Plus className="w-6 h-6 text-indigo-500 group-hover:text-white transition-colors" />
          </div>
        </motion.button>

        <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        {/* Workspaces List */}
        <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent px-3">
          <AnimatePresence mode="popLayout">
            {workspaces.map((workspace, index) => (
              <motion.button
                key={workspace.id}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => handleWorkspaceClick(workspace.id)}
                onContextMenu={(e) => handleContextMenu(e, workspace.id)}
                className="relative w-12 h-12 group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-0 transition-all duration-300 blur-lg
                  ${workspace.id === currentWorkspaceId ? 'opacity-50' : 'group-hover:opacity-30'}
                `} />
                <div className={`w-full h-full rounded-2xl bg-gradient-to-br p-0.5 transition-all duration-300 transform
                  ${workspace.id === currentWorkspaceId 
                    ? 'from-indigo-500 to-purple-600 scale-100 rounded-[14px]' 
                    : 'from-white/10 to-white/5 group-hover:scale-95 group-hover:from-indigo-500/50 group-hover:to-purple-600/50'
                  }
                `}>
                  <div className={`w-full h-full rounded-[14px] transition-all duration-300 overflow-hidden
                    ${workspace.id === currentWorkspaceId ? 'bg-transparent' : 'bg-[#0A0F1C] group-hover:bg-transparent'}
                  `}>
                    {workspace.icon ? (
                      <Image
                        src={workspace.icon}
                        alt={workspace.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/80 group-hover:text-white transition-colors">
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 transition-all duration-300 rounded-r
                  ${workspace.id === currentWorkspaceId 
                    ? 'h-8 bg-white' 
                    : 'h-4 bg-white/0 group-hover:bg-white/50'
                  }
                `} />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        {/* AI Agent Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAIAgentClick}
          onContextMenu={handleAIAgentContextMenu}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 p-0.5 group relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
          <div className={cn(
            "w-full h-full rounded-[14px] bg-[#0A0F1C] flex items-center justify-center group-hover:bg-transparent transition-colors relative z-10",
            settings.workspaces[activeWorkspaceId || ''] && "bg-gradient-to-br from-indigo-500 to-purple-600"
          )}>
            <Bot className={cn(
              "w-6 h-6 transition-colors",
              settings.workspaces[activeWorkspaceId || ''] ? "text-white" : "text-indigo-500 group-hover:text-white"
            )} />
          </div>
          <div className="absolute left-full ml-4 px-2 py-1 bg-black/90 text-white text-sm rounded pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap">
            {settings.workspaces[activeWorkspaceId || ''] ? 'AI Agent Active' : 'AI Agent Inactive'}
          </div>
        </motion.button>

        {/* User Profile Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowUserSettings(true)}
          className="relative w-12 h-12 group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-lg" />
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-0.5 group-hover:from-indigo-500/50 group-hover:to-purple-600/50 transition-all duration-300">
            <div className="w-full h-full rounded-[14px] overflow-hidden relative">
              {user && (
                <UserAvatarWithStatus 
                  userId={user.uid}
                  size="lg"
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </motion.button>
      </div>

      {/* Modals */}
      {contextMenu && (
        <WorkspaceContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          workspaceId={contextMenu.workspaceId}
          onClose={() => setContextMenu(null)}
        />
      )}
      {showUserSettings && (
        <UserSettings
          onClose={() => setShowUserSettings(false)}
          onSignOut={handleSignOut}
        />
      )}
      <WorkspaceActionMenu
        isOpen={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        onCreateWorkspace={handleCreateWorkspace}
        onJoinWorkspace={handleJoinWorkspace}
        position={actionMenuPosition}
      />
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWorkspaceCreated={handleCreateWorkspace}
      />
      <JoinWorkspaceModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onWorkspaceJoined={handleWorkspaceClick}
      />

      {/* Context Menus */}
      {aiAgentContextMenu && (
        <AIAgentContextMenu
          x={aiAgentContextMenu.x}
          y={aiAgentContextMenu.y}
          onClose={() => {
            setAIAgentContextMenu(null);
          }}
          onViewPersona={() => {
            setShowPersonaModal(true);
          }}
        />
      )}

      {/* Persona Modal */}
      <ViewPersonaModal 
        isOpen={showPersonaModal}
        onClose={() => setShowPersonaModal(false)}
      />
    </>
  );
} 