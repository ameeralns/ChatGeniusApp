const { migrateMessagesToNewPattern } = require('../lib/firebase/database');

async function runMigration() {
  try {
    console.log('Starting migration...');
    await migrateMessagesToNewPattern();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 