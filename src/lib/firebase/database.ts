import { ref, get, set, update, push, remove, query, orderByChild, equalTo, serverTimestamp, onValue, DataSnapshot } from 'firebase/database';
import { db } from './firebase';
import { auth } from './firebase';
import {
  DatabaseReference,
  child,
} from 'firebase/database';

interface WorkspaceRole {
  role: 'admin' | 'member';
  joinedAt: number;
}

interface BaseWorkspace {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  defaultChannel: string;
  inviteCode?: string;
  members: { [key: string]: WorkspaceRole };
  channels: {
    [key: string]: {
      id: string;
      name: string;
      description: string;
      createdAt: number;
      createdBy: string;
      type: string;
      isDefault: boolean;
    };
  };
}

interface WorkspaceData extends Omit<BaseWorkspace, 'id'> {}

interface Workspace extends BaseWorkspace {}

interface Channel {
  id: string | null;
  name: string;
  createdBy: string;
  createdAt: number;
}

export interface Message {
  id: string | null;
  content: string;
  userId: string;
  createdAt: number;
  type: 'text' | 'file';
  userProfile: {
    displayName: string | null;
    photoURL: string | null;
    photoURLUpdatedAt?: number;
  };
  fileData?: {
    fileName: string;
    fileKey: string;
    fileType: string;
    url: string;
  };
  reactions?: {
    [reactionId: string]: {
      emoji: string;
      userId: string;
      createdAt: number;
    }
  };
  threadId?: string;
  parentId?: string;
  replyCount?: number;
}

interface UserProfile {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  photoURL: string | null;
  photoURLKey?: string | null;
  photoURLUpdatedAt?: number;
  bio?: string | null;
  createdAt: number;
  updatedAt: number;
  workspaces: {
    [workspaceId: string]: {
      role: 'admin' | 'user';
      joinedAt: number;
    }
  };
}

interface CreateUserProfileParams {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  appleCredential?: {
    providerId?: string;
    signInMethod?: string;
  };
}

interface CreateWorkspaceResult {
  workspaceId: string;
  defaultChannelId: string;
}

interface ReactionUser {
  createdAt: number;
}

interface ReactionData {
  emoji: string;
  users: {
    [userId: string]: ReactionUser;
  };
}

// Workspace Operations
export async function createWorkspace(name: string, userId: string) {
  try {
    // Create the workspace
    const workspaceRef = push(ref(db, 'workspaces'));
    const workspaceId = workspaceRef.key;
    
    if (!workspaceId) {
      throw new Error('Failed to generate workspace ID');
    }

    const timestamp = Date.now();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create workspace data with the creator as the first member
    await set(workspaceRef, {
      name,
      createdBy: userId,
      createdAt: timestamp,
      inviteCode,
      members: {
        [userId]: {
          role: 'admin',
          joinedAt: timestamp
        }
      }
    });

    // Create a general channel automatically
    const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
    const generalChannelRef = push(channelsRef);
    await set(generalChannelRef, {
      name: 'general',
      createdBy: userId,
      createdAt: timestamp
    });

    // Add workspace to user's workspaces
    await set(ref(db, `users/${userId}/workspaces/${workspaceId}`), {
      role: 'admin',
      joinedAt: timestamp
    });

    return { workspaceId, defaultChannelId: generalChannelRef.key };
  } catch (error) {
    console.error('Error creating workspace:', error);
    throw error;
  }
}

