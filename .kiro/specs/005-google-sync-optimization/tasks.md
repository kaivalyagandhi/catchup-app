# Implementation Plan: Google Sync Optimization

## Overview

This implementation plan breaks down the Google Sync Optimization feature into discrete, incremental tasks. The approach prioritizes core infrastructure first (token health, circuit breaker), then builds adaptive scheduling and webhooks, and finally adds admin tooling. Each task builds on previous work and includes testing to validate functionality early.

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create migration for admin role support
    - Add is_admin, admin_promoted_at, admin_promoted_by columns to users table
    - Add index on is_admin column
    - _Requirements: 11.1, 11.4_
  
  - [x] 1.2 Create migration for token_health table
    - Create table with user_id, integration_type, status, last_checked, expiry_date, error_message
    - Add indexes for user_integration, status, and expiring tokens
    - _Requirements: 1.5_
  
  - [x] 1.3 Create migration for circuit_breaker_state table
    - Create table with user_id, integration_type, state, failure_count, timestamps
    - Add indexes for user_integration, state, and next_retry
    - _Requirements: 2.6, 2.7_
  
  - [x] 1.4 Create migration for sync_schedule table
    - Create table with user_id, integration_type, frequency settings, timestamps
    - Add indexes for user_integration and next_sync_at
    - _Requirements: 5.6_
  
  - [x] 1.5 Create migration for calendar_webhook_subscriptions table
    - Create table with user_id, channel_id, resource_id, expiration, token
    - Add indexes for channel_id, expiration, and user_id
    - _Requirements: 6.6_
  
  - [x] 1.6 Create migration for sync_metrics table
    - Create table for tracking sync results, duration, API calls saved
    - Add indexes for user_integration, created_at, and result
    - _Requirements: 10.5_

- [x] 2. Token Health Monitor implementation
  - [x] 2.1 Create TokenHealthMonitor class with core methods
    - Implement checkTokenHealth() to validate tokens before sync
    - Implement markTokenInvalid() for error handling
    - Implement getTokenHealth() for status retrieval
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [x]* 2.2 Write property tests for token health monitor
    - **Property 2: Token expiry classification**
    - **Property 3: Token error handling**
    - **Property 4: Token health persistence**
    - **Validates: Requirements 1.2, 1.3, 1.5**
  
  - [x] 2.3 Implement proactive token refresh logic
    - Create refreshExpiringTokens() method
    - Integrate with existing GoogleContactsOAuthService
    - Handle refresh success and failure cases
    - _Requirements: 8.1, 8.3, 8.4_
  
  - [x]* 2.4 Write property tests for token refresh
    - **Property 36: Proactive token refresh**
    - **Property 37: Token refresh success handling**
    - **Property 38: Token refresh failure handling**
    - **Validates: Requirements 8.1, 8.3, 8.4**
  
  - [x] 2.5 Implement token health event emission
    - Emit token_health_changed events on status transitions
    - Integrate with notification service
    - _Requirements: 1.6, 4.1_
  
  - [x]* 2.6 Write property test for event emission
    - **Property 5: Token health event emission**
    - **Validates: Requirements 1.6**

- [x] 3. Circuit Breaker Manager implementation
  - [x] 3.1 Create CircuitBreakerManager class with state management
    - Implement canExecuteSync() to check if sync should proceed
    - Implement recordSuccess() and recordFailure() for state updates
    - Implement getState() for status retrieval
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  
  - [x]* 3.2 Write property tests for circuit breaker
    - **Property 6: Circuit breaker threshold**
    - **Property 7: Circuit breaker blocks execution when open**
    - **Property 9: Circuit breaker recovery**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**
  
  - [x] 3.3 Implement circuit breaker timeout and state transitions
    - Handle open → half_open transition after timeout
    - Handle half_open → closed/open based on sync result
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [x]* 3.4 Write property test for timeout transition
    - **Property 8: Circuit breaker timeout transition**
    - **Validates: Requirements 2.3**
  
  - [x] 3.5 Implement state isolation per user and integration
    - Ensure Contacts and Calendar have separate circuit breakers
    - Test that failures in one don't affect the other
    - _Requirements: 2.6_
  
  - [x]* 3.6 Write property test for state isolation
    - **Property 10: Circuit breaker state isolation**
    - **Validates: Requirements 2.6**
  
  - [x] 3.7 Add circuit breaker audit logging
    - Log all state transitions with timestamps
    - Include user_id, integration_type, old_state, new_state
    - _Requirements: 2.7_
  
  - [x]* 3.8 Write property test for audit logging
    - **Property 11: Circuit breaker audit logging**
    - **Validates: Requirements 2.7**

