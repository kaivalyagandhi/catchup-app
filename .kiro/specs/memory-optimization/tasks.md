# Memory Optimization: Implementation Tasks

## Overview

This document breaks down the memory optimization implementation into concrete, actionable tasks organized by phase. Each task includes acceptance criteria, estimated effort, and dependencies.

## Task Organization

Tasks are organized into 4 phases:
- **Phase 1:** Critical Fixes (URGENT - 8-12 hours)
- **Phase 2:** Streaming Architecture (HIGH - 16-24 hours)
- **Phase 3:** Memory Management (MEDIUM - 12-16 hours)
- **Phase 4:** Load Testing and Optimization (LOW - 8-12 hours)

---

## Phase 1: Critical Fixes (URGENT)

**Goal:** Prevent immediate crashes with minimal changes
**Timeline:** Week 1 (5 days)
**Total Effort:** 8-12 hours

### Task 1.1: Implement Memory Circuit Breaker

**Priority:** CRITICAL
**Effort:** 2-3 hours
**Dependencies:** None

**Description:**
Create a memory circuit breaker utility that monitors heap usage and prevents operations when memory exceeds safe thresholds.

**Acceptance Criteria:**
- [ ] Create `src/utils/memory-circuit-breaker.ts`
- [ ] Implement `MemoryCircuitBreaker` class with configurable threshold
- [ ] Add `checkMemory()` method that throws when threshold exceeded
- [ ] Add `execute()` method that wraps operations with memory checks
- [ ] Add `getMemoryUsage()` method for current memory stats
- [ ] Create custom `MemoryCircuitBreakerError` class
- [ ] Add unit tests with 90%+ coverage
- [ ] Document usage with examples

**Implementation Checklist:**
```typescript
// src/utils/memory-circuit-breaker.ts
- [ ] Define MemoryCircuitBreakerOptions interface
- [ ] Define MemoryUsage interface
- [ ] Implement MemoryCircuitBreaker class
- [ ] Implement checkMemory() method
- [ ] Implement execute() wrapper method
- [ ] Implement getMemoryUsage() helper
- [ ] Add detailed logging
- [ ] Export class and types
```

**Testing:**
```bash
npm test src/utils/memory-circuit-breaker.test.ts
```

---

### Task 1.2: Implement Memory Monitor

**Priority:** HIGH
**Effort:** 2-3 hours
**Dependencies:** None

**Description:**
Create a memory monitoring utility that tracks memory usage over time and detects potential leaks.

**Acceptance Criteria:**
- [ ] Create `src/utils/memory-monitor.ts`
- [ ] Implement `MemoryMonitor` class with sampling
- [ ] Add `start()` and `stop()` methods for monitoring lifecycle
- [ ] Add `logMemoryUsage()` for operation tracking
- [ ] Add `wrapOperation()` for automatic tracking
- [ ] Implement leak detection algorithm
- [ ] Add unit tests with 85%+ coverage
- [ ] Document usage patterns

**Implementation Checklist:**
```typescript
// src/utils/memory-monitor.ts
- [ ] Define MemoryMonitorOptions interface
- [ ] Define MemorySample interface
- [ ] Define LeakDetectionResult interface
- [ ] Implement MemoryMonitor class
- [ ] Implement sampling logic
- [ ] Implement leak detection algorithm
- [ ] Add operation wrapping
- [ ] Export class and types
```

**Testing:**
```bash
npm test src/utils/memory-monitor.test.ts
```

---

### Task 1.3: Add Memory Checks to Suggestion Generation

**Priority:** CRITICAL
**Effort:** 2 hours
**Dependencies:** Task 1.1

**Description:**
Integrate memory circuit breaker into suggestion generation processor to prevent crashes.

**Acceptance Criteria:**
- [ ] Import `MemoryCircuitBreaker` in suggestion processor
- [ ] Add memory check before processing each batch
- [ ] Add memory check after processing completes
- [ ] Add error handling for `MemoryCircuitBreakerError`
- [ ] Log memory usage before/after operation
- [ ] Test with 1,300 contacts
- [ ] Verify no crashes occur

**Implementation Checklist:**
```typescript
// src/jobs/processors/suggestion-generation-processor.ts
- [ ] Import MemoryCircuitBreaker
- [ ] Create breaker instance at start
- [ ] Add checkMemory() before batch processing
- [ ] Add checkMemory() after batch processing
- [ ] Add try-catch for MemoryCircuitBreakerError
- [ ] Log memory usage
- [ ] Update error handling
```

