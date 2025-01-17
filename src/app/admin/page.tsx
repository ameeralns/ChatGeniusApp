'use client';

import React, { useState } from 'react';
import { syncUserWorkspaces, migrateMessagesWithUserProfiles } from '@/lib/firebase/database';
import { useAuth } from '@/lib/hooks/useAuth';
import { auth } from '@/lib/firebase/firebase';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Ready');
  const { user } = useAuth();

  const handleSyncUsers = async () => {
    setIsProcessing(true);
    setStatus('Syncing user workspaces...');
    try {
      await syncUserWorkspaces();
      toast.success('User workspaces synced successfully');
      setStatus('Sync completed');
    } catch (error) {
      console.error('Error syncing users:', error);
      toast.error('Failed to sync user workspaces');
      setStatus('Sync failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigrateMessages = async () => {
    setIsProcessing(true);
    setStatus('Migrating messages to AI Assistant index...');
    try {
      // Get the current user's ID token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/migrate-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Migration failed');
      }

      if (result.success) {
        const { totalMessages } = result.stats;
        toast.success(`Migration completed: ${totalMessages} messages processed`);
        setStatus('AI Assistant migration completed');
      } else {
        throw new Error(result.error || result.message || 'Migration failed');
      }
    } catch (error) {
      console.error('Error migrating messages:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to migrate messages');
      setStatus('AI Assistant migration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigrateToAIAgent = async () => {
    setIsProcessing(true);
    setStatus('Migrating users to AI Agent...');
    try {
      // Get the current user's ID token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/migrate-ai-agent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Migration failed');
      }

      if (result.success) {
        const { totalUsers, totalMessages, totalBios } = result.stats;
        toast.success(`Migration completed: ${totalUsers} users, ${totalMessages} messages, ${totalBios} bios`);
        setStatus('AI Agent migration completed');
      } else {
        throw new Error(result.error || result.message || 'Migration failed');
      }
    } catch (error) {
      console.error('Error migrating to AI Agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to migrate users to AI Agent');
      setStatus('AI Agent migration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return <div className="p-6">Please log in to access admin panel</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={handleSyncUsers}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Sync User Workspaces
          </button>
        </div>

        <div>
          <button
            onClick={handleMigrateMessages}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Migrate Messages (Add User Profiles)
          </button>
        </div>

        <div>
          <button
            onClick={handleMigrateToAIAgent}
            disabled={isProcessing}
            className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50"
          >
            Migrate Messages for AI Agent
          </button>
        </div>

        <div className="mt-4">
          <p className="text-gray-600">Status: {status}</p>
        </div>
      </div>
    </div>
  );
} 