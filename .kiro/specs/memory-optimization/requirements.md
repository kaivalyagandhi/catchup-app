# Memory Optimization: Preventing Heap Exhaustion

## Executive Summary

**Problem:** Server crashes with "FATAL ERROR: Reached heap limit" when processing large datasets (1,300+ contacts), despite running with 4GB heap size (`--max-old-space-size=4096`).

**Root Cause:** Memory-intensive operations load entire datasets into memory without streaming or batching, causing heap exhaustion during:
1. Suggestion generation (loads all contacts + calendar events + matching logic)
2. Contact sync (processes 1,300+ contacts with group memberships)
3. Calendar sync (fetches and caches thousands of events)

**Solution:** Implement streaming, batching, and memory-efficient algorithms across all data-intensive operations.

**Expected Outcomes:**
- Eliminate heap exhaustion crashes
- Support 10,000+ contacts without memory issues
- Reduce peak memory usage by 60-80%
- Maintain or improve performance
- Enable horizontal scaling

## Current State Analysis

### Memory Crash Incidents

#### Incident 1: Suggestion Generation After Contact Sync
```
Date: 2026-02-16
Trigger: Synced 1,318 contacts from Google Contacts
Error: FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Heap Size: 4GB (--max-old-space-size=4096)
```

**Stack Trace Analysis:**
- Occurred during suggestion generation job
- Processing all 1,318 contacts simultaneously
- Loading calendar events for 2-week window
- Calculating priority scores and matching logic
- Building suggestion objects with full contact data

#### Incident 2: Contact Sync Memory Buildup
```
Date: 2026-02-16
Trigger: Google Contacts sync (1,318 contacts)
Duration: 3.92 seconds
Memory Pattern: Gradual buildup, then crash during suggestion generation
```

**Memory Buildup Pattern:**
1. Fetch contacts from Google (paginated, 500 per page)
2. Process each contact immediately (good)
3. Store group memberships for each contact
4. Accumulate contact objects in memory
5. Trigger suggestion generation job
6. Load ALL contacts again for matching
7. **CRASH:** Heap exhausted

### Memory-Intensive Operations

#### 1. Suggestion Generation (`src/jobs/processors/suggestion-generation-processor.ts`)
**Current Behavior:**
- Loads ALL contacts for user: `await contactService.listContacts(userId)`
- Loads ALL calendar events for 2-week window
- Calculates priority for EVERY contact
- Matches contacts to timeslots (nested loops)
- Creates suggestion objects with full contact data


**Memory Footprint (estimated):**
```
1,318 contacts × ~5KB per contact = ~6.6MB
+ Calendar events (2 weeks) × ~2KB per event = ~2-10MB
+ Suggestion objects × ~3KB per suggestion = ~1-5MB
+ Intermediate arrays and objects = ~10-20MB
+ V8 overhead (GC, fragmentation) = ~2-3x multiplier
= Peak: 60-120MB per user

With 10 concurrent users: 600MB - 1.2GB
With 100 concurrent users: 6GB - 12GB (exceeds 4GB heap)
```

#### 2. Contact Sync (`src/integrations/google-contacts-sync-service.ts`)
**Current Behavior:**
- Fetches contacts in pages of 500 (good)
- Processes each contact immediately (good)
- BUT: Stores group memberships for ALL contacts
- Accumulates contact objects in repository
- No memory release between pages

**Memory Footprint (estimated):**
```
1,318 contacts × ~5KB = ~6.6MB
+ Group memberships × ~1KB per contact = ~1.3MB
+ Google API response objects = ~10-15MB
+ Database connection pool = ~5-10MB
= Peak: 25-35MB per sync

Multiple concurrent syncs: 100-200MB
```

#### 3. Calendar Sync (`src/calendar/calendar-service.ts`)
**Current Behavior:**
- Fetches events in pages of 250 (good)
- Processes in batches of 100 (good)
- BUT: Accumulates ALL events before processing
- Stores full event objects in cache
- No streaming or incremental processing


