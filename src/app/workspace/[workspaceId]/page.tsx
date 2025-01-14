'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Hash, Search, Bell, Settings } from 'lucide-react';
import WorkspaceSidebar from '@/components/layout/WorkspaceSidebar';
import ChannelSidebar from '@/components/layout/ChannelSidebar';
import ChatArea from '@/components/layout/ChatArea';
import { getUserWorkspaces, getChannels } from '@/lib/firebase/database';

interface WorkspaceData {
  name: string;
  createdBy: string;
  members: { [key: string]: { role: 'admin' | 'member'; joinedAt: number } };
  inviteCode?: string;
  createdAt: number;
}

interface Workspace extends WorkspaceData {
  id: string;
  icon?: string;
}

interface Channel {
  id: string | null;
  name: string;
  createdBy: string;
  createdAt: number;
}

interface PageProps {
  params: {
    workspaceId: string;
  };
}

export default function WorkspacePage({ params }: PageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  // Fetch workspaces and set initial state
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user?.uid) return;

      try {
        const userWorkspaces = await getUserWorkspaces(user.uid);
        setWorkspaces(userWorkspaces as Workspace[]);
        
        // Find current workspace
        const workspace = userWorkspaces.find(w => w.id === params.workspaceId);
        if (workspace) {
          setCurrentWorkspace(workspace as Workspace);
          
          // Fetch channels for the workspace
          const workspaceChannels = await getChannels(params.workspaceId);
          setChannels(workspaceChannels);
          
          // Set initial channel if none selected
          if (!activeChannelId && workspaceChannels.length > 0) {
            setActiveChannelId(workspaceChannels[0].id || null);
          }
        }
      } catch (error) {
        console.error('Error fetching workspace data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user?.uid) {
      fetchWorkspaces();
    }
  }, [user?.uid, params.workspaceId, authLoading, activeChannelId]);

  const handleWorkspaceSelect = (workspaceId: string) => {
    if (workspaceId === params.workspaceId) return;
    
    setActiveChannelId(null); // Reset channel selection
    router.push(`/workspace/${workspaceId}`);
  };

  // Show loading state while checking auth or fetching data
  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#313338]">
        <div className="w-8 h-8 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, show nothing while redirecting
  if (!user) {
    return null;
  }

  const activeChannel = channels.find(channel => channel.id === activeChannelId);

  return (
    <div className="flex h-screen bg-[#313338]">
      {/* Workspace Sidebar */}
      <WorkspaceSidebar 
        onWorkspaceSelect={handleWorkspaceSelect}
        activeWorkspaceId={params.workspaceId}
      />

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Channel Sidebar */}
        <ChannelSidebar
          workspaceId={params.workspaceId}
          onChannelSelect={setActiveChannelId}
          activeChannelId={activeChannelId || ''}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
          {/* Channel Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-[#1E1F22] bg-[#313338] shadow-sm">
            <div className="flex items-center space-x-2">
              <Hash className="w-5 h-5 text-[#949BA4]" />
              <span className="font-medium text-white">
                {activeChannel?.name || 'general'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages"
                  className="w-48 h-7 px-3 py-1 bg-[#1E1F22] text-[#D1D2D3] rounded-md text-sm border border-transparent focus:border-[#5865F2] placeholder-[#949BA4] focus:outline-none transition-colors"
                />
                <Search className="absolute right-2.5 top-1.5 w-4 h-4 text-[#949BA4]" />
              </div>
              <div className="flex items-center space-x-2">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#393C41] transition-colors">
                  <Bell className="w-5 h-5 text-[#B5BAC1]" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#393C41] transition-colors">
                  <Settings className="w-5 h-5 text-[#B5BAC1]" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Area with Welcome Message if no channel selected */}
          {activeChannelId ? (
            <ChatArea
              workspaceId={params.workspaceId}
              channelId={activeChannelId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Hash className="w-16 h-16 text-[#949BA4] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to {currentWorkspace?.name}!</h2>
                <p className="text-[#949BA4]">Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 