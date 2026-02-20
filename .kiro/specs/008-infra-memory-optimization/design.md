# Memory Optimization: Technical Design

## Overview

This document details the technical design for implementing memory-efficient patterns across CatchUp's data-intensive operations. The design follows Node.js best practices for streaming, batching, and memory management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Memory-Optimized Architecture                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │ Memory Circuit   │      │ Memory Monitor   │                │
│  │ Breaker          │◄────►│ (Heap Tracking)  │                │
│  └──────────────────┘      └──────────────────┘                │
│           │                          │                           │
│           ▼                          ▼                           │
│  ┌─────────────────────────────────────────────┐               │
│  │         Streaming Data Layer                 │               │
│  ├─────────────────────────────────────────────┤               │
│  │  • Async Generators (Contact Streaming)     │               │
│  │  • Database Cursors (PostgreSQL)            │               │
│  │  • Batch Processing (100 items/batch)       │               │
│  │  • Event Loop Yielding (setImmediate)       │               │
│  └─────────────────────────────────────────────┘               │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────┐               │
│  │         Processing Layer                     │               │
│  ├─────────────────────────────────────────────┤               │
│  │  • Suggestion Generation (Batched)          │               │
│  │  • Contact Sync (Streaming)                 │               │
│  │  • Calendar Sync (Streaming)                │               │
│  │  • Minimal Data Projection                  │               │
│  └─────────────────────────────────────────────┘               │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────┐               │
│  │         Caching Layer                        │               │
│  ├─────────────────────────────────────────────┤               │
│  │  • LRU Cache (Size-Limited)                 │               │
│  │  • WeakMap (Optional Caching)               │               │
│  │  • Automatic Eviction                       │               │
│  └─────────────────────────────────────────────┘               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Memory Circuit Breaker

**Purpose:** Prevent operations when memory usage exceeds safe thresholds

**Location:** `src/utils/memory-circuit-breaker.ts`

**Interface:**
```typescript
interface MemoryCircuitBreakerOptions {
  maxHeapPercent: number;      // Default: 80
  checkIntervalMs: number;     // Default: 1000
  enableLogging: boolean;      // Default: true
}

class MemoryCircuitBreaker {
  constructor(options?: Partial<MemoryCircuitBreakerOptions>);
  
  // Check memory and throw if threshold exceeded
  async checkMemory(): Promise<void>;
  
  // Execute operation with memory checks before/after
  async execute<T>(operation: () => Promise<T>): Promise<T>;
  
  // Get current memory usage
  getMemoryUsage(): MemoryUsage;
}

interface MemoryUsage {
  heapUsed: number;      // Bytes
  heapTotal: number;     // Bytes
  heapPercent: number;   // Percentage
  rss: number;           // Bytes
  external: number;      // Bytes
}
```

**Implementation Details:**
- Monitors `process.memoryUsage()` before expensive operations
- Throws `MemoryCircuitBreakerError` when threshold exceeded
- Logs detailed memory metrics for debugging
- Configurable threshold (default 80% heap usage)

**Error Handling:**
```typescript
class MemoryCircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly memoryUsage: MemoryUsage
  ) {
    super(message);
    this.name = 'MemoryCircuitBreakerError';
  }
}
```

### 2. Memory Monitor

**Purpose:** Track memory usage over time and detect leaks

**Location:** `src/utils/memory-monitor.ts`

**Interface:**
```typescript
interface MemoryMonitorOptions {
  sampleIntervalMs: number;    // Default: 60000 (1 minute)
  maxSamples: number;          // Default: 60 (1 hour of data)
  growthThreshold: number;     // Default: 1.5 (50% growth)
  enableAlerts: boolean;       // Default: true
}

class MemoryMonitor {
  constructor(options?: Partial<MemoryMonitorOptions>);
  
  // Start monitoring
  start(): void;
  
  // Stop monitoring
  stop(): void;
  
  // Log memory usage for an operation
  logMemoryUsage(operation: string, before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage): void;
  
  // Wrap operation with memory tracking
  async wrapOperation<T>(operation: string, fn: () => Promise<T>): Promise<T>;
  
  // Get memory samples
  getSamples(): MemorySample[];
  
  // Detect memory leaks
  detectLeak(): LeakDetectionResult | null;
}

interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
}

interface LeakDetectionResult {
  detected: boolean;
  growthPercent: number;
  firstSample: MemorySample;
  lastSample: MemorySample;
  recommendation: string;
}
```