- [x] 4. Checkpoint - Ensure token health and circuit breaker tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Adaptive Sync Scheduler implementation
  - [x] 5.1 Create AdaptiveSyncScheduler class with frequency management
    - Implement calculateNextSync() with adaptive logic
    - Implement getSchedule() for current schedule retrieval
    - Implement resetToDefault() for frequency restoration
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x]* 5.2 Write property tests for adaptive scheduling
    - **Property 20: Adaptive frequency reduction**
    - **Property 21: Adaptive frequency restoration**
    - **Property 22: Frequency bounds enforcement**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
  
  - [x] 5.3 Implement exponential backoff calculation
    - Calculate backoff delays: 5min, 10min, 20min, 40min, etc.
    - Cap maximum delay at 24 hours
    - Reset on successful sync
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  
  - [x]* 5.4 Write property tests for exponential backoff
    - **Property 12: Exponential backoff calculation**
    - **Property 13: Backoff upper bound**
    - **Property 14: Backoff reset on success**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5**
  
  - [x] 5.5 Implement getUsersDueForSync() for job scheduling
    - Query sync_schedule table for users with next_sync_at <= now
    - Filter by integration type
    - Return list of user IDs
    - _Requirements: 5.1, 5.2_
  
  - [x] 5.6 Implement manual sync isolation
    - Ensure manual syncs don't affect consecutive_no_changes counter
    - Ensure manual syncs don't change next_sync_at
    - _Requirements: 5.7, 7.6_
  
  - [x]* 5.7 Write property test for manual sync isolation
    - **Property 24: Manual sync isolation**
    - **Validates: Requirements 5.7, 7.6**
  
  - [x] 5.8 Add schedule persistence
    - Store frequency changes to sync_schedule table
    - Update consecutive_no_changes counter
    - _Requirements: 5.6_
  
  - [x]* 5.9 Write property test for schedule persistence
    - **Property 15: Backoff persistence**
    - **Property 23: Frequency persistence**
    - **Validates: Requirements 3.6, 5.6**

- [x] 6. Sync Orchestration Layer
  - [x] 6.1 Create SyncOrchestrator class to coordinate all components
    - Integrate TokenHealthMonitor, CircuitBreakerManager, AdaptiveSyncScheduler
    - Implement executeSyncJob() that checks all conditions before sync
    - Handle sync results and update all components
    - _Requirements: 1.1, 1.4, 2.2, 5.1, 5.2_
  
  - [ ]* 6.2 Write property test for sync orchestration
    - **Property 1: Token validation prevents invalid API calls**
    - **Validates: Requirements 1.1, 1.4**
  
  - [x] 6.3 Wrap existing GoogleContactsSyncService calls
    - Add orchestration layer before performFullSync() and performIncrementalSync()
    - Preserve existing sync logic
    - Record metrics after sync completion
    - _Requirements: 1.1, 2.2, 5.1_
  
  - [x] 6.4 Wrap existing GoogleCalendarService calls
    - Add orchestration layer before forceRefreshCalendarEvents()
    - Preserve existing sync logic
    - Record metrics after sync completion
    - _Requirements: 1.1, 2.2, 5.1_
  
  - [x] 6.5 Implement sync metrics recording
    - Record sync_type, result, duration, items_processed, api_calls_saved
    - Store in sync_metrics table
    - Calculate API calls saved by circuit breaker and adaptive scheduling
    - _Requirements: 10.5_

- [x] 7. Checkpoint - Ensure sync orchestration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Notification Service integration
  - [x] 8.1 Create notification templates for token issues
    - Template for "token_invalid" with re-auth link
    - Template for "token_expiring_soon" reminder
    - Include integration type in notification
    - _Requirements: 4.1, 4.2, 4.6_
  
  - [ ]* 8.2 Write property tests for notifications
    - **Property 16: Notification creation on token failure**
    - **Property 17: Notification completeness**
    - **Validates: Requirements 4.1, 4.2, 4.6**
  
  - [x] 8.3 Implement notification reminder logic
    - Check for unresolved token_invalid notifications older than 7 days
    - Send reminder notifications
    - _Requirements: 4.3_
  
  - [ ]* 8.4 Write property test for notification reminders
    - **Property 18: Notification reminders**
    - **Validates: Requirements 4.3**
  
  - [x] 8.5 Implement notification cleanup on re-authentication
    - Clear all token_invalid notifications when user re-authenticates
    - Mark as resolved or delete
    - _Requirements: 4.4_
  
  - [ ]* 8.6 Write property test for notification cleanup
    - **Property 19: Notification cleanup**
    - **Validates: Requirements 4.4**

