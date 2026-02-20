# Test Fixes Applied - February 19, 2026

## Summary
Started fixing 87 test failures. Applied fixes for auth_method constraint violations.

## Fixes Applied

### 1. Circuit Breaker Manager Test
**File**: `src/integrations/circuit-breaker-manager.test.ts`
**Issue**: Missing `auth_method` column in user creation
**Fix**: Added `auth_method` column with value 'google' to both test user insertions
**Status**: ✅ Fixed

### 2. Manual Sync Routes Test  
**File**: `src/api/routes/manual-sync.test.ts`
**Issue**: Missing `auth_method` column in user creation
**Fix**: Added `auth_method` column with value 'google'
**Status**: ✅ Fixed

## Remaining Fixes Needed

### High Priority (Quick Wins)

#### 3. Token Health Monitor Test
**File**: `src/integrations/token-health-monitor.test.ts`
**Lines**: 21-31
**Fix Needed**:
```typescript
// Change from:
`INSERT INTO users (id, email, name, google_id, created_at, updated_at)`
// To:
`INSERT INTO users (id, email, name, google_id, auth_method, created_at, updated_at)`
// And add 'google' to VALUES
```

#### 4. Webhook Health Check Processor Test
**File**: `src/jobs/processors/webhook-health-check-processor.test.ts`
**Lines**: 38-47
**Fix Needed**: Same as above (2 user insertions)

#### 5. Webhook Metrics Service Test
**File**: `src/integrations/webhook-metrics-service.test.ts`
**Lines**: 23-33
**Fix Needed**: Same as above (2 user insertions)

#### 6. Adaptive Sync Scheduler Test
**File**: `src/integrations/adaptive-sync-scheduler.test.ts`
**Lines**: 24-28
**Fix Needed**: Same as above

#### 7. Sync Orchestrator Test
**File**: `src/integrations/sync-orchestrator.test.ts`
**Lines**: 27-30
**Fix Needed**: Same as above

#### 8. Admin Sync Health Routes Test
**File**: `src/api/routes/admin-sync-health.test.ts`
**Lines**: 27-31
**Fix Needed**: Add `auth_method` after `is_admin`

#### 9. Admin Middleware Test
**File**: `src/api/middleware/admin.test.ts`
**Lines**: 30-34
**Fix Needed**: Add `auth_method` after `is_admin`

#### 10. Promote Admin Script Test
**File**: `src/scripts/promote-admin.test.ts`
**Lines**: 18-21
**Fix Needed**: Add `auth_method` after `is_admin`

### Medium Priority (Requires Code Changes)

#### 11. Install ioredis for Rate Limiter Tests
**Issue**: `rate-limiter.test.ts` imports ioredis which isn't installed
**Fix Options**:
- Option A: Install ioredis: `npm install --save-dev ioredis @types/ioredis`
- Option B: Mock Redis in tests instead of real connection
**Recommendation**: Option B (mock Redis) - tests shouldn't require external services

#### 12. Fix Onboarding Schema Mismatch
**Issue**: Code uses old schema, migration 030 created new schema
**Affected Files**:
- `src/contacts/onboarding-repository.ts`
- `src/contacts/onboarding-service.ts`
- `src/contacts/privacy-service.ts`
- All onboarding tests

**Fix Options**:
- Option A: Update code to use new simplified schema
- Option B: Create migration to restore old schema
**Recommendation**: Option A - new schema is better designed

**New Schema Columns**:
```sql
- user_id (PK)
- is_complete
- current_step (1-3)
- dismissed_at
- integrations_complete
- google_calendar_connected
- google_contacts_connected
- circles_complete
- contacts_categorized
- total_contacts
- groups_complete
- mappings_reviewed
- total_mappings
- created_at
- updated_at
```

**Old Schema Columns** (what code expects):
```sql
- user_id (PK)
- current_step
- trigger_type
- progress_data (JSONB)
- completed_steps (TEXT[])
- started_at
- last_updated_at
- completed_at
```

### Low Priority (Edge Cases)

#### 13. Property-Based Test Failures
**Files**:
- `src/voice/incremental-enrichment-properties.test.ts`
- Various property tests

**Issues**:
- Deduplication not handling whitespace-only strings
- Enrichment merge logic issues

**Fix**: Update deduplication and merge logic to handle edge cases

#### 14. API Route Validation
**Files**:
- `src/api/routes/circles.test.ts`
- `src/api/routes/onboarding.test.ts`
- `src/api/routes/google-sso.test.ts`

**Issues**:
- Missing input validation
- Wrong status codes
- Empty array handling

**Fix**: Add proper validation middleware

## Next Steps

1. **Run script to fix remaining auth_method issues** (5 minutes)
2. **Mock Redis in rate-limiter tests** (15 minutes)
3. **Update onboarding code to new schema** (2-3 hours)
4. **Fix API validation** (1 hour)
5. **Fix property test edge cases** (1 hour)

## Testing After Fixes

```bash
# Run tests to verify fixes
npm test

# Run specific test file
npm test src/integrations/circuit-breaker-manager.test.ts

# Run with coverage
npm run test:coverage
```

## Estimated Time to Fix All

- Quick wins (auth_method + Redis mock): 30 minutes
- Onboarding schema update: 3 hours
- API validation fixes: 1 hour
- Property test fixes: 1 hour
- **Total**: ~5.5 hours

## Priority Order

1. ✅ Auth_method fixes (2/10 done)
2. Mock Redis in tests
3. Onboarding schema update (biggest impact)
4. API validation
5. Property test edge cases