export async function joinWorkspace(inviteCode: string, userId: string): Promise<string> {
  try {
    if (!inviteCode?.trim() || !userId?.trim()) {
      throw new Error('Valid invite code and user ID are required');
    }

    // Get all workspaces and find the one with matching invite code
    const workspacesRef = ref(db, 'workspaces');
    const snapshot = await get(workspacesRef);

    if (!snapshot.exists()) {
      throw new Error('Invalid invite code');
    }

    // Find workspace with matching invite code
    const workspaces = snapshot.val();
    const workspaceEntry = Object.entries(workspaces).find(
      ([_, workspace]: [string, any]) => (workspace as WorkspaceData).inviteCode === inviteCode
    );

    if (!workspaceEntry) {
      throw new Error('Invalid invite code');
    }

    const [workspaceId, workspace] = workspaceEntry as [string, WorkspaceData];

    // Check if user is already a member
    if (workspace.members?.[userId]) {
      throw new Error('You are already a member of this workspace');
    }

    const timestamp = Date.now();

    // First add the user to the workspace members
    await set(ref(db, `workspaces/${workspaceId}/members/${userId}`), {
      role: 'member',
      joinedAt: timestamp
    });

    // Then add the workspace to the user's workspaces
    await set(ref(db, `users/${userId}/workspaces/${workspaceId}`), {
      role: 'member',
      joinedAt: timestamp
    });

    // Check if general channel exists
    const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
    const channelsSnapshot = await get(channelsRef);
    let generalChannelId: string | null = null;

    if (channelsSnapshot.exists()) {
      const channels = channelsSnapshot.val();
      const generalChannel = Object.entries(channels).find(
        ([_, channel]: [string, any]) => channel.name === 'general'
      );
      if (generalChannel) {
        generalChannelId = generalChannel[0];
      }
    }

    // If no general channel exists, create one
    if (!generalChannelId) {
      const newChannelRef = push(channelsRef);
      generalChannelId = newChannelRef.key;
      if (generalChannelId) {
        await set(newChannelRef, {
          name: 'general',
          description: 'Welcome to the general channel!',
          createdBy: userId,
          createdAt: timestamp,
          type: 'text',
          isDefault: true
        });
      }
    }

    return workspaceId;
  } catch (error) {
    console.error('Error joining workspace:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to join workspace');
  }
}

