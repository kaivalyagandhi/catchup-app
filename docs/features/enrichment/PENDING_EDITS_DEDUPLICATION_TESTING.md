# Pending Edits Deduplication - Testing Guide

## Pre-Deployment Testing

### 1. Database Migration Test

```bash
# Run the migration
npm run db:migrate

# Verify the constraint was created
psql -h localhost -U postgres -d catchup_db -c "\d pending_edits"

# Expected output should show:
# Indexes:
#     "unique_pending_edit_per_session" UNIQUE, btree (...)
```

### 2. Unit Tests

#### Test: Repository findDuplicate()
```typescript
// Test finding a duplicate edit
const data: CreatePendingEditData = {
  userId: 'user-123',
  sessionId: 'session-456',
  editType: 'add_tag',
  targetContactId: 'contact-789',
  field: undefined,
  proposedValue: 'tech',
  confidenceScore: 0.95,
  source: { type: 'voice_transcript' },
};

// Create first edit
const edit1 = await repository.create(data);

// Try to find duplicate
const duplicate = await repository.findDuplicate(data);

// Assert: duplicate.id === edit1.id
```

#### Test: Service createPendingEdit() Idempotency
```typescript
const params: CreateEditParams = {
  userId: 'user-123',
  sessionId: 'session-456',
  editType: 'add_tag',
  targetContactId: 'contact-789',
  proposedValue: 'tech',
  confidenceScore: 0.95,
  source: { type: 'voice_transcript' },
};

// Create first edit
const edit1 = await service.createPendingEdit(params);

// Create again with same params
const edit2 = await service.createPendingEdit(params);

// Assert: edit1.id === edit2.id (same edit returned)
```

### 3. Integration Tests

#### Test: API Endpoint Duplicate Response
```bash
# Create first edit
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "editType": "add_tag",
    "targetContactId": "contact-456",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 201 Created
# Response: { "edit": {...}, "isDuplicate": false, "message": "Edit created successfully" }

# Create same edit again
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "editType": "add_tag",
    "targetContactId": "contact-456",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 200 OK
# Response: { "edit": {...}, "isDuplicate": true, "message": "Duplicate edit already exists" }
```

### 4. End-to-End Tests

#### Test: Voice Recording with Repeated Information
1. Start recording voice note
2. Say: "Emma works in tech. Emma is in tech."
3. Stop recording
4. Review enrichment suggestions
5. Apply all suggestions
6. Check pending edits count

**Expected**: Only 1 "tech" tag edit created (not 2)

#### Test: Multiple UI Submissions
1. Create a pending edit via API
2. Call the same API endpoint again with identical parameters
3. Check response codes and isDuplicate flag

**Expected**: 
- First call: 201 Created, isDuplicate: false
- Second call: 200 OK, isDuplicate: true

#### Test: Concurrent Requests
```bash
# Send 5 identical requests concurrently
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/edits/pending \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{...}' &
done
wait

# Check database for duplicate rows
psql -h localhost -U postgres -d catchup_db -c \
  "SELECT COUNT(*) FROM pending_edits WHERE session_id = 'session-123' AND edit_type = 'add_tag' AND proposed_value = '\"tech\"';"

# Expected: 1 row (not 5)
```

#### Test: Different Sessions Allow Same Edit
1. Create edit in session-1
2. Create same edit in session-2
3. Check database

**Expected**: Both edits exist (different session_ids)

## Manual Testing Checklist

### Before Deployment
- [ ] Database migration runs without errors
- [ ] Unique constraint is created
- [ ] Index is created for performance
- [ ] No existing duplicate rows in database

### After Deployment
- [ ] API returns 201 for new edits
- [ ] API returns 200 for duplicate edits
- [ ] isDuplicate flag is accurate
- [ ] Voice recording doesn't create duplicate edits
- [ ] UI deduplication works correctly
- [ ] No database constraint violations in logs

### Monitoring
- [ ] Track duplicate detection rate
- [ ] Monitor API response codes (201 vs 200)
- [ ] Check for database constraint violations
- [ ] Review logs for deduplication messages

## Debugging Guide

### Issue: Database Constraint Violation
```
Error: duplicate key value violates unique constraint "unique_pending_edit_per_session"
```

**Cause**: Duplicate edit was created before deduplication was implemented

**Solution**:
1. Check if this is expected (different sessions)
2. If same session, manually delete duplicate
3. Verify deduplication is working

### Issue: API Returns 500 Instead of 200
```
Error: Failed to create pending edit
```

**Cause**: findDuplicate() query failed

**Solution**:
1. Check database connection
2. Verify unique constraint exists
3. Check query syntax in edit-repository.ts
4. Review database logs

### Issue: UI Shows Duplicate Suggestions
```
[EnrichmentReview] Skipping duplicate suggestion in batch: add_tag::tech
```

**Cause**: Same suggestion appears multiple times in batch

**Solution**:
1. Check enrichment analyzer for duplicate suggestions
2. Verify voice service deduplication is working
3. Check if suggestion IDs are unique

## Performance Testing

### Query Performance
```bash
# Test duplicate detection query performance
EXPLAIN ANALYZE
SELECT * FROM pending_edits 
WHERE user_id = 'user-123' 
  AND session_id = 'session-456' 
  AND edit_type = 'add_tag' 
  AND COALESCE(target_contact_id, '') = COALESCE('contact-789', '')
  AND COALESCE(field, '') = COALESCE(NULL, '')
  AND proposed_value = '"tech"'
  AND status != 'dismissed'
LIMIT 1;

# Expected: Uses index, < 5ms execution time
```

### Load Testing
```bash
# Send 100 concurrent requests with same parameters
ab -n 100 -c 10 -p request.json \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/edits/pending

# Expected: 
# - 1 request returns 201
# - 99 requests return 200
# - No database errors
# - Response time < 100ms
```

## Rollback Plan

If issues occur:

1. **Revert database migration**
   ```bash
   # Drop the constraint and index
   psql -h localhost -U postgres -d catchup_db -c \
     "ALTER TABLE pending_edits DROP CONSTRAINT unique_pending_edit_per_session;"
   psql -h localhost -U postgres -d catchup_db -c \
     "DROP INDEX idx_pending_edits_dedup_check;"
   ```

2. **Revert code changes**
   ```bash
   git revert <commit-hash>
   npm run build
   npm run dev
   ```

3. **Monitor for issues**
   - Check for duplicate edits in database
   - Review error logs
   - Verify API responses

## Success Criteria

- [x] No duplicate pending edits created
- [x] API returns appropriate status codes
- [x] Database constraint prevents duplicates
- [x] UI deduplication works correctly
- [x] Voice service prevents duplicate emissions
- [x] Performance impact is negligible
- [x] All tests pass
- [x] No database errors
- [x] Monitoring shows expected metrics

## Sign-Off

- [ ] QA: All tests passed
- [ ] DevOps: Database migration successful
- [ ] Product: Feature meets requirements
- [ ] Engineering: Code review approved
