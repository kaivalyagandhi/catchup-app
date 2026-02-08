# Cloud Cost Optimization Design

## Overview
This design document outlines the technical approach to reduce GCP hosting costs from ~$110/month to ~$40-50/month while maintaining scalability for dozens to hundreds of users.

## Architecture Changes

### 1. Replace Cloud Memorystore with Upstash Redis

#### Why Cloud Memorystore is Expensive
- GCP's managed Redis service has a minimum cost of ~$60/month (Basic tier, 1GB)
- You pay for an always-on instance regardless of usage
- For a startup scaling from 1 to hundreds of users, this is overkill

#### Why Upstash
| Feature | Cloud Memorystore | Upstash |
|---------|-------------------|---------|
| Pricing Model | Per-instance | Pay-per-command |
| Minimum Cost | ~$60/month | $0 (free tier) |
| Free Tier | None | 10,000 commands/day |
| Paid Pricing | Fixed | $0.20/100K commands |
| TLS | Optional | Required (more secure) |
| Bull Compatible | Yes | Yes |

#### Connection Configuration Changes

**Current (`src/jobs/queue.ts`):**
```typescript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};
```

**Updated:**
```typescript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined, // NEW: Upstash requires TLS
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};
```

**Same change needed in `src/utils/cache.ts`.**

#### Environment Variables
```bash
# Upstash Redis Configuration
REDIS_HOST=your-instance.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password
REDIS_TLS=true
```

---

### 2. Cloud Run Optimization

#### Current Configuration
```yaml
--memory=512Mi
--cpu=1
--timeout=3600
# min-instances not explicitly set
```

#### Optimized Configuration
```yaml
--memory=512Mi          # Keep (OOM risk if lower due to contact sync)
--cpu=1                 # Keep (needed for sync operations)
--min-instances=0       # Scale to zero when idle
--max-instances=10      # Cap for cost control
--timeout=300           # Reduced from 3600 (5 min is sufficient)
--concurrency=80        # Explicit setting
```

#### Why Keep 512Mi Memory
Based on analysis of `MEMORY_CRASH_TROUBLESHOOTING.md`:
- Contact sync (1300+ contacts): 500-800 MB
- Voice transcription streaming: 300-500 MB
- Suggestion regeneration: Can spike to 1-2 GB
- 256Mi would cause OOM errors

#### Scale-to-Zero Behavior
- Instance shuts down after ~15 minutes of no requests
- First request after idle: 5-15 second cold start
- Subsequent requests: Normal latency
- Cost during idle: $0

---

### 3. Cloud Build Optimization

#### Current Configuration
```yaml
options:
  machineType: 'E2_HIGHCPU_8'  # 8 vCPU, 8GB RAM
```

#### Optimized Configuration
```yaml
options:
  machineType: 'E2_MEDIUM'     # 2 vCPU, 4GB RAM
```

#### Trade-off
- Build time: ~3 min → ~5-6 min
- Cost per build: ~75% reduction

---

### 4. HTTP Response Caching

#### Strategy
Add `Cache-Control` headers to read-heavy endpoints to reduce repeat requests from browsers.

#### Implementation

**Contacts List (`src/api/routes/contacts.ts`):**
```typescript
router.get('/', authenticate, async (req, res) => {
  // ... fetch contacts
  res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
  res.json(contacts);
});
```

**Groups List (`src/api/routes/groups-tags.ts`):**
```typescript
router.get('/groups', authenticate, async (req, res) => {
  // ... fetch groups
  res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
  res.json(groups);
});
```

**Tags List:**
```typescript
router.get('/tags', authenticate, async (req, res) => {
  // ... fetch tags
  res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
  res.json(tags);
});
```

**User Preferences:**
```typescript
router.get('/preferences', authenticate, async (req, res) => {
  // ... fetch preferences
  res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
  res.json(preferences);
});
```

#### Cache Invalidation
- Write operations (POST, PUT, DELETE) should NOT set cache headers
- Browser will re-fetch after cache expires
- For immediate updates, frontend can add `?t=${Date.now()}` to bypass cache

#### Why `private` Directive
- User data should not be cached by CDNs or proxies
- Only the user's browser should cache the response

---

### 5. Database Query Optimization

#### Problem: Sequential Queries
Some endpoints make multiple database queries sequentially:
```typescript
// Current: ~300ms total (100ms + 100ms + 100ms)
const contacts = await getContacts(userId);
const groups = await getGroups(userId);
const tags = await getTags(userId);
```

#### Solution: Parallel Queries
```typescript
// Optimized: ~100ms total (all run in parallel)
const [contacts, groups, tags] = await Promise.all([
  getContacts(userId),
  getGroups(userId),
  getTags(userId),
]);
```

#### Endpoints to Optimize

**Dashboard/Home Page:**
```typescript
// Load all dashboard data in parallel
const [contacts, groups, tags, suggestions, recentActivity] = await Promise.all([
  contactRepo.findByUserId(userId),
  groupRepo.findByUserId(userId),
  tagRepo.findByUserId(userId),
  suggestionRepo.findPending(userId),
  activityRepo.findRecent(userId, 10),
]);
```