**Memory Footprint (estimated):**
```
2,000 events × ~2KB = ~4MB
+ Event processing buffers = ~2-5MB
+ Database batch operations = ~5-10MB
= Peak: 15-20MB per sync

Multiple concurrent syncs: 60-100MB
```

#### 4. Suggestion Service (`src/matching/suggestion-service.ts`)
**Current Behavior:**
- `matchContactsToTimeslot()`: Iterates ALL contacts for EACH timeslot
- `generateTimeboundSuggestions()`: Loads ALL contacts, filters, then matches
- `generateSuggestions()`: Loads contacts, generates individual + group suggestions
- No pagination or streaming
- Creates full suggestion objects with contact data

**Memory Footprint (estimated):**
```
For 1,318 contacts and 20 timeslots:
- Contact array: ~6.6MB
- Matching iterations: 1,318 × 20 = 26,360 operations
- Intermediate match objects: ~10-20MB
- Suggestion objects: ~5-10MB
= Peak: 25-40MB per generation

With concurrent users: 100-200MB
```

### Memory Leak Indicators

**Symptoms:**
1. Memory usage grows over time
2. Crashes occur after multiple sync operations
3. Garbage collection cannot reclaim memory
4. Heap size increases until limit reached

**Potential Leaks:**
1. Contact objects retained in closures
2. Event listeners not cleaned up
3. Cache entries never expire
4. Database connections not released
5. Large arrays not cleared after use


## Root Cause Analysis

### Primary Causes

#### 1. Load-All-Data Pattern
**Problem:** Services load entire datasets into memory before processing

**Examples:**
- `contactService.listContacts(userId)` - loads ALL contacts
- `calendarEventsRepository.getCachedEvents()` - loads ALL events
- `suggestionService.generateTimeboundSuggestions()` - loads ALL contacts

**Impact:** Memory usage scales linearly with data size (O(n))

**Solution:** Implement streaming/pagination patterns

#### 2. Nested Iteration Without Limits
**Problem:** Nested loops over large datasets without pagination

**Example:**
```typescript
// In matchContactsToTimeslot()
for (const contact of contacts) {  // 1,318 iterations
  // Calculate priority
  // Build reasoning
  // Create match object
}
// Repeated for EACH timeslot (20+ times)
```

**Impact:** O(n × m) memory complexity (contacts × timeslots)

**Solution:** Implement cursor-based iteration with limits

#### 3. Full Object Retention
**Problem:** Storing complete objects when only subset of fields needed

**Example:**
```typescript
// Suggestion stores full Contact object
{
  contact: {
    id, name, email, phone, company, jobTitle,
    tags, groups, customNotes, location, timezone,
    frequencyPreference, lastContactDate, ...
  }
}
```

**Impact:** 5KB per contact vs 500 bytes for minimal data

**Solution:** Store only required fields (id, name, priority)


#### 4. No Memory Limits or Circuit Breakers
**Problem:** No safeguards against excessive memory usage

**Missing Protections:**
- No max contacts per batch
- No max suggestions per generation
- No memory usage monitoring
- No graceful degradation

**Impact:** Unbounded memory growth until crash

**Solution:** Implement limits and circuit breakers

#### 5. Synchronous Processing
**Problem:** Processing large datasets synchronously blocks event loop

**Example:**
```typescript
// Processes ALL contacts before yielding
for (const contact of contacts) {
  await processContact(contact);
}
```

**Impact:** Prevents garbage collection, accumulates memory

**Solution:** Implement async batching with yield points

### Secondary Causes

#### 6. Inefficient Data Structures
**Problem:** Using arrays for operations better suited to streams

**Example:**
```typescript
const allEvents = await fetchEventsFromGoogle(); // Array
const busySlots = allEvents.map(...).filter(...); // New array
const freeSlots = identifyFreeSlots(busySlots); // New array
```

**Impact:** 3x memory usage (original + mapped + filtered)

**Solution:** Use generators and iterators