**Leak Detection Algorithm:**
1. Collect memory samples at regular intervals
2. Compare first and last samples in window
3. Calculate growth percentage
4. Alert if growth exceeds threshold (50%)
5. Recommend heap snapshot for investigation

### 3. Streaming Contact Repository

**Purpose:** Stream contacts in batches without loading all into memory

**Location:** `src/contacts/streaming-repository.ts`

**Interface:**
```typescript
interface StreamingOptions {
  batchSize: number;           // Default: 100
  minimalData: boolean;        // Default: false
  orderBy: 'last_contact_date' | 'name' | 'created_at';
  orderDirection: 'ASC' | 'DESC';
}

class StreamingContactRepository {
  // Stream contacts using async generator
  async *streamContacts(
    userId: string,
    options?: Partial<StreamingOptions>
  ): AsyncGenerator<Contact[], void, undefined>;
  
  // Stream minimal contact data for matching
  async *streamMinimalContacts(
    userId: string,
    options?: Partial<StreamingOptions>
  ): AsyncGenerator<MinimalContact[], void, undefined>;
  
  // Get contacts using database cursor
  async *streamWithCursor(
    userId: string,
    options?: Partial<StreamingOptions>
  ): AsyncGenerator<Contact[], void, undefined>;
}

interface MinimalContact {
  id: string;
  name: string;
  lastContactDate: Date | null;
  frequencyPreference: FrequencyOption;
  groups: string[];  // Just IDs
}
```

**Implementation Strategy:**
- Use `LIMIT/OFFSET` for simple pagination
- Use `pg-cursor` for large datasets (>1000 contacts)
- Yield to event loop between batches
- Support both full and minimal data projection

**SQL Queries:**
```sql
-- Full contact data
SELECT * FROM contacts 
WHERE user_id = $1 AND archived = false
ORDER BY last_contact_date ASC NULLS FIRST
LIMIT $2 OFFSET $3;

-- Minimal contact data (80% smaller)
SELECT 
  id, 
  name, 
  last_contact_date, 
  frequency_preference,
  ARRAY_AGG(g.id) as group_ids
FROM contacts c
LEFT JOIN contact_groups cg ON c.id = cg.contact_id
LEFT JOIN groups g ON cg.group_id = g.id
WHERE c.user_id = $1 AND c.archived = false
GROUP BY c.id, c.name, c.last_contact_date, c.frequency_preference
ORDER BY c.last_contact_date ASC NULLS FIRST
LIMIT $2 OFFSET $3;
```

### 4. Memory-Efficient Suggestion Generation

**Purpose:** Generate suggestions without loading all contacts into memory

**Location:** `src/jobs/processors/suggestion-generation-processor.ts` (refactored)

**Algorithm:**
```typescript
async function processSuggestionGeneration(
  job: Bull.Job<SuggestionGenerationJobData>
): Promise<SuggestionGenerationResult> {
  const MAX_SUGGESTIONS = 50;
  const BATCH_SIZE = 100;
  
  const memoryBreaker = new MemoryCircuitBreaker();
  const memoryMonitor = new MemoryMonitor();
  const suggestions: Suggestion[] = [];
  
  // Get available slots (cached, small dataset)
  const availableSlots = await calendarService.getFreeTimeSlots(...);
  
  // Stream contacts in batches
  const contactStream = streamingRepository.streamMinimalContacts(userId, {
    batchSize: BATCH_SIZE,
    orderBy: 'last_contact_date',
    orderDirection: 'ASC'
  });
  
  for await (const contactBatch of contactStream) {
    // Check memory before processing
    await memoryBreaker.checkMemory();
    
    // Process batch
    const batchSuggestions = await memoryMonitor.wrapOperation(
      'generate-suggestions-batch',
      async () => generateSuggestionsForBatch(contactBatch, availableSlots)
    );
    
    suggestions.push(...batchSuggestions);
    
    // Stop if we have enough suggestions
    if (suggestions.length >= MAX_SUGGESTIONS) {
      break;
    }
    
    // Force GC if available
    if (global.gc) global.gc();
  }
  
  return {
    usersProcessed: 1,
    suggestionsGenerated: suggestions.slice(0, MAX_SUGGESTIONS).length,
    errors: []
  };
}
```

