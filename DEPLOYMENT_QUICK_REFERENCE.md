# Google Sync Optimization - Deployment Quick Reference

## Quick Start

### Localhost Deployment (Development)
```bash
# Run the deployment script
./scripts/deploy-localhost.sh

# Start dev server
npm run dev

# Promote admin
npm run promote-admin -- promote your-email@example.com

# Access app
open http://localhost:3000
open http://localhost:3000/admin/sync-health.html
```

### Staging Deployment
```bash
# 1. Set environment
export NODE_ENV=staging
export DB_HOST=your-staging-db-host
export DB_USER=your-db-user
export DB_NAME=your-db-name
export GOOGLE_CLIENT_ID=your-client-id
export GOOGLE_CLIENT_SECRET=your-client-secret
export WEBHOOK_BASE_URL=https://staging.your-domain.com
export WEBHOOK_VERIFICATION_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Deploy
./scripts/deploy-staging.sh

# 3. Promote admin
npm run promote-admin -- promote admin@example.com

# 4. Monitor for 48 hours
./scripts/monitor-staging.sh
```

### Production Deployment
```bash
# 1. Set environment
export NODE_ENV=production
export DB_HOST=your-production-db-host
export DB_USER=your-db-user
export DB_NAME=your-db-name
export GOOGLE_CLIENT_ID=your-client-id
export GOOGLE_CLIENT_SECRET=your-client-secret
export WEBHOOK_BASE_URL=https://your-domain.com
export WEBHOOK_VERIFICATION_TOKEN=your-secure-token

# 2. Deploy
./scripts/deploy-production.sh

# 3. Promote admin
npm run promote-admin -- promote admin@example.com

# 4. Monitor
./scripts/monitor-production.sh 24h  # First 24 hours
./scripts/monitor-production.sh 7d   # After 1 week
./scripts/monitor-production.sh 14d  # After 2 weeks
```

### Rollback
```bash
./scripts/rollback-deployment.sh
```

## Key Commands

### Admin Management
```bash
# Promote user to admin
npm run promote-admin -- promote user@example.com

# Revoke admin access
npm run promote-admin -- revoke user@example.com

# List all admins
npm run promote-admin -- list
```

### Monitoring
```bash
# Staging monitoring
./scripts/monitor-staging.sh

# Production monitoring (24 hours)
./scripts/monitor-production.sh 24h

# Production monitoring (7 days)
./scripts/monitor-production.sh 7d

# Production monitoring (14 days)
./scripts/monitor-production.sh 14d
```

### Health Checks
```bash
# Check application health
curl https://your-domain.com/health

# Check admin dashboard (should return 401/403 without auth)
curl https://your-domain.com/api/admin/sync-health

# Test manual sync
curl -X POST https://your-domain.com/api/sync/manual \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","integrationType":"contacts"}'
```

### Database Verification
```bash
# Verify migrations
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt token_health"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt circuit_breaker_state"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt sync_schedule"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt calendar_webhook_subscriptions"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt sync_metrics"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt token_health_notifications"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt webhook_notifications"

# Verify admin columns
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d users"

# Verify onboarding_until column
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d sync_schedule"
```

## Success Criteria

### Staging (48 Hours)
- ✅ Webhook reliability: >95%
- ✅ Onboarding success rate: >95%
- ✅ API usage reduction: 70-85%
- ✅ Sync success rate: >90%

### Production (2 Weeks)
- ✅ All staging criteria maintained
- ✅ No critical incidents
- ✅ No rollbacks required

## Rollback Triggers

Rollback if:
- Sync success rate < 70%
- Webhook success rate < 80%
- Onboarding success rate < 80%
- Critical bugs discovered
- Background jobs fail repeatedly

## Key Files

### Scripts
- `scripts/deploy-staging.sh` - Staging deployment
- `scripts/deploy-production.sh` - Production deployment
- `scripts/monitor-staging.sh` - Staging monitoring
- `scripts/monitor-production.sh` - Production monitoring
- `scripts/rollback-deployment.sh` - Rollback

### Documentation
- `DEPLOYMENT_CHECKLIST.md` - Full checklist
- `DEPLOYMENT_SUMMARY.md` - Implementation summary
- `docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md` - Detailed guide
- `docs/features/google-integrations/ADMIN_GUIDE.md` - Admin guide
- `docs/features/google-integrations/MONITORING.md` - Monitoring guide

## Troubleshooting

### Deployment fails
1. Check environment variables are set
2. Verify database connection
3. Check logs for errors
4. Review migration output

### Monitoring shows issues
1. Run monitoring script for details
2. Check specific metrics that failed
3. Review error logs
4. Consult troubleshooting guide

### Need to rollback
1. Run `./scripts/rollback-deployment.sh`
2. Follow prompts
3. Verify rollback success
4. Document incident

## Support

- **Deployment Guide**: `docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md`
- **Admin Guide**: `docs/features/google-integrations/ADMIN_GUIDE.md`
- **Troubleshooting**: `docs/features/google-integrations/ADMIN_GUIDE.md#troubleshooting`
- **API Reference**: `docs/API.md`

---

For detailed instructions, see `DEPLOYMENT_CHECKLIST.md`
