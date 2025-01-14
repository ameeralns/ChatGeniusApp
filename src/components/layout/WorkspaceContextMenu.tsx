import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { Check, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WorkspaceContextMenuProps {
  x: number;
  y: number;
  workspaceId: string;
  onClose: () => void;
}

export default function WorkspaceContextMenu({ x, y, workspaceId, onClose }: WorkspaceContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopyInvite = async () => {
    try {
      const workspaceRef = ref(db, `workspaces/${workspaceId}`);
      const snapshot = await get(workspaceRef);
      const workspaceData = snapshot.val();
      
      // Get or create invite code
      let inviteCode = workspaceData.inviteCode;
      if (!inviteCode) {
        inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        // Save the invite code to the workspace
        await set(ref(db, `workspaces/${workspaceId}/inviteCode`), inviteCode);
      }
      
      // Copy just the invite code
      await navigator.clipboard.writeText(inviteCode);
      
      // Show success state
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      // Show toast notification
      toast.success('Invite code copied to clipboard!', {
        duration: 3000,
        style: {
          background: '#36393f',
          color: '#fff',
          border: '1px solid #2f3136',
        },
        iconTheme: {
          primary: '#5865f2',
          secondary: '#fff',
        },
      });

      onClose(); // Close the context menu after successful copy
    } catch (error) {
      console.error('Error copying invite code:', error);
      toast.error('Failed to copy invite code', {
        duration: 3000,
        style: {
          background: '#36393f',
          color: '#fff',
          border: '1px solid #2f3136',
        },
      });
    }
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 50
      }}
      className="bg-[#18191C] rounded-lg shadow-lg py-2 min-w-[220px]"
    >
      <button
        onClick={() => {
          router.push(`/workspace/${workspaceId}/settings`);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-[#B5BAC1] hover:bg-indigo-500 hover:text-white"
      >
        Workspace Settings
      </button>
      <button
        onClick={handleCopyInvite}
        className="w-full px-3 py-2 text-left text-[#B5BAC1] hover:bg-indigo-500 hover:text-white flex items-center justify-between"
      >
        <span>Copy Invite Code</span>
        {isCopied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
      <div className="h-[1px] bg-[#2B2D31] my-1" />
      <button
        onClick={() => {
          // Handle leave workspace
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-red-500 hover:bg-red-500 hover:text-white"
      >
        Leave Workspace
      </button>
    </div>
  );
} 