**Testing:**
```bash
# Test with real data
npm run test:suggestion-generation -- --contacts=1300
```

---

### Task 1.4: Reduce Batch Sizes and Add Limits

**Priority:** HIGH
**Effort:** 1-2 hours
**Dependencies:** None

**Description:**
Reduce batch sizes and add hard limits to prevent unbounded memory growth.

**Acceptance Criteria:**
- [ ] Reduce suggestion generation batch size to 100 (from unlimited)
- [ ] Add MAX_SUGGESTIONS limit of 50
- [ ] Add early exit when max suggestions reached
- [ ] Reduce contact sync page size to 500 (from 1000)
- [ ] Reduce calendar sync batch size to 100 (from 250)
- [ ] Update configuration documentation
- [ ] Test with various dataset sizes

**Implementation Checklist:**
```typescript
// src/jobs/processors/suggestion-generation-processor.ts
- [ ] Change DEFAULT_BATCH_SIZE to 100
- [ ] Add MAX_SUGGESTIONS constant (50)
- [ ] Add early exit logic
- [ ] Update loop conditions

// src/integrations/google-contacts-sync-service.ts
- [ ] Change pageSize to 500

// src/calendar/calendar-service.ts
- [ ] Change BATCH_SIZE to 100
```

**Testing:**
```bash
npm test -- --grep="batch size"
```

---

### Task 1.5: Add Forced Garbage Collection

**Priority:** MEDIUM
**Effort:** 1 hour
**Dependencies:** None

**Description:**
Add forced garbage collection between batches to release memory more aggressively.

**Acceptance Criteria:**
- [ ] Add `global.gc` checks before forcing GC
- [ ] Force GC after each batch in suggestion generation
- [ ] Force GC after each page in contact sync
- [ ] Force GC after each batch in calendar sync
- [ ] Add logging when GC is forced
- [ ] Document `--expose-gc` flag requirement
- [ ] Update deployment scripts

**Implementation Checklist:**
```typescript
// Add to all batch processing loops
- [ ] Check if (global.gc) exists
- [ ] Call global.gc() after batch
- [ ] Log GC invocation
- [ ] Add comment explaining purpose
```

**Deployment:**
```bash
# Update package.json scripts
- [ ] Add --expose-gc to start script
- [ ] Update Dockerfile CMD
- [ ] Update cloudbuild.yaml
```

---

### Task 1.6: Add Memory Logging

**Priority:** MEDIUM
**Effort:** 1-2 hours
**Dependencies:** Task 1.2

**Description:**
Add comprehensive memory logging to all data-intensive operations.

**Acceptance Criteria:**
- [ ] Log memory before/after suggestion generation
- [ ] Log memory before/after contact sync
- [ ] Log memory before/after calendar sync
- [ ] Include heap used, heap total, heap percent, RSS
- [ ] Format memory values in MB for readability
- [ ] Add operation duration to logs
- [ ] Test log output format

**Implementation Checklist:**
```typescript
// Add to each processor
- [ ] Capture memory before operation
- [ ] Capture memory after operation
- [ ] Calculate diff and percent
- [ ] Log structured data
- [ ] Include operation metadata
```

**Log Format:**
```typescript
console.log('[Memory] Operation:', {
  operation: 'suggestion-generation',
  userId,
  heapBefore: '1.2 GB',
  heapAfter: '1.4 GB',
  heapDiff: '+200 MB',
  heapPercent: '35%',
  duration: '9.5s'
});
```

---

## Phase 2: Streaming Architecture (HIGH)

**Goal:** Implement streaming patterns for all data-intensive operations
**Timeline:** Week 2 (5 days)
**Total Effort:** 16-24 hours

### Task 2.1: Create Streaming Contact Repository

**Priority:** HIGH
**Effort:** 4-6 hours
**Dependencies:** None

**Description:**
Create a new repository that streams contacts using async generators and database cursors.

**Acceptance Criteria:**
- [ ] Create `src/contacts/streaming-repository.ts`
- [ ] Implement `streamContacts()` async generator
- [ ] Implement `streamMinimalContacts()` for reduced data
- [ ] Implement `streamWithCursor()` using pg-cursor
- [ ] Add configurable batch size
- [ ] Add configurable ordering
- [ ] Yield to event loop between batches
- [ ] Add unit tests with 90%+ coverage
- [ ] Document usage patterns

