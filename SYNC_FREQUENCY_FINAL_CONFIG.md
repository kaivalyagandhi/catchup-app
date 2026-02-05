# Google Sync Optimization - Final Configuration

## Status: ✅ APPROVED - Ready for Implementation

**Date**: 2026-02-04  
**Approved by**: User

---

## Final Configuration

### Sync Frequencies

```typescript
const SYNC_FREQUENCIES = {
  contacts: {
    default: 7 * 24 * 60 * 60 * 1000,      // 7 days
    min: 30 * 24 * 60 * 60 * 1000,         // 30 days
    max: 1 * 24 * 60 * 60 * 1000,          // 1 day
    onboarding: 1 * 60 * 60 * 1000,        // 1 hour (first 24h)
  },
  calendar: {
    default: 24 * 60 * 60 * 1000,          // 24 hours
    min: 24 * 60 * 60 * 1000,              // 24 hours
    max: 4 * 60 * 60 * 1000,               // 4 hours
    webhookFallback: 12 * 60 * 60 * 1000,  // 12 hours (when webhook active)
    onboarding: 2 * 60 * 60 * 1000,        // 2 hours (first 24h)
  },
};
```

### Background Jobs

```typescript
const BACKGROUND_JOBS = {
  adaptiveSync: 24 * 60 * 60 * 1000,       // Daily (24 hours)
  tokenRefresh: 24 * 60 * 60 * 1000,       // Daily (24 hours)
  webhookRenewal: 24 * 60 * 60 * 1000,     // Daily (24 hours)
  webhookHealthCheck: 12 * 60 * 60 * 1000, // Every 12 hours
};
```

### Dashboard

```typescript
const DASHBOARD = {
  autoRefresh: 24 * 60 * 60 * 1000,        // Daily (24 hours)
};
```

### Webhook Monitoring

```typescript
const WEBHOOK_MONITORING = {
  failureAlertThreshold: 0.05,              // Alert if >5% failure rate
  registrationRetryAttempts: 3,             // Retry registration 3 times
  healthCheckInterval: 12 * 60 * 60 * 1000, // Check webhook health every 12h
};
```

### Onboarding

```typescript
const ONBOARDING = {
  immediateFirstSync: true,                 // Trigger sync on connection
  showSyncProgress: true,                   // Show progress with retry CTA
  onboardingFrequency: true,                // Use faster frequency for 24h
  onboardingPeriod: 24 * 60 * 60 * 1000,   // 24 hours
};
```

---

## Changes from Current Configuration

### Google Contacts
- **Default**: 3 days → **7 days** (+133%)
- **Minimum**: 7 days → **30 days** (+329%)
- **Maximum**: 1 day → **1 day** (unchanged)
- **Onboarding**: N/A → **1 hour** (new)

### Google Calendar
- **Default**: 4 hours → **24 hours** (+500%)
- **Minimum**: 4 hours → **24 hours** (+500%)
- **Maximum**: 1 hour → **4 hours** (+300%)
- **Webhook Fallback**: 8 hours → **12 hours** (+50%)
- **Onboarding**: N/A → **2 hours** (new)

### Background Jobs
- **Adaptive Sync**: Every 12 hours → **Daily** (+100%)
- **Webhook Health Check**: Every 6 hours → **Every 12 hours** (+100%)

### Dashboard
- **Auto-refresh**: Every 5 minutes → **Daily** (+28,700%)

---

## Expected Impact

### API Call Reduction
- **Contacts**: ~57% reduction (10 syncs/month → 4 syncs/month)
- **Calendar**: ~83% reduction (6 syncs/day → 1 sync/day)
- **Overall**: 70-85% reduction in total API calls

### System Load Reduction
- **Background Jobs**: 50% fewer job executions
- **Dashboard Queries**: 99.7% reduction (288x fewer queries)
- **Database Load**: Significant reduction in sync-related queries

### User Experience
- ✅ Immediate sync on first connection (no waiting)
- ✅ Visual feedback during onboarding sync
- ✅ Retry option if sync fails
- ✅ Faster sync frequency during first 24 hours
- ⚠️ Longer sync intervals after onboarding (mitigated by webhooks + manual sync)

---

## Onboarding Mitigations (Approved)

### 1. Immediate First Sync ✅
- Trigger sync immediately when user connects Google integration
- No waiting for scheduled sync
- Ensures good first impression

### 2. Onboarding Progress UI with Retry ✅
- Show spinner during sync
- Display success message with contact count
- Show error message with "Retry" button if sync fails
- **Note**: No separate "Sync Now" prompt after OAuth

### 3. Onboarding-Specific Frequency ✅
- Use 1-hour frequency for Contacts during first 24 hours
- Use 2-hour frequency for Calendar during first 24 hours
- Automatically transition to default frequency after 24 hours