**Contact Detail Page:**
```typescript
// Load contact with related data in parallel
const [contact, contactTags, contactGroups] = await Promise.all([
  contactRepo.findById(contactId, userId),
  tagRepo.findByContactId(contactId),
  groupRepo.findByContactId(contactId),
]);
```

---

### 6. Background Job Concurrency Optimization

#### Problem: Memory Spikes
Heavy jobs running concurrently can cause memory spikes:
- Suggestion generation processes all contacts
- Contact sync downloads and processes 1000+ contacts
- Multiple concurrent jobs = memory exhaustion

#### Solution: Limit Concurrency

**Current (`src/jobs/worker.ts`):**
```typescript
suggestionGenerationQueue.process(async (job) => {
  // Default concurrency (unlimited)
  return processSuggestionGeneration(job);
});
```

**Optimized:**
```typescript
// Limit heavy jobs to 1 concurrent
suggestionGenerationQueue.process(1, async (job) => {
  return processSuggestionGeneration(job);
});

googleContactsSyncQueue.process(1, async (job) => {
  return processGoogleContactsSync(job);
});

calendarSyncQueue.process(1, async (job) => {
  return processCalendarSync(job);
});

// Light jobs can have higher concurrency
tokenRefreshQueue.process(3, async (job) => {
  return processTokenRefresh(job);
});
```

#### Benefits
- Predictable memory usage
- No OOM crashes during job processing
- Jobs still process efficiently (just not all at once)

---

## Cost Projection

### Current Costs (~$110/month)
| Service | Cost |
|---------|------|
| Cloud Memorystore | $60.70 |
| Cloud Run | $17.26 |
| Cloud SQL | $15.86 |
| Networking | $7.47 |
| Other | $8.71 |

### Projected Costs (~$42-50/month)
| Service | Current | Projected | Savings |
|---------|---------|-----------|---------|
| Redis (Upstash) | $60.70 | $5-10 | $50-55 |
| Cloud Run | $17.26 | $8-12 | $5-9 |
| Cloud SQL | $15.86 | $15.86 | $0 |
| Networking | $7.47 | $4-5 | $2-3 |
| Cloud Build | $1.57 | $0.80 | $0.77 |
| Other | $8.71 | $7-8 | $1-2 |
| **Total** | **$110** | **$42-50** | **$60-68** |

### Scaling Costs (Future)
With Upstash pay-per-use model:
- 100 users × 50 jobs/day × 30 days = 150,000 commands/month → ~$0.30/month
- 1000 users × 50 jobs/day × 30 days = 1,500,000 commands/month → ~$3/month

Cloud Run scales automatically with usage.

---

## File Changes Summary

### Modified Files
| File | Changes |
|------|---------|
| `src/jobs/queue.ts` | Add TLS support for Upstash |
| `src/utils/cache.ts` | Add TLS support for Upstash |
| `src/jobs/worker.ts` | Add concurrency limits to heavy jobs |
| `src/api/routes/contacts.ts` | Add Cache-Control headers, parallel queries |
| `src/api/routes/groups-tags.ts` | Add Cache-Control headers |
| `cloudbuild.yaml` | Smaller machine type, optimized Cloud Run settings |
| `.env.example` | Document new Redis configuration options |

### New Files
| File | Purpose |
|------|---------|
| `docs/deployment/COST_OPTIMIZATION.md` | Documentation for cost-optimized deployment |

---

## Migration Plan

### Phase 1: Upstash Migration (Biggest Impact)
1. Create Upstash account and Redis database
2. Update code to support TLS connections
3. Add Upstash credentials to GCP Secret Manager
4. Update Cloud Run environment variables
5. Deploy and verify all jobs work
6. Delete Cloud Memorystore instance
7. **Savings: ~$55/month**

### Phase 2: Cloud Run Optimization
1. Update cloudbuild.yaml with optimized settings
2. Deploy with scale-to-zero enabled
3. Monitor cold start times
4. **Savings: ~$5-9/month**

### Phase 3: App-Level Optimizations
1. Add HTTP caching headers to read endpoints
2. Implement parallel database queries
3. Add job concurrency limits
4. Test and verify no regressions
5. **Savings: Indirect (faster responses, less CPU time)**

### Phase 4: Cloud Build Optimization
1. Change machine type to E2_MEDIUM
2. Verify builds complete successfully
3. **Savings: ~$0.77/month**

---

## Rollback Plan
- Keep Cloud Memorystore configuration documented
- Environment variables allow instant switch back to any Redis provider
- No code changes that break backward compatibility
- All optimizations are configuration-driven

---

## Testing Strategy
1. Test locally with Upstash Redis (free tier)
2. Verify all 11 job queues work correctly
3. Test job scheduling and execution
4. Verify HTTP caching works (check response headers)
5. Benchmark parallel vs sequential queries
6. Monitor Cloud Run cold starts
7. Validate cost reduction in GCP billing after 1-2 weeks
