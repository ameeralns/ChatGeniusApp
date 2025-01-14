'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, push, get, set } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';
import { useRouter, useParams } from 'next/navigation';
import { Hash, ChevronDown, Plus, Settings, MessageSquare, Volume2, Users, MoreVertical, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'dm' | 'ai';
  category?: string;
  createdAt: number;
  members?: string[];
}

interface WorkspaceMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  status?: 'online' | 'offline' | 'idle' | 'dnd';
  lastOnline?: number;
}

interface ChannelSidebarProps {
  workspaceId: string;
  activeChannelId?: string;
  onChannelSelect?: (channelId: string, name?: string) => void;
  onCreateChannel?: () => void;
  onViewProfile?: (userId: string) => void;
}

export default function ChannelSidebar({ 
  workspaceId,
  activeChannelId: propActiveChannelId,
  onChannelSelect,
  onCreateChannel,
  onViewProfile
}: ChannelSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [workspaceName, setWorkspaceName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    memberId: string;
  } | null>(null);
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const activeChannelId = propActiveChannelId || (params?.channelId as string);

  // Add function to check if AI channel is active
  const isAIChannelActive = () => {
    const activeChannel = channels.find(channel => channel.id === activeChannelId);
    return activeChannel?.type === 'ai';
  };

  useEffect(() => {
    const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
    const workspaceRef = ref(db, `workspaces/${workspaceId}`);
    const membersRef = ref(db, `workspaces/${workspaceId}/members`);
    
    // Fetch workspace name
    const unsubscribeWorkspace = onValue(workspaceRef, (snapshot) => {
      if (snapshot.exists()) {
        const workspaceData = snapshot.val();
        setWorkspaceName(workspaceData.name);
      }
    });
    
    // Fetch channels
    const unsubscribeChannels = onValue(channelsRef, (snapshot) => {
      const channelsData = snapshot.val();
      if (channelsData) {
        const channelsList = Object.entries(channelsData).map(([id, data]: [string, any]) => ({
          id,
          name: data.name,
          type: data.type || 'text',
          createdAt: data.createdAt || 0,
          members: data.members
        }));

        const sortedChannels = channelsList.sort((a, b) => {
          if (a.name === 'general') return -1;
          if (b.name === 'general') return 1;
          return a.createdAt - b.createdAt;
        });

        setChannels(sortedChannels);
      }
    });

    // Fetch members
    const unsubscribeMembers = onValue(membersRef, async (snapshot) => {
      if (snapshot.exists()) {
        const membersData = snapshot.val();
        const membersList: WorkspaceMember[] = [];

        for (const [userId, data] of Object.entries(membersData)) {
          const userRef = ref(db, `users/${userId}`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            membersList.push({
              id: userId,
              name: userData.displayName || 'Anonymous',
              avatar: userData.photoURL,
              role: (data as any).role,
              status: userData.status || 'offline',
              lastOnline: userData.lastOnline
            });
          }
        }

        setMembers(membersList);
      }
    });

    return () => {
      unsubscribeChannels();
      unsubscribeWorkspace();
      unsubscribeMembers();
    };
  }, [workspaceId]);

  const handleChannelClick = (channelId: string, name?: string) => {
    if (onChannelSelect) {
      onChannelSelect(channelId, name);
      return;
    }
    router.push(`/workspace/${workspaceId}/channel/${channelId}`);
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(category)) {
        newCollapsed.delete(category);
      } else {
        newCollapsed.add(category);
      }
      return newCollapsed;
    });
  };

  const handleMemberAction = (e: React.MouseEvent, memberId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the button element's position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    // Calculate position to show menu to the left of the button
    const menuX = rect.left - 160; // Menu width is 160px
    const menuY = rect.top;

    // If menu would go off screen to the left, show it to the right of the button instead
    const finalX = menuX < 0 ? rect.right : menuX;
    
    setContextMenu({
      x: finalX,
      y: menuY,
      memberId
    });
  };

  const handleViewProfile = (memberId: string) => {
    if (onViewProfile) {
      onViewProfile(memberId);
    }
    setContextMenu(null);
  };

  const handleCreateDM = async (memberId: string) => {
    if (!user) return;

    // Check if DM channel already exists
    const existingDM = channels.find(channel => 
      channel.type === 'dm' && 
      channel.members?.includes(user.uid) && 
      channel.members?.includes(memberId)
    );

    if (existingDM) {
      handleChannelClick(existingDM.id);
      setContextMenu(null);
      return;
    }

    // Create new DM channel
    const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
    const newChannelRef = push(channelsRef);
    const member = members.find(m => m.id === memberId);
    
    await set(newChannelRef, {
      name: `${user.displayName}-${member?.name}`,
      type: 'dm',
      createdBy: user.uid,
      createdAt: Date.now(),
      members: [user.uid, memberId]
    });

    handleChannelClick(newChannelRef.key!);
    setContextMenu(null);
  };

  // Add click outside handler for context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && !(e.target as HTMLElement).closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Add function to handle AI chat button click
  const handleAIChatClick = async () => {
    try {
      // Find existing AI channel for the user
      const aiChannel = channels.find(channel => 
        channel.type === 'ai' && 
        channel.members?.includes(user?.uid || '')
      );

      if (aiChannel) {
        handleChannelClick(aiChannel.id);
      } else if (user) {
        // Create new AI channel if none exists
        const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
        const newChannelRef = push(channelsRef);
        
        await set(newChannelRef, {
          name: 'AI Assistant',
          type: 'ai',
          createdBy: user.uid,
          createdAt: Date.now(),
          members: [user.uid]
        });

        handleChannelClick(newChannelRef.key!);
      }
    } catch (error) {
      console.error('Error accessing AI chat:', error);
    }
  };

  return (
    <div className="w-60 bg-white/5 backdrop-blur-md flex flex-col border-r border-white/10">
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-white/5">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-medium text-white truncate"
        >
          {workspaceName}
        </motion.h2>
        <motion.button 
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          className="text-white/60 hover:text-white transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>
      
      <div className="flex-1 overflow-y-auto pt-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <motion.div layout className="mb-2">
          <div className="px-3 flex items-center justify-between group mb-1">
            <motion.button 
              whileHover={{ x: 2 }}
              onClick={() => toggleCategory('text-channels')}
              className="flex items-center text-xs font-medium text-white/60 hover:text-white uppercase tracking-wide transition-colors"
            >
              <motion.div
                animate={{ rotate: collapsedCategories.has('text-channels') ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3 h-3 mr-0.5" />
              </motion.div>
              Text Channels
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onCreateChannel}
              className="text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>

          <AnimatePresence>
            {!collapsedCategories.has('text-channels') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-0.5"
              >
                {channels
                  .filter(channel => channel.name === 'general' && channel.type !== 'dm' && channel.type !== 'ai')
                  .map(channel => (
                    <motion.button
                      key={channel.id}
                      whileHover={{ x: 4 }}
                      onClick={() => handleChannelClick(channel.id, channel.name)}
                      className={`w-full flex items-center px-2 py-[5px] mx-2 rounded-lg group ${
                        channel.id === activeChannelId
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center mr-2 ${
                        channel.id === activeChannelId ? 'opacity-100' : 'opacity-70'
                      }`}>
                        <Hash className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="truncate text-sm">{channel.name}</span>
                    </motion.button>
                  ))}

                {channels
                  .filter(channel => channel.name !== 'general' && channel.type !== 'dm' && channel.type !== 'ai')
                  .map(channel => (
                    <motion.button
                      key={channel.id}
                      whileHover={{ x: 4 }}
                      onClick={() => handleChannelClick(channel.id, channel.name)}
                      className={`w-full flex items-center px-2 py-[5px] mx-2 rounded-lg group ${
                        channel.id === activeChannelId
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center mr-2 ${
                        channel.id === activeChannelId ? 'opacity-100' : 'opacity-70'
                      }`}>
                        <Hash className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="truncate text-sm">{channel.name}</span>
                    </motion.button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div layout className="mb-2">
          <div className="px-3 flex items-center justify-between group mb-1">
            <motion.button 
              whileHover={{ x: 2 }}
              onClick={() => toggleCategory('voice-channels')}
              className="flex items-center text-xs font-medium text-white/60 hover:text-white uppercase tracking-wide transition-colors"
            >
              <motion.div
                animate={{ rotate: collapsedCategories.has('voice-channels') ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3 h-3 mr-0.5" />
              </motion.div>
              Voice Channels
            </motion.button>
          </div>

          <AnimatePresence>
            {!collapsedCategories.has('voice-channels') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-0.5"
              >
                <motion.button
                  whileHover={{ x: 4 }}
                  className="w-full flex items-center px-2 py-[5px] mx-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center mr-2 opacity-70">
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="truncate text-sm">General Voice</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mx-2 mb-4 border-t border-white/10" />

        <motion.div layout className="mb-2">
          <div className="px-3 flex items-center justify-between group mb-1">
            <motion.button 
              whileHover={{ x: 2 }}
              onClick={() => toggleCategory('members')}
              className="flex items-center text-xs font-medium text-white/60 hover:text-white uppercase tracking-wide transition-colors"
            >
              <motion.div
                animate={{ rotate: collapsedCategories.has('members') ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3 h-3 mr-0.5" />
              </motion.div>
              Members — {members.length}
            </motion.button>
          </div>

          <AnimatePresence>
            {!collapsedCategories.has('members') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-0.5"
              >
                {members.map(member => (
                  <motion.div
                    key={member.id}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center justify-between px-2 py-[5px] mx-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white group/member"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleViewProfile(member.id)}
                      >
                        {member.avatar ? (
                          <Image
                            src={member.avatar}
                            alt={member.name}
                            width={24}
                            height={24}
                            className="rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#5865F2] text-white flex items-center justify-center mr-2 text-sm">
                            {member.name[0]}
                          </div>
                        )}
                      </div>
                      <span className="truncate text-sm">
                        {member.name}
                        {member.id === user?.uid && <span className="ml-1 text-white/40">(you)</span>}
                      </span>
                    </div>
                    {member.id !== user?.uid && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleMemberAction(e, member.id)}
                        className="opacity-0 group-hover/member:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div layout className="mb-2">
          <div className="px-3 flex items-center justify-between group mb-1">
            <motion.button 
              whileHover={{ x: 2 }}
              onClick={() => toggleCategory('direct-messages')}
              className="flex items-center text-xs font-medium text-white/60 hover:text-white uppercase tracking-wide transition-colors"
            >
              <motion.div
                animate={{ rotate: collapsedCategories.has('direct-messages') ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3 h-3 mr-0.5" />
              </motion.div>
              Direct Messages
            </motion.button>
          </div>

          <AnimatePresence>
            {!collapsedCategories.has('direct-messages') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-0.5"
              >
                {channels
                  .filter(channel => channel.type === 'dm' && channel.members?.includes(user?.uid || ''))
                  .map(channel => {
                    const otherMemberId = channel.members?.find(id => id !== user?.uid);
                    const otherMember = members.find(m => m.id === otherMemberId);
                    
                    return (
                      <motion.button
                        key={channel.id}
                        whileHover={{ x: 4 }}
                        onClick={() => handleChannelClick(channel.id)}
                        className={`w-full flex items-center px-2 py-[5px] mx-2 rounded-lg group ${
                          channel.id === activeChannelId
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {otherMember?.avatar ? (
                          <Image
                            src={otherMember.avatar}
                            alt={otherMember.name}
                            width={24}
                            height={24}
                            className="rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#5865F2] text-white flex items-center justify-center mr-2 text-sm">
                            {otherMember?.name[0]}
                          </div>
                        )}
                        <span className="truncate text-sm">{otherMember?.name}</span>
                      </motion.button>
                    );
                  })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="mt-auto px-2 py-2">
        <motion.button
          onClick={handleAIChatClick}
          className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all duration-300 group relative overflow-hidden
            ${isAIChannelActive() 
              ? 'text-white bg-gradient-to-r from-indigo-500/10 to-purple-600/10' 
              : 'text-white/60 hover:text-white hover:bg-white/5'
            }
          `}
        >
          <div className={`relative w-9 h-9 rounded-xl bg-gradient-to-br p-0.5 transition-all duration-300
            ${isAIChannelActive()
              ? 'from-indigo-500 to-purple-600'
              : 'from-indigo-500/10 to-purple-600/10 group-hover:from-indigo-500 group-hover:to-purple-600'
            }
          `}>
            <div className={`w-full h-full rounded-[10px] flex items-center justify-center transition-colors duration-300
              ${isAIChannelActive() ? 'bg-transparent' : 'bg-[#0A0F1C] group-hover:bg-transparent'}
            `}>
              <Bot className="w-4 h-4" />
            </div>
          </div>
          AI Assistant
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-sm p-3 border-t border-white/10"
      >
        <div className="flex items-center space-x-2 text-white/60 text-xs">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
            <MessageSquare className="w-3 h-3 text-white" />
          </div>
          <span>Voice Connected</span>
        </div>
      </motion.div>

      {contextMenu && (
        <div 
          className="fixed bg-[#18191C] rounded-lg shadow-lg py-1 z-[100] min-w-[160px] context-menu"
          style={{ 
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewProfile(contextMenu.memberId)}
            className="w-full px-3 py-2 text-sm text-[#B5BAC1] hover:bg-[#4752C4] hover:text-white text-left flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Profile
          </button>
          {contextMenu.memberId !== user?.uid && (
            <button
              onClick={() => handleCreateDM(contextMenu.memberId)}
              className="w-full px-3 py-2 text-sm text-[#B5BAC1] hover:bg-[#4752C4] hover:text-white text-left flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </button>
          )}
        </div>
      )}
    </div>
  );
} 