---

## Enhanced Webhook Monitoring (Approved)

### 1. Webhook Health Check Job
- Runs every **12 hours** (reduced from 6 hours)
- Checks if webhooks are receiving notifications
- Alerts if no notifications in 48 hours
- Attempts to re-register broken webhooks

### 2. Webhook Failure Alerts
- Alert admins if failure rate exceeds 5%
- Track webhook registration success/failure
- Monitor webhook notification delivery

### 3. Webhook Registration Retry
- Retry registration up to 3 times on failure
- Exponential backoff: 2s, 4s, 8s
- Fall back to polling if all retries fail

---

## Risk Mitigation

### Calendar Data Staleness
**Risk**: Calendar data may be up to 24 hours stale without webhooks

**Mitigations**:
- ✅ Webhooks provide real-time updates (primary mechanism)
- ✅ 12-hour fallback polling when webhooks are active (safety net)
- ✅ Enhanced webhook monitoring detects failures within 12 hours
- ✅ Automatic webhook re-registration on failure
- ✅ Manual sync option always available
- ✅ Onboarding mitigations ensure good first impression

### Webhook Reliability
**Risk**: Webhooks may fail, causing extended data staleness

**Mitigations**:
- ✅ Health check every 12 hours
- ✅ Automatic re-registration on failure
- ✅ 12-hour fallback polling as safety net
- ✅ Admin alerts for high failure rates
- ✅ Retry logic with exponential backoff

### Onboarding Experience
**Risk**: New users may wait too long for initial sync

**Mitigations**:
- ✅ Immediate first sync on connection
- ✅ Progress UI with visual feedback
- ✅ Retry button if sync fails
- ✅ Faster frequency (1-2 hours) for first 24 hours

---

## Implementation Priority

### Phase 1: Update Frequency Constants (Week 1)
- Update `SYNC_FREQUENCIES` in code
- Update `BACKGROUND_JOBS` schedules
- Update `DASHBOARD` auto-refresh
- Update documentation

### Phase 2: Onboarding Mitigations (Week 2)
- Implement immediate first sync
- Create onboarding progress UI
- Implement onboarding-specific frequency
- Add database migration for `onboarding_until` column

### Phase 3: Enhanced Webhook Monitoring (Week 3)
- Create webhook health check job (12-hour interval)
- Implement webhook failure alerts
- Add webhook registration retry logic
- Create `webhook_notifications` table

### Phase 4: Testing & Monitoring (Week 4)
- Test all onboarding flows
- Test webhook monitoring
- Monitor API usage reduction
- Monitor user feedback
- Verify webhook reliability

---

## Success Metrics

Track for 2 weeks after deployment:

- **API Usage**: Should decrease by 70-85%
- **Onboarding Sync Success Rate**: Should be >95%
- **Webhook Reliability**: Should be >95%
- **Manual Sync Usage**: May increase slightly (acceptable)
- **User Complaints**: Monitor for "stale data" complaints
- **Sync Job Queue Length**: Should decrease significantly
- **Database Load**: Should decrease significantly
- **Webhook Health Check Effectiveness**: Should detect failures within 12 hours

---

## Rollback Plan

If issues arise:
1. Revert frequency constants to previous values
2. Restart background jobs with old schedule
3. Keep onboarding mitigations (beneficial regardless)
4. Keep webhook monitoring (beneficial regardless)
5. No data loss or corruption risk

---

## Files to Update

### Configuration Files
- `src/integrations/adaptive-sync-scheduler.ts` - Update `SYNC_FREQUENCIES`
- `src/jobs/job-scheduler.ts` - Update `BACKGROUND_JOBS`
- `public/js/sync-health-dashboard.js` - Update dashboard auto-refresh

### Documentation Files
- `.kiro/steering/google-integrations.md` - Update Section 4
- `docs/features/google-integrations/ADMIN_GUIDE.md` - Update monitoring section
- `SYNC_OPTIMIZATION_SUMMARY.md` - Update with new frequencies

### Spec Files
- `.kiro/specs/google-sync-optimization/design.md` - ✅ Already updated
- `.kiro/specs/google-sync-optimization/requirements.md` - May need updates
- `.kiro/specs/google-sync-optimization/tasks.md` - May need updates

---

## Next Steps

1. **Review this configuration** - Confirm all settings are correct
2. **Begin Phase 1** - Update frequency constants in code
3. **Create database migrations** - For onboarding and webhook monitoring
4. **Implement onboarding mitigations** - Priority 1-3
5. **Implement webhook monitoring** - Health checks and alerts
6. **Test thoroughly** - All flows and edge cases
7. **Deploy incrementally** - Phase by phase with monitoring

---

**Status**: ✅ Ready for implementation  
**Next Action**: Begin Phase 1 - Update frequency constants