- [x] 9. Calendar Webhook Manager implementation
  - [x] 9.1 Create CalendarWebhookManager class with registration logic
    - Implement registerWebhook() to call Google Calendar API watch endpoint
    - Generate unique channel_id and verification token
    - Store subscription in calendar_webhook_subscriptions table
    - _Requirements: 6.1, 6.6_
  
  - [ ]* 9.2 Write property tests for webhook registration
    - **Property 25: Webhook registration on connection**
    - **Property 30: Webhook persistence**
    - **Validates: Requirements 6.1, 6.6**
  
  - [x] 9.3 Create webhook notification endpoint
    - Create POST /api/webhooks/calendar route
    - Validate X-Goog-Channel-ID and X-Goog-Resource-ID headers
    - Validate channel_id and resource_id against database
    - _Requirements: 6.7_
  
  - [ ]* 9.4 Write property test for webhook validation
    - **Property 31: Webhook validation**
    - **Validates: Requirements 6.7**
  
  - [x] 9.5 Implement webhook notification handling
    - Trigger immediate incremental sync on "exists" notification
    - Ignore "sync" notifications (initial confirmation)
    - Log all webhook notifications
    - _Requirements: 6.2_
  
  - [ ]* 9.6 Write property test for webhook handling
    - **Property 26: Webhook notification handling**
    - **Validates: Requirements 6.2**
  
  - [x] 9.7 Implement webhook frequency adjustment
    - Set calendar polling to 8 hours when webhook is active
    - Fall back to 4 hours when webhook registration fails
    - _Requirements: 6.3, 6.5_
  
  - [ ]* 9.8 Write property tests for frequency adjustment
    - **Property 27: Webhook frequency adjustment**
    - **Property 29: Webhook fallback**
    - **Validates: Requirements 6.3, 6.5**
  
  - [x] 9.9 Implement webhook renewal logic
    - Check for webhooks expiring within 24 hours
    - Call Google Calendar API to renew subscription
    - Update expiration in database
    - _Requirements: 6.4_
  
  - [ ]* 9.10 Write property test for webhook renewal
    - **Property 28: Webhook renewal**
    - **Validates: Requirements 6.4**
  
  - [x] 9.11 Implement stopWebhook() for disconnection
    - Call Google Calendar API stop endpoint
    - Delete subscription from database
    - Restore normal polling frequency
    - _Requirements: 6.5_

- [x] 10. Checkpoint - Ensure webhook tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 11. Manual Sync functionality
  - [x] 11.1 Create manual sync API endpoint
    - Create POST /api/sync/manual route
    - Accept integration_type parameter (contacts or calendar)
    - Trigger immediate sync via SyncOrchestrator
    - _Requirements: 7.1_
  
  - [ ]* 11.2 Write property test for manual sync triggering
    - **Property 32: Manual sync triggering**
    - **Validates: Requirements 7.1**
  
  - [x] 11.3 Implement circuit breaker bypass for manual syncs
    - Allow manual syncs even when circuit breaker is open
    - Mark sync as "manual" type in metrics
    - _Requirements: 7.2_
  
  - [ ]* 11.4 Write property test for circuit breaker bypass
    - **Property 33: Manual sync circuit breaker bypass**
    - **Validates: Requirements 7.2**
  
  - [x] 11.5 Implement manual sync error handling
    - Return error response with re-auth link on token failure
    - Return user-friendly error messages
    - _Requirements: 7.3_
  
  - [ ]* 11.6 Write property test for manual sync error handling
    - **Property 34: Manual sync error handling**
    - **Validates: Requirements 7.3**
  
  - [x] 11.7 Implement rate limiting for manual syncs
    - Limit to 1 request per minute per user per integration
    - Return 429 Too Many Requests if exceeded
    - _Requirements: 7.4_
  
  - [ ]* 11.8 Write property test for rate limiting
    - **Property 35: Manual sync rate limiting**
    - **Validates: Requirements 7.4**

