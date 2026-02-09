/**
 * Connection Pool Manager for External APIs
 *
 * Manages connection pooling and reuse for external services:
 * - Google Cloud Speech-to-Text
 * - Google Gemini API
 * - Twilio API
 * - Redis connections
 *
 * Requirements: All (Performance optimization for external API calls)
 */

import { SpeechClient } from '@google-cloud/speech';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Redis from 'ioredis';
import { Twilio } from 'twilio';

/**
 * Connection pool configuration
 */
interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  minConnections: 2,
  maxConnections: 10,
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 5000,
};

/**
 * Google Cloud Speech-to-Text client pool
 */
class SpeechClientPool {
  private clients: SpeechClient[] = [];
  private availableClients: SpeechClient[] = [];
  private config: PoolConfig;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.initialize();
  }

  private initialize(): void {
    // Create minimum number of clients
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = new SpeechClient();
      this.clients.push(client);
      this.availableClients.push(client);
    }
  }

  async acquire(): Promise<SpeechClient> {
    // Return available client if exists
    if (this.availableClients.length > 0) {
      return this.availableClients.pop()!;
    }

    // Create new client if under max limit
    if (this.clients.length < this.config.maxConnections) {
      const client = new SpeechClient();
      this.clients.push(client);
      return client;
    }

    // Wait for available client
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.availableClients.length > 0) {
          clearInterval(checkInterval);
          resolve(this.availableClients.pop()!);
        }
      }, 100);

      // Timeout after configured time
      setTimeout(() => {
        clearInterval(checkInterval);
        // Create new client even if over limit (emergency)
        const client = new SpeechClient();
        this.clients.push(client);
        resolve(client);
      }, this.config.connectionTimeoutMs);
    });
  }

  release(client: SpeechClient): void {
    if (!this.availableClients.includes(client)) {
      this.availableClients.push(client);
    }
  }

  getStats() {
    return {
      total: this.clients.length,
      available: this.availableClients.length,
      inUse: this.clients.length - this.availableClients.length,
    };
  }

  async close(): Promise<void> {
    for (const client of this.clients) {
      await client.close();
    }
    this.clients = [];
    this.availableClients = [];
  }
}

/**
 * Redis connection pool
 */
class RedisPool {
  private clients: Redis[] = [];
  private availableClients: Redis[] = [];
  private config: PoolConfig;
  private redisUrl?: string;
  private redisConfig?: any;

  constructor(redisConfig: any, poolConfig: Partial<PoolConfig> = {}) {
    // Support both connection string and object config
    if (typeof redisConfig === 'string') {
      this.redisUrl = redisConfig;
    } else {
      this.redisConfig = redisConfig;
    }
    this.config = { ...DEFAULT_POOL_CONFIG, ...poolConfig };
    this.initialize();
  }

  private createClient(): Redis {
    if (this.redisUrl) {
      return new Redis(this.redisUrl);
    } else {
      return new Redis(this.redisConfig);
    }
  }

  private initialize(): void {
    // Create minimum number of connections
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = this.createClient();
      this.clients.push(client);
      this.availableClients.push(client);
    }
  }

  async acquire(): Promise<Redis> {
    // Return available client if exists
    if (this.availableClients.length > 0) {
      return this.availableClients.pop()!;
    }

    // Create new client if under max limit
    if (this.clients.length < this.config.maxConnections) {
      const client = this.createClient();
      this.clients.push(client);
      return client;
    }

    // Wait for available client
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.availableClients.length > 0) {
          clearInterval(checkInterval);
          resolve(this.availableClients.pop()!);
        }
      }, 100);

      // Timeout after configured time
      setTimeout(() => {
        clearInterval(checkInterval);
        // Create new client even if over limit (emergency)
        const client = this.createClient();
        this.clients.push(client);
        resolve(client);
      }, this.config.connectionTimeoutMs);
    });
  }

  release(client: Redis): void {
    if (!this.availableClients.includes(client)) {
      this.availableClients.push(client);
    }
  }

  getStats() {
    return {
      total: this.clients.length,
      available: this.availableClients.length,
      inUse: this.clients.length - this.availableClients.length,
    };
  }

  async close(): Promise<void> {
    for (const client of this.clients) {
      await client.quit();
    }
    this.clients = [];
    this.availableClients = [];
  }
}

/**
 * Twilio client pool
 */
class TwilioClientPool {
  private clients: Twilio[] = [];
  private availableClients: Twilio[] = [];
  private config: PoolConfig;
  private accountSid: string;
  private authToken: string;