#### 7. Cache Without Eviction
**Problem:** Caches grow unbounded without LRU eviction

**Example:**
- Contact cache never evicts old entries
- Calendar event cache stores 30 days of events
- Suggestion cache accumulates over time

**Impact:** Memory grows indefinitely

**Solution:** Implement LRU cache with size limits


#### 8. Database Query Inefficiency
**Problem:** Loading full rows when only subset needed

**Example:**
```sql
-- Loads ALL columns
SELECT * FROM contacts WHERE user_id = $1;

-- Better: Load only needed columns
SELECT id, name, last_contact_date, frequency_preference 
FROM contacts WHERE user_id = $1;
```

**Impact:** 5KB per row vs 500 bytes

**Solution:** Use column projection in queries

## Proposed Architecture

### Design Principles

1. **Stream, Don't Load:** Process data as it arrives, don't accumulate (Node.js best practice)
2. **Batch with Limits:** Process in fixed-size batches with memory limits
3. **Minimal Data:** Store only required fields, fetch on-demand
4. **Async Yielding:** Yield control to event loop between batches
5. **Circuit Breakers:** Fail fast when limits exceeded
6. **Memory Monitoring:** Track usage and alert on thresholds
7. **Graceful Degradation:** Reduce functionality under memory pressure
8. **Weak References:** Use WeakMap/WeakSet for optional caching (V8 best practice)
9. **Cursor-Based Pagination:** Use database cursors for constant memory usage
10. **Concurrency Control:** Limit parallel operations to prevent memory spikes

### Target Architecture

#### 1. Streaming Contact Processing (Async Generator Pattern)
```typescript
// BEFORE: Load all contacts
const contacts = await contactService.listContacts(userId);

// AFTER: Stream contacts using async generators (Node.js best practice)
async function* streamContacts(userId: string, batchSize = 100): AsyncGenerator<Contact[]> {
  let offset = 0;
  
  while (true) {
    const batch = await db.query(
      'SELECT * FROM contacts WHERE user_id = $1 LIMIT $2 OFFSET $3',
      [userId, batchSize, offset]
    );
    
    if (batch.rows.length === 0) break;
    
    yield batch.rows;
    offset += batchSize;
    
    // Yield to event loop (prevents blocking)
    await new Promise(resolve => setImmediate(resolve));
  }
}

// Usage
for await (const contactBatch of streamContacts(userId)) {
  await processContactBatch(contactBatch);
}
```

#### 2. Cursor-Based Suggestion Generation (Database Cursor Pattern)
```typescript
// BEFORE: Load all contacts, match all
const contacts = await contactService.listContacts(userId);
const suggestions = await matchContactsToTimeslots(contacts, slots);

// AFTER: Use database cursor for constant memory (PostgreSQL best practice)
import Cursor from 'pg-cursor';

async function generateSuggestionsWithCursor(userId: string, slots: TimeSlot[]) {
  const client = await pool.connect();
  const suggestions: Suggestion[] = [];
  const MAX_SUGGESTIONS = 50;
  
  try {
    const cursor = client.query(new Cursor(
      `SELECT id, name, last_contact_date, frequency_preference, groups
       FROM contacts 
       WHERE user_id = $1 AND archived = false
       ORDER BY last_contact_date ASC NULLS FIRST`,
      [userId]
    ));
    
    const BATCH_SIZE = 100;
    
    while (suggestions.length < MAX_SUGGESTIONS) {
      const rows = await new Promise<Contact[]>((resolve, reject) => {
        cursor.read(BATCH_SIZE, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      if (rows.length === 0) break;
      
      // Process batch
      const batchSuggestions = await matchContactsToTimeslots(rows, slots);
      suggestions.push(...batchSuggestions.slice(0, MAX_SUGGESTIONS - suggestions.length));
      
      // Force GC between batches
      if (global.gc) global.gc();
    }
    
    cursor.close();
    return suggestions;
  } finally {
    client.release();
  }
}
```