- [x] 12. Graceful Degradation features
  - [x] 12.1 Implement cached data availability
    - Return cached data when sync is unavailable
    - Include last_updated timestamp in response
    - _Requirements: 9.2, 9.4_
  
  - [ ]* 12.2 Write property tests for cached data
    - **Property 41: Cached data availability**
    - **Property 42: Cached data timestamps**
    - **Validates: Requirements 9.2, 9.4**
  
  - [x] 12.3 Add warning banner to UI
    - Display banner when sync is unavailable
    - Show last successful sync time
    - Include "Reconnect" button with re-auth link
    - _Requirements: 9.1, 9.6_

- [x] 13. Admin Role Management
  - [x] 13.1 Create admin middleware
    - Implement requireAdmin() middleware
    - Verify JWT token validity
    - Check is_admin flag in users table
    - Return 403 Forbidden for non-admins
    - _Requirements: 11.2, 11.3, 11.6_
  
  - [ ]* 13.2 Write property tests for admin middleware
    - **Property 45: Admin role-based access control**
    - **Property 46: Admin middleware authentication**
    - **Validates: Requirements 11.2, 11.3, 11.6**
  
  - [x] 13.3 Implement admin access audit logging
    - Log all access attempts to admin endpoints
    - Include user_id, endpoint, outcome, timestamp
    - _Requirements: 11.7_
  
  - [ ]* 13.4 Write property test for admin audit logging
    - **Property 47: Admin access audit logging**
    - **Validates: Requirements 11.7**
  
  - [x] 13.5 Create CLI script for promoting users to admin
    - Create scripts/promote-admin.ts
    - Accept email as command-line argument
    - Update is_admin, admin_promoted_at, admin_promoted_by in database
    - Add commands: promote, revoke, list
    - _Requirements: 11.5_
  
  - [x]* 13.6 Write unit test for CLI script
    - Test promote command updates database correctly
    - Test revoke command removes admin access
    - Test list command returns all admins
    - **Validates: Requirements 11.5**

- [x] 14. Sync Health Dashboard backend
  - [x] 14.1 Create SyncHealthService class
    - Implement getHealthMetrics() to aggregate all metrics
    - Query token_health, circuit_breaker_state, sync_metrics tables
    - Calculate success rates and API calls saved
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 14.2 Write property tests for dashboard metrics
    - **Property 43: Dashboard metric accuracy**
    - **Property 44: Dashboard persistent failures query**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.8**
  
  - [x] 14.3 Create admin sync health API endpoint
    - Create GET /api/admin/sync-health route
    - Protect with requireAdmin middleware
    - Accept integration_type filter parameter
    - Return SyncHealthMetrics object
    - _Requirements: 10.1, 10.6_
  
  - [x] 14.4 Implement getUserSyncStatus() for detailed view
    - Return token health, circuit breaker state, sync schedule for a user
    - Include webhook status for calendar
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 15. Sync Health Dashboard frontend
  - [x] 15.1 Create admin sync health HTML page
    - Create public/admin/sync-health.html
    - Display all metrics from SyncHealthMetrics
    - Add filter dropdown for integration type
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 15.2 Implement auto-refresh functionality
    - Refresh metrics every day
    - Show last refresh timestamp
    - Add manual refresh button
    - _Requirements: 10.7_
  
  - [x] 15.3 Create persistent failures table
    - Display users with sync failures >7 days
    - Show user email, integration type, last success, error message
    - Add "View Details" link for each user
    - _Requirements: 10.8_
  
  - [x] 15.4 Add API calls saved visualization
    - Show breakdown by optimization type (circuit breaker, adaptive, webhooks)
    - Display total API calls saved
    - Add percentage saved vs. total calls
    - _Requirements: 10.5_
  
  - [x] 15.5 Add CSV export functionality
    - Export all metrics to CSV file
    - Include timestamp in filename
    - _Requirements: 10.6_

- [x] 16. Checkpoint - Ensure admin dashboard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Background Jobs and Cron Setup
  - [x] 17.1 Create token refresh cron job
    - Run TokenHealthMonitor.refreshExpiringTokens() daily
    - Log refresh results
    - Alert on high failure rate
    - _Requirements: 8.2_
  
  - [x] 17.2 Create webhook renewal cron job
    - Run CalendarWebhookManager.renewExpiringWebhooks() daily
    - Log renewal results
    - Alert on high failure rate
    - _Requirements: 6.4_
  
  - [x] 17.3 Create notification reminder cron job
    - Check for unresolved token_invalid notifications >7 days
    - Send reminder notifications
    - Run daily
    - _Requirements: 4.3_
  
  - [x] 17.4 Migrate existing sync cron jobs to adaptive scheduler
    - Replace fixed cron schedules with AdaptiveSyncScheduler.getUsersDueForSync()
    - Run scheduler every 12 hours to check for due syncs
    - Execute syncs via SyncOrchestrator
    - _Requirements: 5.1, 5.2_
  
  - [x] 17.5 Add job monitoring and alerting
    - Track job execution duration
    - Alert on job failures
    - Monitor queue backlog
    - _Requirements: 10.4_