**Implementation Checklist:**
```typescript
// src/contacts/streaming-repository.ts
- [ ] Define StreamingOptions interface
- [ ] Define MinimalContact interface
- [ ] Implement StreamingContactRepository class
- [ ] Implement streamContacts() generator
- [ ] Implement streamMinimalContacts() generator
- [ ] Implement streamWithCursor() generator
- [ ] Add event loop yielding
- [ ] Export class and types
```

**SQL Queries:**
```sql
-- Add optimized queries
- [ ] Full contact query with pagination
- [ ] Minimal contact query with projection
- [ ] Add appropriate indexes
```

**Testing:**
```bash
npm test src/contacts/streaming-repository.test.ts
```

---

### Task 2.2: Refactor Suggestion Generation to Use Streaming

**Priority:** CRITICAL
**Effort:** 4-6 hours
**Dependencies:** Task 2.1, Task 1.1

**Description:**
Refactor suggestion generation processor to use streaming contact repository instead of loading all contacts.

**Acceptance Criteria:**
- [ ] Replace `listContacts()` with `streamMinimalContacts()`
- [ ] Process contacts in batches using for-await-of loop
- [ ] Add memory checks before each batch
- [ ] Add early exit when max suggestions reached
- [ ] Maintain existing suggestion logic
- [ ] Test with 1,000, 5,000, and 10,000 contacts
- [ ] Verify memory usage stays constant
- [ ] Verify performance is acceptable

**Implementation Checklist:**
```typescript
// src/jobs/processors/suggestion-generation-processor.ts
- [ ] Import StreamingContactRepository
- [ ] Replace listContacts() call
- [ ] Convert to for-await-of loop
- [ ] Add memory checks in loop
- [ ] Add early exit logic
- [ ] Maintain suggestion generation logic
- [ ] Update error handling
- [ ] Add memory logging
```

**Testing:**
```bash
# Test with various dataset sizes
npm run test:suggestion-generation -- --contacts=1000
npm run test:suggestion-generation -- --contacts=5000
npm run test:suggestion-generation -- --contacts=10000
```

---

### Task 2.3: Optimize Contact Sync Memory Usage

**Priority:** HIGH
**Effort:** 3-4 hours
**Dependencies:** None

**Description:**
Optimize contact sync to process contacts immediately without accumulating in memory.

**Acceptance Criteria:**
- [ ] Verify contacts are processed immediately after fetch
- [ ] Add memory checks between pages
- [ ] Add forced GC after each page
- [ ] Reduce page size if needed
- [ ] Test with 1,000+ contacts
- [ ] Verify memory usage stays constant
- [ ] Measure sync duration

**Implementation Checklist:**
```typescript
// src/integrations/google-contacts-sync-service.ts
- [ ] Review current implementation
- [ ] Ensure immediate processing
- [ ] Add memory checks
- [ ] Add forced GC
- [ ] Optimize batch operations
- [ ] Add memory logging
```

**Testing:**
```bash
npm run test:contact-sync -- --contacts=1318
```

---

### Task 2.4: Optimize Calendar Sync Memory Usage

**Priority:** MEDIUM
**Effort:** 3-4 hours
**Dependencies:** None

**Description:**
Optimize calendar sync to stream events to database without intermediate arrays.

**Acceptance Criteria:**
- [ ] Process events in batches of 100
- [ ] Stream directly to database
- [ ] Add memory checks between batches
- [ ] Add forced GC after batches
- [ ] Test with 2,000+ events
- [ ] Verify memory usage stays constant
- [ ] Measure sync duration

**Implementation Checklist:**
```typescript
// src/calendar/calendar-service.ts
- [ ] Review fetchEventsFromGoogle()
- [ ] Optimize syncEventsToCache()
- [ ] Add streaming to database
- [ ] Add memory checks
- [ ] Add forced GC
- [ ] Add memory logging
```

**Testing:**
```bash
npm run test:calendar-sync -- --events=2000
```

---

### Task 2.5: Add Minimal Data Projections

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Dependencies:** Task 2.1

**Description:**
Create minimal data interfaces and queries that load only required fields.