export async function getUserWorkspaces(userId: string) {
  try {
    if (!userId) {
      console.error('getUserWorkspaces: No userId provided');
      return [];
    }

    console.log('Getting workspaces for user:', userId);
    const userWorkspacesRef = ref(db, `users/${userId}/workspaces`);
    const snapshot = await get(userWorkspacesRef);

    if (!snapshot.exists()) {
      console.log('No workspaces found for user:', userId);
      return [];
    }

    const workspaces = snapshot.val();
    const workspacePromises = Object.keys(workspaces).map(async (workspaceId) => {
      try {
        const workspaceRef = ref(db, `workspaces/${workspaceId}`);
        const workspaceSnapshot = await get(workspaceRef);
        
        if (!workspaceSnapshot.exists()) {
          console.warn(`Workspace ${workspaceId} not found in database`);
          return null;
        }

        const workspaceData = workspaceSnapshot.val();
        return {
          id: workspaceId,
          ...workspaceData,
          role: workspaces[workspaceId].role
        };
      } catch (error) {
        console.error(`Error fetching workspace ${workspaceId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(workspacePromises);
    return results.filter(workspace => workspace !== null);
  } catch (error) {
    console.error('Error in getUserWorkspaces:', error);
    throw new Error('Failed to load workspaces. Please check your connection and try again.');
  }
}

// Channel Operations
export const createChannel = async (workspaceId: string, channelData: { name: string; createdBy: string }): Promise<string> => {
  try {
    const channelRef = push(ref(db, `workspaces/${workspaceId}/channels`));
    const channelId = channelRef.key;

    if (!channelId) {
      throw new Error('Failed to generate channel ID');
    }

    const channel: Channel = {
      id: channelId,
      name: channelData.name,
      createdBy: channelData.createdBy,
      createdAt: Date.now(),
    };

    await set(channelRef, channel);
    return channelId;
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
};

export const getChannels = async (workspaceId: string): Promise<Channel[]> => {
  try {
    const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
    const snapshot = await get(channelsRef);
    
    if (!snapshot.exists()) return [];

    const channels: Channel[] = [];
    snapshot.forEach((child) => {
      channels.push({
        ...child.val(),
        id: child.key,
      });
    });

    return channels;
  } catch (error) {
    console.error('Error getting workspace channels:', error);
    throw error;
  }
};

export const subscribeToChannels = (workspaceId: string, callback: (channels: Channel[]) => void): (() => void) => {
  const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
  
  const unsubscribe = onValue(channelsRef, (snapshot) => {
    const channels: Channel[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        channels.push({
          ...child.val(),
          id: child.key,
        });
      });
    }
    callback(channels);
  });

  return unsubscribe;
};

// Message Operations
export const sendMessage = async (
  channelId: string,
  workspaceId: string,
  content: string,
  userId: string,
  type: 'text' | 'file' = 'text',
  fileData?: {
    fileName: string;
    fileType: string;
    url: string;
  }
) => {
  const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
  const userRef = ref(db, `users/${userId}`);
  
  // Get user profile data
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();
  
  const messageData = {
    content,
    userId,
    type,
    createdAt: serverTimestamp(),
    userProfile: {
      displayName: userData?.displayName || null,
      photoURL: userData?.photoURL || null,
      photoURLUpdatedAt: userData?.photoURLUpdatedAt || null
    },
    ...(fileData && { fileData })
  };
  
  await push(messagesRef, messageData);
};

export const subscribeToMessages = (
  workspaceId: string,
  channelId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
  
  const unsubscribe = onValue(messagesRef, async (snapshot) => {
    const messages: Message[] = [];
    if (snapshot.exists()) {
      const messagePromises: Promise<Message>[] = [];
      
      snapshot.forEach((child) => {
        const messageData = child.val();
        // If message doesn't have user profile, fetch it
        if (!messageData.userProfile) {
          const promise = get(ref(db, `users/${messageData.userId}`))
            .then((userSnapshot) => {
              const userProfile = userSnapshot.val();
              return {
                ...messageData,
                id: child.key,
                userProfile: {
                  displayName: userProfile?.displayName || null,
                  photoURL: userProfile?.photoURL || null,
                  photoURLUpdatedAt: userProfile?.photoURLUpdatedAt || null
                }
              } as Message;
            })
            .catch(() => ({
              ...messageData,
              id: child.key,
              userProfile: {
                displayName: null,
                photoURL: null
              }
            } as Message));
          messagePromises.push(promise);
        } else {
          messages.push({
            ...messageData,
            id: child.key
          } as Message);
        }
      });

      if (messagePromises.length > 0) {
        const fetchedMessages = await Promise.all(messagePromises);
        messages.push(...fetchedMessages);
      }
    }
    
    // Sort messages by createdAt
    messages.sort((a, b) => a.createdAt - b.createdAt);
    callback(messages);
  });

  return unsubscribe;
};

// User Profile Operations
export const createUserProfile = async (userId: string, data: {
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoURL?: string | null;
}) => {
  const timestamp = Date.now();
  const userRef = ref(db, `users/${userId}`);

  const profile = {
    id: userId,
    email: data.email,
    displayName: data.displayName || null,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    photoURL: data.photoURL || null,
    createdAt: timestamp,
    updatedAt: timestamp,
    workspaces: {}
  };

  await set(userRef, profile);
  return profile;
};

export const addWorkspaceToUserProfile = async (
  userId: string,
  workspaceId: string,
  role: 'admin' | 'user',
  joinedAt: number = Date.now()
): Promise<void> => {
  try {
    if (!userId?.trim() || !workspaceId?.trim()) {
      throw new Error('Valid user ID and workspace ID are required');
    }
    if (!['admin', 'user'].includes(role)) {
      throw new Error('Invalid role specified');
    }

    const userRef = ref(db, `users/${userId}`);
    const workspaceRef = ref(db, `workspaces/${workspaceId}`);
    
    // Get both user and workspace data simultaneously
    const [userSnapshot, workspaceSnapshot] = await Promise.all([
      get(userRef),
      get(workspaceRef)
    ]);

    if (!userSnapshot.exists()) {
      throw new Error('User profile not found');
    }
    if (!workspaceSnapshot.exists()) {
      throw new Error('Workspace not found');
    }

    const userData = userSnapshot.val() as UserProfile;
    const workspaceData = workspaceSnapshot.val() as WorkspaceData;
    
    // Verify workspace membership consistency
    const isMemberInWorkspace = workspaceData.members?.[userId] !== undefined;
    const isInUserWorkspaces = userData.workspaces?.[workspaceId] !== undefined;

    if (isMemberInWorkspace !== isInUserWorkspaces) {
      // Fix inconsistency
      const updates: { [key: string]: any } = {};
      
      if (!isInUserWorkspaces && isMemberInWorkspace) {
        // Add to user's workspaces if missing
        updates[`users/${userId}/workspaces/${workspaceId}`] = {
          role: workspaceData.members[userId].role,
          joinedAt: workspaceData.members[userId].joinedAt
        };
      } else if (!isMemberInWorkspace && isInUserWorkspaces) {
        // Add to workspace members if missing
        updates[`workspaces/${workspaceId}/members/${userId}`] = {
          role: userData.workspaces[workspaceId].role,
          joinedAt: userData.workspaces[workspaceId].joinedAt
        };
      }
      
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
    }

    // Update role if different
    if (userData.workspaces?.[workspaceId]?.role !== role) {
      const updates: { [key: string]: any } = {
        [`users/${userId}/workspaces/${workspaceId}`]: {
          role,
          joinedAt
        },
        [`workspaces/${workspaceId}/members/${userId}`]: {
          role,
          joinedAt
        },
        [`users/${userId}/updatedAt`]: Date.now()
      };
      
      await update(ref(db), updates);
    }
  } catch (error) {
    console.error('Error adding workspace to user profile:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to add workspace to user profile');
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'email' | 'photoURL' | 'photoURLKey' | 'bio'>>
): Promise<void> => {
  try {
    const timestamp = Date.now();

    // 1. First update the main user profile
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error('User profile not found');
    }

    const currentProfile = userSnapshot.val();
    const updatedProfile = {
      ...currentProfile,
      ...(updates.displayName !== undefined && { displayName: updates.displayName }),
      ...(updates.email !== undefined && { email: updates.email }),
      ...(updates.photoURL !== undefined && { 
        photoURL: updates.photoURL,
        photoURLUpdatedAt: timestamp 
      }),
      ...(updates.photoURLKey !== undefined && { photoURLKey: updates.photoURLKey }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
      updatedAt: timestamp
    };

    // Create the consistent user profile data that will be used in all messages
    const messageUserProfile = {
      displayName: updatedProfile.displayName,
      photoURL: updatedProfile.photoURL,
      photoURLUpdatedAt: updatedProfile.photoURLUpdatedAt,
      profileVersion: timestamp // Add version to track updates
    };

    // 2. Update main profile
    await set(userRef, updatedProfile);

    // 3. Get all workspaces
    const workspacesRef = ref(db, 'workspaces');
    const workspacesSnapshot = await get(workspacesRef);
    
    if (workspacesSnapshot.exists()) {
      const workspaces = workspacesSnapshot.val();
      
      // Process each workspace
      for (const workspaceId in workspaces) {
        const workspace = workspaces[workspaceId];
        const batchUpdates: { [key: string]: any } = {};
        
        // Update workspace member data
        if (workspace.members?.[userId]) {
          batchUpdates[`workspaces/${workspaceId}/members/${userId}`] = {
            ...workspace.members[userId],
            ...messageUserProfile
          };
        }

        // Process each channel in the workspace
        if (workspace.channels) {
          for (const channelId in workspace.channels) {
            // Update main channel messages
            const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
            const messagesSnapshot = await get(messagesRef);
            
            if (messagesSnapshot.exists()) {
              messagesSnapshot.forEach((messageSnapshot) => {
                const message = messageSnapshot.val();
                if (message.userId === userId) {
                  batchUpdates[`workspaces/${workspaceId}/channels/${channelId}/messages/${messageSnapshot.key}/userProfile`] = messageUserProfile;
                }
              });
            }

            // Update thread messages
            const threadsRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/threads`);
            const threadsSnapshot = await get(threadsRef);
            
            if (threadsSnapshot.exists()) {
              threadsSnapshot.forEach((threadSnapshot) => {
                const thread = threadSnapshot.val();
                if (thread.messages) {
                  Object.entries(thread.messages).forEach(([messageId, message]: [string, any]) => {
                    if (message.userId === userId) {
                      batchUpdates[`workspaces/${workspaceId}/channels/${channelId}/threads/${threadSnapshot.key}/messages/${messageId}/userProfile`] = messageUserProfile;
                    }
                  });
                }
              });
            }
          }
        }

        // Apply all updates for this workspace in a single batch
        if (Object.keys(batchUpdates).length > 0) {
          await update(ref(db), batchUpdates);
        }
      }
    }

    // 4. Update presence data
    const presenceRef = ref(db, `userPresence/v1/${userId}`);
    const presenceSnapshot = await get(presenceRef);
    if (presenceSnapshot.exists()) {
      await set(presenceRef, {
        ...presenceSnapshot.val(),
        ...messageUserProfile
      });
    }

  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  try {
    console.log('Getting user profile for:', userId);
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      console.log('User profile not found');
      throw new Error('User profile not found');
    }

    const profile = snapshot.val() as UserProfile;
    console.log('Found user profile:', profile);
    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export async function leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
  const workspaceRef = ref(db, `workspaces/${workspaceId}`);
  const snapshot = await get(workspaceRef);
  const workspace = snapshot.val() as WorkspaceData;

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  if (workspace.createdBy === userId) {
    throw new Error('Workspace creator cannot leave the workspace');
  }

  if (!workspace.members[userId]) {
    throw new Error('You are not a member of this workspace');
  }

  const updates: { [key: string]: null } = {
    [`workspaces/${workspaceId}/members/${userId}`]: null,
    [`users/${userId}/workspaces/${workspaceId}`]: null
  };

  await update(ref(db), updates);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const workspaceRef = ref(db, `workspaces/${workspaceId}`);
  const snapshot = await get(workspaceRef);
  const workspace = snapshot.val() as WorkspaceData;

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  // Remove workspace from all members' workspace lists
  const memberUpdates = Object.keys(workspace.members).reduce((acc, userId) => {
    acc[`users/${userId}/workspaces/${workspaceId}`] = null;
    return acc;
  }, {} as { [key: string]: null });

  // Delete the workspace itself
  memberUpdates[`workspaces/${workspaceId}`] = null;

  await update(ref(db), memberUpdates);
}

