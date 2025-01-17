import { useEffect, useState } from 'react';
import { useAIAgent } from '@/lib/contexts/AIAgentContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle, Building2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Workspace {
  id: string;
  name: string;
  channels?: {
    [key: string]: {
      name: string;
      type: string;
    };
  };
}

export default function AIAgentSettingsTab() {
  const { settings, toggleWorkspace, toggleDM, toggleChannel } = useAIAgent();
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!user) return;

      try {
        const userWorkspacesRef = ref(db, `users/${user.uid}/workspaces`);
        const snapshot = await get(userWorkspacesRef);
        const workspacesData = snapshot.val();

        if (workspacesData) {
          const workspacePromises = Object.keys(workspacesData).map(async (workspaceId) => {
            const workspaceRef = ref(db, `workspaces/${workspaceId}`);
            const workspaceSnapshot = await get(workspaceRef);
            const workspaceData = workspaceSnapshot.val();
            
            // Get channels for this workspace
            const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
            const channelsSnapshot = await get(channelsRef);
            const channelsData = channelsSnapshot.val();

            return {
              id: workspaceId,
              name: workspaceData.name,
              channels: channelsData
            };
          });

          const workspacesList = await Promise.all(workspacePromises);
          setWorkspaces(workspacesList);
        }
      } catch (error) {
        console.error('Error loading workspaces:', error);
      }
    };

    loadWorkspaces();
  }, [user]);

  const handleWorkspaceToggle = async (e: React.MouseEvent, workspaceId: string) => {
    e.stopPropagation(); // Prevent expansion toggle
    if (isLoading) return;

    try {
      setIsLoading(true);
      await toggleWorkspace(workspaceId);
      toast.success(settings.workspaces[workspaceId] 
        ? 'AI agent disabled for workspace' 
        : 'AI agent enabled for workspace'
      );
    } catch (error) {
      console.error('Error toggling workspace:', error);
      toast.error('Failed to update workspace settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDMToggle = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      await toggleDM();
      toast.success(settings.dmEnabled 
        ? 'AI agent disabled for direct messages' 
        : 'AI agent enabled for direct messages'
      );
    } catch (error) {
      console.error('Error toggling DM setting:', error);
      toast.error('Failed to update DM settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelToggle = async (e: React.MouseEvent, workspaceId: string, channelId: string) => {
    e.stopPropagation(); // Prevent expansion toggle
    if (isLoading) return;

    try {
      setIsLoading(true);
      await toggleChannel(workspaceId, channelId);
      toast.success(settings.channels?.[workspaceId]?.[channelId]
        ? 'AI agent disabled for channel'
        : 'AI agent enabled for channel'
      );
    } catch (error) {
      console.error('Error toggling channel:', error);
      toast.error('Failed to update channel settings');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWorkspaceExpansion = (workspaceId: string) => {
    setExpandedWorkspaces(prev => ({
      ...prev,
      [workspaceId]: !prev[workspaceId]
    }));
  };

  return (
    <div className="space-y-8 p-6">
      {/* Direct Messages Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-start space-x-4 p-4 rounded-lg bg-[#1a1625] hover:bg-[#1e1a2e] transition-colors">
          <MessageCircle className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium text-white">Direct Messages</Label>
                <p className="text-sm text-white/60">
                  When enabled, the AI agent will automatically respond to direct messages
                </p>
              </div>
              <div 
                className="relative"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDMToggle();
                }}
              >
                <Switch
                  checked={settings.dmEnabled}
                  disabled={isLoading}
                  className={cn(
                    "bg-[#2a2435] data-[state=checked]:bg-indigo-500",
                    "hover:bg-[#332d40] data-[state=checked]:hover:bg-indigo-600",
                    "transition-colors"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Workspaces Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <Label className="text-base font-medium text-white">Workspaces</Label>
        </div>

        <div className="space-y-4">
          {workspaces.map((workspace, index) => (
            <motion.div
              key={workspace.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-lg bg-[#1a1625] overflow-hidden"
            >
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#1e1a2e] transition-colors"
                onClick={() => toggleWorkspaceExpansion(workspace.id)}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{workspace.name}</p>
                  <p className="text-xs text-white/60">
                    {settings.workspaces[workspace.id] 
                      ? 'AI agent is responding in this workspace'
                      : 'AI agent is disabled for this workspace'
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div 
                    className="relative"
                    onClick={(e) => handleWorkspaceToggle(e, workspace.id)}
                  >
                    <Switch
                      checked={settings.workspaces[workspace.id] || false}
                      disabled={isLoading}
                      className={cn(
                        "bg-[#2a2435] data-[state=checked]:bg-indigo-500",
                        "hover:bg-[#332d40] data-[state=checked]:hover:bg-indigo-600",
                        "transition-colors"
                      )}
                    />
                  </div>
                  <ChevronDown 
                    className={cn(
                      "w-4 h-4 text-white/60 transition-transform",
                      expandedWorkspaces[workspace.id] && "transform rotate-180"
                    )} 
                  />
                </div>
              </div>

              <AnimatePresence>
                {expandedWorkspaces[workspace.id] && workspace.channels && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5"
                  >
                    <div className="p-4 space-y-3">
                      <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Channels</p>
                      {Object.entries(workspace.channels).map(([channelId, channel]) => (
                        <div 
                          key={channelId} 
                          className="flex items-center justify-between pl-4 py-2 hover:bg-[#1e1a2e] rounded-lg transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <Hash className="w-4 h-4 text-white/40" />
                            <span className="text-sm text-white/80">{channel.name}</span>
                          </div>
                          <div 
                            className="relative"
                            onClick={(e) => handleChannelToggle(e, workspace.id, channelId)}
                          >
                            <Switch
                              checked={settings.channels?.[workspace.id]?.[channelId] || false}
                              disabled={isLoading || !settings.workspaces[workspace.id]}
                              className={cn(
                                "bg-[#2a2435] data-[state=checked]:bg-indigo-500",
                                "hover:bg-[#332d40] data-[state=checked]:hover:bg-indigo-600",
                                "transition-colors",
                                (!settings.workspaces[workspace.id] || isLoading) && "opacity-50 cursor-not-allowed"
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 