# Action Items - Pending Edits Deduplication

## 🚀 Ready to Deploy

All implementation and fixes are complete. Follow these steps to deploy:

## Step 1: Run Database Migration (Required)

```bash
npm run db:migrate
```

This will:
- Add unique constraint to pending_edits table
- Create index for duplicate detection

**Verify it worked**:
```bash
psql -h localhost -U postgres -d catchup_db -c "\d pending_edits"
```

Expected output should show:
```
Indexes:
    "unique_pending_edit_per_session" UNIQUE, btree (...)
    "idx_pending_edits_dedup_check" btree (...)
```

## Step 2: Test the API

```bash
# Start the app
npm run dev

# In another terminal, create a test edit
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "editType": "add_tag",
    "targetContactId": "contact-123",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 201 Created
# Response: { "edit": {...}, "isDuplicate": false }
```

## Step 3: Test Duplicate Detection

```bash
# Run the same request again
curl -X POST http://localhost:3000/api/edits/pending \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "editType": "add_tag",
    "targetContactId": "contact-123",
    "proposedValue": "tech",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 200 OK
# Response: { "edit": {...}, "isDuplicate": true }
```

## Step 4: Test Voice Recording

1. Open the app in browser
2. Record a voice note with repeated information
3. Review enrichment suggestions
4. Apply suggestions
5. Check pending edits list

**Expected**: Only one edit per unique suggestion (no duplicates)

## Step 5: Monitor Logs

```bash
# Watch for any errors
tail -f logs/production.log | grep -E "\[EditRepository\]|\[EditService\]|error"

# Watch for duplicate detection
tail -f logs/production.log | grep "Duplicate edit detected"
```

## Step 6: Deploy to Production

```bash
# Build
npm run build

# Deploy
npm run deploy:production

# Run migration on production database
npm run db:migrate -- --env production
```

## Verification Checklist

- [ ] Database migration ran successfully
- [ ] Unique constraint created
- [ ] Index created
- [ ] API returns 201 for new edits
- [ ] API returns 200 for duplicate edits
- [ ] Voice recording creates only unique edits
- [ ] No errors in logs
- [ ] Performance is acceptable

## If Issues Occur

### Issue: "Constraint already exists"
```bash
# Check if constraint already exists
psql -h localhost -U postgres -d catchup_db -c \
  "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='pending_edits';"

# If it exists, drop it first
psql -h localhost -U postgres -d catchup_db -c \
  "ALTER TABLE pending_edits DROP CONSTRAINT unique_pending_edit_per_session;"

# Then run migration again
npm run db:migrate
```

### Issue: "Edits not being created"
```bash
# Check logs
tail -f logs/production.log | grep -E "error|Error|ERROR"

# Check database connection
npm run db:test

# Verify migration ran
psql -h localhost -U postgres -d catchup_db -c \
  "SELECT * FROM pending_edits LIMIT 1;"
```

### Issue: "Duplicate detection not working"
```bash
# Check if constraint exists
psql -h localhost -U postgres -d catchup_db -c "\d pending_edits"

# Check if index exists
psql -h localhost -U postgres -d catchup_db -c \
  "SELECT * FROM pg_indexes WHERE tablename='pending_edits';"

# Check logs for duplicate detection
tail -f logs/production.log | grep "Duplicate edit detected"
```

## Rollback (if needed)

```bash
# Drop constraint
psql -h localhost -U postgres -d catchup_db -c \
  "ALTER TABLE pending_edits DROP CONSTRAINT unique_pending_edit_per_session;"

# Drop index
psql -h localhost -U postgres -d catchup_db -c \
  "DROP INDEX idx_pending_edits_dedup_check;"

# Revert code
git revert <commit-hash>
npm run build
npm run deploy:production
```

## Documentation Reference

- **Quick Start**: `QUICK_REFERENCE.md`
- **Fixes Applied**: `FIXES_APPLIED.md`
- **Fix Guide**: `DEDUPLICATION_FIX_GUIDE.md`
- **Final Status**: `FINAL_STATUS.md`
- **Full Implementation**: `PENDING_EDITS_DEDUPLICATION_IMPLEMENTATION.md`
- **Testing Guide**: `PENDING_EDITS_DEDUPLICATION_TESTING.md`
- **Deployment Guide**: `PENDING_EDITS_DEDUPLICATION_DEPLOYMENT.md`

## Support

### Questions?
1. Check `QUICK_REFERENCE.md` for quick answers
2. Check `FIXES_APPLIED.md` for what was fixed
3. Check `FINAL_STATUS.md` for current status
4. Check `DEDUPLICATION_FIX_GUIDE.md` for detailed fixes

### Issues?
1. Check logs: `tail -f logs/production.log`
2. Check database: `psql -h localhost -U postgres -d catchup_db`
3. Check code: Review `src/edits/edit-repository.ts` and `src/edits/edit-service.ts`
4. Check migration: `scripts/migrations/018_add_pending_edits_deduplication.sql`

## Timeline

- **Today**: Run migration and test
- **This Week**: Deploy to production
- **Next Week**: Monitor metrics and verify

## Success Criteria

✅ Edits are created successfully
✅ Duplicates are detected and prevented
✅ No errors in logs
✅ Performance is acceptable
✅ Users see only unique edits

---

**Status**: 🟢 READY TO DEPLOY

Start with Step 1: Run the database migration!
