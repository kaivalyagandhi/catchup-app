# Google Sync Optimization - Deployment Checklist

## Overview

This checklist guides you through the complete deployment process for the Google Sync Optimization feature, from staging to production.

## Pre-Deployment (Complete Before Starting)

### Code Quality
- [ ] All code changes reviewed and approved
- [ ] All tests passing (`npm test`)
- [ ] No failing PBT tests
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code coverage >80% for core logic

### Documentation
- [ ] API documentation updated (`docs/API.md`)
- [ ] Admin guide reviewed (`docs/features/google-integrations/ADMIN_GUIDE.md`)
- [ ] Google integrations documentation updated (`.kiro/steering/google-integrations.md`)
- [ ] Deployment guide reviewed (`docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md`)
- [ ] Monitoring guide reviewed (`docs/features/google-integrations/MONITORING.md`)

### Infrastructure
- [ ] Staging environment matches production configuration
- [ ] Database backup strategy confirmed
- [ ] Rollback plan documented and understood
- [ ] Monitoring and alerting configured
- [ ] Admin users identified for promotion

### Environment Variables
- [ ] `GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_SECRET` set
- [ ] `GOOGLE_CONTACTS_REDIRECT_URI` set
- [ ] `GOOGLE_CALENDAR_REDIRECT_URI` set
- [ ] `WEBHOOK_BASE_URL` set
- [ ] `WEBHOOK_VERIFICATION_TOKEN` generated and set
- [ ] Optional configuration variables reviewed

## Phase 1: Staging Deployment

### 1.1 Deploy to Staging
- [ ] Set `NODE_ENV=staging`
- [ ] Run deployment script: `./scripts/deploy-staging.sh`
- [ ] Verify all migrations completed successfully
- [ ] Verify all tables created
- [ ] Verify admin columns added to users table
- [ ] Verify onboarding_until column added to sync_schedule table

### 1.2 Post-Deployment Verification
- [ ] Health endpoint responding: `curl $WEBHOOK_BASE_URL/health`
- [ ] Admin dashboard endpoint requires auth (returns 401/403)
- [ ] Application logs show no errors
- [ ] Database queries execute successfully

### 1.3 Promote Admin Users
- [ ] Promote first admin: `npm run promote-admin -- promote admin@example.com`
- [ ] Verify admin promotion: `npm run promote-admin -- list`
- [ ] Test admin dashboard access with admin JWT token

### 1.4 Functional Testing
- [ ] Admin dashboard loads at `/admin/sync-health.html`
- [ ] Dashboard displays metrics correctly
- [ ] Dashboard filters work (Contacts, Calendar, Both)
- [ ] Dashboard auto-refresh works
- [ ] CSV export works
- [ ] Manual sync works: `POST /api/sync/manual`
- [ ] Webhook endpoint responds: `POST /api/webhooks/calendar`

### 1.5 Integration Testing
- [ ] Connect new Google Contacts integration
  - [ ] Immediate first sync triggers
  - [ ] Progress UI displays
  - [ ] Contacts appear within 1 minute
  - [ ] Next sync scheduled in 1 hour
- [ ] Connect new Google Calendar integration
  - [ ] Immediate first sync triggers
  - [ ] Webhook registration succeeds
  - [ ] Next sync scheduled in 2 hours
  - [ ] Make calendar change in Google
  - [ ] Webhook notification triggers sync

## Phase 2: Staging Monitoring (48 Hours)

### 2.1 Initial Monitoring (First 4 Hours)
- [ ] Run monitoring script: `./scripts/monitor-staging.sh`
- [ ] Check for critical errors in logs
- [ ] Verify webhook registrations succeeding
- [ ] Verify onboarding syncs succeeding
- [ ] Verify no database errors

### 2.2 Daily Monitoring (Day 1)
- [ ] Run monitoring script: `./scripts/monitor-staging.sh`
- [ ] Review webhook health metrics
  - [ ] Target: >95% webhook reliability
  - [ ] Check for silent webhooks (>48h no notifications)
- [ ] Review onboarding success rate
  - [ ] Target: >95% success rate
  - [ ] Check for failed initial syncs
- [ ] Review API usage reduction
  - [ ] Target: 70-85% reduction
  - [ ] Verify contacts: ~57% reduction
  - [ ] Verify calendar: ~83% reduction
- [ ] Review sync success rate
  - [ ] Target: >90% success rate
  - [ ] Check for common error patterns

### 2.3 Daily Monitoring (Day 2)
- [ ] Run monitoring script: `./scripts/monitor-staging.sh`
- [ ] Review all metrics from Day 1
- [ ] Check for any degradation in performance
- [ ] Verify background jobs running correctly
  - [ ] Token refresh job (daily at 2 AM)
  - [ ] Webhook renewal job (daily at 3 AM)
  - [ ] Webhook health check job (every 12 hours)
  - [ ] Notification reminder job (daily at 9 AM)
  - [ ] Adaptive sync job (daily)

### 2.4 Final Staging Assessment
- [ ] All metrics meet targets
- [ ] No critical issues found
- [ ] No user complaints about stale data
- [ ] Background jobs running reliably
- [ ] Webhook health stable
- [ ] Onboarding success rate stable
- [ ] API usage reduction stable

### 2.5 Go/No-Go Decision
- [ ] Review all staging metrics
- [ ] Confirm readiness for production
- [ ] Document any issues and resolutions
- [ ] Get approval from stakeholders

## Phase 3: Production Deployment

### 3.1 Pre-Production Checklist
- [ ] Staging monitoring complete (48 hours)
- [ ] All staging issues resolved
- [ ] Production database backup created
- [ ] Rollback plan reviewed and understood
- [ ] Team notified of deployment window
- [ ] Monitoring alerts configured

