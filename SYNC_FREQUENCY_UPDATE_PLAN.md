# Sync Frequency Update Plan

## Overview

This document outlines the approved changes to Google Sync Optimization frequencies, including onboarding mitigations and enhanced webhook monitoring.

## Approved Changes

### 1. Google Contacts Frequencies

| Setting | Current | New | Change |
|---------|---------|-----|--------|
| Default | 3 days | **7 days** | +133% |
| Minimum | 7 days | **30 days** | +329% |
| Maximum | 1 day | **1 day** | No change |
| Onboarding | N/A | **1 hour** | New |

**API Savings**: ~57% reduction in default sync frequency

### 2. Google Calendar Frequencies

| Setting | Current | New | Change |
|---------|---------|-----|--------|
| Default | 4 hours | **24 hours** | +500% |
| Minimum | 4 hours | **24 hours** | +500% |
| Maximum | 1 hour | **4 hours** | +300% |
| Webhook Fallback | 8 hours | **12 hours** | +50% |
| Onboarding | N/A | **2 hours** | New |

**API Savings**: ~83% reduction in default sync frequency

### 3. Background Jobs

| Job | Current | New | Change |
|-----|---------|-----|--------|
| Adaptive Sync | Every 12 hours | **Daily** | +100% |
| Token Refresh | Daily | **Daily** | No change |
| Webhook Renewal | Daily | **Daily** | No change |

### 4. Admin Dashboard

| Setting | Current | New | Change |
|---------|---------|-----|--------|
| Auto-refresh | Every 5 minutes | **Daily** | +28,700% |

**Load Reduction**: 288x fewer dashboard queries per day

## Onboarding Mitigations

### Priority 1: Immediate First Sync ✅

**What**: Trigger immediate sync when user first connects Google integration

**Implementation**:
```typescript
// In GoogleContactsOAuthService and GoogleCalendarOAuthService
async handleSuccessfulConnection(userId: string, tokens: OAuthTokens) {
  await this.oauthRepository.storeTokens(userId, tokens);
  await this.adaptiveSyncScheduler.initialize(userId, integrationType);
  
  // 🆕 Immediate first sync
  const isFirstConnection = await this.isFirstConnection(userId, integrationType);
  if (isFirstConnection) {
    await this.syncOrchestrator.executeSyncJob(
      userId,
      integrationType,
      { syncType: 'initial', bypassSchedule: true }
    );
  }
}
```

**Files to modify**:
- `src/integrations/google-contacts-oauth-service.ts`
- `src/integrations/google-calendar-oauth-service.ts`
- `src/integrations/sync-orchestrator.ts` (add `syncType: 'initial'` support)

### Priority 2: Onboarding Progress UI with Retry ✅

**What**: Show sync progress during onboarding with retry button if sync fails

**Implementation**:
```typescript
// Onboarding sync status component
<div class="onboarding-sync-status" data-integration="contacts">
  <div class="sync-in-progress">
    <span class="spinner"></span>
    <p>Syncing your contacts...</p>
    <small>This usually takes 30-60 seconds</small>
  </div>
  
  <div class="sync-complete" style="display: none;">
    <span class="checkmark">✓</span>
    <p>Sync complete! Found <span class="contact-count">0</span> contacts.</p>
  </div>
  
  <div class="sync-failed" style="display: none;">
    <span class="error-icon">⚠</span>
    <p>Sync failed. Please try again.</p>
    <button class="retry-sync-btn">Retry</button>
  </div>
</div>
```

**Files to modify**:
- `public/js/onboarding-controller.js` (add sync status tracking)
- `public/js/step1-integrations-handler.js` (show progress after OAuth)
- `public/css/onboarding.css` (add sync status styles)

**Behavior**:
1. Show spinner immediately after OAuth callback
2. Poll `/api/sync/status` endpoint every 2 seconds
3. Update UI when sync completes (show count)
4. If sync fails, show error with "Retry" button
5. Retry button triggers manual sync via `/api/sync/manual`