export async function getWorkspaceInviteCode(workspaceId: string): Promise<string> {
  const workspaceRef = ref(db, `workspaces/${workspaceId}`);
  const snapshot = await get(workspaceRef);
  const workspace = snapshot.val() as WorkspaceData;

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  if (!workspace.inviteCode) {
    // Generate a new invite code if one doesn't exist
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await update(ref(db, `workspaces/${workspaceId}`), { inviteCode });
    return inviteCode;
  }

  return workspace.inviteCode;
}

export const syncUserWorkspaces = async () => {
  try {
    // Get all users
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      console.log('No users found');
      return;
    }

    // Get all workspaces
    const workspacesRef = ref(db, 'workspaces');
    const workspacesSnapshot = await get(workspacesRef);
    
    const updates: { [key: string]: any } = {};

    // Iterate through each workspace
    workspacesSnapshot.forEach((workspaceSnapshot) => {
      const workspaceId = workspaceSnapshot.key;
      const workspace = workspaceSnapshot.val() as WorkspaceData;
      
      // For each member in the workspace
      Object.keys(workspace.members).forEach((userId) => {
        const memberData = workspace.members[userId];
        // Add to user's workspaces
        updates[`users/${userId}/workspaces/${workspaceId}`] = {
          role: memberData.role || 'member',
          joinedAt: memberData.joinedAt || workspace.createdAt
        };
      });
    });

    // Apply all updates
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
      console.log('Successfully synchronized user workspaces');
    } else {
      console.log('No updates needed');
    }
  } catch (error) {
    console.error('Error synchronizing user workspaces:', error);
  }
};