#### 3. Minimal Data Projection
```typescript
// BEFORE: Full contact object
interface Contact {
  id, name, email, phone, company, jobTitle,
  tags, groups, customNotes, location, timezone,
  frequencyPreference, lastContactDate, ...
}

// AFTER: Minimal contact for matching
interface ContactForMatching {
  id: string;
  name: string;
  lastContactDate: Date | null;
  frequencyPreference: FrequencyOption;
  groups: string[];  // Just IDs, not full objects
}
```

#### 4. Memory Circuit Breaker
```typescript
class MemoryCircuitBreaker {
  private maxHeapUsagePercent = 80;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const heapUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
    
    if (heapUsage > this.maxHeapUsagePercent / 100) {
      throw new Error('Memory circuit breaker: Heap usage too high');
    }
    
    return await operation();
  }
}
```

#### 5. LRU Cache with Size Limits
```typescript
// BEFORE: Unbounded cache
const cache = new Map();

// AFTER: LRU cache with size limit
const cache = new LRUCache({
  max: 1000,  // Max 1000 entries
  maxSize: 50 * 1024 * 1024,  // Max 50MB
  sizeCalculation: (value) => JSON.stringify(value).length,
});
```

## Requirements

### Functional Requirements

#### FR-1: Streaming Contact Processing
**Description:** Process contacts in batches without loading all into memory

**Acceptance Criteria:**
- Contact repository supports cursor-based pagination
- Batch size configurable (default: 100 contacts)
- Memory usage stays constant regardless of total contacts
- Processing time scales linearly with contact count

**Priority:** HIGH (Critical for preventing crashes)


#### FR-2: Memory-Efficient Suggestion Generation
**Description:** Generate suggestions without loading all contacts into memory

**Acceptance Criteria:**
- Process contacts in batches of 100
- Stop when max suggestions reached (default: 50)
- Use minimal contact data (id, name, lastContactDate, frequencyPreference)
- Yield to event loop between batches
- Memory usage < 100MB for 10,000 contacts

**Priority:** HIGH (Primary crash cause)

#### FR-3: Optimized Calendar Sync
**Description:** Sync calendar events without accumulating all in memory

**Acceptance Criteria:**
- Process events in batches of 100
- Stream events to database without intermediate arrays
- Use database transactions for batch inserts
- Memory usage < 50MB for 10,000 events

**Priority:** MEDIUM (Secondary optimization)

#### FR-4: Memory Circuit Breaker
**Description:** Prevent operations when memory usage exceeds threshold

**Acceptance Criteria:**
- Monitor heap usage before expensive operations
- Fail fast with clear error when threshold exceeded (80% heap)
- Log memory usage for debugging
- Provide graceful degradation options

**Priority:** HIGH (Safety mechanism)

#### FR-5: LRU Cache Implementation
**Description:** Replace unbounded caches with size-limited LRU caches

**Acceptance Criteria:**
- Contact cache limited to 1000 entries or 50MB
- Calendar event cache limited to 5000 entries or 100MB
- Suggestion cache limited to 500 entries or 25MB
- Automatic eviction of least-recently-used entries

**Priority:** MEDIUM (Prevents long-term memory growth)


#### FR-6: Database Query Optimization
**Description:** Load only required columns from database

**Acceptance Criteria:**
- Contact queries use column projection
- Separate queries for minimal vs full contact data
- Index optimization for cursor-based pagination
- Query performance maintained or improved

**Priority:** MEDIUM (Reduces data transfer)

#### FR-7: Memory Monitoring and Alerting
**Description:** Track memory usage and alert on thresholds

**Acceptance Criteria:**
- Log memory usage before/after expensive operations
- Alert when heap usage exceeds 70%
- Track memory usage per operation type
- Dashboard showing memory trends

**Priority:** MEDIUM (Observability)

### Non-Functional Requirements

#### NFR-1: Memory Efficiency
**Target:** Peak memory usage < 2GB for 10,000 contacts
**Measurement:** `process.memoryUsage().heapUsed`
**Acceptance:** No crashes with 4GB heap for any dataset size

