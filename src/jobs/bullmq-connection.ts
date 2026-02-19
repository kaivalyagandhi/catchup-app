import { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Shared BullMQ Connection Configuration
 * 
 * This connection is shared across all BullMQ queues and workers,
 * reducing the total connection count from 33 (11 queues × 3 connections)
 * to just 1-3 connections total.
 * 
 * Production Best Practices (from BullMQ docs):
 * - maxRetriesPerRequest: null (required for Workers to handle disconnections)
 * - enableReadyCheck: false (skip ready check for faster startup)
 * - enableOfflineQueue: true (queue commands during reconnection)
 * - retryStrategy: exponential backoff (1s min, 20s max)
 * - Connection pooling: shared connection reduces overhead
 * 
 * Serverless Optimizations:
 * - lazyConnect: false (connect immediately to detect issues early)
 * - keepAlive: 30000 (keep connections alive in Cloud Run)
 * - connectTimeout: 10000 (fail fast on connection issues)
 */
export const bullmqConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  
  // BullMQ-specific settings (CRITICAL for Workers)
  maxRetriesPerRequest: null, // Required: Workers need unlimited retries for blocking commands
  enableReadyCheck: false,    // Skip ready check for faster startup
  enableOfflineQueue: true,   // Queue commands during reconnection (prevents "Stream isn't writeable")
  
  // Connection settings optimized for Cloud Run
  connectTimeout: 10000,      // 10 second timeout - fail fast on connection issues
  keepAlive: 30000,           // Keep connection alive (important for serverless)
  family: 4,                  // IPv4 only
  lazyConnect: false,         // Connect immediately to detect issues early
  
  // Retry strategy: exponential backoff (BullMQ production best practice)
  retryStrategy: (times: number) => {
    // Exponential backoff: min 1s, max 20s
    // Formula: Math.max(Math.min(Math.exp(times), 20000), 1000)
    const delay = Math.max(Math.min(Math.exp(times), 20000), 1000);
    console.log(`[BullMQ] Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  
  // Reconnection settings
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
};

/**
 * Alternative: Connection string format
 * 
 * If REDIS_URL is provided, parse it and use those values.
 * This is useful for Upstash and other managed Redis services.
 * 
 * Applies the same production best practices as the main connection.
 */
export function getBullMQConnection(): ConnectionOptions {
  if (process.env.REDIS_URL) {
    console.log('[BullMQ] Using REDIS_URL connection string');
    
    // Parse Redis URL (format: redis://[:password@]host[:port][/db])
    // or rediss:// for TLS
    const url = new URL(process.env.REDIS_URL);
    
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      db: parseInt(url.pathname.slice(1) || '0', 10),
      tls: url.protocol === 'rediss:' ? {} : undefined,
      
      // BullMQ-specific settings (CRITICAL for Workers)
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
      
      // Connection settings optimized for Cloud Run
      connectTimeout: 10000,
      keepAlive: 30000,
      family: 4,
      lazyConnect: false,
      
      // Retry strategy: exponential backoff (BullMQ production best practice)
      retryStrategy: (times: number) => {
        const delay = Math.max(Math.min(Math.exp(times), 20000), 1000);
        console.log(`[BullMQ] Retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      
      // Reconnection settings
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    };
  }
  
  console.log('[BullMQ] Using object configuration');
  return bullmqConnection;
}

/**
 * Log connection info (without sensitive data)
 */
export function logConnectionInfo(): void {
  const conn = getBullMQConnection();
  console.log('[BullMQ] Connection configuration:', {
    host: (conn as any).host,
    port: (conn as any).port,
    db: (conn as any).db,
    tls: (conn as any).tls ? 'enabled' : 'disabled',
    passwordSet: !!(conn as any).password,
  });
}

