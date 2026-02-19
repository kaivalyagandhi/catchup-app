/**
 * CatchUp - AI-Powered Relationship Management Application
 *
 * Main entry point for the application
 */

import { Server } from 'http';
import { testConnection } from './db/connection';
import { startServer } from './api/server';
import { validateAndFailFast as validateGoogleSSO } from './api/google-sso-config-validator';
import { validateAndFailFast as validateEnvVars } from './utils/env-validator';
import { getVersion, getDisplayVersion } from './utils/version';

let httpServer: Server | null = null;

async function main() {
  console.log('CatchUp Application Starting...');
  console.log(`Version: ${getDisplayVersion()} (${getVersion()})`);

  // Validate environment variables (fail fast if invalid)
  console.log('Validating environment variables...');
  validateEnvVars();

  // Validate Google SSO configuration (fail fast if invalid)
  console.log('Validating Google SSO configuration...');
  validateGoogleSSO();

  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }

  console.log('CatchUp Application Ready');
  console.log(`Running version: ${getVersion()}`);

  // Start background job worker (only if not using Cloud Tasks)
  const useCloudTasks = process.env.USE_CLOUD_TASKS?.trim() === 'true';
  
  if (useCloudTasks) {
    console.log('[Startup] Using Cloud Tasks - workers not needed');
  } else {
    console.log('[Startup] Using BullMQ/Bull - starting workers');
    const { startWorker } = await import('./jobs/worker-selector');
    await startWorker();
  }

  // Start API server
  const port = parseInt(process.env.PORT || '3000', 10);
  httpServer = startServer(port);
}

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');

  // Close HTTP server to stop accepting new connections
  if (httpServer) {
    httpServer.close(() => {
      console.log('HTTP server closed');
    });
  }

  // Stop background job worker
  const { stopWorker } = await import('./jobs/worker-selector');
  await stopWorker();

  // Close database connections
  const { closePool } = await import('./db/connection');
  await closePool();

  console.log('Graceful shutdown complete');
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
