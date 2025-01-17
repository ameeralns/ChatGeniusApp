import { useState } from 'react';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';

interface AIAgentButtonProps {
  isActive?: boolean;
  onClick?: () => void;
}

export default function AIAgentButton({ isActive, onClick }: AIAgentButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-12 h-12 group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl transition-opacity duration-300 blur-lg
        ${isActive ? 'opacity-50' : isHovered ? 'opacity-30' : 'opacity-0'}
      `} />
      <div className={`w-full h-full rounded-2xl bg-gradient-to-br p-0.5 transition-all duration-300
        ${isActive 
          ? 'from-cyan-500 to-blue-600' 
          : 'from-white/10 to-white/5 group-hover:from-cyan-500/50 group-hover:to-blue-600/50'
        }
      `}>
        <div className={`w-full h-full rounded-[14px] flex items-center justify-center relative
          ${isActive ? 'bg-transparent' : 'bg-[#0A0F1C] group-hover:bg-transparent'}
        `}>
          <Bot className={`w-6 h-6 transition-colors duration-300
            ${isActive ? 'text-white' : 'text-cyan-500 group-hover:text-white'}
          `} />
        </div>
      </div>
    </motion.button>
  );
} 