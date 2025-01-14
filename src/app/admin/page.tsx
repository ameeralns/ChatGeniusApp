'use client';

import React, { useState } from 'react';
import { syncUserWorkspaces, migrateMessagesWithUserProfiles } from '@/lib/firebase/database';
import { useAuth } from '@/lib/hooks/useAuth';

export default function AdminPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('Ready');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSyncUsers = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      setStatus('Syncing users...');
      await syncUserWorkspaces();
      setStatus('Users synced successfully');
    } catch (error) {
      console.error('Error syncing users:', error);
      setStatus('Error syncing users');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigrateMessages = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      setStatus('Starting message migration...');
      
      // Run the migration
      const updatedCount = await migrateMessagesWithUserProfiles();
      
      if (updatedCount === 0) {
        setStatus('No messages needed migration');
      } else {
        setStatus(`Migration complete. Updated ${updatedCount} messages with user profiles.`);
      }
    } catch (error) {
      console.error('Error migrating messages:', error);
      setStatus(error instanceof Error ? `Error: ${error.message}` : 'Error migrating messages');
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

        <div className="mt-4">
          <p className="text-gray-600">Status: {status}</p>
        </div>
      </div>
    </div>
  );
} 