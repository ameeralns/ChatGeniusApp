const { syncUserWorkspaces } = require('../lib/firebase/database');

// Run the sync function
syncUserWorkspaces()
  .then(() => {
    console.log('Workspace sync completed');
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error('Error syncing workspaces:', error);
    process.exit(1);
  }); 