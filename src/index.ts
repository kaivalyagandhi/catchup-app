/**
 * CatchUp - AI-Powered Relationship Management Application
 *
 * Main entry point for the application
 */

import { testConnection } from './db/connection';

async function main() {
  console.log('CatchUp Application Starting...');

  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }

  console.log('CatchUp Application Ready');

  // TODO: Initialize API server and other services
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  const { closePool } = await import('./db/connection');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  const { closePool } = await import('./db/connection');
  await closePool();
  process.exit(0);
});

// Start the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
