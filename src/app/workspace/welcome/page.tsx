'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { motion } from 'framer-motion';
import { Plus, UserPlus } from 'lucide-react';
import CreateWorkspaceModal from '@/components/workspace/CreateWorkspaceModal';
import JoinWorkspaceModal from '@/components/workspace/JoinWorkspaceModal';

export default function WelcomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleWorkspaceCreated = (workspaceId: string) => {
    setShowCreateModal(false);
    router.push(`/workspace/${workspaceId}/channel/general`);
  };

  const handleWorkspaceJoined = (workspaceId: string) => {
    setShowJoinModal(false);
    router.push(`/workspace/${workspaceId}/channel/general`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 bg-[#313338] flex items-center justify-center p-4 min-h-screen relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-l from-emerald-500/20 to-cyan-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-4xl w-full mx-auto relative z-10"
      >
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#5865F2] to-[#4752C4]"
          >
            Welcome to ChatGenius!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-[#B5BAC1] text-xl"
          >
            Create your own workspace or join an existing one to start chatting.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-4">
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            onClick={() => setShowCreateModal(true)}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
            <div className="relative flex flex-col items-center justify-center p-8 bg-[#2B2D31]/80 backdrop-blur-xl rounded-xl border border-white/10 hover:border-[#5865F2]/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Create a Workspace</h2>
              <p className="text-[#B5BAC1] text-center">
                Start fresh with a new workspace for your team
              </p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            onClick={() => setShowJoinModal(true)}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
            <div className="relative flex flex-col items-center justify-center p-8 bg-[#2B2D31]/80 backdrop-blur-xl rounded-xl border border-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Join a Workspace</h2>
              <p className="text-[#B5BAC1] text-center">
                Join an existing workspace with an invite code
              </p>
            </div>
          </motion.button>
        </div>
      </motion.div>

      <CreateWorkspaceModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
      
      <JoinWorkspaceModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)}
        onWorkspaceJoined={handleWorkspaceJoined}
      />
    </div>
  );
} 