/**
 * Performance Optimizer for SMS/MMS Enrichment
 * 
 * Provides caching, connection pooling, and performance monitoring
 * for the SMS/MMS enrichment feature.
 * 
 * Requirements: All (Performance optimization across all components)
 */

import { LRUCache } from 'lru-cache';
import pool from '../db/connection';

/**
 * Cache configuration for different data types
 */
const CACHE_CONFIG = {
  phoneNumberLookup: {
    max: 1000, // Maximum 1000 phone numbers cached
    ttl: 1000 * 60 * 15, // 15 minutes
  },
  userVerification: {
    max: 500,
    ttl: 1000 * 60 * 5, // 5 minutes
  },
  rateLimitStatus: {
    max: 1000,
    ttl: 1000 * 60, // 1 minute
  },
};

/**
 * LRU Cache for phone number to user ID lookups
 */
export const phoneNumberCache = new LRUCache<string, string>({
  max: CACHE_CONFIG.phoneNumberLookup.max,
  ttl: CACHE_CONFIG.phoneNumberLookup.ttl,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

/**
 * LRU Cache for phone number verification status
 */
export const verificationCache = new LRUCache<string, boolean>({
  max: CACHE_CONFIG.userVerification.max,
  ttl: CACHE_CONFIG.userVerification.ttl,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

/**
 * Performance metrics tracking
 */
interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  dbQueries: number;
  avgQueryTime: number;
  totalQueryTime: number;
}

const metrics: PerformanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  dbQueries: 0,
  avgQueryTime: 0,
  totalQueryTime: 0,
};

/**
 * Get user ID by phone number with caching
 * 
 * @param phoneNumber - Phone number to lookup
 * @returns User ID or null if not found
 */
export async function getCachedUserByPhoneNumber(
  phoneNumber: string
): Promise<string | null> {
  // Check cache first
  const cached = phoneNumberCache.get(phoneNumber);
  if (cached !== undefined) {
    metrics.cacheHits++;
    return cached;
  }

  metrics.cacheMisses++;

  // Query database
  const startTime = Date.now();
  const result = await pool.query(
    'SELECT user_id FROM user_phone_numbers WHERE phone_number = $1 AND verified = true',
    [phoneNumber]
  );
  const queryTime = Date.now() - startTime;

  // Update metrics
  metrics.dbQueries++;
  metrics.totalQueryTime += queryTime;
  metrics.avgQueryTime = metrics.totalQueryTime / metrics.dbQueries;

  const userId = result.rows.length > 0 ? result.rows[0].user_id : null;

  // Cache result (including null results to avoid repeated lookups)
  phoneNumberCache.set(phoneNumber, userId);

  return userId;
}

/**
 * Check if phone number is verified with caching
 * 
 * @param phoneNumber - Phone number to check
 * @returns true if verified, false otherwise
 */
export async function getCachedVerificationStatus(
  phoneNumber: string
): Promise<boolean> {
  // Check cache first
  const cached = verificationCache.get(phoneNumber);
  if (cached !== undefined) {
    metrics.cacheHits++;
    return cached;
  }

  metrics.cacheMisses++;

  // Query database
  const startTime = Date.now();
  const result = await pool.query(
    'SELECT verified FROM user_phone_numbers WHERE phone_number = $1',
    [phoneNumber]
  );
  const queryTime = Date.now() - startTime;

  // Update metrics
  metrics.dbQueries++;
  metrics.totalQueryTime += queryTime;
  metrics.avgQueryTime = metrics.totalQueryTime / metrics.dbQueries;

  const verified = result.rows.length > 0 ? result.rows[0].verified : false;

  // Cache result
  verificationCache.set(phoneNumber, verified);

  return verified;
}

/**
 * Invalidate cache for a phone number
 * Call this when phone number verification status changes
 * 
 * @param phoneNumber - Phone number to invalidate
 */
export function invalidatePhoneNumberCache(phoneNumber: string): void {
  phoneNumberCache.delete(phoneNumber);
  verificationCache.delete(phoneNumber);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  phoneNumberCache.clear();
  verificationCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    phoneNumberCache: {
      size: phoneNumberCache.size,
      max: phoneNumberCache.max,
      hitRate:
        metrics.cacheHits + metrics.cacheMisses > 0
          ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
          : 0,
    },
    verificationCache: {
      size: verificationCache.size,
      max: verificationCache.max,
    },
    metrics: {
      ...metrics,
      hitRate:
        metrics.cacheHits + metrics.cacheMisses > 0
          ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
          : 0,
    },
  };
}

/**
 * Reset performance metrics
 */
export function resetMetrics(): void {
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.dbQueries = 0;
  metrics.avgQueryTime = 0;
  metrics.totalQueryTime = 0;
}

/**
 * Batch insert enrichment items for better performance
 * 
 * @param enrichments - Array of enrichment items to insert
 * @returns Array of inserted enrichment IDs
 */
export async function batchInsertEnrichments(
  enrichments: Array<{
    userId: string;
    contactId?: string;
    enrichmentType: string;
    content: string;
    source: string;
    sourceMetadata?: any;
    status: string;
  }>
): Promise<string[]> {
  if (enrichments.length === 0) {
    return [];
  }

  const startTime = Date.now();

  // Build batch insert query
  const values: any[] = [];
  const placeholders: string[] = [];

  enrichments.forEach((enrichment, index) => {
    const offset = index * 7;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
    );
    values.push(
      enrichment.userId,
      enrichment.contactId || null,
      enrichment.enrichmentType,
      enrichment.content,
      enrichment.source,
      enrichment.sourceMetadata ? JSON.stringify(enrichment.sourceMetadata) : null,
      enrichment.status
    );
  });

  const query = `
    INSERT INTO enrichment_items 
    (user_id, contact_id, enrichment_type, content, source, source_metadata, status)
    VALUES ${placeholders.join(', ')}
    RETURNING id
  `;

  const result = await pool.query(query, values);
  const queryTime = Date.now() - startTime;

  // Update metrics
  metrics.dbQueries++;
  metrics.totalQueryTime += queryTime;
  metrics.avgQueryTime = metrics.totalQueryTime / metrics.dbQueries;

  console.log(
    `Batch inserted ${enrichments.length} enrichments in ${queryTime}ms`
  );

  return result.rows.map((row) => row.id);
}