**Memory Optimization Techniques:**
1. Stream contacts instead of loading all
2. Use minimal data projection (80% smaller)
3. Process in batches of 100
4. Stop early when max suggestions reached
5. Check memory before each batch
6. Force GC between batches
7. Yield to event loop

### 5. LRU Cache Implementation

**Purpose:** Replace unbounded caches with size-limited LRU caches

**Location:** `src/utils/lru-cache.ts`

**Interface:**
```typescript
import { LRUCache } from 'lru-cache';

// Contact cache configuration
export const contactCache = new LRUCache<string, Contact>({
  max: 1000,                           // Max 1000 entries
  maxSize: 50 * 1024 * 1024,          // Max 50MB
  sizeCalculation: (contact) => {
    return JSON.stringify(contact).length;
  },
  ttl: 1000 * 60 * 60,                // 1 hour TTL
  updateAgeOnGet: true,               // LRU behavior
  updateAgeOnHas: false,
});

// Calendar event cache configuration
export const calendarEventCache = new LRUCache<string, CalendarEvent[]>({
  max: 5000,                           // Max 5000 entries
  maxSize: 100 * 1024 * 1024,         // Max 100MB
  sizeCalculation: (events) => {
    return JSON.stringify(events).length;
  },
  ttl: 1000 * 60 * 60 * 24,           // 24 hour TTL
  updateAgeOnGet: true,
});

// Suggestion cache configuration
export const suggestionCache = new LRUCache<string, Suggestion[]>({
  max: 500,                            // Max 500 entries
  maxSize: 25 * 1024 * 1024,          // Max 25MB
  sizeCalculation: (suggestions) => {
    return JSON.stringify(suggestions).length;
  },
  ttl: 1000 * 60 * 30,                // 30 minute TTL
  updateAgeOnGet: true,
});
```

**Migration Strategy:**
- Replace `Map` with `LRUCache` in existing cache utilities
- Add size calculation for automatic eviction
- Configure appropriate TTLs per cache type
- Monitor cache hit rates

### 6. Database Query Optimization

**Purpose:** Load only required columns to reduce memory usage

**Location:** Various repository files

**Optimization Patterns:**

**Before:**
```typescript
// Loads ALL columns (5KB per row)
const contacts = await pool.query(
  'SELECT * FROM contacts WHERE user_id = $1',
  [userId]
);
```

**After:**
```typescript
// Loads only needed columns (500 bytes per row)
const contacts = await pool.query(
  `SELECT 
    id, 
    name, 
    last_contact_date, 
    frequency_preference
   FROM contacts 
   WHERE user_id = $1`,
  [userId]
);
```

**Index Optimization:**
```sql
-- Add index for cursor-based pagination
CREATE INDEX idx_contacts_user_last_contact 
ON contacts(user_id, last_contact_date ASC NULLS FIRST, id);

-- Add index for archived filter
CREATE INDEX idx_contacts_user_archived 
ON contacts(user_id, archived) 
WHERE archived = false;
```

## Data Flow Diagrams