**Acceptance Criteria:**
- [ ] Define `MinimalContact` interface
- [ ] Create SQL query with column projection
- [ ] Update suggestion generation to use minimal data
- [ ] Verify 80% memory reduction
- [ ] Test functionality with minimal data
- [ ] Document field requirements

**Implementation Checklist:**
```typescript
// src/types/index.ts
- [ ] Define MinimalContact interface
- [ ] Document required fields

// SQL queries
- [ ] Create minimal contact query
- [ ] Add to streaming repository
- [ ] Test query performance
```

**Testing:**
```bash
npm test -- --grep="minimal data"
```

---

## Phase 3: Memory Management (MEDIUM)

**Goal:** Implement comprehensive memory management
**Timeline:** Week 3 (5 days)
**Total Effort:** 12-16 hours

### Task 3.1: Implement LRU Cache for Contacts

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Dependencies:** None

**Description:**
Replace unbounded contact cache with size-limited LRU cache.

**Acceptance Criteria:**
- [ ] Install `lru-cache` package
- [ ] Create `src/utils/lru-cache.ts`
- [ ] Configure contact cache (1000 entries, 50MB max)
- [ ] Implement size calculation function
- [ ] Set appropriate TTL (1 hour)
- [ ] Migrate existing cache usage
- [ ] Test cache eviction
- [ ] Monitor cache hit rates

**Implementation Checklist:**
```typescript
// src/utils/lru-cache.ts
- [ ] Import LRUCache from lru-cache
- [ ] Create contactCache instance
- [ ] Configure max entries and size
- [ ] Implement sizeCalculation
- [ ] Set TTL
- [ ] Export cache instance

// Migration
- [ ] Find all cache.set() calls
- [ ] Replace with LRU cache
- [ ] Update cache.get() calls
- [ ] Test functionality
```

**Testing:**
```bash
npm test src/utils/lru-cache.test.ts
```

---

### Task 3.2: Implement LRU Cache for Calendar Events

**Priority:** MEDIUM
**Effort:** 2 hours
**Dependencies:** Task 3.1

**Description:**
Replace unbounded calendar event cache with size-limited LRU cache.

**Acceptance Criteria:**
- [ ] Configure calendar event cache (5000 entries, 100MB max)
- [ ] Implement size calculation for event arrays
- [ ] Set appropriate TTL (24 hours)
- [ ] Migrate existing cache usage
- [ ] Test cache eviction
- [ ] Monitor cache hit rates

**Implementation Checklist:**
```typescript
// src/utils/lru-cache.ts
- [ ] Create calendarEventCache instance
- [ ] Configure max entries and size
- [ ] Implement sizeCalculation for arrays
- [ ] Set TTL
- [ ] Export cache instance

// Migration
- [ ] Update calendar service
- [ ] Replace cache calls
- [ ] Test functionality
```

**Testing:**
```bash
npm test -- --grep="calendar.*cache"
```

---

### Task 3.3: Implement LRU Cache for Suggestions

**Priority:** LOW
**Effort:** 1-2 hours
**Dependencies:** Task 3.1

**Description:**
Replace unbounded suggestion cache with size-limited LRU cache.

**Acceptance Criteria:**
- [ ] Configure suggestion cache (500 entries, 25MB max)
- [ ] Implement size calculation for suggestion arrays
- [ ] Set appropriate TTL (30 minutes)
- [ ] Migrate existing cache usage
- [ ] Test cache eviction
- [ ] Monitor cache hit rates

**Implementation Checklist:**
```typescript
// src/utils/lru-cache.ts
- [ ] Create suggestionCache instance
- [ ] Configure max entries and size
- [ ] Implement sizeCalculation
- [ ] Set TTL
- [ ] Export cache instance

// Migration
- [ ] Update suggestion service
- [ ] Replace cache calls
- [ ] Test functionality
```

**Testing:**
```bash
npm test -- --grep="suggestion.*cache"
```

---

### Task 3.4: Optimize Database Queries

**Priority:** MEDIUM
**Effort:** 3-4 hours
**Dependencies:** None

**Description:**
Optimize database queries to use column projection and appropriate indexes.

**Acceptance Criteria:**
- [ ] Audit all SELECT * queries
- [ ] Replace with column projection
- [ ] Create indexes for cursor-based pagination
- [ ] Create indexes for common filters
- [ ] Test query performance
- [ ] Verify memory reduction
- [ ] Document query patterns

