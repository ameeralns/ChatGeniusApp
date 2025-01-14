'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { LogOut, Settings, Hash, Search, Bell } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import ChatArea from '@/components/chat/ChatArea';
import WorkspaceSidebar from '@/components/layout/WorkspaceSidebar';
import ChannelSidebar from '@/components/layout/ChannelSidebar';
import { getUserWorkspaces, createWorkspace, joinWorkspace } from '@/lib/firebase/database';

interface WorkspaceRole {
  role: 'admin' | 'member';
  joinedAt: number;
}

interface Workspace {
  id: string;
  name: string;
  createdBy: string;
  members: { [key: string]: WorkspaceRole };
  inviteCode?: string;
  createdAt: number;
}

export default function ChatLayout() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasWorkspaces, setHasWorkspaces] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function checkWorkspaces() {
      if (!user?.uid) return;

      try {
        const userWorkspaces = await getUserWorkspaces(user.uid);
        if (!mounted) return;
        
        const workspacesList = userWorkspaces
          .filter(workspace => workspace.id)
          .map(workspace => ({
            id: workspace.id || '',
            name: workspace.name,
            createdBy: workspace.createdBy,
            members: Object.entries(workspace.members || {}).reduce((acc, [key, value]) => ({
              ...acc,
              [key]: {
                role: value.role as 'admin' | 'member',
                joinedAt: value.joinedAt
              }
            }), {}),
            inviteCode: workspace.inviteCode,
            createdAt: workspace.createdAt
          }));

        setWorkspaces(workspacesList);
        setHasWorkspaces(workspacesList.length > 0);
        
        // If there's no active workspace and we have workspaces, select the first one
        if (!activeWorkspaceId && workspacesList.length > 0) {
          setActiveWorkspaceId(workspacesList[0].id);
        }
      } catch (error) {
        console.error('Error checking workspaces:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else {
        checkWorkspaces();
      }
    }

    return () => {
      mounted = false;
    };
  }, [user?.uid, authLoading, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1d21]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show welcome screen if user has no workspaces
  if (!hasWorkspaces) {
    return (
      <div className="flex h-screen bg-[#1a1d21]">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome to ChatGeniusApp</h2>
              <p className="text-[#D1D2D3] mb-8">Create or join a workspace to get started</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-6 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={() => router.push('/workspace/create')}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create a New Workspace
              </button>
              <button
                onClick={() => router.push('/workspace/join')}
                className="flex items-center justify-center gap-2 bg-[#27242C] text-white px-4 py-3 rounded-lg hover:bg-[#363139] transition-colors"
              >
                Join an Existing Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1a1d21]">
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Workspace Sidebar */}
        <WorkspaceSidebar
          onWorkspaceSelect={setActiveWorkspaceId}
          activeWorkspaceId={activeWorkspaceId || undefined}
          workspaces={workspaces}
        />

        {/* Channel Sidebar */}
        <ChannelSidebar
          workspaceId={activeWorkspaceId || ''}
          onChannelSelect={setActiveChannelId}
          activeChannelId={activeChannelId || ''}
        />

        {/* Chat Content */}
        <div className="flex-1 flex flex-col">
          {/* Channel Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-[#2e2e2e] bg-[#313338]">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Hash className="w-5 h-5 text-[#D1D2D3]" />
                <span className="font-medium text-white">general</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-56 h-8 px-3 py-1 bg-[#1E1F22] text-[#D1D2D3] rounded border border-[#2e2e2e] placeholder-[#6B6F74] text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <Search className="absolute right-3 top-1.5 w-4 h-4 text-[#6B6F74]" />
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#404249]">
                <Bell className="w-5 h-5 text-[#D1D2D3]" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#404249]">
                <Settings className="w-5 h-5 text-[#D1D2D3]" />
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <ChatArea
            workspaceId={activeWorkspaceId || ''}
            channelId={activeChannelId || ''}
          />
        </div>
      </div>
    </div>
  );
} 