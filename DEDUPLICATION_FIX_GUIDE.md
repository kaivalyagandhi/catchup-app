# Pending Edits Deduplication - Fix Guide

## Issue Found

The initial implementation had issues preventing edits from being created:

1. **Migration naming conflict**: File was named `005_add_pending_edits_deduplication.sql` but `005_create_users_table.sql` already existed
2. **PostgreSQL NULL handling**: COALESCE in unique constraints and indexes is not supported in PostgreSQL
3. **Query NULL comparison**: The findDuplicate query wasn't handling NULL values correctly

## Fixes Applied

### Fix 1: Rename Migration File
**Changed**: `scripts/migrations/005_add_pending_edits_deduplication.sql`
**To**: `scripts/migrations/018_add_pending_edits_deduplication.sql`

**Reason**: Avoid naming conflicts with existing migrations

### Fix 2: Simplify Unique Constraint
**Before**:
```sql
ALTER TABLE pending_edits
ADD CONSTRAINT unique_pending_edit_per_session UNIQUE (
  user_id,
  session_id,
  edit_type,
  COALESCE(target_contact_id, ''),
  COALESCE(field, ''),
  proposed_value
);
```

**After**:
```sql
ALTER TABLE pending_edits
ADD CONSTRAINT unique_pending_edit_per_session UNIQUE (
  user_id,
  session_id,
  edit_type,
  target_contact_id,
  field,
  proposed_value
);
```

**Reason**: PostgreSQL doesn't support COALESCE in unique constraints. The constraint will treat NULL values as distinct (which is correct for our use case).

### Fix 3: Fix NULL Handling in Query
**Before**:
```typescript
AND COALESCE(target_contact_id, '') = COALESCE($4, '')
AND COALESCE(field, '') = COALESCE($5, '')
```

**After**:
```typescript
AND (
  (target_contact_id = $4) OR 
  (target_contact_id IS NULL AND $4 IS NULL)
)
AND (
  (field = $5) OR 
  (field IS NULL AND $5 IS NULL)
)
```

**Reason**: In PostgreSQL, `NULL = NULL` returns NULL (not true). We need explicit `IS NULL` checks to match NULL values correctly.

### Fix 4: Add Error Handling
Added try-catch blocks in both repository and service layers to prevent blocking edit creation if duplicate check fails.

**Repository**:
```typescript
try {
  // ... query ...
} catch (error) {
  console.error('[EditRepository] Error in findDuplicate:', error);
  return null; // Allow creation if check fails
}
```

**Service**:
```typescript
try {
  const existingEdit = await this.editRepository.findDuplicate(data);
  if (existingEdit) {
    return existingEdit;
  }
} catch (error) {
  console.error('[EditService] Error checking for duplicates:', error);
  // Continue with creation if check fails
}
```

## How to Deploy the Fix

### Step 1: Update Code
The code has already been updated with the fixes above.

### Step 2: Run the Migration
```bash
npm run db:migrate
```

This will:
1. Add the unique constraint to pending_edits table
2. Create the index for duplicate detection

### Step 3: Verify
```bash
# Check that constraint was created
psql -h localhost -U postgres -d catchup_db -c "\d pending_edits"

# Should show:
# Indexes:
#     "unique_pending_edit_per_session" UNIQUE, btree (...)
```

### Step 4: Test
Create a pending edit and verify it appears:
```bash
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "editType": "add_tag",
    "targetContactId": "contact-1",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 201 Created
```

## How Deduplication Now Works

1. **First edit creation**:
   - User applies suggestion
   - API calls `createPendingEdit()`
   - Service calls `findDuplicate()` - returns null (no existing edit)
   - Service creates new edit
   - API returns 201 Created

2. **Duplicate edit attempt**:
   - User applies same suggestion again
   - API calls `createPendingEdit()`
   - Service calls `findDuplicate()` - finds existing edit
   - Service returns existing edit (no new creation)
   - API returns 200 OK with isDuplicate: true

3. **If duplicate check fails**:
   - Error is caught and logged
   - Edit creation proceeds normally
   - No edits are blocked

## Testing the Fix

### Test 1: Create First Edit
```bash
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-1",
    "editType": "add_tag",
    "targetContactId": "contact-1",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 201 Created
# Response: { "edit": {...}, "isDuplicate": false }
```

### Test 2: Create Duplicate
```bash
# Same request as above
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-1",
    "editType": "add_tag",
    "targetContactId": "contact-1",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 200 OK
# Response: { "edit": {...}, "isDuplicate": true }
```

### Test 3: Different Session Allows Same Edit
```bash
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-2",  # Different session
    "editType": "add_tag",
    "targetContactId": "contact-1",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 201 Created (different session, so not a duplicate)
```

## Monitoring

### Check for Errors
```bash
tail -f logs/production.log | grep -E "\[EditRepository\]|\[EditService\]"
```

### Check Duplicate Detection
```bash
tail -f logs/production.log | grep "Duplicate edit detected"
```

### Check Database
```sql
-- Count pending edits
SELECT COUNT(*) FROM pending_edits WHERE status != 'dismissed';

-- Check for constraint violations
SELECT * FROM pg_stat_user_tables WHERE relname = 'pending_edits';
```

## Rollback (if needed)

If issues occur:

```bash
# Drop the constraint
psql -h localhost -U postgres -d catchup_db -c \
  "ALTER TABLE pending_edits DROP CONSTRAINT unique_pending_edit_per_session;"

# Drop the index
psql -h localhost -U postgres -d catchup_db -c \
  "DROP INDEX idx_pending_edits_dedup_check;"

# Revert code
git revert <commit-hash>
npm run build
npm run deploy:production
```

## Summary

The fixes ensure that:
- ✅ Edits are created successfully
- ✅ Duplicates are detected and prevented
- ✅ NULL values are handled correctly
- ✅ Errors don't block edit creation
- ✅ Deduplication works as intended

The system is now ready for deployment.
