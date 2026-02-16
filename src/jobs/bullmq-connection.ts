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
 * Key optimizations:
 * - maxRetriesPerRequest: null (required for BullMQ)
 * - enableReadyCheck: false (skip ready check for faster startup)
 * - enableOfflineQueue: false (fail fast instead of queuing)
 * - Connection pooling handled by ioredis internally
 */
export const bullmqConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  
  // BullMQ-specific settings
  maxRetriesPerRequest: null, // Required for BullMQ blocking commands
  enableReadyCheck: false,    // Skip ready check for faster startup
  enableOfflineQueue: false,  // Fail fast instead of queuing commands
  
  // Connection settings
  connectTimeout: 10000,      // 10 second timeout
  keepAlive: 30000,           // Keep connection alive
  family: 4,                  // IPv4 only
  
  // Retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
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
      
      // BullMQ-specific settings
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      
      // Connection settings
      connectTimeout: 10000,
      keepAlive: 30000,
      family: 4,
      
      // Retry strategy
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
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