### 3.2 Deploy to Production
- [ ] Set `NODE_ENV=production`
- [ ] Run deployment script: `./scripts/deploy-production.sh`
- [ ] Verify all migrations completed successfully
- [ ] Verify all tables created
- [ ] Verify admin columns added
- [ ] Verify onboarding_until column added

### 3.3 Post-Deployment Verification
- [ ] Health endpoint responding
- [ ] Admin dashboard endpoint requires auth
- [ ] Application logs show no errors
- [ ] Database queries execute successfully

### 3.4 Promote Admin Users
- [ ] Promote production admins
- [ ] Verify admin promotion
- [ ] Test admin dashboard access

### 3.5 Smoke Testing
- [ ] Admin dashboard loads
- [ ] Manual sync works
- [ ] Webhook endpoint responds
- [ ] Test new user onboarding flow
- [ ] Test webhook registration

## Phase 4: Production Monitoring

### 4.1 First 24 Hours (Critical Monitoring)
- [ ] Hour 1: Run `./scripts/monitor-production.sh 24h`
  - [ ] Check for critical errors
  - [ ] Verify webhook registrations
  - [ ] Verify onboarding syncs
- [ ] Hour 4: Run monitoring script
  - [ ] Review all metrics
  - [ ] Check for any issues
- [ ] Hour 8: Run monitoring script
  - [ ] Review trends
  - [ ] Verify stability
- [ ] Hour 12: Run monitoring script
  - [ ] Check background jobs
  - [ ] Verify webhook health
- [ ] Hour 24: Run monitoring script
  - [ ] Full metrics review
  - [ ] Document any issues

### 4.2 Week 1 Monitoring
- [ ] Day 2: Run `./scripts/monitor-production.sh 24h`
- [ ] Day 3: Run monitoring script
- [ ] Day 4: Run monitoring script
- [ ] Day 5: Run monitoring script
- [ ] Day 6: Run monitoring script
- [ ] Day 7: Run `./scripts/monitor-production.sh 7d`
  - [ ] Review 7-day trends
  - [ ] Verify all targets met
  - [ ] Document any patterns

### 4.3 Week 2 Monitoring
- [ ] Day 8-13: Run daily monitoring
- [ ] Day 14: Run `./scripts/monitor-production.sh 14d`
  - [ ] Review 14-day trends
  - [ ] Verify sustained performance
  - [ ] Calculate final metrics

### 4.4 Success Metrics (2 Weeks)
- [ ] Webhook reliability: >95%
- [ ] Onboarding success rate: >95%
- [ ] API usage reduction: 70-85%
- [ ] Sync success rate: >90%
- [ ] No critical incidents
- [ ] No rollbacks required
- [ ] User satisfaction maintained

## Phase 5: Post-Deployment

### 5.1 Documentation
- [ ] Update deployment history in `SYNC_OPTIMIZATION_DEPLOYMENT.md`
- [ ] Document any issues encountered and resolutions
- [ ] Update troubleshooting guide with new learnings
- [ ] Create post-deployment report

### 5.2 Team Communication
- [ ] Notify team of successful deployment
- [ ] Share final metrics and results
- [ ] Document lessons learned
- [ ] Update runbooks if needed

### 5.3 Cleanup
- [ ] Archive staging backups (keep for 30 days)
- [ ] Archive production backups (keep for 90 days)
- [ ] Remove temporary monitoring scripts if any
- [ ] Update monitoring dashboards

## Rollback Procedure (If Needed)

### When to Rollback
Rollback immediately if:
- [ ] Critical bugs discovered in production
- [ ] Database migrations fail
- [ ] Background jobs fail repeatedly (>3 consecutive failures)
- [ ] Admin dashboard not accessible
- [ ] Sync functionality broken for >10% of users
- [ ] Webhook success rate <80%
- [ ] Onboarding success rate <80%
- [ ] Sync success rate <70%

### Rollback Steps
1. [ ] Run rollback script: `./scripts/rollback-deployment.sh`
2. [ ] Follow prompts to:
   - [ ] Stop background jobs
   - [ ] Stop application
   - [ ] Restore database from backup
   - [ ] Revert code to previous version
   - [ ] Restart application
3. [ ] Verify rollback successful
4. [ ] Notify team of rollback
5. [ ] Create incident report
6. [ ] Plan fixes for re-deployment

## Monitoring Commands Reference

```bash
# Staging monitoring
./scripts/monitor-staging.sh

# Production monitoring (24 hours)
./scripts/monitor-production.sh 24h

# Production monitoring (7 days)
./scripts/monitor-production.sh 7d

# Production monitoring (14 days)
./scripts/monitor-production.sh 14d

# Check admin users
npm run promote-admin -- list

# Promote admin user
npm run promote-admin -- promote user@example.com

# Revoke admin access
npm run promote-admin -- revoke user@example.com
```

## Support Contacts

- **Development Team**: [contact info]
- **DevOps Team**: [contact info]
- **On-Call Engineer**: [contact info]

## Related Documentation

- **Deployment Guide**: `docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md`
- **Admin Guide**: `docs/features/google-integrations/ADMIN_GUIDE.md`
- **Monitoring Guide**: `docs/features/google-integrations/MONITORING.md`
- **API Reference**: `docs/API.md`
- **Troubleshooting**: `docs/features/google-integrations/ADMIN_GUIDE.md#troubleshooting`

## Notes

- Keep all backup files until deployment is verified successful (minimum 2 weeks)
- Monitor closely during first 24 hours after production deployment
- Be ready to rollback if critical issues arise
- Document all issues and resolutions for future reference
- Update this checklist based on lessons learned

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Approved By**: _________________

**Rollback Plan Reviewed By**: _________________
