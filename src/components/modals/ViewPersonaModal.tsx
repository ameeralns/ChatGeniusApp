'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserPersonaSummary, generateUserPersonaSummary } from '@/lib/vectordb/ai-agent-operations';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import AIAgentSettingsTab from '@/app/components/modals/AIAgentSettingsTab';

interface ViewPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'personality' | 'settings';

export default function ViewPersonaModal({ isOpen, onClose }: ViewPersonaModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('personality');
  const [personaSummary, setPersonaSummary] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && isOpen) {
      loadPersonaSummary();
    }
  }, [user, isOpen]);

  const loadPersonaSummary = async () => {
    if (!user) return;

    try {
      const userRef = ref(db, `users/${user.uid}/persona`);
      const snapshot = await get(userRef);
      const data = snapshot.val();
      
      if (data) {
        setPersonaSummary(data.summary);
        setLastUpdated(data.lastUpdated);
      } else {
        setPersonaSummary("No persona summary available. Click refresh to generate one.");
      }
    } catch (error) {
      console.error('Error loading persona summary:', error);
      toast.error('Failed to load persona summary');
    }
  };

  const handleRefresh = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-agent/generate-persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate persona summary');
      }

      const data = await response.json();
      setPersonaSummary(data.summary);
      setLastUpdated(Date.now());
      toast.success('Persona summary updated');
    } catch (error) {
      console.error('Error refreshing persona summary:', error);
      toast.error('Failed to update persona summary');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl h-[80vh] bg-[#0A0F1C] rounded-2xl shadow-xl border border-white/10 overflow-hidden flex flex-col"
          >
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
              <div className="absolute -inset-[500px] opacity-10">
                <div className="absolute inset-0 rotate-45 bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 blur-3xl" />
              </div>
            </div>

            {/* Header */}
            <div className="p-6 border-b border-white/5 flex-shrink-0">
              <h2 className="text-xl font-semibold text-white">AI Agent Persona</h2>
            </div>

            {/* Tabs */}
            <div className="flex p-4 space-x-2 border-b border-white/5 flex-shrink-0">
              <button
                onClick={() => setActiveTab('personality')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === 'personality'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                Personality
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                Settings
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
              <AnimatePresence mode="wait">
                {activeTab === 'personality' ? (
                  <motion.div
                    key="personality"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="h-full flex flex-col p-6"
                  >
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-white">Persona Summary</h3>
                        {lastUpdated && (
                          <span className="text-xs text-white/40">
                            Last updated: {new Date(lastUpdated).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={cn(
                          "p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors",
                          isLoading && "animate-spin"
                        )}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 bg-white/5 rounded-lg p-4 text-white/80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {personaSummary || "Loading..."}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                  >
                    <AIAgentSettingsTab />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-white/5 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 