// Helper function to generate unique invite codes
async function generateUniqueInviteCode(): Promise<string> {
  // Generate a random string of 10 characters (alphanumeric)
  const code = Math.random().toString(36).substring(2, 12).toUpperCase();
  // Check if this code is already in use
  const workspacesRef = ref(db, 'workspaces');
  const workspaceQuery = query(workspacesRef, orderByChild('inviteCode'), equalTo(code));
  const snapshot = await get(workspaceQuery);
  
  if (snapshot.exists()) {
    // If code exists, try again recursively
    return generateUniqueInviteCode();
  }
  return code;
}

export const createWorkspaceWithValidation = async (
  workspaceData: {
    name: string;
    creatorId: string;
  }
): Promise<CreateWorkspaceResult> => {
  try {
    // Input validation
    if (!workspaceData.name?.trim()) {
      throw new Error('Workspace name is required');
    }
    if (!workspaceData.creatorId?.trim()) {
      throw new Error('Creator ID is required');
    }

    // Verify creator exists
    const creatorRef = ref(db, `users/${workspaceData.creatorId}`);
    const creatorSnapshot = await get(creatorRef);
    if (!creatorSnapshot.exists()) {
      throw new Error('Creator profile not found');
    }

    // Generate a unique workspace ID with timestamp to ensure uniqueness
    const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const defaultChannelId = 'general';
    const timestamp = Date.now();

    // Generate and verify unique invite code
    const inviteCode = await generateUniqueInviteCode();

    // Create the workspace data structure
    const newWorkspaceData: WorkspaceData = {
      name: workspaceData.name.trim(),
      createdBy: workspaceData.creatorId,
      createdAt: timestamp,
      defaultChannel: defaultChannelId,
      inviteCode,
      members: {
        [workspaceData.creatorId]: {
          role: 'admin',
          joinedAt: timestamp
        }
      },
      channels: {
        [defaultChannelId]: {
          id: defaultChannelId,
          name: 'general',
          description: 'Welcome to your new workspace! This is the default channel for all members.',
          createdAt: timestamp,
          createdBy: workspaceData.creatorId,
          type: 'text',
          isDefault: true
        }
      }
    };

    // Use a transaction to ensure atomicity
    const updates: { [key: string]: any } = {
      [`workspaces/${workspaceId}`]: newWorkspaceData
    };

    // Create workspace and add to creator's profile atomically
    await Promise.all([
      update(ref(db), updates),
      addWorkspaceToUserProfile(workspaceData.creatorId, workspaceId, 'admin', timestamp)
    ]);

    return {
      workspaceId,
      defaultChannelId
    };
  } catch (error) {
    console.error('Error creating workspace:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create workspace');
  }
};

