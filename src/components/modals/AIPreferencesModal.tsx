import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[#1E1F22] w-full max-w-md rounded-lg shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-medium">AI Assistant Preferences</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Personality */}
          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium">Personality</label>
            <select
              value={preferences.personality}
              onChange={(e) => setPreferences(prev => ({ ...prev, personality: e.target.value as AIPersonality }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="humorous">Humorous</option>
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium">Tone</label>
            <select
              value={preferences.tone}
              onChange={(e) => setPreferences(prev => ({ ...prev, tone: e.target.value as AITone }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
            >
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="empathetic">Empathetic</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>

          {/* Expertise */}
          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium">Expertise Focus</label>
            <select
              value={preferences.expertise}
              onChange={(e) => setPreferences(prev => ({ ...prev, expertise: e.target.value as AIExpertise }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
            >
              <option value="general">General Knowledge</option>
              <option value="technical">Technical</option>
              <option value="creative">Creative</option>
              <option value="academic">Academic</option>
              <option value="business">Business</option>
            </select>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium">Custom Instructions (Optional)</label>
            <textarea
              value={preferences.customInstructions || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, customInstructions: e.target.value }))}
              placeholder="Add any specific instructions for your AI assistant..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2] min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors disabled:opacity-50"
          >
            Save Preferences
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
} 