- [x] 18. Integration with existing services
  - [x] 18.1 Update Google Calendar connection flow
    - Add webhook registration after successful OAuth
    - Handle webhook registration failures gracefully
    - Update calendar sync frequency based on webhook status
    - _Requirements: 6.1, 6.3, 6.5_
  
  - [x] 18.2 Update Google Contacts connection flow
    - Initialize sync schedule with default frequency
    - Initialize circuit breaker in closed state
    - Run initial token health check
    - _Requirements: 5.1, 2.1, 1.1_
  
  - [x] 18.3 Update disconnection flows
    - Stop webhooks when calendar is disconnected
    - Clean up sync schedule entries
    - Reset circuit breaker state
    - Clear token health records
    - _Requirements: 6.1, 5.1, 2.1, 1.1_
  
  - [x] 18.4 Add "Sync Now" button to UI
    - Add button to calendar and contacts pages
    - Call manual sync API endpoint
    - Show loading indicator during sync
    - Display success/error messages
    - _Requirements: 7.1, 7.5_

- [x] 19. Documentation and deployment
  - [x] 19.1 Create API documentation for new endpoints
    - Document POST /api/sync/manual
    - Document POST /api/webhooks/calendar
    - Document GET /api/admin/sync-health
    - Add to docs/API.md
    - _Requirements: 7.1, 6.2, 10.1_
  
  - [x] 19.2 Create admin user guide
    - Document how to promote users to admin
    - Document how to use sync health dashboard
    - Document how to interpret metrics
    - Create docs/features/google-integrations/ADMIN_GUIDE.md
    - _Requirements: 11.5, 10.1_
  
  - [x] 19.3 Update Google integrations documentation
    - Document new sync optimization features
    - Document webhook setup and troubleshooting
    - Document adaptive scheduling behavior
    - Update .kiro/steering/google-integrations.md
    - _Requirements: 6.1, 5.1_
  
  - [x] 19.4 Create deployment checklist
    - List all database migrations in order
    - List all environment variables needed
    - List all cron jobs to configure
    - Document rollback procedure
    - Create docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md
    - _Requirements: All_
  
  - [x] 19.5 Create monitoring and alerting guide
    - Document metrics to track
    - Document alerts to configure
    - Document dashboard usage
    - Create docs/features/google-integrations/MONITORING.md
    - _Requirements: 10.1, 10.4, 10.5_

- [x] 20. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Manual testing validates UI and user experience


---

## Phase 2: Sync Frequency Updates (Approved 2026-02-04)

**Context**: Update sync frequencies to reduce API usage by 70-85% while maintaining reliability through onboarding mitigations and enhanced webhook monitoring.

**Reference Documents**:
- `SYNC_FREQUENCY_FINAL_CONFIG.md` - Complete approved configuration
- `SYNC_FREQUENCY_UPDATE_PLAN.md` - Detailed implementation plan

### New Frequencies
- **Contacts**: 7-day default, 30-day min, 1-day max, 1-hour onboarding
- **Calendar**: 24-hour default, 24-hour min, 4-hour max, 12-hour webhook fallback, 2-hour onboarding
- **Background Jobs**: Daily adaptive sync, 12-hour webhook health checks
- **Dashboard**: Daily auto-refresh

- [x] 21. Update Frequency Constants
  - [x] 21.1 Update SYNC_FREQUENCIES in AdaptiveSyncScheduler
    - Update contacts: default 7d, min 30d, max 1d
    - Add contacts onboarding: 1h
    - Update calendar: default 24h, min 24h, max 4h, webhookFallback 12h
    - Add calendar onboarding: 2h
    - File: `src/integrations/adaptive-sync-scheduler.ts`
    - _Reference: SYNC_FREQUENCY_FINAL_CONFIG.md Section "Sync Frequencies"_
  
  - [x] 21.2 Update background job schedules
    - Update adaptive sync job: 12h → 24h (daily)
    - Add webhook health check job: 12h interval
    - File: `src/jobs/job-scheduler.ts`
    - _Reference: SYNC_FREQUENCY_FINAL_CONFIG.md Section "Background Jobs"_
  
  - [x] 21.3 Update dashboard auto-refresh
    - Update auto-refresh: 5min → 24h (daily)
    - Keep manual refresh button functional
    - File: `public/js/sync-health-dashboard.js`
    - _Reference: SYNC_FREQUENCY_FINAL_CONFIG.md Section "Dashboard"_
  
  - [x] 21.4 Update documentation with new frequencies
    - Update `.kiro/steering/google-integrations.md` Section 4
    - Update `SYNC_OPTIMIZATION_SUMMARY.md`
    - Update `docs/features/google-integrations/ADMIN_GUIDE.md`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Documentation Updates"_