export const addReaction = async (
  workspaceId: string,
  channelId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<string> => {
  try {
    const messageReactionsRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/reactions`);
    
    // Get current reactions
    const snapshot = await get(messageReactionsRef);
    const reactions = snapshot.val() as { [key: string]: ReactionData } || {};
    
    // Check if this emoji already exists
    const existingReactionEntry = Object.entries(reactions).find(
      ([_, reaction]) => reaction.emoji === emoji
    );

    if (existingReactionEntry) {
      // Emoji exists, add user to existing reaction
      const [reactionId, reaction] = existingReactionEntry;
      const users = reaction.users || {};
      
      // Add the new user if they haven't reacted yet
      if (!users[userId]) {
        users[userId] = {
          createdAt: Date.now()
        };
        
        await set(ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/reactions/${reactionId}`), {
          emoji: reaction.emoji,
          users
        });
      }
      
      return reactionId;
    } else {
      // Create new reaction with first user
      const newReactionRef = push(messageReactionsRef);
      const reactionId = newReactionRef.key;

      if (!reactionId) {
        throw new Error('Failed to generate reaction ID');
      }

      const reaction: ReactionData = {
        emoji,
        users: {
          [userId]: {
            createdAt: Date.now()
          }
        }
      };

      await set(newReactionRef, reaction);
      return reactionId;
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

export const removeReaction = async (
  workspaceId: string,
  channelId: string,
  messageId: string,
  reactionId: string,
  userId: string
): Promise<void> => {
  try {
    const reactionRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/reactions/${reactionId}`);
    const snapshot = await get(reactionRef);
    const reaction = snapshot.val() as ReactionData;

    if (!reaction) {
      throw new Error('Reaction not found');
    }

    const users = reaction.users || {};
    delete users[userId];

    // If no users left, remove the entire reaction
    if (Object.keys(users).length === 0) {
      await remove(reactionRef);
    } else {
      // Update the reaction with the remaining users
      await set(reactionRef, {
        emoji: reaction.emoji,
        users
      });
    }
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
};

export const createThread = async (
  workspaceId: string,
  channelId: string,
  parentMessageId: string,
  content: string,
  userId: string,
  fileData?: {
    fileName: string;
    fileKey: string;
    fileType: string;
  }
): Promise<string> => {
  try {
    // Create a new thread ID
    const threadId = push(ref(db, `workspaces/${workspaceId}/channels/${channelId}/threads`)).key;
    if (!threadId) {
      throw new Error('Failed to generate thread ID');
    }

    // Create the first thread message
    const firstMessageId = push(ref(db, `workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/messages`)).key;
    if (!firstMessageId) {
      throw new Error('Failed to generate message ID');
    }

    const firstMessage = {
      id: firstMessageId,
      content,
      userId,
      createdAt: Date.now(),
      type: fileData ? 'file' : 'text',
      ...(fileData && { fileData }),
      threadId,
      parentMessageId
    };

    // Update the parent message and create the thread with its first message
    const updates: { [key: string]: any } = {
      // Update parent message with thread info
      [`workspaces/${workspaceId}/channels/${channelId}/messages/${parentMessageId}/threadId`]: threadId,
      [`workspaces/${workspaceId}/channels/${channelId}/messages/${parentMessageId}/replyCount`]: 1,
      
      // Create thread
      [`workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/parentMessageId`]: parentMessageId,
      [`workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/createdAt`]: Date.now(),
      [`workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/createdBy`]: userId,
      
      // Add first message to thread
      [`workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/messages/${firstMessageId}`]: firstMessage
    };

    await update(ref(db), updates);
    return threadId;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

export const replyToThread = async (
  workspaceId: string,
  channelId: string,
  threadId: string,
  parentMessageId: string,
  content: string,
  userId: string,
  fileData?: {
    fileName: string;
    fileKey: string;
    fileType: string;
  }
): Promise<string> => {
  try {
    // First verify the thread exists
    const threadRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}`);
    const threadSnapshot = await get(threadRef);
    if (!threadSnapshot.exists()) {
      throw new Error('Thread not found');
    }

    // Generate message ID
    const messageId = push(ref(db, `workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/messages`)).key;
    if (!messageId) {
      throw new Error('Failed to generate message ID');
    }

    const replyMessage = {
      id: messageId,
      content,
      userId,
      createdAt: Date.now(),
      type: fileData ? 'file' : 'text',
      ...(fileData && { fileData }),
      threadId,
      parentMessageId
    };

    // Get current reply count
    const parentMessageRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages/${parentMessageId}`);
    const parentMessageSnapshot = await get(parentMessageRef);
    if (!parentMessageSnapshot.exists()) {
      throw new Error('Parent message not found');
    }
    const currentReplyCount = parentMessageSnapshot.val().replyCount || 0;

    // Update both the thread messages and the parent message reply count
    const updates: { [key: string]: any } = {
      [`workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/messages/${messageId}`]: replyMessage,
      [`workspaces/${workspaceId}/channels/${channelId}/messages/${parentMessageId}/replyCount`]: currentReplyCount + 1
    };

    await update(ref(db), updates);
    return messageId;
  } catch (error) {
    console.error('Error replying to thread:', error);
    throw error;
  }
};

export const subscribeToThread = (
  workspaceId: string,
  channelId: string,
  threadId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  console.log('Subscribing to thread:', { workspaceId, channelId, threadId });
  
  const threadRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/messages`);
  
  const unsubscribe = onValue(threadRef, (snapshot) => {
    console.log('Thread update received:', snapshot.exists());
    
    const messages: Message[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const message = child.val();
        messages.push({
          ...message,
          id: message.id || child.key,
        });
      });
      
      // Sort messages by createdAt
      messages.sort((a, b) => a.createdAt - b.createdAt);
      console.log('Processed thread messages:', messages.length);
    }
    
    callback(messages);
  }, (error) => {
    console.error('Error in thread subscription:', error);
  });

  return () => {
    console.log('Unsubscribing from thread:', threadId);
    unsubscribe();
  };
};

