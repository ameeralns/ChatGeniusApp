'use client';

import { useEffect, useRef } from 'react';
import { Copy, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { leaveWorkspace, deleteWorkspace, getWorkspaceInviteCode } from '@/lib/firebase/database';

interface WorkspaceContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  isCreator: boolean;
  onWorkspaceSelect: (workspaceId: string) => void;
}

export default function WorkspaceContextMenu({
  position,
  onClose,
  workspaceId,
  workspaceName,
  isCreator,
  onWorkspaceSelect
}: WorkspaceContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopyInviteCode = async () => {
    try {
      const inviteCode = await getWorkspaceInviteCode(workspaceId);
      await navigator.clipboard.writeText(inviteCode);
      onClose();
    } catch (error) {
      console.error('Error copying invite code:', error);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!user?.uid) return;

    try {
      await leaveWorkspace(workspaceId, user.uid);
      onClose();
    } catch (error) {
      console.error('Error leaving workspace:', error);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!user?.uid || !isCreator) return;

    try {
      await deleteWorkspace(workspaceId);
      onClose();
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className="bg-[#111214] rounded-lg shadow-lg py-2 min-w-[220px] z-50"
    >
      <div className="px-3 py-2 text-xs font-semibold text-[#B5BAC1] uppercase">
        {workspaceName}
      </div>

      <div className="h-px bg-[#2B2D31] mx-2 my-1" />

      <button
        onClick={handleCopyInviteCode}
        className="w-full px-3 py-2 text-[#D1D2D3] text-sm flex items-center gap-2 hover:bg-[#5865F2] hover:text-white"
      >
        <Copy className="w-4 h-4" />
        Copy Invite Code
      </button>

      {!isCreator && (
        <button
          onClick={handleLeaveWorkspace}
          className="w-full px-3 py-2 text-[#D1D2D3] text-sm flex items-center gap-2 hover:bg-[#ED4245] hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Leave Workspace
        </button>
      )}

      {isCreator && (
        <button
          onClick={handleDeleteWorkspace}
          className="w-full px-3 py-2 text-[#ED4245] text-sm flex items-center gap-2 hover:bg-[#ED4245] hover:text-white"
        >
          <Trash2 className="w-4 h-4" />
          Delete Workspace
        </button>
      )}
    </div>
  );
} 