  constructor(accountSid: string, authToken: string, poolConfig: Partial<PoolConfig> = {}) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.config = { ...DEFAULT_POOL_CONFIG, ...poolConfig };
    this.initialize();
  }

  private initialize(): void {
    // Create minimum number of clients
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = new Twilio(this.accountSid, this.authToken);
      this.clients.push(client);
      this.availableClients.push(client);
    }
  }

  async acquire(): Promise<Twilio> {
    // Return available client if exists
    if (this.availableClients.length > 0) {
      return this.availableClients.pop()!;
    }

    // Create new client if under max limit
    if (this.clients.length < this.config.maxConnections) {
      const client = new Twilio(this.accountSid, this.authToken);
      this.clients.push(client);
      return client;
    }

    // Wait for available client
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.availableClients.length > 0) {
          clearInterval(checkInterval);
          resolve(this.availableClients.pop()!);
        }
      }, 100);

      // Timeout after configured time
      setTimeout(() => {
        clearInterval(checkInterval);
        // Create new client even if over limit (emergency)
        const client = new Twilio(this.accountSid, this.authToken);
        this.clients.push(client);
        resolve(client);
      }, this.config.connectionTimeoutMs);
    });
  }

  release(client: Twilio): void {
    if (!this.availableClients.includes(client)) {
      this.availableClients.push(client);
    }
  }

  getStats() {
    return {
      total: this.clients.length,
      available: this.availableClients.length,
      inUse: this.clients.length - this.availableClients.length,
    };
  }

  close(): void {
    // Twilio clients don't need explicit cleanup
    this.clients = [];
    this.availableClients = [];
  }
}

/**
 * Global connection pool manager
 */
export class ConnectionPoolManager {
  private speechClientPool?: SpeechClientPool;
  private redisPool?: RedisPool;
  private twilioClientPool?: TwilioClientPool;

  /**
   * Initialize Speech-to-Text client pool
   */
  initializeSpeechClientPool(config?: Partial<PoolConfig>): void {
    if (!this.speechClientPool) {
      this.speechClientPool = new SpeechClientPool(config);
      console.log('Speech-to-Text client pool initialized');
    }
  }

  /**
   * Initialize Redis connection pool
   */
  initializeRedisPool(redisConfig: any, poolConfig?: Partial<PoolConfig>): void {
    if (!this.redisPool) {
      this.redisPool = new RedisPool(redisConfig, poolConfig);
      console.log('Redis connection pool initialized');
    }
  }

  /**
   * Initialize Twilio client pool
   */
  initializeTwilioClientPool(
    accountSid: string,
    authToken: string,
    config?: Partial<PoolConfig>
  ): void {
    if (!this.twilioClientPool) {
      this.twilioClientPool = new TwilioClientPool(accountSid, authToken, config);
      console.log('Twilio client pool initialized');
    }
  }

  /**
   * Get Speech-to-Text client from pool
   */
  async getSpeechClient(): Promise<SpeechClient> {
    if (!this.speechClientPool) {
      this.initializeSpeechClientPool();
    }
    return this.speechClientPool!.acquire();
  }

  /**
   * Release Speech-to-Text client back to pool
   */
  releaseSpeechClient(client: SpeechClient): void {
    if (this.speechClientPool) {
      this.speechClientPool.release(client);
    }
  }

  /**
   * Get Redis client from pool
   */
  async getRedisClient(): Promise<Redis> {
    if (!this.redisPool) {
      // Use REDIS_URL if available (recommended for Upstash)
      const redisConfig = process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        // TLS support for Upstash and other cloud Redis providers
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      };
      this.initializeRedisPool(redisConfig);
    }
    return this.redisPool!.acquire();
  }

  /**
   * Release Redis client back to pool
   */
  releaseRedisClient(client: Redis): void {
    if (this.redisPool) {
      this.redisPool.release(client);
    }
  }

  /**
   * Get Twilio client from pool
   */
  async getTwilioClient(): Promise<Twilio> {
    if (!this.twilioClientPool) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      this.initializeTwilioClientPool(accountSid, authToken);
    }
    return this.twilioClientPool!.acquire();
  }

  /**
   * Release Twilio client back to pool
   */
  releaseTwilioClient(client: Twilio): void {
    if (this.twilioClientPool) {
      this.twilioClientPool.release(client);
    }
  }

  /**
   * Get statistics for all pools
   */
  getAllStats() {
    return {
      speechClient: this.speechClientPool?.getStats() || null,
      redis: this.redisPool?.getStats() || null,
      twilio: this.twilioClientPool?.getStats() || null,
    };
  }

  /**
   * Close all connection pools
   */
  async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.speechClientPool) {
      promises.push(this.speechClientPool.close());
    }

    if (this.redisPool) {
      promises.push(this.redisPool.close());
    }

    if (this.twilioClientPool) {
      this.twilioClientPool.close();
    }

    await Promise.all(promises);
    console.log('All connection pools closed');
  }
}

// Export singleton instance
export const connectionPoolManager = new ConnectionPoolManager();