// Migration function to update all messages to new pattern
export async function migrateMessagesToNewPattern(): Promise<number> {
  try {
    const workspacesRef = ref(db, 'workspaces');
    const workspacesSnapshot = await get(workspacesRef);

    if (!workspacesSnapshot.exists()) {
      console.log('No workspaces found');
      return 0;
    }

    let totalUpdated = 0;
    const workspaces = workspacesSnapshot.val();

    for (const [workspaceId, workspace] of Object.entries(workspaces)) {
      const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
      const channelsSnapshot = await get(channelsRef);

      if (!channelsSnapshot.exists()) continue;

      const channels = channelsSnapshot.val();
      for (const [channelId, channel] of Object.entries(channels)) {
        const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
        const messagesSnapshot = await get(messagesRef);

        if (!messagesSnapshot.exists()) continue;

        const messages = messagesSnapshot.val();
        for (const [messageId, message] of Object.entries(messages)) {
          const messageData = message as any;
          
          // Skip if message is already in new format
          if (messageData.type) continue;

          const updates: any = {
            [`workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/type`]: 'text',
            [`workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/createdAt`]: messageData.timestamp || Date.now()
          };

          // Remove old fields
          updates[`workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/timestamp`] = null;
          updates[`workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/userName`] = null;
          updates[`workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/userAvatar`] = null;

          await update(ref(db), updates);
          totalUpdated++;
        }
      }
    }

    console.log(`Migration completed. Updated ${totalUpdated} messages.`);
    return totalUpdated;
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Function to get user profile from workspace members
export const getUserProfileFromWorkspace = async (workspaceId: string, userId: string) => {
  const memberRef = ref(db, `workspaces/${workspaceId}/members/${userId}`);
  const memberSnapshot = await get(memberRef);
  
  if (!memberSnapshot.exists()) {
    throw new Error('User is not a member of this workspace');
  }

  return memberSnapshot.val();
};

// Add this function to handle DM channels
export const getOrCreateDMChannel = async (
  workspaceId: string,
  userId1: string,
  userId2: string
): Promise<string> => {
  try {
    // Get all channels in the workspace
    const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
    const snapshot = await get(channelsRef);
    const channels = snapshot.val() || {};

    // Look for existing DM channel between these users
    const existingDMChannel = Object.entries(channels).find(([_, channel]: [string, any]) => {
      return channel.type === 'dm' && 
             channel.participants && 
             channel.participants[userId1] && 
             channel.participants[userId2];
    });

    if (existingDMChannel) {
      return existingDMChannel[0];
    }

    // If no existing DM channel, create a new one
    const currentUserId = auth.currentUser?.uid;
    const recipientId = userId1 === currentUserId ? userId2 : userId1;
    const recipientSnapshot = await get(ref(db, `users/${recipientId}`));
    const recipientName = recipientSnapshot.val()?.displayName || 'Unknown User';

    const newChannelRef = push(channelsRef);
    const channelId = newChannelRef.key;
    if (!channelId) {
      throw new Error('Failed to generate channel ID');
    }

    const timestamp = Date.now();
    await set(newChannelRef, {
      name: recipientName,
      displayName: recipientName,
      type: 'dm',
      createdBy: currentUserId,
      createdAt: timestamp,
      participants: {
        [userId1]: true,
        [userId2]: true
      }
    });

    return channelId;
  } catch (error) {
    console.error('Error getting/creating DM channel:', error);
    throw error;
  }
};

export async function createAIAssistantChannel(workspaceId: string, userId: string) {
  const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
  const newChannelRef = push(channelsRef);
  
  await set(newChannelRef, {
    name: 'AI Assistant',
    type: 'ai',
    createdBy: userId,
    createdAt: Date.now(),
    members: [userId]
  });

  return newChannelRef.key;
}

export async function addUserToWorkspace(workspaceId: string, userId: string, role: string = 'member') {
  try {
    // Add user to workspace members
    const workspaceMemberRef = ref(db, `workspaces/${workspaceId}/members/${userId}`);
    await set(workspaceMemberRef, { role });

    // Add workspace to user's workspaces
    const userWorkspaceRef = ref(db, `users/${userId}/workspaces/${workspaceId}`);
    await set(userWorkspaceRef, { role });

    // Create AI assistant channel for the user
    await createAIAssistantChannel(workspaceId, userId);

    return true;
  } catch (error) {
    console.error('Error adding user to workspace:', error);
    return false;
  }
} 

export async function migrateMessagesWithUserProfiles(): Promise<number> {
  try {
    const workspacesRef = ref(db, 'workspaces');
    const workspacesSnapshot = await get(workspacesRef);

    if (!workspacesSnapshot.exists()) {
      console.log('No workspaces found');
      return 0;
    }

    let totalUpdated = 0;
    const workspaces = workspacesSnapshot.val();

    for (const [workspaceId, workspace] of Object.entries(workspaces)) {
      const channelsRef = ref(db, `workspaces/${workspaceId}/channels`);
      const channelsSnapshot = await get(channelsRef);

      if (!channelsSnapshot.exists()) continue;

      const channels = channelsSnapshot.val();
      for (const [channelId, channel] of Object.entries(channels)) {
        // Update main channel messages
        const messagesRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages`);
        const messagesSnapshot = await get(messagesRef);

        if (messagesSnapshot.exists()) {
          const messages = messagesSnapshot.val();
          for (const [messageId, message] of Object.entries(messages)) {
            const messageData = message as any;
            
            // Skip if message already has a proper userProfile
            if (messageData.userProfile?.displayName !== undefined) continue;

            // Fetch user profile for the message
            const userProfileRef = ref(db, `users/${messageData.userId}`);
            const userProfileSnapshot = await get(userProfileRef);
            const userProfile = userProfileSnapshot.val();

            const updates: any = {
              [`workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/userProfile`]: {
                displayName: userProfile?.displayName || null,
                photoURL: userProfile?.photoURL || null,
                photoURLUpdatedAt: userProfile?.photoURLUpdatedAt || null
              }
            };

            await update(ref(db), updates);
            totalUpdated++;
          }
        }

        // Update thread messages
        const threadsRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/threads`);
        const threadsSnapshot = await get(threadsRef);

        if (threadsSnapshot.exists()) {
          const threads = threadsSnapshot.val();
          for (const [threadId, thread] of Object.entries(threads)) {
            const threadData = thread as any;
            if (!threadData.messages) continue;

            for (const [messageId, message] of Object.entries(threadData.messages)) {
              const messageData = message as any;
              
              // Skip if message already has a proper userProfile
              if (messageData.userProfile?.displayName !== undefined) continue;

              // Fetch user profile for the message
              const userProfileRef = ref(db, `users/${messageData.userId}`);
              const userProfileSnapshot = await get(userProfileRef);
              const userProfile = userProfileSnapshot.val();

              const updates: any = {
                [`workspaces/${workspaceId}/channels/${channelId}/threads/${threadId}/messages/${messageId}/userProfile`]: {
                  displayName: userProfile?.displayName || null,
                  photoURL: userProfile?.photoURL || null,
                  photoURLUpdatedAt: userProfile?.photoURLUpdatedAt || null
                }
              };

              await update(ref(db), updates);
              totalUpdated++;
            }
          }
        }
      }
    }

    console.log(`Migration completed. Updated ${totalUpdated} messages with user profiles.`);
    return totalUpdated;
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
} 