const { migrateAllWorkspaces } = require('../src/lib/vectordb/migrate-messages');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    console.log('Starting migration of messages to vector database...');
    await migrateAllWorkspaces();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 