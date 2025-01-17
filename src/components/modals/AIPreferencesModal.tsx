import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bot, Zap } from 'lucide-react';
import { AIAssistantPreferences, AIPersonality, AITone, AIExpertise, defaultPreferences } from '@/lib/types/aiAssistant';
import { db } from '@/lib/firebase/firebase';
import { ref, get, set } from 'firebase/database';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface AIPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function AIPreferencesModal({ isOpen, onClose, workspaceId }: AIPreferencesModalProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AIAssistantPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        const prefsRef = ref(db, `workspaces/${workspaceId}/users/${user.uid}/aiPreferences`);
        const snapshot = await get(prefsRef);
        
        if (snapshot.exists()) {
          setPreferences(snapshot.val());
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading AI preferences:', error);
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, workspaceId]);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      const prefsRef = ref(db, `workspaces/${workspaceId}/users/${user.uid}/aiPreferences`);
      await set(prefsRef, preferences);
      toast.success('AI preferences saved');
      onClose();
    } catch (error) {
      console.error('Error saving AI preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg mx-4"
      >
        {/* Glass morphism background */}
        <div className="relative bg-[#0A0F1C]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
            <div className="absolute -inset-[500px] opacity-10">
              <div className="absolute inset-0 rotate-45 bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 blur-3xl" />
            </div>
          </div>

          {/* Header */}
          <div className="relative p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                  AI Assistant Preferences
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-6 space-y-6">
            {/* Personality */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Personality
              </label>
              <select
                value={preferences.personality}
                onChange={(e) => setPreferences(prev => ({ ...prev, personality: e.target.value as AIPersonality }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 transition-all duration-200"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="humorous">Humorous</option>
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            {/* Tone */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Zap className="w-4 h-4 text-cyan-400" />
                Tone
              </label>
              <select
                value={preferences.tone}
                onChange={(e) => setPreferences(prev => ({ ...prev, tone: e.target.value as AITone }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/40 transition-all duration-200"
              >
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="empathetic">Empathetic</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            {/* Expertise */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Bot className="w-4 h-4 text-indigo-400" />
                Expertise Focus
              </label>
              <select
                value={preferences.expertise}
                onChange={(e) => setPreferences(prev => ({ ...prev, expertise: e.target.value as AIExpertise }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all duration-200"
              >
                <option value="general">General Knowledge</option>
                <option value="technical">Technical</option>
                <option value="creative">Creative</option>
                <option value="academic">Academic</option>
                <option value="business">Business</option>
              </select>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Sparkles className="w-4 h-4 text-pink-400" />
                Custom Instructions
              </label>
              <textarea
                value={preferences.customInstructions || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, customInstructions: e.target.value }))}
                placeholder="Add any specific instructions for your AI assistant..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/40 transition-all duration-200 min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="relative p-6 border-t border-white/5 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all duration-200 relative group"
            >
              <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <span className="relative">Save Preferences</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 