#### NFR-2: Performance
**Target:** Suggestion generation < 10 seconds for 10,000 contacts
**Measurement:** Job duration metrics
**Acceptance:** No degradation vs current performance

#### NFR-3: Scalability
**Target:** Support 100,000 contacts per user
**Measurement:** Load testing with large datasets
**Acceptance:** Linear memory growth, no crashes

#### NFR-4: Reliability
**Target:** Zero memory-related crashes for 30 days
**Measurement:** Error logs and crash reports
**Acceptance:** 99.9% uptime

#### NFR-5: Maintainability
**Target:** Clear memory management patterns
**Measurement:** Code review and documentation
**Acceptance:** All developers understand patterns


## Implementation Phases

### Phase 1: Critical Fixes (Priority: URGENT)
**Goal:** Prevent immediate crashes with minimal changes

**Estimated Effort:** 8-12 hours

**Tasks:**
1. Add memory circuit breaker to suggestion generation
2. Implement batch processing with limits (max 50 suggestions)
3. Add memory logging before/after operations
4. Reduce contact data in suggestions (minimal fields only)
5. Force garbage collection between batches

**Success Criteria:**
- No crashes with 1,300 contacts
- Memory usage < 2GB during suggestion generation
- All existing functionality maintained

**Rollback Plan:**
- Revert to current code
- Increase heap size to 8GB as temporary measure

### Phase 2: Streaming Architecture (Priority: HIGH)
**Goal:** Implement streaming patterns for all data-intensive operations

**Estimated Effort:** 16-24 hours

**Tasks:**
1. Implement cursor-based contact pagination
2. Refactor suggestion generation to use streaming
3. Refactor calendar sync to use streaming
4. Add async yielding between batches
5. Implement minimal data projections

**Success Criteria:**
- Memory usage constant regardless of dataset size
- Support 10,000 contacts without crashes
- Performance maintained or improved

**Rollback Plan:**
- Keep old code in separate branch
- Can revert per-operation if issues arise

### Phase 3: Memory Management (Priority: MEDIUM)
**Goal:** Implement comprehensive memory management

**Estimated Effort:** 12-16 hours

**Tasks:**
1. Implement LRU caches with size limits
2. Optimize database queries (column projection)
3. Add memory monitoring and alerting
4. Implement graceful degradation
5. Add memory profiling tools

**Success Criteria:**
- Caches never exceed size limits
- Memory usage tracked and alerted
- Graceful degradation under pressure

**Rollback Plan:**
- Disable LRU caches if issues
- Revert to simple caching


### Phase 4: Load Testing and Optimization (Priority: LOW)
**Goal:** Validate and optimize for extreme scale

**Estimated Effort:** 8-12 hours

**Tasks:**
1. Load test with 100,000 contacts
2. Profile memory usage under load
3. Optimize hot paths
4. Add performance benchmarks
5. Document best practices

**Success Criteria:**
- Support 100,000 contacts
- Memory usage < 4GB under load
- Performance benchmarks established

## Technical Design

### Streaming Contact Iterator

```typescript
// src/contacts/streaming-repository.ts
export class StreamingContactRepository {
  async *streamContacts(
    userId: string,
    options: {
      batchSize?: number;
      minimalData?: boolean;
    } = {}
  ): AsyncGenerator<Contact[], void, undefined> {
    const batchSize = options.batchSize || 100;
    let offset = 0;
    
    while (true) {
      const query = options.minimalData
        ? 'SELECT id, name, last_contact_date, frequency_preference FROM contacts WHERE user_id = $1 LIMIT $2 OFFSET $3'
        : 'SELECT * FROM contacts WHERE user_id = $1 LIMIT $2 OFFSET $3';
      
      const result = await pool.query(query, [userId, batchSize, offset]);
      
      if (result.rows.length === 0) break;
      
      yield result.rows;
      offset += batchSize;
      
      // Yield to event loop
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}
```