- [x] 22. Database Migration for Onboarding Support
  - [x] 22.1 Create migration for onboarding_until column
    - Add `onboarding_until TIMESTAMP` to sync_schedule table
    - This tracks when onboarding period ends (24h after first connection)
    - File: `scripts/migrations/045_add_onboarding_until_to_sync_schedule.sql`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 3: Onboarding-Specific Frequency"_
  
  - [x] 22.2 Run migration and verify
    - Execute migration: `npm run migrate`
    - Verify column exists: `\d sync_schedule`
    - Test with sample data

- [x] 23. Onboarding Mitigation - Immediate First Sync
  - [x] 23.1 Add isFirstConnection helper method
    - Check if user has any sync history for integration type
    - Return true if no previous syncs exist
    - File: `src/integrations/adaptive-sync-scheduler.ts` or create `src/integrations/onboarding-helper.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 1: Immediate First Sync"_
  
  - [x] 23.2 Update GoogleContactsOAuthService connection handler
    - After storing tokens, check if first connection
    - If first connection, trigger immediate sync with `syncType: 'initial'`
    - File: `src/integrations/google-contacts-oauth-service.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 1: Immediate First Sync"_
  
  - [x] 23.3 Update GoogleCalendarOAuthService connection handler
    - After storing tokens, check if first connection
    - If first connection, trigger immediate sync with `syncType: 'initial'`
    - File: `src/integrations/google-calendar-oauth-service.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 1: Immediate First Sync"_
  
  - [x] 23.4 Update SyncOrchestrator to support initial sync type
    - Add support for `syncType: 'initial'` parameter
    - Allow bypassing schedule for initial syncs
    - File: `src/integrations/sync-orchestrator.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 1: Immediate First Sync"_