**Implementation Checklist:**
```sql
-- Audit queries
- [ ] Find all SELECT * queries
- [ ] Identify required columns
- [ ] Create optimized queries

-- Add indexes
- [ ] idx_contacts_user_last_contact
- [ ] idx_contacts_user_archived
- [ ] idx_calendar_events_user_date
- [ ] Test index usage with EXPLAIN
```

**Migration Script:**
```sql
-- scripts/migrations/XXX_optimize_queries.sql
- [ ] Create migration file
- [ ] Add index creation statements
- [ ] Test on staging
- [ ] Deploy to production
```

**Testing:**
```bash
npm run db:migrate
npm test -- --grep="query optimization"
```

---

### Task 3.5: Add Memory Leak Detection

**Priority:** LOW
**Effort:** 2-3 hours
**Dependencies:** Task 1.2

**Description:**
Implement automatic memory leak detection and alerting.

**Acceptance Criteria:**
- [ ] Enable memory monitoring in production
- [ ] Configure leak detection thresholds
- [ ] Add alerting for detected leaks
- [ ] Create heap snapshot on leak detection
- [ ] Document investigation process
- [ ] Test leak detection with synthetic leak

**Implementation Checklist:**
```typescript
// src/index.ts
- [ ] Import MemoryMonitor
- [ ] Create monitor instance
- [ ] Start monitoring
- [ ] Configure thresholds
- [ ] Add alert handlers

// Alerting
- [ ] Add Slack/email integration
- [ ] Format alert messages
- [ ] Include heap snapshot path
```

**Testing:**
```bash
# Create synthetic leak
npm run test:memory-leak
```

---

### Task 3.6: Implement Graceful Degradation

**Priority:** LOW
**Effort:** 2-3 hours
**Dependencies:** Task 1.1

**Description:**
Implement graceful degradation when memory pressure is high.

**Acceptance Criteria:**
- [ ] Detect high memory pressure (>70% heap)
- [ ] Reduce batch sizes automatically
- [ ] Reduce max suggestions automatically
- [ ] Skip non-critical operations
- [ ] Return partial results with warning
- [ ] Log degradation events
- [ ] Test degradation behavior

**Implementation Checklist:**
```typescript
// src/utils/graceful-degradation.ts
- [ ] Create GracefulDegradation class
- [ ] Implement pressure detection
- [ ] Implement batch size reduction
- [ ] Implement suggestion limit reduction
- [ ] Add warning messages
- [ ] Export class

// Integration
- [ ] Add to suggestion generation
- [ ] Add to contact sync
- [ ] Add to calendar sync
```

**Testing:**
```bash
npm run test:degradation
```

---

## Phase 4: Load Testing and Optimization (LOW)

**Goal:** Validate and optimize for extreme scale
**Timeline:** Week 4 (5 days)
**Total Effort:** 8-12 hours

### Task 4.1: Create Load Testing Scripts

**Priority:** MEDIUM
**Effort:** 3-4 hours
**Dependencies:** None

**Description:**
Create scripts to generate large datasets and run load tests.

**Acceptance Criteria:**
- [ ] Create script to generate 10,000 test contacts
- [ ] Create script to generate 100,000 test contacts
- [ ] Create script to simulate concurrent users
- [ ] Add memory profiling to tests
- [ ] Add performance benchmarking
- [ ] Document test procedures
- [ ] Create CI/CD integration

**Implementation Checklist:**
```typescript
// scripts/load-test-contacts.ts
- [ ] Create contact generation script
- [ ] Add configurable contact count
- [ ] Add realistic data generation
- [ ] Add progress logging

// scripts/load-test-concurrent.ts
- [ ] Create concurrent user simulation
- [ ] Add configurable user count
- [ ] Add memory monitoring
- [ ] Add performance metrics
```

**Testing:**
```bash
npm run load-test:contacts -- --count=10000
npm run load-test:concurrent -- --users=10
```

---

### Task 4.2: Run Load Tests with 10,000 Contacts

**Priority:** HIGH
**Effort:** 2-3 hours
**Dependencies:** Task 4.1

**Description:**
Run comprehensive load tests with 10,000 contacts per user.

**Acceptance Criteria:**
- [ ] Generate 10,000 test contacts
- [ ] Run suggestion generation
- [ ] Run contact sync
- [ ] Run calendar sync
- [ ] Measure peak memory usage
- [ ] Measure processing time
- [ ] Verify no crashes
- [ ] Document results

