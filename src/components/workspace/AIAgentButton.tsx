import { useState } from 'react';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAIAgent } from '@/lib/contexts/AIAgentContext';
import { useParams } from 'next/navigation';

export default function AIAgentButton() {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();
  const { settings, toggleWorkspace } = useAIAgent();
  const params = useParams();
  const workspaceId = params?.workspaceId as string;

  if (!user) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaceId) {
      await toggleWorkspace(workspaceId);
    }
  };

  const isWorkspaceEnabled = workspaceId ? settings.workspaces[workspaceId] : false;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-12 h-12 group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl transition-opacity duration-300 blur-lg
        ${isWorkspaceEnabled ? 'opacity-50' : isHovered ? 'opacity-30' : 'opacity-0'}
      `} />
      <div className={`w-full h-full rounded-2xl bg-gradient-to-br p-0.5 transition-all duration-300
        ${isWorkspaceEnabled 
          ? 'from-cyan-500 to-blue-600' 
          : 'from-white/10 to-white/5 group-hover:from-cyan-500/50 group-hover:to-blue-600/50'
        }
      `}>
        <div className={`w-full h-full rounded-[14px] flex items-center justify-center relative
          ${isWorkspaceEnabled ? 'bg-transparent' : 'bg-[#0A0F1C] group-hover:bg-transparent'}
        `}>
          <Bot className={`w-6 h-6 transition-colors duration-300
            ${isWorkspaceEnabled ? 'text-white' : 'text-cyan-500 group-hover:text-white'}
          `} />
        </div>
      </div>
    </motion.button>
  );
} 