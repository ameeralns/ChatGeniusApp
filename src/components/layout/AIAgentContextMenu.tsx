'use client';

import { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import { useAIAgent } from '@/lib/contexts/AIAgentContext';
import { useParams } from 'next/navigation';

interface AIAgentContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onViewPersona: () => void;
}

export default function AIAgentContextMenu({ x, y, onClose, onViewPersona }: AIAgentContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { toggleWorkspace, settings } = useAIAgent();
  const params = useParams();
  const workspaceId = params?.workspaceId as string;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToggle = async () => {
    if (workspaceId) {
      await toggleWorkspace(workspaceId);
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 bg-[#1F2937] border border-white/10 rounded-lg shadow-lg py-1"
      style={{ top: y, left: x }}
    >
      <button
        onClick={handleToggle}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
      >
        <Bot className="w-4 h-4" />
        {settings.workspaces[workspaceId] ? 'Deactivate AI Agent' : 'Activate AI Agent'}
      </button>
      <button
        onClick={() => {
          onViewPersona();
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        View AI Persona
      </button>
    </div>
  );
} 