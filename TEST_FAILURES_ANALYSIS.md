# Test Failures Analysis - February 19, 2026

## Summary
87 tests failing across 23 test files. Main issues:

1. **Onboarding Schema Mismatch** (25 failures)
2. **Missing Test User Setup** (15 failures)  
3. **Missing ioredis Dependency** (11 failures)
4. **Auth Method Constraint** (6 failures)
5. **API Route Validation** (10 failures)
6. **Property-Based Test Issues** (5 failures)
7. **Miscellaneous** (15 failures)

## Issue 1: Onboarding Schema Mismatch

**Problem**: Migration 030 simplified the `onboarding_state` table schema, but the code and tests still use the old schema.

**Old Schema** (what code expects):
```sql
- user_id
- current_step
- trigger_type
- progress_data (JSONB)
- completed_steps (TEXT[])
- started_at
- last_updated_at
- completed_at
```

**New Schema** (migration 030):
```sql
- user_id
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

**Affected Files**:
- `src/contacts/onboarding-repository.ts`
- `src/contacts/onboarding-service.ts`
- `src/contacts/privacy-service.ts`
- All onboarding tests

**Solution**: Update code to match new schema OR revert migration 030.

## Issue 2: Missing Test User Setup

**Problem**: Tests use `TEST_USER_ID = '00000000-0000-0000-0000-000000000001'` but don't create the user, causing foreign key violations.

**Affected Tests**:
- `circuit-breaker-manager.test.ts`
- `token-health-monitor.test.ts`
- `manual-sync.test.ts`

**Solution**: Add user creation in `beforeEach`:
```typescript
beforeEach(async () => {
  await pool.query(
    `INSERT INTO users (id, email, name, auth_method, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [TEST_USER_ID, 'test@example.com', 'Test User', 'google']
  );
});
```

## Issue 3: Missing ioredis Dependency

**Problem**: `rate-limiter.test.ts` imports `ioredis` which isn't installed.

**Error**:
```
Cannot find package 'ioredis' imported from '/Users/kaivalyagandhi/Github/catchup-app/src/utils/rate-limiter.test.ts'
```

**Solution**: 
1. Install ioredis: `npm install --save-dev ioredis @types/ioredis`
2. OR: Mock Redis in tests instead of using real connection

## Issue 4: Auth Method Constraint

**Problem**: Users table has check constraint requiring `auth_method` column, but tests don't provide it.

**Error**:
```
new row for relation "users" violates check constraint "check_auth_method"
```

**Solution**: Add `auth_method` when creating test users:
```typescript
INSERT INTO users (id, email, name, auth_method, ...)
VALUES ($1, $2, $3, 'google', ...)
```

## Issue 5: API Route Validation Issues

**Problem**: API routes not properly validating inputs or returning wrong status codes.

**Affected Routes**:
- `/api/circles/assign` - Not validating required fields
- `/api/circles/batch-assign` - Accepting empty arrays
- `/api/onboarding/initialize` - Not validating trigger type
- `/api/auth/google/callback` - Returning 302 instead of 200

**Solution**: Add proper validation middleware and fix response codes.

## Issue 6: Property-Based Test Issues

**Problem**: Property tests finding edge cases that break assumptions.

**Examples**:
- Deduplication not handling whitespace-only strings
- Enrichment merge not handling similar values correctly
- Circuit breaker state isolation issues

**Solution**: Fix the underlying logic to handle edge cases.

## Issue 7: Miscellaneous

**Other Issues**:
- `TwilioSMSService` constructor not throwing on empty credentials
- `env-validator` not checking REDIS_HOST (now optional with Upstash)
- Privacy service export using old onboarding schema

## Recommended Fix Order

1. **Fix onboarding schema** - Biggest impact (25 failures)
2. **Add test user setup** - Quick win (15 failures)
3. **Install ioredis or mock Redis** - Quick win (11 failures)
4. **Fix auth method constraint** - Quick win (6 failures)
5. **Fix API validation** - Medium effort (10 failures)
6. **Fix property tests** - Requires logic changes (5 failures)
7. **Fix miscellaneous** - Case by case (15 failures)

## Next Steps

Choose one of two approaches:

### Approach A: Update Code to Match New Schema
- Update `onboarding-repository.ts` to use new columns
- Update `onboarding-service.ts` to use new schema
- Update all tests to match new schema
- **Pros**: Keeps simplified schema
- **Cons**: More code changes

### Approach B: Revert Migration 030
- Create new migration to restore old schema
- Keep existing code as-is
- **Pros**: Minimal code changes
- **Cons**: Loses simplified schema benefits

**Recommendation**: Approach A - The simplified schema is better designed for the 3-step onboarding flow.
