# Google Integrations Onboarding Sync Guide

## Overview

When users first connect Google Contacts or Calendar, they expect to see their data immediately. However, with default sync frequencies of 7 days (Contacts) and 24 hours (Calendar), new users would experience significant delays before seeing their data.

This guide documents the onboarding mitigations implemented to provide immediate data visibility and frequent syncs during the critical first 24 hours after connection.

## Table of Contents

1. [Onboarding Challenges](#onboarding-challenges)
2. [Mitigation Strategies](#mitigation-strategies)
3. [Immediate First Sync](#immediate-first-sync)
4. [Onboarding Progress UI](#onboarding-progress-ui)
5. [Onboarding-Specific Frequencies](#onboarding-specific-frequencies)
6. [Technical Implementation](#technical-implementation)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Onboarding Challenges

### The Problem

With the updated sync frequencies (implemented 2026-02-04):
- **Contacts**: Default 7-day sync interval
- **Calendar**: Default 24-hour sync interval

New users connecting these integrations would face:
- **Contacts**: Up to 7 days before seeing their contacts
- **Calendar**: Up to 24 hours before seeing calendar events
- Poor first impression and user confusion
- Increased support requests
- Higher abandonment rates

### The Solution

Three complementary mitigations ensure excellent onboarding experience:

1. **Immediate First Sync**: Data appears within seconds of connection
2. **Onboarding Progress UI**: Real-time visibility and retry capability
3. **Onboarding-Specific Frequencies**: More frequent syncs for first 24 hours

## Mitigation Strategies

### 1. Immediate First Sync

**Purpose**: Ensure users see their data immediately after connecting

**Behavior**:
- Triggered automatically when user completes OAuth flow
- Runs before user is redirected back to the app
- Marked as `initial` sync type for tracking
- Bypasses normal scheduling logic

**User Experience**:
```
1. User clicks "Connect Google Contacts"
2. User authorizes in Google OAuth screen
3. System immediately triggers sync (background)
4. User redirected to app
5. Progress UI shows sync status
6. Data appears within 5-30 seconds
```

**Implementation**:
- `GoogleContactsOAuthService.handleCallback()` detects first connection
- Calls `SyncOrchestrator.executeSyncJob()` with `syncType: 'initial'`
- Same logic for `GoogleCalendarOAuthService`

### 2. Onboarding Progress UI with Retry

**Purpose**: Provide visibility and control during initial sync

**Features**:
- Real-time sync status display
- Progress indicator with item count
- Success message with total items synced
- Error message with retry button
- Polling-based status updates (every 2 seconds)

**User Experience**:

**In Progress:**
```
┌─────────────────────────────────────┐
│  Syncing your Google Contacts...   │
│                                     │
│  ⟳ Processing contacts...          │
│  📊 45 contacts synced so far       │
└─────────────────────────────────────┘
```

**Success:**
```
┌─────────────────────────────────────┐
│  ✓ Sync Complete!                   │
│                                     │
│  Successfully synced 127 contacts   │
│  [Continue]                         │
└─────────────────────────────────────┘
```

**Failure:**
```
┌─────────────────────────────────────┐
│  ✗ Sync Failed                      │
│                                     │
│  Unable to sync contacts            │
│  Error: Token expired               │
│  [Retry Sync]                       │
└─────────────────────────────────────┘
```

**Implementation**:
- `onboarding-sync-status.js`: Status display component
- `onboarding-controller.js`: Integration with onboarding flow
- `onboarding.css`: Styling for status indicators

### 3. Onboarding-Specific Frequencies

**Purpose**: More frequent syncs during the first 24 hours

**Frequencies**:
- **Contacts**: 1 hour (vs. 7 days default)
- **Calendar**: 2 hours (vs. 24 hours default)
- **Duration**: First 24 hours after connection

**Rationale**:
- Users are most active during onboarding
- More likely to make changes in Google
- Want to see updates quickly
- After 24 hours, transition to normal frequencies

**Transition**:
```
Hour 0:  Connect → Immediate sync
Hour 1:  Onboarding sync (Contacts)
Hour 2:  Onboarding sync (Calendar)
Hour 3:  Onboarding sync (Contacts)
...
Hour 24: Transition to normal adaptive scheduling
Hour 25+: 7-day (Contacts) or 24-hour (Calendar) default
```

## Immediate First Sync

### How It Works

```typescript
// In GoogleContactsOAuthService.handleCallback()
async handleCallback(code: string): Promise<void> {
  // 1. Exchange code for tokens
  const tokens = await this.exchangeCodeForTokens(code);
  
  // 2. Store tokens
  await this.storeTokens(userId, tokens);
  
  // 3. Check if first connection
  const isFirstConnection = await this.isFirstConnection(userId, 'google_contacts');
  
  // 4. If first connection, trigger immediate sync
  if (isFirstConnection) {
    await this.syncOrchestrator.executeSyncJob(
      userId,
      'google_contacts',
      'initial'  // Mark as initial sync
    );
  }
  
  // 5. Initialize sync schedule with onboarding frequency
  await this.adaptiveSyncScheduler.initialize(
    userId,
    'google_contacts',
    isFirstConnection
  );
}
```

### First Connection Detection

```typescript
async isFirstConnection(
  userId: string,
  integrationType: 'google_contacts' | 'google_calendar'
): Promise<boolean> {
  // Check if user has any sync history
  const syncHistory = await this.syncMetricsRepository.findByUserAndIntegration(
    userId,
    integrationType
  );
  
  return syncHistory.length === 0;
}
```

### Sync Type Handling

The `initial` sync type:
- Bypasses circuit breaker checks
- Bypasses adaptive scheduling
- Always performs full sync (not incremental)
- Recorded in sync_metrics for tracking
- Does not affect consecutive_no_changes counter

## Onboarding Progress UI

### API Endpoint

**GET /api/sync/status/:userId/:integrationType**

**Response:**
```typescript
{
  status: 'in_progress' | 'completed' | 'failed',
  itemsProcessed: number,
  totalItems: number,
  errorMessage?: string,
  startedAt: string,  // ISO date
  completedAt?: string  // ISO date
}
```

**Status Values:**
- `in_progress`: Sync is currently running
- `completed`: Sync finished successfully
- `failed`: Sync encountered an error

### Frontend Component

**onboarding-sync-status.js**

```javascript
class OnboardingSyncStatus {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.userId = null;
    this.integrationType = null;
    this.pollInterval = null;
  }
  
  // Start monitoring sync status
  async start(userId, integrationType) {
    this.userId = userId;
    this.integrationType = integrationType;
    
    // Show initial loading state
    this.render({ status: 'in_progress', itemsProcessed: 0 });
    
    // Start polling every 2 seconds
    this.pollInterval = setInterval(() => {
      this.checkStatus();
    }, 2000);
  }
  
  // Check sync status
  async checkStatus() {
    const response = await fetch(
      `/api/sync/status/${this.userId}/${this.integrationType}`
    );
    const status = await response.json();
    
    this.render(status);
    
    // Stop polling if completed or failed
    if (status.status === 'completed' || status.status === 'failed') {
      clearInterval(this.pollInterval);
    }
  }
  
  // Render status UI
  render(status) {
    if (status.status === 'in_progress') {
      this.renderInProgress(status);
    } else if (status.status === 'completed') {
      this.renderCompleted(status);
    } else if (status.status === 'failed') {
      this.renderFailed(status);
    }
  }
  
  // Retry sync on failure
  async retry() {
    const response = await fetch('/api/sync/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrationType: this.integrationType
      })
    });
    
    if (response.ok) {
      this.start(this.userId, this.integrationType);
    }
  }
}
```

### Integration with Onboarding Flow

```javascript
// In onboarding-controller.js

async handleGoogleContactsCallback() {
  // 1. Complete OAuth flow
  await this.completeOAuthFlow();
  
  // 2. Show sync status UI
  const syncStatus = new OnboardingSyncStatus('sync-status-container');
  syncStatus.start(this.userId, 'google_contacts');
  
  // 3. Wait for completion
  await syncStatus.waitForCompletion();
  
  // 4. Continue to next onboarding step
  this.showNextStep();
}
```

## Onboarding-Specific Frequencies

### Database Schema

```sql
ALTER TABLE sync_schedule 
ADD COLUMN onboarding_until TIMESTAMP;
```

**Purpose**: Track when onboarding period ends (24 hours after connection)

### Initialization

```typescript
// In AdaptiveSyncScheduler.initialize()
async initialize(
  userId: string,
  integrationType: 'google_contacts' | 'google_calendar',
  isFirstConnection: boolean
): Promise<void> {
  const now = new Date();
  
  // Determine frequency based on connection status
  let frequency: number;
  let onboardingUntil: Date | null = null;
  
  if (isFirstConnection) {
    // Use onboarding frequency
    frequency = SYNC_FREQUENCIES[integrationType].onboarding;
    
    // Set onboarding period to 24 hours from now
    onboardingUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // Use default frequency
    frequency = SYNC_FREQUENCIES[integrationType].default;
  }
  
  // Create sync schedule
  await this.syncScheduleRepository.create({
    userId,
    integrationType,
    currentFrequencyMs: frequency,
    defaultFrequencyMs: SYNC_FREQUENCIES[integrationType].default,
    minFrequencyMs: SYNC_FREQUENCIES[integrationType].min,
    maxFrequencyMs: SYNC_FREQUENCIES[integrationType].max,
    consecutiveNoChanges: 0,
    lastSyncAt: now,
    nextSyncAt: new Date(now.getTime() + frequency),
    onboardingUntil
  });
}
```

### Frequency Calculation

```typescript
// In AdaptiveSyncScheduler.calculateNextSync()
async calculateNextSync(
  userId: string,
  integrationType: 'google_contacts' | 'google_calendar',
  changesDetected: boolean
): Promise<Date> {
  const schedule = await this.getSchedule(userId, integrationType);
  const now = new Date();
  
  // Check if still in onboarding period
  if (schedule.onboardingUntil && now < schedule.onboardingUntil) {
    // Use onboarding frequency
    const onboardingFrequency = SYNC_FREQUENCIES[integrationType].onboarding;
    return new Date(now.getTime() + onboardingFrequency);
  }
  
  // Past onboarding period, use normal adaptive logic
  return this.calculateAdaptiveNextSync(schedule, changesDetected);
}
```

### Transition to Normal Scheduling

After 24 hours:
- `onboardingUntil` timestamp is in the past
- `calculateNextSync()` uses normal adaptive logic
- Frequency transitions to default (7 days or 24 hours)
- Adaptive scheduling takes over (reduces frequency if no changes)

## Technical Implementation

### Components

**Backend:**
- `src/integrations/google-contacts-oauth-service.ts`: First connection detection and immediate sync
- `src/integrations/google-calendar-oauth-service.ts`: Same for Calendar
- `src/integrations/adaptive-sync-scheduler.ts`: Onboarding frequency logic
- `src/integrations/sync-orchestrator.ts`: Initial sync type handling
- `src/api/routes/sync-status.ts`: Sync status API endpoint

**Frontend:**
- `public/js/onboarding-sync-status.js`: Status display component
- `public/js/onboarding-controller.js`: Onboarding flow integration
- `public/css/onboarding.css`: Styling

**Database:**
- `sync_schedule.onboarding_until`: Tracks onboarding period
- `sync_metrics.sync_type`: Distinguishes initial syncs

### Sync Status Tracking

```typescript
// In SyncOrchestrator.executeSyncJob()
async executeSyncJob(
  userId: string,
  integrationType: 'google_contacts' | 'google_calendar',
  syncType: 'full' | 'incremental' | 'manual' | 'initial' = 'full'
): Promise<void> {
  // Store sync status in memory/Redis
  await this.syncStatusStore.set(`${userId}:${integrationType}`, {
    status: 'in_progress',
    itemsProcessed: 0,
    startedAt: new Date()
  });
  
  try {
    // Execute sync
    const result = await this.executeSync(userId, integrationType, syncType);
    
    // Update status on success
    await this.syncStatusStore.set(`${userId}:${integrationType}`, {
      status: 'completed',
      itemsProcessed: result.itemsProcessed,
      totalItems: result.totalItems,
      startedAt: result.startedAt,
      completedAt: new Date()
    });
  } catch (error) {
    // Update status on failure
    await this.syncStatusStore.set(`${userId}:${integrationType}`, {
      status: 'failed',
      errorMessage: error.message,
      startedAt: result.startedAt,
      completedAt: new Date()
    });
  }
}
```

## Testing

### Manual Testing

See `docs/testing/ONBOARDING_SYNC_TESTING_GUIDE.md` for comprehensive testing procedures.

**Quick Test:**
1. Create new test user
2. Connect Google Contacts
3. Verify immediate sync triggers
4. Verify progress UI shows status
5. Verify data appears within 30 seconds
6. Check sync_schedule.onboarding_until is set
7. Verify next sync scheduled in 1 hour

### Automated Testing

**Test HTML File**: `tests/html/onboarding-sync-test.html`

**Test Cases:**
- First connection detection
- Immediate sync triggering
- Onboarding frequency initialization
- Frequency transition after 24 hours
- Sync status API responses
- Progress UI rendering
- Retry functionality

### Database Verification

```sql
-- Check onboarding schedule
SELECT user_id, integration_type, 
       current_frequency_ms / 1000 / 60 as frequency_minutes,
       onboarding_until,
       next_sync_at
FROM sync_schedule
WHERE user_id = 'test-user-id';

-- Check initial sync was recorded
SELECT sync_type, result, items_processed, created_at
FROM sync_metrics
WHERE user_id = 'test-user-id'
  AND sync_type = 'initial'
ORDER BY created_at DESC
LIMIT 1;
```

## Troubleshooting

### Immediate Sync Not Triggering

**Symptoms:**
- User completes OAuth but no sync happens
- Data doesn't appear after connection
- No `initial` sync in sync_metrics

**Causes:**
- First connection detection failing
- Sync orchestrator error
- Token storage issue

**Solutions:**
1. Check logs for errors during OAuth callback
2. Verify `isFirstConnection()` logic
3. Check sync_metrics table for sync attempts
4. Manually trigger sync via API

**Debug Query:**
```sql
-- Check if sync was attempted
SELECT * FROM sync_metrics
WHERE user_id = 'user-id'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

### Progress UI Not Updating

**Symptoms:**
- UI shows "in progress" indefinitely
- No status updates
- Polling not working

**Causes:**
- Sync status API endpoint error
- Polling interval not started
- CORS issues
- Authentication issues

**Solutions:**
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check authentication token
4. Verify polling interval is running

**Debug:**
```javascript
// In browser console
const response = await fetch('/api/sync/status/user-id/google_contacts');
const status = await response.json();
console.log(status);
```

### Onboarding Frequency Not Applied

**Symptoms:**
- Next sync scheduled in 7 days (not 1 hour)
- onboarding_until is null
- Frequency not transitioning after 24 hours

**Causes:**
- `isFirstConnection` returning false incorrectly
- onboarding_until not set during initialization
- Frequency calculation logic error

**Solutions:**
1. Check sync_schedule.onboarding_until value
2. Verify first connection detection
3. Check frequency calculation logic
4. Manually update onboarding_until if needed

**Debug Query:**
```sql
-- Check onboarding schedule
SELECT user_id, integration_type,
       current_frequency_ms,
       onboarding_until,
       CASE 
         WHEN onboarding_until > NOW() THEN 'In onboarding'
         ELSE 'Past onboarding'
       END as onboarding_status
FROM sync_schedule
WHERE user_id = 'user-id';
```

### Retry Not Working

**Symptoms:**
- Retry button doesn't trigger sync
- Error persists after retry
- No new sync attempt recorded

**Causes:**
- Manual sync API error
- Rate limiting
- Token still invalid
- Circuit breaker blocking

**Solutions:**
1. Check manual sync API response
2. Verify rate limiting not exceeded
3. Check token health status
4. Verify circuit breaker state

**Debug:**
```javascript
// Test manual sync API
const response = await fetch('/api/sync/manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ integrationType: 'google_contacts' })
});
console.log(await response.json());
```

## Best Practices

### For Developers

1. **Always trigger immediate sync on first connection**
2. **Set onboarding_until during initialization**
3. **Use `initial` sync type for first sync**
4. **Implement progress UI for all integrations**
5. **Provide retry functionality on failures**
6. **Test onboarding flow thoroughly**

### For Administrators

1. **Monitor initial sync success rate**
2. **Track onboarding completion rate**
3. **Alert on high initial sync failure rate**
4. **Review onboarding sync metrics weekly**
5. **Ensure onboarding frequencies are appropriate**

### For Users

1. **Wait for sync to complete before navigating away**
2. **Use retry button if sync fails**
3. **Contact support if issues persist**
4. **Expect data within 30 seconds of connection**

## Related Documentation

- **Google Integrations**: `.kiro/steering/google-integrations.md` - Architecture
- **Admin Guide**: `docs/features/google-integrations/ADMIN_GUIDE.md` - Monitoring
- **API Reference**: `docs/API.md` - Sync status endpoint
- **Testing Guide**: `docs/testing/ONBOARDING_SYNC_TESTING_GUIDE.md` - Testing procedures
- **Deployment Guide**: `docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md` - Setup

## Support

For issues or questions:
- Check logs: `logs/sync-orchestrator.log`
- Review sync metrics: `SELECT * FROM sync_metrics WHERE sync_type = 'initial'`
- Test sync status API: `GET /api/sync/status/:userId/:integrationType`
- Contact development team
