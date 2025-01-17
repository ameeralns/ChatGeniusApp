import { ref, get, set, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';

interface Message {
  id: string;
  content: string;
  userId: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
}

interface AutoResponse {
  userId: string;
  response: string;
  channelId: string;
  workspaceId: string;
}

interface UserProfile {
  displayName: string;
  photoURL: string;
  email?: string;
}

export const handleNewMessage = async (
  message: Message,
  workspaceId: string,
  channelId: string,
  isDM: boolean
) => {
  try {
    console.log('Processing new message:', {
      workspaceId,
      channelId,
      isDM,
      messageId: message.id
    });

    // Call the auto-response API
    const response = await fetch('/api/ai/auto-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message.content,
        channelId,
        workspaceId,
        isDM
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get auto-responses');
    }

    const { responses } = await response.json() as { responses: AutoResponse[] };
    
    console.log('Received auto-responses:', {
      count: responses.length,
      channelId,
      workspaceId
    });

    // Process each auto-response
    const autoResponsePromises = responses.map(async (autoResponse, index) => {
      // Add a natural delay between responses (2-4 seconds)
      const delay = 2000 + (index * Math.random() * 2000); // Random delay between 2-4 seconds per message
      await new Promise(resolve => setTimeout(resolve, delay));

      // Fetch user profile data
      const userRef = ref(db, `users/${autoResponse.userId}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();
      
      const userProfile: UserProfile = {
        displayName: userData.displayName || 'Unknown User',
        photoURL: userData.photoURL || null,
        email: userData.email
      };

      console.log('Using profile for auto-response:', {
        userId: autoResponse.userId,
        displayName: userProfile.displayName,
        delay
      });

      // Calculate a timestamp that's slightly after the previous message
      const baseTimestamp = Date.now();
      const messageTimestamp = baseTimestamp + delay;
      const messageId = `${messageTimestamp}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the auto-response message with user profile data
      const messageData = {
        id: messageId,
        content: autoResponse.response,
        userId: autoResponse.userId,
        timestamp: messageTimestamp,
        createdAt: messageTimestamp, // Add createdAt to ensure proper sorting
        type: 'text' as const,
        isAutoResponse: true,
        userProfile: userProfile  // Include the user's actual profile data
      };

      // Save the message to the appropriate location
      const messageRef = ref(db, `workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`);
      await set(messageRef, messageData);

      console.log('Saved auto-response:', {
        messageId,
        userId: autoResponse.userId,
        channelId,
        displayName: userProfile.displayName,
        timestamp: messageTimestamp
      });

      return messageId;
    });

    // Wait for all auto-responses to be saved
    await Promise.all(autoResponsePromises);

  } catch (error) {
    console.error('Error handling new message:', error);
    throw error;
  }
}; 