### Suggestion Generation Flow (Memory-Optimized)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Job Triggered                                             │
│    └─> Check memory circuit breaker                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Initialize Streaming                                      │
│    ├─> Create async generator for contacts                  │
│    ├─> Fetch available time slots (cached)                  │
│    └─> Initialize suggestions array (max 50)                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Stream Contacts (Loop)                                    │
│    ├─> Fetch batch of 100 contacts (minimal data)           │
│    ├─> Check memory circuit breaker                         │
│    ├─> Process batch (calculate priorities, match slots)    │
│    ├─> Add suggestions to array                             │
│    ├─> Check if max suggestions reached                     │
│    ├─> Force GC if available                                │
│    └─> Yield to event loop                                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Finalize                                                  │
│    ├─> Trim to max suggestions (50)                         │
│    ├─> Log memory usage                                     │
│    └─> Return results                                       │
└─────────────────────────────────────────────────────────────┘
```

### Contact Sync Flow (Memory-Optimized)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Sync Triggered                                            │
│    └─> Check memory circuit breaker                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch from Google (Paginated)                            │
│    ├─> Request page of 500 contacts                         │
│    └─> Process immediately (don't accumulate)               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Process Batch                                             │
│    ├─> Import/update each contact                           │
│    ├─> Store group memberships                              │
│    ├─> Check memory circuit breaker                         │
│    └─> Force GC after batch                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Next Page or Complete                                     │
│    ├─> If nextPageToken: Fetch next page                    │
│    └─> Else: Store sync token and complete                  │
└─────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

### Memory Usage Comparison

| Operation | Before | After | Reduction |
|-----------|--------|-------|-----------|
| Suggestion Generation (1,318 contacts) | 60-120 MB | 15-25 MB | 75-80% |
| Contact Sync (1,318 contacts) | 25-35 MB | 8-12 MB | 65-70% |
| Calendar Sync (2,000 events) | 15-20 MB | 5-8 MB | 60-65% |
| Peak Memory (10 concurrent users) | 600MB-1.2GB | 150-250 MB | 75-80% |

### Processing Time Impact

| Operation | Before | After | Change |
|-----------|--------|-------|--------|
| Suggestion Generation | 8-10s | 9-12s | +10-20% |
| Contact Sync | 3-4s | 3-5s | +0-25% |
| Calendar Sync | 5-7s | 5-8s | +0-15% |

**Note:** Slight performance decrease is acceptable trade-off for memory safety

### Scalability Limits

| Metric | Before | After |
|--------|--------|-------|
| Max Contacts per User | ~2,000 | 100,000+ |
| Max Concurrent Users | ~10 | 100+ |
| Heap Size Required | 4GB+ | 2GB |
| Crash Frequency | Daily | Never |

## Error Handling

### Memory Circuit Breaker Errors

```typescript
try {
  await processSuggestionGeneration(job);
} catch (error) {
  if (error instanceof MemoryCircuitBreakerError) {
    // Log detailed memory info
    console.error('Memory circuit breaker triggered:', {
      heapUsed: error.memoryUsage.heapUsed,
      heapPercent: error.memoryUsage.heapPercent,
      operation: 'suggestion-generation',
      userId: job.data.userId
    });
    
    // Retry with smaller batch size
    return await processSuggestionGeneration({
      ...job,
      data: { ...job.data, batchSize: 50 }
    });
  }
  throw error;
}
```

### Graceful Degradation

When memory pressure is high:
1. Reduce batch size (100 → 50 → 25)
2. Reduce max suggestions (50 → 25 → 10)
3. Skip non-critical operations
4. Return partial results with warning

## Monitoring and Observability

### Metrics to Track

```typescript
// Memory metrics
metrics.gauge('nodejs.heap.used.bytes', process.memoryUsage().heapUsed);
metrics.gauge('nodejs.heap.total.bytes', process.memoryUsage().heapTotal);
metrics.gauge('nodejs.heap.percent', heapPercent);
metrics.gauge('nodejs.rss.bytes', process.memoryUsage().rss);

// Operation metrics
metrics.histogram('suggestion.generation.memory.peak', peakMemory);
metrics.histogram('suggestion.generation.duration', duration);
metrics.counter('suggestion.generation.contacts.processed', contactCount);
metrics.counter('memory.circuit.breaker.triggered', 1);

// Cache metrics
metrics.gauge('cache.contacts.size', contactCache.size);
metrics.gauge('cache.contacts.bytes', contactCache.calculatedSize);
metrics.counter('cache.contacts.hits', 1);
metrics.counter('cache.contacts.misses', 1);
```

### Logging

```typescript
// Memory usage logging
console.log('[Memory] Suggestion Generation:', {
  operation: 'suggestion-generation',
  userId,
  contactCount: 1318,
  heapBefore: '1.2 GB',
  heapAfter: '1.4 GB',
  heapDiff: '+200 MB',
  heapPercent: '35%',
  duration: '9.5s',
  suggestionsGenerated: 50
});

