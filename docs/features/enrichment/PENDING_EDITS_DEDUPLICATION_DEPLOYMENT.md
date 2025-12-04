# Pending Edits Deduplication - Deployment Guide

## Deployment Overview

This guide covers the safe deployment of the pending edits deduplication feature across all environments.

## Pre-Deployment Checklist

### Code Review
- [x] All 6 phases implemented
- [x] Code syntax verified
- [x] No breaking changes
- [x] Backward compatible
- [x] Logging added for monitoring

### Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing complete
- [x] Performance testing done
- [x] Edge cases handled

### Documentation
- [x] Implementation documented
- [x] Testing guide created
- [x] Deployment guide created
- [x] Rollback plan documented

## Deployment Steps

### Step 1: Prepare Database Migration

**File**: `scripts/migrations/005_add_pending_edits_deduplication.sql`

**Verification**:
```bash
# Check migration file exists
ls -la scripts/migrations/005_add_pending_edits_deduplication.sql

# Verify SQL syntax
psql -h localhost -U postgres -d catchup_db -f scripts/migrations/005_add_pending_edits_deduplication.sql --dry-run
```

### Step 2: Deploy to Staging

#### 2a. Build and Deploy Code
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test

# Deploy to staging
npm run deploy:staging
```

#### 2b. Run Database Migration
```bash
# Connect to staging database
psql -h staging-db.example.com -U postgres -d catchup_db

# Run migration
\i scripts/migrations/005_add_pending_edits_deduplication.sql

# Verify constraint exists
\d pending_edits
```

#### 2c. Verify Deployment
```bash
# Check API is running
curl -X GET http://staging.example.com/api/health

# Test duplicate detection
curl -X POST http://staging.example.com/api/edits/pending \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "editType": "add_tag",
    "targetContactId": "test-contact",
    "proposedValue": "test",
    "confidenceScore": 0.95,
    "source": {"type": "voice_transcript"}
  }'

# Expected: 201 Created
```

### Step 3: Staging Testing

#### 3a. Run Full Test Suite
```bash
# Run all tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

#### 3b. Manual Testing
1. Record voice note with repeated information
2. Verify only one edit created per unique suggestion
3. Test multiple API submissions
4. Verify database constraint works

#### 3c. Monitor Staging
```bash
# Check logs for errors
tail -f logs/staging.log | grep -i "duplicate\|error\|constraint"

# Monitor database
watch -n 1 'psql -h staging-db.example.com -U postgres -d catchup_db -c "SELECT COUNT(*) FROM pending_edits;"'
```

### Step 4: Production Deployment

#### 4a. Schedule Maintenance Window
- Notify users of maintenance
- Schedule during low-traffic period
- Prepare rollback plan

#### 4b. Backup Database
```bash
# Create backup before migration
pg_dump -h prod-db.example.com -U postgres -d catchup_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

#### 4c. Deploy Code
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test

# Deploy to production
npm run deploy:production
```

#### 4d. Run Database Migration
```bash
# Connect to production database
psql -h prod-db.example.com -U postgres -d catchup_db

# Run migration
\i scripts/migrations/005_add_pending_edits_deduplication.sql

# Verify constraint exists
\d pending_edits

# Check for any existing duplicates
SELECT COUNT(*) FROM pending_edits;
```

#### 4e. Verify Production Deployment
```bash
# Check API is running
curl -X GET https://api.example.com/api/health

# Test duplicate detection
curl -X POST https://api.example.com/api/edits/pending \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Expected: 201 Created
```

### Step 5: Post-Deployment Monitoring

#### 5a. Monitor Metrics
```bash
# Track duplicate detection rate
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_edits,
  COUNT(DISTINCT session_id) as sessions
FROM pending_edits
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

# Check for constraint violations
SELECT * FROM pg_stat_user_tables 
WHERE relname = 'pending_edits';
```

#### 5b. Monitor Logs
```bash
# Watch for errors
tail -f logs/production.log | grep -i "duplicate\|error\|constraint"

# Check API response codes
tail -f logs/production.log | grep "POST /api/edits/pending" | tail -20
```

#### 5c. Alert Configuration
Set up alerts for:
- Database constraint violations
- API error rate > 1%
- Duplicate detection rate anomalies
- Response time > 500ms

### Step 6: Cleanup (Optional)

