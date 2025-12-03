/**
 * CatchUp - AI-Powered Relationship Management Application
 *
 * Main entry point for the application
 */

import { testConnection } from './db/connection';
import { startServer } from './api/server';
import { validateAndFailFast } from './api/google-sso-config-validator';

async function main() {
  console.log('CatchUp Application Starting...');

  // Validate Google SSO configuration (fail fast if invalid)
  console.log('Validating Google SSO configuration...');
  validateAndFailFast();

  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }

  console.log('CatchUp Application Ready');

  // Start background job worker
  const { startWorker } = await import('./jobs/worker');
  startWorker();

  // Start API server
  const port = parseInt(process.env.PORT || '3000', 10);
  startServer(port);
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
