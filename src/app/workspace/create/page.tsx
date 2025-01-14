'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { createWorkspace } from '@/lib/firebase/database';

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !workspaceName.trim() || creating) return;

    setCreating(true);
    setError('');

    try {
      const { workspaceId } = await createWorkspace(workspaceName.trim(), user.uid);
      if (workspaceId) {
        router.push('/workspace/welcome');
      }
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      setError(error.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1d21]">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Create a New Workspace</h2>
            <p className="text-[#D1D2D3] mb-8">Create a workspace to start collaborating with your team</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-[#D1D2D3] mb-2">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
                className="w-full bg-[#1E1F22] text-[#D1D2D3] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-[#2e2e2e] placeholder-[#6B6F74]"
                disabled={creating}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!workspaceName.trim() || creating}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                onClick={() => router.back()}
                className="flex-1 bg-[#27242C] text-[#D1D2D3] px-4 py-3 rounded-lg hover:bg-[#363139] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 