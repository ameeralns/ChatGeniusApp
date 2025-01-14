'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users } from 'lucide-react';

interface WorkspaceActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkspace: () => void;
  onJoinWorkspace: () => void;
  position: { x: number; y: number };
}

export default function WorkspaceActionMenu({
  isOpen,
  onClose,
  onCreateWorkspace,
  onJoinWorkspace,
  position
}: WorkspaceActionMenuProps) {
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible overlay to handle clicks outside */}
          <div
            className="fixed inset-0 z-50"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: 50,
            }}
            className="w-56 p-1.5 rounded-lg border border-gray-800 shadow-xl"
          >
            {/* Glass morphism background */}
            <div className="absolute inset-0 rounded-lg bg-gray-900/90 backdrop-blur-xl -z-10" />

            {/* Decorative gradient */}
            <div className="absolute inset-px rounded-lg bg-gradient-to-b from-white/[0.05] to-transparent -z-10" />

            {/* Menu items */}
            <div className="space-y-0.5">
              <button
                onClick={() => handleAction(onCreateWorkspace)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white rounded-md hover:bg-white/[0.05] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Workspace
              </button>
              <button
                onClick={() => handleAction(onJoinWorkspace)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white rounded-md hover:bg-white/[0.05] transition-colors"
              >
                <Users className="w-4 h-4" />
                Join Workspace
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 