**Test Scenarios:**
```bash
# Single user, 10K contacts
- [ ] Suggestion generation
- [ ] Contact sync
- [ ] Calendar sync

# 10 concurrent users, 1K contacts each
- [ ] Parallel suggestion generation
- [ ] Parallel contact sync
- [ ] Parallel calendar sync
```

**Success Criteria:**
- Peak memory < 2GB
- No crashes
- Processing time < 30s per operation
- All operations complete successfully

---

### Task 4.3: Run Load Tests with 100,000 Contacts

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Dependencies:** Task 4.2

**Description:**
Run extreme load tests with 100,000 contacts per user.

**Acceptance Criteria:**
- [ ] Generate 100,000 test contacts
- [ ] Run suggestion generation
- [ ] Measure peak memory usage
- [ ] Measure processing time
- [ ] Verify no crashes
- [ ] Identify bottlenecks
- [ ] Document results

**Test Scenarios:**
```bash
# Single user, 100K contacts
- [ ] Suggestion generation
- [ ] Contact sync (if applicable)

# Measure scalability
- [ ] Memory usage vs contact count
- [ ] Processing time vs contact count
```

**Success Criteria:**
- Peak memory < 4GB
- No crashes
- Linear scaling of memory and time
- Identify optimization opportunities

---

### Task 4.4: Profile Memory Usage

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Dependencies:** Task 4.2

**Description:**
Profile memory usage to identify remaining optimization opportunities.

**Acceptance Criteria:**
- [ ] Take heap snapshots before/after operations
- [ ] Analyze heap snapshots in Chrome DevTools
- [ ] Identify largest objects
- [ ] Identify retained objects
- [ ] Identify potential leaks
- [ ] Document findings
- [ ] Create optimization recommendations

**Profiling Steps:**
```bash
# Take heap snapshots
- [ ] node --expose-gc --heap-prof index.js
- [ ] Load heap snapshot in Chrome DevTools
- [ ] Analyze memory allocation
- [ ] Identify optimization opportunities
```

**Analysis:**
- [ ] Largest objects by retained size
- [ ] Objects by shallow size
- [ ] Detached DOM nodes (if applicable)
- [ ] Closure retentions
- [ ] Array allocations

---

### Task 4.5: Optimize Hot Paths

**Priority:** LOW
**Effort:** 2-3 hours
**Dependencies:** Task 4.4

**Description:**
Optimize identified hot paths based on profiling results.

**Acceptance Criteria:**
- [ ] Identify top 3 memory-intensive operations
- [ ] Optimize each operation
- [ ] Measure improvement
- [ ] Verify no regressions
- [ ] Document optimizations
- [ ] Update benchmarks

**Optimization Techniques:**
- [ ] Object pooling for frequently allocated objects
- [ ] String interning for repeated strings
- [ ] Array pre-allocation
- [ ] Lazy evaluation
- [ ] Memoization

**Testing:**
```bash
# Before/after benchmarks
npm run benchmark:before
npm run benchmark:after
```

---

### Task 4.6: Create Performance Benchmarks

**Priority:** LOW
**Effort:** 2 hours
**Dependencies:** Task 4.2

**Description:**
Create automated performance benchmarks for regression testing.

**Acceptance Criteria:**
- [ ] Create benchmark suite
- [ ] Add memory usage benchmarks
- [ ] Add processing time benchmarks
- [ ] Add throughput benchmarks
- [ ] Set baseline metrics
- [ ] Add CI/CD integration
- [ ] Document benchmark procedures

**Implementation Checklist:**
```typescript
// scripts/benchmark.ts
- [ ] Create benchmark framework
- [ ] Add memory benchmarks
- [ ] Add performance benchmarks
- [ ] Add reporting
- [ ] Export results

// CI/CD
- [ ] Add benchmark job
- [ ] Compare against baseline
- [ ] Alert on regressions
```

**Testing:**
```bash
npm run benchmark
npm run benchmark:compare
```

---

### Task 4.7: Update Documentation

**Priority:** MEDIUM
**Effort:** 2-3 hours
**Dependencies:** All previous tasks

**Description:**
Update all documentation to reflect memory optimization changes.

**Acceptance Criteria:**
- [ ] Update architecture documentation
- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Update troubleshooting guide
- [ ] Create memory optimization guide
- [ ] Document best practices
- [ ] Update README