### Memory-Efficient Suggestion Generation

```typescript
// src/jobs/processors/suggestion-generation-processor.ts
export async function processSuggestionGeneration(
  job: Bull.Job<SuggestionGenerationJobData>
): Promise<SuggestionGenerationResult> {
  const MAX_SUGGESTIONS = 50;
  const BATCH_SIZE = 100;
  
  const memoryBreaker = new MemoryCircuitBreaker();
  const suggestions: Suggestion[] = [];
  
  // Get available slots
  const availableSlots = await calendarService.getFreeTimeSlots(...);
  
  // Stream contacts in batches
  for await (const contactBatch of contactRepository.streamContacts(userId, { 
    batchSize: BATCH_SIZE,
    minimalData: true 
  })) {
    // Check memory before processing
    await memoryBreaker.checkMemory();
    
    // Process batch
    const batchSuggestions = await generateSuggestionsForBatch(
      contactBatch,
      availableSlots
    );
    
    suggestions.push(...batchSuggestions);
    
    // Stop if we have enough suggestions
    if (suggestions.length >= MAX_SUGGESTIONS) {
      break;
    }
    
    // Force GC if available
    if (global.gc) global.gc();
  }
  
  return { suggestions: suggestions.slice(0, MAX_SUGGESTIONS) };
}
```


### Memory Circuit Breaker

```typescript
// src/utils/memory-circuit-breaker.ts
export class MemoryCircuitBreaker {
  private maxHeapPercent: number;
  private checkInterval: number;
  
  constructor(maxHeapPercent = 80, checkInterval = 1000) {
    this.maxHeapPercent = maxHeapPercent;
    this.checkInterval = checkInterval;
  }
  
  async checkMemory(): Promise<void> {
    const usage = process.memoryUsage();
    const heapPercent = (usage.heapUsed / usage.heapTotal) * 100;
    
    if (heapPercent > this.maxHeapPercent) {
      const error = new Error(
        `Memory circuit breaker triggered: ${heapPercent.toFixed(1)}% heap used`
      );
      console.error(error.message, usage);
      throw error;
    }
  }
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.checkMemory();
    const result = await operation();
    await this.checkMemory();
    return result;
  }
}
```

### LRU Cache Implementation

```typescript
// src/utils/lru-cache.ts
import { LRUCache } from 'lru-cache';

export const contactCache = new LRUCache<string, Contact>({
  max: 1000,
  maxSize: 50 * 1024 * 1024, // 50MB
  sizeCalculation: (contact) => {
    return JSON.stringify(contact).length;
  },
  ttl: 1000 * 60 * 60, // 1 hour
});

export const calendarEventCache = new LRUCache<string, CalendarEvent[]>({
  max: 5000,
  maxSize: 100 * 1024 * 1024, // 100MB
  sizeCalculation: (events) => {
    return JSON.stringify(events).length;
  },
  ttl: 1000 * 60 * 60 * 24, // 24 hours
});
```

### Memory Monitoring