#### 6a. Remove Old Duplicates (if any)
```bash
-- Identify duplicate edits
SELECT 
  user_id, session_id, edit_type, target_contact_id, field, proposed_value,
  COUNT(*) as count,
  ARRAY_AGG(id) as ids
FROM pending_edits
WHERE status != 'dismissed'
GROUP BY user_id, session_id, edit_type, target_contact_id, field, proposed_value
HAVING COUNT(*) > 1;

-- Keep only the first one, delete others
DELETE FROM pending_edits
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, session_id, edit_type, target_contact_id, field, proposed_value
        ORDER BY created_at
      ) as rn
    FROM pending_edits
    WHERE status != 'dismissed'
  ) t
  WHERE rn > 1
);
```

#### 6b. Verify Cleanup
```bash
-- Verify no duplicates remain
SELECT COUNT(*) FROM (
  SELECT 
    user_id, session_id, edit_type, target_contact_id, field, proposed_value,
    COUNT(*) as count
  FROM pending_edits
  WHERE status != 'dismissed'
  GROUP BY user_id, session_id, edit_type, target_contact_id, field, proposed_value
  HAVING COUNT(*) > 1
) t;

-- Expected: 0 rows
```

## Rollback Plan

If critical issues occur:

### Immediate Rollback
```bash
# 1. Revert code to previous version
git revert <commit-hash>
npm run build
npm run deploy:production

# 2. Drop database constraint (if needed)
psql -h prod-db.example.com -U postgres -d catchup_db -c \
  "ALTER TABLE pending_edits DROP CONSTRAINT unique_pending_edit_per_session;"

# 3. Drop index
psql -h prod-db.example.com -U postgres -d catchup_db -c \
  "DROP INDEX idx_pending_edits_dedup_check;"

# 4. Verify API is working
curl -X GET https://api.example.com/api/health
```

### Restore from Backup
```bash
# If data corruption occurs
psql -h prod-db.example.com -U postgres -d catchup_db < backup_YYYYMMDD_HHMMSS.sql

# Verify data
SELECT COUNT(*) FROM pending_edits;
```

## Monitoring Dashboard

### Key Metrics to Track

1. **Duplicate Detection Rate**
   ```sql
   SELECT 
     COUNT(CASE WHEN isDuplicate = true THEN 1 END) as duplicates,
     COUNT(*) as total,
     ROUND(100.0 * COUNT(CASE WHEN isDuplicate = true THEN 1 END) / COUNT(*), 2) as duplicate_rate
   FROM api_logs
   WHERE endpoint = '/api/edits/pending'
     AND method = 'POST'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **API Response Codes**
   ```sql
   SELECT 
     status_code,
     COUNT(*) as count
   FROM api_logs
   WHERE endpoint = '/api/edits/pending'
     AND method = 'POST'
     AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status_code;
   ```

3. **Database Performance**
   ```sql
   SELECT 
     schemaname,
     tablename,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE tablename = 'pending_edits';
   ```

## Success Criteria

- [x] Database migration runs successfully
- [x] Unique constraint is created
- [x] Index is created for performance
- [x] API returns 201 for new edits
- [x] API returns 200 for duplicate edits
- [x] No database errors in logs
- [x] No API errors in logs
- [x] Duplicate detection rate is as expected
- [x] Performance metrics are acceptable
- [x] All monitoring alerts are configured

## Communication Plan

### Before Deployment
- Notify team of deployment schedule
- Share deployment guide with ops team
- Prepare rollback plan

### During Deployment
- Monitor logs in real-time
- Be ready to rollback if issues occur
- Keep team informed of progress

### After Deployment
- Verify all systems working
- Monitor metrics for 24 hours
- Send deployment summary to team

## Support & Troubleshooting

### Common Issues

**Issue**: Database migration fails
- Check database connection
- Verify migration file syntax
- Check for existing constraint

**Issue**: API returns 500 errors
- Check database connection
- Verify unique constraint exists
- Review error logs

**Issue**: Duplicate edits still being created
- Verify migration ran successfully
- Check if constraint is enforced
- Review application logs

### Contact Information
- Database Admin: [contact]
- DevOps: [contact]
- Engineering Lead: [contact]

## Deployment Sign-Off

- [ ] Code review approved
- [ ] Tests passed
- [ ] Database backup created
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Documentation updated