### Priority 3: Onboarding-Specific Frequency ✅

**What**: Use faster sync frequency for first 24 hours after connection

**Implementation**:
```typescript
// In AdaptiveSyncScheduler
async initialize(userId: string, integrationType: IntegrationType) {
  const isNewConnection = await this.isFirstConnection(userId, integrationType);
  
  const frequencies = this.getFrequencyConfig(integrationType);
  const currentFrequency = isNewConnection
    ? frequencies.onboarding  // 1h for contacts, 2h for calendar
    : frequencies.default;     // 7d for contacts, 24h for calendar
  
  const schedule: SyncSchedule = {
    userId,
    integrationType,
    currentFrequency,
    defaultFrequency: frequencies.default,
    minFrequency: frequencies.min,
    maxFrequency: frequencies.max,
    consecutiveNoChanges: 0,
    lastSyncAt: null,
    nextSyncAt: new Date(Date.now() + currentFrequency),
    onboardingUntil: isNewConnection 
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 hours from now
      : null,
  };
  
  await this.repository.createSchedule(schedule);
}

// In calculateNextSync()
async calculateNextSync(userId: string, integrationType: IntegrationType, changesDetected: boolean) {
  const schedule = await this.getSchedule(userId, integrationType);
  
  // Check if still in onboarding period
  const isOnboarding = schedule.onboardingUntil && new Date() < schedule.onboardingUntil;
  
  if (isOnboarding) {
    // Use onboarding frequency
    const frequencies = this.getFrequencyConfig(integrationType);
    return new Date(Date.now() + frequencies.onboarding);
  }
  
  // Normal adaptive logic...
}
```

**Database migration**:
```sql
-- Add onboarding_until column to sync_schedule table
ALTER TABLE sync_schedule ADD COLUMN onboarding_until TIMESTAMP;
```

**Files to modify**:
- `src/integrations/adaptive-sync-scheduler.ts`
- `scripts/migrations/045_add_onboarding_until_to_sync_schedule.sql` (new)

## Enhanced Webhook Monitoring

### 1. Webhook Health Check Job

**What**: Proactively check webhook health every 6 hours

**Implementation**:
```typescript
// New job: webhook-health-check-processor.ts
export class WebhookHealthCheckProcessor {
  async process(): Promise<void> {
    const subscriptions = await this.webhookRepository.getAllActiveSubscriptions();
    
    for (const subscription of subscriptions) {
      // Check if webhook is receiving notifications
      const lastNotification = await this.getLastWebhookNotification(subscription.userId);
      const hoursSinceLastNotification = lastNotification 
        ? (Date.now() - lastNotification.getTime()) / (1000 * 60 * 60)
        : null;
      
      // Alert if no notifications in 48 hours (likely webhook is broken)
      if (hoursSinceLastNotification && hoursSinceLastNotification > 48) {
        await this.alertWebhookFailure(subscription.userId, 'no_notifications_48h');
        
        // Attempt to re-register webhook
        await this.webhookManager.reregisterWebhook(subscription.userId);
      }
      
      // Check if webhook is expiring soon (within 24 hours)
      const hoursUntilExpiry = (subscription.expiration.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilExpiry < 24 && hoursUntilExpiry > 0) {
        await this.webhookManager.renewWebhook(subscription.userId);
      }
    }
  }
}
```

**Files to create**:
- `src/jobs/processors/webhook-health-check-processor.ts`
- `src/integrations/webhook-health-repository.ts` (track notification timestamps)

### 2. Webhook Failure Alerts

**What**: Alert admins when webhook failure rate exceeds 5%

