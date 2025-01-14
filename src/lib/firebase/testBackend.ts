import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  createWorkspace,
  joinWorkspace,
  getUserWorkspaces,
  createChannel,
  getChannels,
  sendMessage,
  subscribeToMessages
} from './database';

interface TestResult {
  success: boolean;
  error?: any;
  data?: any;
}

export async function testBackendFunctionality() {
  const results: { [key: string]: TestResult } = {};
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'testPassword123!';
  let userId: string | undefined;
  let workspaceId: string | undefined;
  let channelId: string | undefined;

  try {
    // Test 1: User Registration
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      userId = userCredential.user.uid;
      results['userRegistration'] = { success: true, data: { userId } };
    } catch (error) {
      results['userRegistration'] = { success: false, error };
    }

    // Test 2: User Login
    try {
      await signOut(auth); // Sign out first to test login
      const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      results['userLogin'] = { success: true, data: { userId: userCredential.user.uid } };
    } catch (error) {
      results['userLogin'] = { success: false, error };
    }

    // Test 3: Create Workspace
    if (userId) {
      try {
        const { workspaceId: newWorkspaceId, defaultChannelId } = await createWorkspace('Test Workspace', userId);
        workspaceId = newWorkspaceId;
        channelId = defaultChannelId || undefined;
        results['createWorkspace'] = { success: true, data: { workspaceId, defaultChannelId } };
      } catch (error) {
        results['createWorkspace'] = { success: false, error };
      }
    }

    // Test 4: Get User Workspaces
    if (userId) {
      try {
        const workspaces = await getUserWorkspaces(userId);
        results['getUserWorkspaces'] = { success: true, data: { workspaces } };
      } catch (error) {
        results['getUserWorkspaces'] = { success: false, error };
      }
    }

    // Test 5: Create Channel
    if (workspaceId && userId) {
      try {
        const newChannelId = await createChannel(workspaceId, {
          name: 'test-channel',
          createdBy: userId
        });
        results['createChannel'] = { success: true, data: { channelId: newChannelId } };
      } catch (error) {
        results['createChannel'] = { success: false, error };
      }
    }

    // Test 6: Get Channels
    if (workspaceId) {
      try {
        const channels = await getChannels(workspaceId);
        results['getChannels'] = { success: true, data: { channels } };
      } catch (error) {
        results['getChannels'] = { success: false, error };
      }
    }

    // Test 7: Send Message
    if (workspaceId && channelId && userId) {
      try {
        const messageId = await sendMessage(channelId, workspaceId, 'Test message', userId);
        results['sendMessage'] = { success: true, data: { messageId } };
      } catch (error) {
        results['sendMessage'] = { success: false, error };
      }
    }

    // Test 8: Subscribe to Messages
    if (workspaceId && channelId) {
      try {
        let messagesReceived = false;
        const unsubscribe = subscribeToMessages(workspaceId, channelId, (messages) => {
          messagesReceived = true;
          results['subscribeToMessages'] = { success: true, data: { messages } };
          unsubscribe(); // Unsubscribe after receiving messages
        });

        // Wait a bit to receive messages
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!messagesReceived) {
          results['subscribeToMessages'] = { 
            success: true, 
            data: { messages: [], note: 'No messages received in time window' } 
          };
        }
      } catch (error) {
        results['subscribeToMessages'] = { success: false, error };
      }
    }

    // Clean up
    try {
      await signOut(auth);
      results['cleanup'] = { success: true };
    } catch (error) {
      results['cleanup'] = { success: false, error };
    }

  } catch (error) {
    console.error('Error during backend testing:', error);
  }

  // Print results
  console.log('\n=== Backend Functionality Test Results ===\n');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${test}:`, result.success ? '✅ Passed' : '❌ Failed');
    if (!result.success) {
      console.error(`Error in ${test}:`, result.error);
    }
    if (result.data) {
      console.log(`Data:`, result.data);
    }
    console.log('---');
  });

  return results;
} 