- [x] 24. Onboarding Mitigation - Progress UI with Retry
  - [x] 24.1 Create sync status API endpoint
    - Create GET `/api/sync/status/:userId/:integrationType`
    - Return: sync status (in_progress, completed, failed), items processed, error message
    - File: `src/api/routes/sync-status.ts` (new)
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 2: Onboarding Progress UI with Retry"_
  
  - [x] 24.2 Add sync status tracking to SyncOrchestrator
    - Store sync status in memory or Redis (in_progress, completed, failed)
    - Update status as sync progresses
    - Include item count and error messages
    - File: `src/integrations/sync-orchestrator.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 2: Onboarding Progress UI with Retry"_
  
  - [x] 24.3 Create onboarding sync status UI component
    - Add sync status display to onboarding flow
    - Show spinner during sync (in_progress)
    - Show success message with count (completed)
    - Show error message with retry button (failed)
    - File: `public/js/onboarding-sync-status.js` (new)
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 2: Onboarding Progress UI with Retry"_
  
  - [x] 24.4 Integrate sync status into onboarding controller
    - After OAuth callback, show sync status component
    - Poll `/api/sync/status` every 2 seconds
    - Update UI based on status
    - Handle retry button click → trigger manual sync
    - File: `public/js/onboarding-controller.js`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 2: Onboarding Progress UI with Retry"_
  
  - [x] 24.5 Add sync status styles
    - Style spinner, success checkmark, error icon
    - Style retry button
    - Ensure mobile responsiveness
    - File: `public/css/onboarding.css`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 2: Onboarding Progress UI with Retry"_

- [x] 25. Onboarding Mitigation - Onboarding-Specific Frequency
  - [x] 25.1 Update AdaptiveSyncScheduler.initialize()
    - Check if first connection using isFirstConnection()
    - If first connection, use onboarding frequency (1h contacts, 2h calendar)
    - Set onboardingUntil to 24 hours from now
    - If not first connection, use default frequency
    - File: `src/integrations/adaptive-sync-scheduler.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 3: Onboarding-Specific Frequency"_
  
  - [x] 25.2 Update AdaptiveSyncScheduler.calculateNextSync()
    - Check if current time < onboardingUntil
    - If in onboarding period, use onboarding frequency
    - If past onboarding period, use normal adaptive logic
    - File: `src/integrations/adaptive-sync-scheduler.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 3: Onboarding-Specific Frequency"_
  
  - [x] 25.3 Test onboarding frequency transition
    - Create test user, connect integration
    - Verify 1h/2h frequency for first 24 hours
    - Mock time to 25 hours later
    - Verify transition to default frequency (7d/24h)
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Phase 4: Testing"_

- [x] 26. Checkpoint - Test Onboarding Mitigations
  - [x] 26.1 Test immediate first sync
    - Connect new Google Contacts integration
    - Verify sync triggers immediately
    - Verify contacts appear in UI within 1 minute
  
  - [x] 26.2 Test onboarding progress UI
    - Connect new integration
    - Verify spinner appears
    - Verify success message shows contact count
    - Simulate sync failure, verify retry button works
  
  - [x] 26.3 Test onboarding frequency
    - Connect new integration
    - Verify next sync scheduled in 1h (contacts) or 2h (calendar)
    - Wait 24 hours (or mock time)
    - Verify frequency transitions to 7d (contacts) or 24h (calendar)

- [x] 27. Enhanced Webhook Monitoring - Database Schema
  - [x] 27.1 Create webhook_notifications table migration
    - Track all webhook notifications received
    - Columns: id, user_id, channel_id, resource_id, resource_state, result, error_message, created_at
    - Indexes: created_at, result
    - File: `scripts/migrations/046_create_webhook_notifications_table.sql`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "2. Webhook Failure Alerts"_
  
  - [x] 27.2 Run migration and verify
    - Execute migration: `npm run migrate`
    - Verify table exists: `\dt webhook_notifications`
    - Test with sample data

- [x] 28. Enhanced Webhook Monitoring - Health Check Job
  - [x] 28.1 Create WebhookHealthCheckProcessor
    - Check all active webhook subscriptions
    - Alert if no notifications in 48 hours
    - Attempt to re-register broken webhooks
    - Check for webhooks expiring within 24 hours
    - File: `src/jobs/processors/webhook-health-check-processor.ts` (new)
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "1. Webhook Health Check Job"_
  
  - [x] 28.2 Create WebhookHealthRepository
    - Method to get last notification timestamp for user
    - Method to get all active subscriptions
    - Method to track notification events
    - File: `src/integrations/webhook-health-repository.ts` (new)
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "1. Webhook Health Check Job"_
  
  - [x] 28.3 Register webhook health check job
    - Schedule to run every 12 hours
    - Add to job scheduler
    - File: `src/jobs/job-scheduler.ts`
    - _Reference: SYNC_FREQUENCY_FINAL_CONFIG.md Section "Background Jobs"_
  
  - [x] 28.4 Test webhook health check job
    - Create test webhook subscription
    - Mock no notifications for 48+ hours
    - Verify alert is triggered
    - Verify re-registration is attempted

- [x] 29. Enhanced Webhook Monitoring - Failure Alerts
  - [x] 29.1 Create WebhookMetricsService
    - Calculate webhook failure rate over last 24 hours
    - Query webhook_notifications table
    - Return success count, failure count, total count
    - File: `src/integrations/webhook-metrics-service.ts` (new)
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "2. Webhook Failure Alerts"_
  
  - [x] 29.2 Add failure rate tracking to WebhookManager
    - Call WebhookMetricsService after each notification
    - If failure rate > 5%, send admin alert
    - File: `src/integrations/calendar-webhook-manager.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "2. Webhook Failure Alerts"_
  
  - [x] 29.3 Update webhook notification handler to log results
    - Log all webhook notifications to webhook_notifications table
    - Include result (success, failure, ignored)
    - Include error message if failure
    - File: `src/api/routes/calendar-webhooks.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "2. Webhook Failure Alerts"_
  
  - [x] 29.4 Test webhook failure alerts
    - Simulate 10 webhook notifications with 6+ failures
    - Verify failure rate > 5%
    - Verify admin alert is sent

- [x] 30. Enhanced Webhook Monitoring - Registration Retry
  - [x] 30.1 Add retry logic to CalendarWebhookManager.registerWebhook()
    - Retry up to 3 times on failure
    - Exponential backoff: 2s, 4s, 8s
    - Log each attempt
    - Fall back to polling if all retries fail
    - File: `src/integrations/calendar-webhook-manager.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "3. Webhook Registration Retry Logic"_
  
  - [x] 30.2 Add webhook event logging
    - Log registration_success, registration_failure events
    - Include attempt number and error message
    - File: `src/integrations/calendar-webhook-manager.ts`
    - _Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "3. Webhook Registration Retry Logic"_
  
  - [x] 30.3 Test webhook registration retry
    - Mock Google Calendar API to fail first 2 attempts
    - Verify 3 attempts are made with exponential backoff
    - Verify success on 3rd attempt
    - Mock all 3 attempts to fail
    - Verify fallback to polling mode