**Implementation**:
```typescript
// In WebhookManager
async trackWebhookMetrics() {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const metrics = await this.db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE result = 'success') as success_count,
      COUNT(*) FILTER (WHERE result = 'failure') as failure_count,
      COUNT(*) as total_count
    FROM webhook_notifications
    WHERE created_at >= $1
  `, [last24h]);
  
  const failureRate = metrics.failure_count / metrics.total_count;
  
  if (failureRate > 0.05) {  // 5% threshold
    await this.alertService.sendAdminAlert({
      type: 'webhook_high_failure_rate',
      severity: 'warning',
      message: `Webhook failure rate is ${(failureRate * 100).toFixed(1)}% (threshold: 5%)`,
      metrics: {
        successCount: metrics.success_count,
        failureCount: metrics.failure_count,
        totalCount: metrics.total_count,
      },
    });
  }
}
```

**Database migration**:
```sql
-- Create webhook_notifications table for tracking
CREATE TABLE webhook_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  resource_state VARCHAR(50) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'ignored')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_notifications_created_at ON webhook_notifications(created_at);
CREATE INDEX idx_webhook_notifications_result ON webhook_notifications(result);
```

**Files to create**:
- `scripts/migrations/046_create_webhook_notifications_table.sql`
- `src/integrations/webhook-metrics-service.ts`

### 3. Webhook Registration Retry Logic

**What**: Retry webhook registration up to 3 times on failure

**Implementation**:
```typescript
// In CalendarWebhookManager
async registerWebhook(userId: string, accessToken: string, maxRetries = 3): Promise<WebhookSubscription> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const subscription = await this.attemptWebhookRegistration(userId, accessToken);
      
      // Log successful registration
      await this.logWebhookEvent(userId, 'registration_success', { attempt });
      
      return subscription;
    } catch (error) {
      lastError = error as Error;
      
      // Log failed attempt
      await this.logWebhookEvent(userId, 'registration_failure', { 
        attempt, 
        error: error.message 
      });
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;  // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries failed - fall back to polling
  await this.adaptiveSyncScheduler.setPollingMode(userId, 'google_calendar');
  
  throw new Error(`Webhook registration failed after ${maxRetries} attempts: ${lastError?.message}`);
}
```

**Files to modify**:
- `src/integrations/calendar-webhook-manager.ts`

## Implementation Checklist

### Phase 1: Update Frequency Constants
- [ ] Update `SYNC_FREQUENCIES` in `src/integrations/adaptive-sync-scheduler.ts`
- [ ] Update `BACKGROUND_JOBS` in `src/jobs/job-scheduler.ts`
- [ ] Update `DASHBOARD` auto-refresh in `public/js/sync-health-dashboard.js`
- [ ] Update documentation in `.kiro/steering/google-integrations.md`

### Phase 2: Onboarding Mitigations
- [ ] Implement immediate first sync in OAuth services
- [ ] Add `isFirstConnection()` helper method
- [ ] Create onboarding sync status UI component
- [ ] Add retry button functionality
- [ ] Implement onboarding-specific frequency logic
- [ ] Create migration for `onboarding_until` column
- [ ] Update `AdaptiveSyncScheduler` to check onboarding period

### Phase 3: Enhanced Webhook Monitoring
- [ ] Create `webhook_notifications` table migration
- [ ] Implement webhook health check job
- [ ] Add webhook failure rate tracking
- [ ] Implement admin alerts for high failure rate
- [ ] Add webhook registration retry logic with exponential backoff
- [ ] Create webhook metrics dashboard section

### Phase 4: Testing
- [ ] Test immediate first sync for new connections
- [ ] Test onboarding progress UI with success/failure/retry
- [ ] Test onboarding frequency transitions after 24 hours
- [ ] Test webhook health check job
- [ ] Test webhook failure alerts
- [ ] Test webhook registration retry logic
- [ ] Load test with new frequencies

### Phase 5: Monitoring Setup
- [ ] Configure webhook failure rate alert (>5%)
- [ ] Configure webhook health check alert (no notifications >48h)
- [ ] Add dashboard metrics for onboarding sync success rate
- [ ] Add dashboard metrics for webhook reliability
- [ ] Document new monitoring procedures

## Expected Impact

### API Call Reduction
- **Contacts**: ~57% reduction (from ~10 syncs/month to ~4 syncs/month)
- **Calendar**: ~83% reduction (from 6 syncs/day to 1 sync/day)
- **Overall**: Estimated 70-85% reduction in total API calls

### User Experience
- ✅ Immediate sync on first connection (no waiting)
- ✅ Visual feedback during onboarding sync
- ✅ Retry option if sync fails
- ✅ Faster sync frequency during first 24 hours
- ⚠️ Longer sync intervals after onboarding (mitigated by webhooks + manual sync)

### System Load
- ✅ Reduced database query load
- ✅ Reduced background job execution
- ✅ Reduced admin dashboard load
- ✅ Better scalability for more users

### Risks
- ⚠️ Calendar data may be up to 24 hours stale without webhooks
- ⚠️ Webhook reliability is critical for calendar freshness
- ⚠️ Users may need to use manual sync more frequently

### Mitigation Strategies
- ✅ Enhanced webhook monitoring and alerts
- ✅ Automatic webhook re-registration on failure
- ✅ 8-hour fallback polling when webhooks fail
- ✅ Manual sync option always available
- ✅ Onboarding mitigations ensure good first impression

## Rollout Plan

### Week 1: Onboarding Mitigations
- Deploy immediate first sync
- Deploy onboarding progress UI
- Deploy onboarding-specific frequency
- Monitor onboarding sync success rate

### Week 2: Webhook Monitoring
- Deploy webhook health check job
- Deploy webhook failure alerts
- Deploy webhook registration retry logic
- Monitor webhook reliability

### Week 3: Frequency Updates
- Update contacts frequencies (lower risk)
- Monitor API usage and user feedback
- Verify adaptive scheduling works correctly

### Week 4: Calendar Frequency Update
- Update calendar frequencies (higher risk)
- Monitor webhook reliability closely
- Monitor user complaints about stale data
- Be ready to roll back if issues arise

## Rollback Plan

If issues arise:
1. Revert frequency constants to previous values
2. Restart background jobs with old schedule
3. Keep onboarding mitigations (they're beneficial regardless)
4. Keep webhook monitoring (it's beneficial regardless)
5. No data loss or corruption risk

## Success Metrics

Track for 2 weeks after full deployment:

- **API Usage**: Should decrease by 70-85%
- **Onboarding Sync Success Rate**: Should be >95%
- **Webhook Reliability**: Should be >95%
- **Manual Sync Usage**: May increase slightly (acceptable)
- **User Complaints**: Monitor for "stale data" complaints
- **Sync Job Queue Length**: Should decrease significantly
- **Database Load**: Should decrease significantly

## Documentation Updates

- [ ] Update `.kiro/steering/google-integrations.md` with new frequencies
- [ ] Update `docs/features/google-integrations/ADMIN_GUIDE.md` with webhook monitoring
- [ ] Update `docs/API.md` with new sync status endpoint
- [ ] Create `docs/features/google-integrations/ONBOARDING_SYNC.md`
- [ ] Update `SYNC_OPTIMIZATION_SUMMARY.md` with new frequencies

## Questions & Decisions

### Resolved ✅
- ✅ Calendar default frequency: 24 hours (approved)
- ✅ Dashboard auto-refresh: Daily (approved)
- ✅ Onboarding mitigations: Immediate sync + progress UI + faster frequency (approved)
- ✅ Webhook monitoring: Enhanced health checks + alerts + retry logic (approved)
- ✅ No "Sync Now" prompt after OAuth (use retry button in progress UI instead)

### Open Questions
- None - ready to implement!

---

**Status**: Ready for implementation
**Approved by**: User
**Date**: 2026-02-04
