'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserWorkspaces } from '@/lib/firebase/database';
import WorkspaceSidebar from '@/components/layout/WorkspaceSidebar';
import ChannelSidebar from '@/components/layout/ChannelSidebar';
import ChatArea from '@/components/layout/ChatArea';
import UserProfileBar from '@/components/layout/UserProfileBar';
import { useRouter, useParams } from 'next/navigation';

interface WorkspaceRole {
  role: 'admin' | 'member';
  joinedAt: number;
}

interface Workspace {
  id: string;
  name: string;
  icon?: string;
  createdBy: string;
  members: { [key: string]: WorkspaceRole };
  inviteCode?: string;
  createdAt: number;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string>('general');
  const [loading, setLoading] = useState(true);

  // Fetch user's workspaces
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadWorkspaces = async () => {
      try {
        const userWorkspaces = await getUserWorkspaces(user.uid);
        setWorkspaces(userWorkspaces);

        // Set active workspace from URL if available
        const workspaceId = params?.workspaceId as string;
        if (workspaceId && userWorkspaces.some(w => w.id === workspaceId)) {
          setActiveWorkspaceId(workspaceId);
        }
      } catch (error) {
        console.error('Error loading workspaces:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [user, params?.workspaceId]);

  const handleWorkspaceSelect = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setActiveChannelId(null); // Reset active channel when switching workspaces
    router.push(`/workspace/${workspaceId}`);
  };

  const handleChannelSelect = (channelId: string, name?: string) => {
    setActiveChannelId(channelId);
    if (name) setChannelName(name);
    if (activeWorkspaceId) {
      router.push(`/workspace/${activeWorkspaceId}/channel/${channelId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#313338]">
        <div className="w-8 h-8 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#313338]">
        <div className="text-white">Please sign in to continue</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#313338] text-white">
      {/* Workspaces Sidebar */}
      <WorkspaceSidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId || undefined}
        onWorkspaceSelect={handleWorkspaceSelect}
      />

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Channels Sidebar */}
        <ChannelSidebar
          workspaceId={activeWorkspaceId || ''}
          activeChannelId={activeChannelId || ''}
          onChannelSelect={handleChannelSelect}
        />

        {/* Chat Area with Header */}
        <div className="flex flex-col flex-1">
          <div className="h-12 border-b border-[#2D2F32] px-4 flex items-center justify-between bg-[#313338]">
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium">#{channelName}</span>
            </div>
          </div>

          <div className="flex-1 flex">
            <ChatArea
              workspaceId={activeWorkspaceId || ''}
              channelId={activeChannelId || ''}
              channelName={channelName}
            />
            
            {/* User Profile Sidebar - Only shown when a user profile is clicked */}
            <UserProfileBar />
          </div>
        </div>
      </div>
    </div>
  );
} 