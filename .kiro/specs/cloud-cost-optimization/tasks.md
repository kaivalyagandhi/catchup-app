# Cloud Cost Optimization Tasks

## Phase 1: Upstash Redis Migration
**Estimated Savings: ~$55/month**

### Task 1.1: Update Redis Connection for TLS Support
- [x] 1.1.1 Update `src/jobs/queue.ts` to support TLS connections via `REDIS_TLS` env var
- [x] 1.1.2 Update `src/utils/cache.ts` to support TLS connections via `REDIS_TLS` env var
- [x] 1.1.3 Update `.env.example` with Upstash configuration documentation

### Task 1.2: Set Up Upstash Redis
- [ ] 1.2.1 Create Upstash account at https://upstash.com
- [ ] 1.2.2 Create Redis database (free tier)
- [ ] 1.2.3 Note connection details (host, port, password)

### Task 1.3: Test Locally with Upstash
- [ ] 1.3.1 Configure local `.env` with Upstash credentials
- [ ] 1.3.2 Start app and verify Redis connection succeeds
- [ ] 1.3.3 Test all 11 job queues execute correctly
- [ ] 1.3.4 Test cache operations (get, set, delete)

### Task 1.4: Deploy to Production
- [ ] 1.4.1 Add Upstash credentials to GCP Secret Manager
- [ ] 1.4.2 Update Cloud Run environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS=true)
- [ ] 1.4.3 Deploy updated code
- [ ] 1.4.4 Verify jobs execute correctly in production
- [ ] 1.4.5 Monitor for 24 hours

### Task 1.5: Decommission Cloud Memorystore
- [ ] 1.5.1 Confirm all functionality works with Upstash
- [ ] 1.5.2 Delete Cloud Memorystore instance via GCP Console
- [ ] 1.5.3 Remove VPC connector Redis traffic (automatic)

---

## Phase 2: Cloud Run Optimization
**Estimated Savings: ~$5-9/month**

### Task 2.1: Update Cloud Run Configuration
- [x] 2.1.1 Update `cloudbuild.yaml` with optimized Cloud Run settings:
  - `--min-instances=0`
  - `--max-instances=10`
  - `--timeout=300`
  - `--concurrency=80`
- [x] 2.1.2 Keep `--memory=512Mi` and `--cpu=1` (required for sync operations)

### Task 2.2: Deploy and Verify
- [ ] 2.2.1 Deploy updated configuration
- [ ] 2.2.2 Test cold start times (target: <15 seconds)
- [ ] 2.2.3 Verify scale-to-zero works (check Cloud Run metrics after 30 min idle)
- [ ] 2.2.4 Test that app handles cold starts gracefully

---

## Phase 3: App-Level Optimizations
**Estimated Savings: Indirect (reduced CPU time, faster responses)**

### Task 3.1: Add HTTP Response Caching
- [x] 3.1.1 Add `Cache-Control: private, max-age=60` to `GET /api/contacts` endpoint
- [x] 3.1.2 Add `Cache-Control: private, max-age=60` to `GET /api/groups` endpoint
- [x] 3.1.3 Add `Cache-Control: private, max-age=60` to `GET /api/tags` endpoint
- [x] 3.1.4 Add `Cache-Control: private, max-age=300` to `GET /api/preferences` endpoint
- [ ] 3.1.5 Verify caching works (check response headers in browser dev tools)

### Task 3.2: Optimize Database Queries with Parallel Execution
- [ ] 3.2.1 Identify endpoints with multiple sequential database queries
- [ ] 3.2.2 Refactor dashboard/home data loading to use `Promise.all()`
- [ ] 3.2.3 Refactor contact detail page to load contact, tags, groups in parallel
- [ ] 3.2.4 Test that parallel queries return correct data
- [ ] 3.2.5 Verify no N+1 query patterns in list endpoints

### Task 3.3: Optimize Background Job Concurrency
- [x] 3.3.1 Update `src/jobs/worker.ts` to limit `suggestionGenerationQueue` to 1 concurrent job
- [x] 3.3.2 Update `src/jobs/worker.ts` to limit `googleContactsSyncQueue` to 1 concurrent job
- [x] 3.3.3 Update `src/jobs/worker.ts` to limit `calendarSyncQueue` to 1 concurrent job
- [x] 3.3.4 Keep lighter jobs (token refresh, webhook renewal) at higher concurrency (3)
- [ ] 3.3.5 Test that jobs still process correctly with limited concurrency
- [ ] 3.3.6 Monitor memory usage during job processing

---

## Phase 4: Cloud Build Optimization
**Estimated Savings: ~$0.77/month**

### Task 4.1: Reduce Build Machine Size
- [x] 4.1.1 Update `cloudbuild.yaml` machine type from `E2_HIGHCPU_8` to `E2_MEDIUM`
- [ ] 4.1.2 Deploy and verify build completes successfully
- [ ] 4.1.3 Note build time increase (expected: ~3 min → ~5-6 min)

---

## Phase 5: Documentation and Monitoring

### Task 5.1: Create Documentation
- [x] 5.1.1 Create `docs/deployment/COST_OPTIMIZATION.md` with:
  - Upstash setup instructions
  - Cost comparison table
  - Scaling considerations
  - Troubleshooting guide

### Task 5.2: Set Up Cost Monitoring
- [ ] 5.2.1 Set up GCP budget alert at $60/month (50% of current)
- [ ] 5.2.2 Set up GCP budget alert at $80/month (warning threshold)
- [ ] 5.2.3 Document actual cost savings after 2 weeks

---

## Priority Order

1. **Phase 1** (Upstash migration) - Biggest impact, ~$55/month savings
2. **Phase 2** (Cloud Run optimization) - Second biggest, ~$5-9/month savings
3. **Phase 3** (App optimizations) - Improves performance, indirect cost savings
4. **Phase 4** (Cloud Build) - Quick win, ~$0.77/month savings
5. **Phase 5** (Documentation) - Important for maintenance

---

## Success Criteria

- [ ] Monthly GCP costs reduced to ~$40-50/month (from $110)
- [ ] All 11 job queues functioning correctly with Upstash
- [ ] No increase in error rates
- [ ] Cold start times under 15 seconds
- [ ] HTTP caching headers present on read endpoints
- [ ] Database queries optimized with parallel execution
- [ ] Job memory usage stable (no OOM errors)
- [ ] Application scales to 100+ users without issues
- [ ] Documentation complete for future reference

---

## Rollback Procedures

### If Upstash Issues Occur
1. Update Cloud Run env vars to point back to Cloud Memorystore IP
2. Set `REDIS_TLS=false`
3. Redeploy

### If Cloud Run Scale-to-Zero Causes Issues
1. Update `cloudbuild.yaml` to set `--min-instances=1`
2. Redeploy

### If App Optimizations Cause Issues
1. Revert specific code changes
2. Redeploy
