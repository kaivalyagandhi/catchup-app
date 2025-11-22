# Background Jobs and Scheduling - Implementation Summary

## Overview

Implemented a comprehensive background job processing system using Bull and Redis for the CatchUp application. The system handles three main recurring tasks: suggestion generation, batch notifications, and calendar synchronization.

## Implementation Details

### Task 13.1: Set up job queue with Bull ✅

**Files Created:**
- `src/jobs/queue.ts` - Bull queue configuration with Redis
- `src/jobs/types.ts` - TypeScript types for job data and results
- `src/integrations/oauth-repository.ts` - OAuth token storage and retrieval

**Key Features:**
- Three separate queues: suggestion-generation, batch-notifications, calendar-sync
- Exponential backoff retry strategy (3 attempts, starting at 2 seconds)
- Automatic cleanup of completed jobs
- Error logging and monitoring
- Graceful shutdown support

**Configuration:**
```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false, // Keep for debugging
}
```

### Task 13.2: Implement suggestion generation job ✅

**Files Created:**
- `src/jobs/processors/suggestion-generation-processor.ts`

**Functionality:**
- Runs every 6 hours
- Processes users in batches of 50
- Generates suggestions for next 14 days
- Fetches available time slots from Google Calendar
- Creates timebound suggestions based on frequency preferences
- Handles errors gracefully and continues processing

**Requirements Satisfied:** 9.1-11.4

### Task 13.3: Implement batch notification job ✅

**Files Created:**
- `src/jobs/processors/batch-notification-processor.ts`

**Functionality:**
- Scheduled based on user preferences (default: Sunday 9am)
- Sends notifications for pending suggestions without calendar events
- Supports SMS and email delivery channels
- Tracks delivery status (success/failed/skipped)
- Respects user notification preferences
- Handles errors per suggestion without failing entire batch

**Requirements Satisfied:** 12.1-12.5

### Task 13.4: Implement calendar sync job ✅

**Files Created:**
- `src/jobs/processors/calendar-sync-processor.ts`

**Functionality:**
- Runs every 30 minutes per user
- Syncs calendar list from Google
- Fetches events from selected calendars
- Updates availability predictions
- Handles OAuth token refresh
- Estimates events processed for monitoring

**Requirements Satisfied:** 7.8, 8.1

### Additional Infrastructure

**Worker Management:**
- `src/jobs/worker.ts` - Registers processors and handles job execution
- `src/jobs/scheduler.ts` - Manages recurring job schedules
- `src/jobs/index.ts` - Module exports

**Scheduler Features:**
- `initializeScheduler()` - Set up all recurring jobs on startup
- `scheduleUserBatchNotification(userId)` - Schedule per-user notifications
- `scheduleUserCalendarSync(userId)` - Schedule per-user calendar sync
- `clearAllSchedules()` - Clear all scheduled jobs (for maintenance)

**Documentation:**
- `src/jobs/README.md` - Comprehensive module documentation
- `src/jobs/example-usage.ts` - Usage examples and patterns
- `src/jobs/IMPLEMENTATION_SUMMARY.md` - This file

**Testing:**
- `src/jobs/queue.test.ts` - Queue configuration tests

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Job Scheduler                         │
│  - Manages recurring job schedules                       │
│  - Handles user-specific scheduling                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Bull Queues                           │
│  - suggestion-generation (every 6 hours)                 │
│  - batch-notifications (per user preferences)            │
│  - calendar-sync (every 30 minutes per user)             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Job Processors                         │
│  - Process jobs from queues                              │
│  - Implement retry logic with exponential backoff        │
│  - Track results and errors                              │
└─────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Added to `.env.example`:
```bash
# Redis Configuration (for job queue and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379
```

### Job Schedules

1. **Suggestion Generation**: Every 6 hours
   - Processes all users with Google Calendar connected
   - Generates suggestions for next 14 days
   - Batches users in groups of 50

2. **Batch Notifications**: Per user preferences
   - Default: Sunday at 9am local time
   - Configurable day of week and time
   - Respects user timezone

3. **Calendar Sync**: Every 30 minutes per user
   - Syncs calendar list from Google
   - Fetches events for next 30 days
   - Updates availability predictions

## Error Handling

### Retry Strategy
- 3 attempts with exponential backoff
- First retry: 2 seconds
- Second retry: 4 seconds
- Third retry: 8 seconds
- Failed jobs kept for debugging

### Error Recovery
- OAuth token errors: Skip user and continue
- API failures: Retry with backoff
- Database errors: Propagate to fail job for retry
- Per-user errors don't fail entire batch

## Usage Examples

### Starting the System

```typescript
import { startWorker, initializeScheduler } from './jobs';

// Start processing jobs
startWorker();

// Set up all recurring jobs
await initializeScheduler();
```

### User-Specific Scheduling

```typescript
import {
  scheduleUserBatchNotification,
  scheduleUserCalendarSync,
} from './jobs';

// When user connects Google Calendar
await scheduleUserCalendarSync(userId);

// When user updates notification preferences
await scheduleUserBatchNotification(userId);
```

### Manual Job Triggering

```typescript
import { suggestionGenerationQueue } from './jobs';

// Trigger suggestion generation immediately
await suggestionGenerationQueue.add({
  batchSize: 50,
  offset: 0,
});
```

## Testing

All tests pass successfully:
- Queue configuration tests
- Type checking passes
- Integration with existing services verified

## Dependencies

- **Bull**: Job queue implementation
- **ioredis**: Redis client
- **Redis**: Message broker and job storage (external)

## Future Enhancements

- [ ] Add Bull Board for web-based queue monitoring
- [ ] Implement job priority levels
- [ ] Add metrics collection (Prometheus/StatsD)
- [ ] Implement job result caching
- [ ] Add dead letter queue for permanently failed jobs
- [ ] Add job progress tracking
- [ ] Implement rate limiting per user
- [ ] Add job scheduling UI

## Notes

- Redis must be running for the job system to work
- Jobs are automatically retried on failure
- Failed jobs are kept for debugging
- Completed jobs are automatically cleaned up
- Each user has their own calendar sync and batch notification schedule
- Suggestion generation runs globally for all users