- [x] 31. Checkpoint - Test Enhanced Webhook Monitoring
  - [x] 31.1 Test webhook health check job
    - Create webhook subscription
    - Don't send notifications for 48+ hours
    - Verify health check detects issue
    - Verify re-registration is attempted
  
  - [x] 31.2 Test webhook failure alerts
    - Simulate high failure rate (>5%)
    - Verify admin alert is sent
    - Verify metrics are tracked correctly
  
  - [x] 31.3 Test webhook registration retry
    - Simulate registration failures
    - Verify retry logic with exponential backoff
    - Verify fallback to polling after 3 failures

- [x] 32. Update Documentation
  - [x] 32.1 Update google-integrations.md
    - Update Section 4 with new frequencies
    - Document onboarding mitigations
    - Document enhanced webhook monitoring
    - File: `.kiro/steering/google-integrations.md`
  
  - [x] 32.2 Update ADMIN_GUIDE.md
    - Document new webhook monitoring features
    - Document how to interpret webhook health metrics
    - Document troubleshooting steps for webhook failures
    - File: `docs/features/google-integrations/ADMIN_GUIDE.md`
  
  - [x] 32.3 Create ONBOARDING_SYNC.md
    - Document onboarding sync behavior
    - Document immediate first sync
    - Document onboarding-specific frequencies
    - Document progress UI and retry functionality
    - File: `docs/features/google-integrations/ONBOARDING_SYNC.md` (new)
  
  - [x] 32.4 Update API.md
    - Document GET `/api/sync/status/:userId/:integrationType`
    - Update existing sync endpoints with new behavior
    - File: `docs/API.md`

- [x] 33. Final Testing and Verification
  - [x] 33.1 End-to-end onboarding test
    - New user connects Google Contacts
    - Verify immediate sync
    - Verify progress UI
    - Verify 1-hour frequency for 24 hours
    - Verify transition to 7-day frequency
  
  - [x] 33.2 End-to-end calendar webhook test
    - New user connects Google Calendar
    - Verify webhook registration with retry
    - Verify 12-hour fallback polling
    - Make calendar change in Google
    - Verify webhook notification triggers sync
    - Verify webhook health check runs every 12 hours
  
  - [x] 33.3 Monitor API usage reduction
    - Track API calls before and after deployment
    - Verify 70-85% reduction in total API calls
    - Verify contacts: ~57% reduction
    - Verify calendar: ~83% reduction
  
  - [x] 33.4 Monitor user experience
    - Track onboarding sync success rate (target >95%)
    - Track webhook reliability (target >95%)
    - Monitor user complaints about stale data
    - Track manual sync usage

- [x] 34. Deployment
  - [x] 34.1 Deploy to staging environment
    - Run all migrations
    - Update environment variables if needed
    - Restart services
    - Verify all features work
  
  - [x] 34.2 Monitor staging for 48 hours
    - Check webhook health
    - Check onboarding success rate
    - Check API usage reduction
    - Check for errors in logs
  
  - [x] 34.3 Deploy to production
    - Run all migrations
    - Update environment variables if needed
    - Restart services
    - Monitor closely for first 24 hours
  
  - [x] 34.4 Post-deployment monitoring
    - Track success metrics for 2 weeks
    - Be ready to rollback if issues arise
    - Document any issues and resolutions

## Notes for Phase 2

- **Reference Documents**: Always refer to `SYNC_FREQUENCY_FINAL_CONFIG.md` for approved configuration
- **Testing**: Test each phase thoroughly before moving to next phase
- **Rollback**: Keep rollback plan ready (revert frequency constants, restart jobs)
- **Monitoring**: Monitor API usage, webhook reliability, and user feedback closely
- **Incremental**: Deploy in phases (frequencies → onboarding → webhooks)