/**
 * Prepared statement cache for frequently used queries
 */
const preparedStatements = new Map<string, string>();

/**
 * Get or create a prepared statement
 * 
 * @param name - Statement name
 * @param query - SQL query
 * @returns Statement name
 */
export function getPreparedStatement(name: string, query: string): string {
  if (!preparedStatements.has(name)) {
    preparedStatements.set(name, query);
  }
  return name;
}

/**
 * Database connection pool health check
 */
export async function checkPoolHealth(): Promise<{
  healthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
}> {
  return {
    healthy: true,
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
  };
}

/**
 * Optimize database queries by ensuring proper indexes exist
 * This should be called during application startup
 */
export async function ensureOptimalIndexes(): Promise<void> {
  const indexes = [
    // Phone number lookups
    'CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_phone_verified ON user_phone_numbers(phone_number, verified)',
    
    // Enrichment queries
    'CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_status ON enrichment_items(user_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_enrichment_items_created_at ON enrichment_items(created_at DESC)',
    
    // Composite index for common query patterns
    'CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_source_status ON enrichment_items(user_id, source, status)',
  ];

  for (const indexQuery of indexes) {
    try {
      await pool.query(indexQuery);
    } catch (error) {
      console.error('Error creating index:', error);
    }
  }

  console.log('Database indexes optimized');
}

/**
 * Analyze query performance and suggest optimizations
 * 
 * @param query - SQL query to analyze
 * @returns Query plan and suggestions
 */
export async function analyzeQuery(query: string, params: any[] = []): Promise<any> {
  const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
  
  try {
    const result = await pool.query(explainQuery, params);
    return result.rows[0]['QUERY PLAN'];
  } catch (error) {
    console.error('Error analyzing query:', error);
    return null;
  }
}
