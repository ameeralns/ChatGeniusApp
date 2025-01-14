'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { createWorkspace } from '@/lib/firebase/database';
import { LogOut, Plus } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import Loading from '@/components/ui/loading';

export default function Welcome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return <Loading message="Loading..." />;
  }

  if (!user) {
    return null;
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !newWorkspaceName.trim() || creating) return;

    setCreating(true);
    try {
      const workspaceId = await createWorkspace(newWorkspaceName.trim(), user.uid);
      if (workspaceId) {
        router.replace('/workspace/welcome');
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setCreating(false);
      setNewWorkspaceName('');
      setShowCreateWorkspace(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-white text-xl font-bold">ChatGeniusApp</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.displayName || user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 bg-gray-800 text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to ChatGeniusApp</h1>
          <p className="text-gray-400 mb-8">Create your first workspace to get started</p>
          
          {!showCreateWorkspace ? (
            <button
              onClick={() => setShowCreateWorkspace(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create New Workspace
            </button>
          ) : (
            <form onSubmit={handleCreateWorkspace} className="max-w-md mx-auto">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={creating}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!newWorkspaceName.trim() || creating}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateWorkspace(false);
                    setNewWorkspaceName('');
                  }}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 