**Documentation Updates:**
```markdown
- [ ] docs/ARCHITECTURE.md - Add memory optimization section
- [ ] docs/API.md - Update affected endpoints
- [ ] docs/DEPLOYMENT.md - Add memory configuration
- [ ] docs/TROUBLESHOOTING.md - Add memory issues section
- [ ] docs/MEMORY_OPTIMIZATION.md - Create new guide
- [ ] README.md - Update system requirements
```

**Testing:**
```bash
# Verify documentation
npm run docs:verify
```

---

## Task Dependencies Graph

```
Phase 1 (Critical Fixes)
├─ 1.1 Memory Circuit Breaker
│  └─ 1.3 Add to Suggestion Generation
├─ 1.2 Memory Monitor
│  └─ 1.6 Add Memory Logging
├─ 1.4 Reduce Batch Sizes
└─ 1.5 Add Forced GC

Phase 2 (Streaming)
├─ 2.1 Streaming Repository
│  ├─ 2.2 Refactor Suggestion Generation (depends on 1.1, 2.1)
│  └─ 2.5 Minimal Data Projections
├─ 2.3 Optimize Contact Sync
└─ 2.4 Optimize Calendar Sync

Phase 3 (Memory Management)
├─ 3.1 LRU Cache - Contacts
│  ├─ 3.2 LRU Cache - Calendar
│  └─ 3.3 LRU Cache - Suggestions
├─ 3.4 Optimize Queries
├─ 3.5 Leak Detection (depends on 1.2)
└─ 3.6 Graceful Degradation (depends on 1.1)

Phase 4 (Load Testing)
├─ 4.1 Load Testing Scripts
│  ├─ 4.2 Test 10K Contacts
│  │  ├─ 4.3 Test 100K Contacts
│  │  └─ 4.4 Profile Memory
│  │     └─ 4.5 Optimize Hot Paths
│  └─ 4.6 Performance Benchmarks
└─ 4.7 Update Documentation (depends on all)
```

## Effort Summary

| Phase | Tasks | Total Effort | Priority |
|-------|-------|--------------|----------|
| Phase 1 | 6 | 8-12 hours | URGENT |
| Phase 2 | 5 | 16-24 hours | HIGH |
| Phase 3 | 6 | 12-16 hours | MEDIUM |
| Phase 4 | 7 | 8-12 hours | LOW |
| **Total** | **24** | **44-64 hours** | - |

## Timeline

| Week | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| Week 1 | Phase 1 | Critical Fixes | Memory circuit breaker, monitoring, batch limits |
| Week 2 | Phase 2 | Streaming | Streaming repository, refactored processors |
| Week 3 | Phase 3 | Memory Management | LRU caches, query optimization, leak detection |
| Week 4 | Phase 4 | Validation | Load tests, profiling, benchmarks, documentation |

## Success Metrics

### Phase 1 Completion
- ✅ No crashes with 1,300 contacts
- ✅ Memory usage < 2GB
- ✅ Memory logging active

### Phase 2 Completion
- ✅ Support 10,000 contacts
- ✅ Constant memory usage
- ✅ Performance maintained

### Phase 3 Completion
- ✅ LRU caches working
- ✅ Leak detection active
- ✅ Graceful degradation tested

### Phase 4 Completion
- ✅ Load tests passing
- ✅ Benchmarks established
- ✅ Documentation complete

### Overall Success
- ✅ Zero crashes for 30 days
- ✅ Support 100,000 contacts
- ✅ Peak memory < 2GB
- ✅ 60-80% memory reduction

## Risk Mitigation

### High Risk Tasks
- **Task 2.2** (Refactor Suggestion Generation): Keep old code in branch for rollback
- **Task 3.1-3.3** (LRU Caches): Test thoroughly before production
- **Task 4.3** (100K Contacts): May reveal new bottlenecks

### Rollback Plan
Each phase can be rolled back independently:
- Phase 1: Remove circuit breaker, increase heap
- Phase 2: Disable streaming, use old pattern
- Phase 3: Disable LRU caches, use simple Map
- Phase 4: No rollback needed (testing only)

## Notes

- All tasks should include unit tests
- Integration tests required for critical paths
- Document all configuration changes
- Update deployment scripts as needed
- Monitor production metrics closely after each phase