```typescript
// src/utils/memory-monitor.ts
export class MemoryMonitor {
  logMemoryUsage(operation: string, before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage) {
    const heapDiff = after.heapUsed - before.heapUsed;
    const heapPercent = (after.heapUsed / after.heapTotal) * 100;
    
    console.log(`[Memory] ${operation}:`, {
      heapUsed: `${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(after.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapPercent: `${heapPercent.toFixed(1)}%`,
      heapDiff: `${(heapDiff / 1024 / 1024).toFixed(2)} MB`,
    });
    
    // Alert if heap usage > 70%
    if (heapPercent > 70) {
      console.warn(`[Memory] WARNING: High heap usage (${heapPercent.toFixed(1)}%)`);
    }
  }
  
  async wrapOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const before = process.memoryUsage();
    const result = await fn();
    const after = process.memoryUsage();
    this.logMemoryUsage(operation, before, after);
    return result;
  }
}
```


## Testing Strategy

### Unit Tests

#### Memory Circuit Breaker Tests
```typescript
describe('MemoryCircuitBreaker', () => {
  it('should allow operations when memory is low', async () => {
    const breaker = new MemoryCircuitBreaker(90);
    await expect(breaker.execute(async () => 'success')).resolves.toBe('success');
  });
  
  it('should throw when memory exceeds threshold', async () => {
    // Allocate memory to exceed threshold
    const largeArray = new Array(1000000).fill('x'.repeat(1000));
    const breaker = new MemoryCircuitBreaker(10);
    await expect(breaker.execute(async () => 'fail')).rejects.toThrow('Memory circuit breaker');
  });
});
```

#### Streaming Repository Tests
```typescript
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
  
  it('should use minimal data when requested', async () => {
    const repo = new StreamingContactRepository();
    
    for await (const batch of repo.streamContacts(userId, { minimalData: true })) {
      const contact = batch[0];
      expect(contact).toHaveProperty('id');
      expect(contact).toHaveProperty('name');
      expect(contact).not.toHaveProperty('customNotes');
      break;
    }
  });
});
```

### Integration Tests

#### Memory-Efficient Suggestion Generation
```typescript
describe('Suggestion Generation - Memory', () => {
  it('should generate suggestions without exceeding memory limit', async () => {
    // Create 1000 test contacts
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

#### Large Dataset Test
```typescript
describe('Load Test - 10,000 Contacts', () => {
  it('should handle 10,000 contacts without crashing', async () => {
    await createTestContacts(userId, 10000);
    
    const result = await processSuggestionGeneration({
      data: { userId }
    });
    
    expect(result.suggestionsGenerated).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Memory Profiling

#### Heap Snapshot Analysis
```bash
# Take heap snapshot before operation
node --expose-gc --heap-prof index.js

# Analyze with Chrome DevTools
# Look for:
# - Retained size of objects
# - Shallow size of arrays
# - Detached DOM nodes (if applicable)
# - Closure retentions
```

## Monitoring and Observability

### Metrics to Track

#### Memory Metrics
- **Heap Used:** Current heap memory usage (MB)
- **Heap Total:** Total heap size (MB)
- **Heap Percent:** Heap used / heap total (%)
- **RSS:** Resident set size (total memory)
- **External:** C++ objects bound to JS (MB)

#### Operation Metrics
- **Suggestion Generation Memory:** Peak memory during generation
- **Contact Sync Memory:** Peak memory during sync
- **Calendar Sync Memory:** Peak memory during sync
- **Memory Per Contact:** Average memory per contact processed

#### Performance Metrics
- **Suggestion Generation Time:** Duration (seconds)
- **Contacts Processed Per Second:** Throughput
- **Memory Efficiency:** Contacts processed per MB

### Logging

#### Memory Usage Logging
```typescript
console.log('[Memory] Suggestion Generation:', {
  operation: 'suggestion-generation',
  userId,
  contactCount: 1318,
  heapBefore: '1.2 GB',
  heapAfter: '1.8 GB',
  heapDiff: '+600 MB',
  heapPercent: '45%',
  duration: '8.5s',
});
```

### Alerting

#### Critical Alerts
- Heap usage > 90% for > 1 minute
- Memory circuit breaker triggered > 5 times/hour
- Process crash with OOM error
- Memory leak detected (continuous growth)

#### Warning Alerts
- Heap usage > 70% for > 5 minutes
- Memory circuit breaker triggered
- Suggestion generation > 30 seconds
- Contact sync > 60 seconds

## Risk Assessment

### High Risk Items

#### Risk 1: Performance Degradation
**Description:** Streaming and batching may slow down operations

**Mitigation:**
- Benchmark before/after changes
- Optimize batch sizes
- Use database indexes
- Profile hot paths

**Contingency:**
- Revert to current code
- Increase heap size temporarily
- Optimize specific operations

#### Risk 2: Incomplete Suggestions
**Description:** Limiting suggestions may miss important connections

**Mitigation:**
- Set reasonable limits (50 suggestions)
- Prioritize by recency and frequency
- Allow manual refresh for more

**Contingency:**
- Increase suggestion limit
- Add "load more" functionality
- Generate on-demand

### Medium Risk Items

#### Risk 3: Cache Eviction Issues
**Description:** LRU cache may evict frequently-used data

**Mitigation:**
- Monitor cache hit rates
- Tune cache sizes
- Use appropriate TTLs

**Contingency:**
- Increase cache sizes
- Adjust eviction policy
- Revert to simple cache

## Success Metrics

### Phase 1 Success Criteria
- ✅ No crashes with 1,300 contacts
- ✅ Memory usage < 2GB during suggestion generation
- ✅ All functionality maintained
- ✅ Memory logging in place

### Phase 2 Success Criteria
- ✅ Support 10,000 contacts without crashes
- ✅ Memory usage constant regardless of dataset size
- ✅ Performance maintained or improved
- ✅ Streaming implemented for all operations

### Phase 3 Success Criteria
- ✅ LRU caches implemented and working
- ✅ Memory monitoring and alerting active
- ✅ Graceful degradation under pressure
- ✅ Database queries optimized

### Overall Success Criteria
- ✅ Zero memory crashes for 30 days
- ✅ Support 100,000 contacts per user
- ✅ Peak memory < 2GB for typical workloads
- ✅ 60-80% reduction in memory usage
- ✅ No performance degradation

## Timeline

### Week 1: Phase 1 (Critical Fixes)
- **Day 1-2:** Implement memory circuit breaker and batch limits
- **Day 3:** Add memory logging and monitoring
- **Day 4:** Test with 1,300 contacts
- **Day 5:** Deploy and monitor

### Week 2: Phase 2 (Streaming Architecture)
- **Day 1-2:** Implement streaming contact repository
- **Day 3-4:** Refactor suggestion generation
- **Day 5:** Test and deploy

### Week 3: Phase 3 (Memory Management)
- **Day 1-2:** Implement LRU caches
- **Day 3:** Optimize database queries
- **Day 4-5:** Add monitoring and alerting

### Week 4: Phase 4 (Load Testing)
- **Day 1-3:** Load test with large datasets
- **Day 4-5:** Optimize and document

**Total Timeline:** 4 weeks

## Dependencies

### External Dependencies
- `lru-cache` package for LRU cache implementation
- Node.js `--expose-gc` flag for manual GC
- Monitoring tools (Grafana, CloudWatch, etc.)

### Internal Dependencies
- All services using contacts must support streaming
- All queue processors must use memory circuit breaker
- Database must support cursor-based pagination
- Cache layer must support LRU eviction

## Appendix

### A. Files to Modify

**High Priority:**
- `src/jobs/processors/suggestion-generation-processor.ts`
- `src/matching/suggestion-service.ts`
- `src/contacts/repository.ts`
- `src/contacts/service.ts`

**Medium Priority:**
- `src/integrations/google-contacts-sync-service.ts`
- `src/calendar/calendar-service.ts`
- `src/utils/cache.ts`

**New Files:**
- `src/utils/memory-circuit-breaker.ts`
- `src/utils/memory-monitor.ts`
- `src/utils/lru-cache.ts`
- `src/contacts/streaming-repository.ts`

### B. Package Changes
```json
{
  "dependencies": {
    "lru-cache": "^10.0.0"
  }
}
```

### C. Environment Variables
```bash
# Memory configuration
MAX_HEAP_PERCENT=80
SUGGESTION_BATCH_SIZE=100
MAX_SUGGESTIONS_PER_GENERATION=50
ENABLE_MEMORY_MONITORING=true
```

### D. Reference Documentation
- Node.js Memory Management: https://nodejs.org/en/docs/guides/simple-profiling/
- V8 Heap Profiling: https://v8.dev/docs/profile
- LRU Cache: https://github.com/isaacs/node-lru-cache
- Stream Processing: https://nodejs.org/api/stream.html