// Memory leak detection
console.warn('[Memory] Potential leak detected:', {
  growthPercent: 45,
  firstSample: { heapUsed: '1.0 GB', timestamp: '...' },
  lastSample: { heapUsed: '1.45 GB', timestamp: '...' },
  recommendation: 'Take heap snapshot for investigation'
});
```

## Testing Strategy

### Unit Tests

```typescript
describe('MemoryCircuitBreaker', () => {
  it('should allow operations when memory is low', async () => {
    const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 90 });
    await expect(breaker.execute(async () => 'success')).resolves.toBe('success');
  });
  
  it('should throw when memory exceeds threshold', async () => {
    // Allocate memory to exceed threshold
    const largeArray = new Array(1000000).fill('x'.repeat(1000));
    const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 10 });
    await expect(breaker.execute(async () => 'fail')).rejects.toThrow('Memory circuit breaker');
  });
});

describe('StreamingContactRepository', () => {
  it('should stream contacts in batches', async () => {
    const repo = new StreamingContactRepository();
    const batches: Contact[][] = [];
    
    for await (const batch of repo.streamContacts(userId, { batchSize: 10 })) {
      batches.push(batch);
    }
    
    expect(batches.length).toBeGreaterThan(0);
    expect(batches[0].length).toBeLessThanOrEqual(10);
  });
});
```

### Integration Tests

```typescript
describe('Memory-Efficient Suggestion Generation', () => {
  it('should generate suggestions without exceeding memory limit', async () => {
    await createTestContacts(userId, 1000);
    
    const before = process.memoryUsage();
    
    await processSuggestionGeneration({
      data: { userId, batchSize: 100 }
    });
    
    const after = process.memoryUsage();
    const heapDiff = after.heapUsed - before.heapUsed;
    
    // Should use < 200MB for 1000 contacts
    expect(heapDiff).toBeLessThan(200 * 1024 * 1024);
  });
});
```

### Load Tests

```bash
# Test with 10,000 contacts
npm run test:load -- --contacts=10000 --concurrent-users=10

# Expected results:
# - Peak memory < 2GB
# - No crashes
# - All suggestions generated
# - Response time < 30s
```

## Migration Path

### Phase 1: Critical Fixes (Week 1)
1. Implement memory circuit breaker
2. Add memory monitoring
3. Reduce batch sizes in suggestion generation
4. Add forced GC between batches

### Phase 2: Streaming Architecture (Week 2)
1. Implement streaming contact repository
2. Refactor suggestion generation to use streaming
3. Refactor contact sync to use streaming
4. Add minimal data projections

### Phase 3: Memory Management (Week 3)
1. Implement LRU caches
2. Optimize database queries
3. Add memory leak detection
4. Implement graceful degradation

### Phase 4: Validation (Week 4)
1. Load testing with large datasets
2. Memory profiling
3. Performance benchmarking
4. Documentation updates

## Rollback Strategy

Each phase can be rolled back independently:

**Phase 1 Rollback:**
- Remove memory circuit breaker checks
- Increase heap size to 8GB temporarily
- Revert to original batch sizes

**Phase 2 Rollback:**
- Keep streaming code but disable
- Fall back to original load-all pattern
- Monitor for stability

**Phase 3 Rollback:**
- Disable LRU caches
- Revert to simple Map-based caching
- Keep monitoring in place

## Dependencies

### New Packages
```json
{
  "dependencies": {
    "lru-cache": "^10.0.0",
    "pg-cursor": "^2.10.0"
  }
}
```

### Environment Variables
```bash
# Memory configuration
MAX_HEAP_PERCENT=80
SUGGESTION_BATCH_SIZE=100
MAX_SUGGESTIONS_PER_GENERATION=50
ENABLE_MEMORY_MONITORING=true
ENABLE_FORCED_GC=true
```

### Node.js Flags
```bash
# Enable manual GC
node --expose-gc index.js

# Increase heap size (if needed)
node --max-old-space-size=4096 index.js
```

## Success Criteria

### Phase 1
- ✅ No crashes with 1,300 contacts
- ✅ Memory usage < 2GB during suggestion generation
- ✅ Memory logging in place

### Phase 2
- ✅ Support 10,000 contacts without crashes
- ✅ Memory usage constant regardless of dataset size
- ✅ Performance maintained or improved

### Phase 3
- ✅ LRU caches working correctly
- ✅ Memory monitoring and alerting active
- ✅ Graceful degradation under pressure

### Overall
- ✅ Zero memory crashes for 30 days
- ✅ Support 100,000 contacts per user
- ✅ Peak memory < 2GB for typical workloads
- ✅ 60-80% reduction in memory usage
