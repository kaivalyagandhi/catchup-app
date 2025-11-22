# Background Jobs and Scheduling

This module implements the background job processing system for CatchUp using Bull and Redis.

## Overview

The job system handles three main recurring tasks:

1. **Suggestion Generation** - Runs every 6 hours to generate connection suggestions for all users
2. **Batch Notifications** - Sends scheduled digest notifications based on user preferences
3. **Calendar Sync** - Refreshes calendar data every 30 minutes per user

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
│  - suggestion-generation                                 │
│  - batch-notifications                                   │
│  - calendar-sync                                         │
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

## Components

### Queue (`queue.ts`)

Configures Bull queues with Redis connection and default job options:

- Exponential backoff retry strategy (3 attempts, starting at 2 seconds)
- Automatic cleanup of completed jobs
- Error logging and monitoring

### Worker (`worker.ts`)

Registers job processors with queues and handles job execution:

- Processes jobs from all three queues
- Logs job completion and failures
- Provides graceful shutdown

### Scheduler (`scheduler.ts`)

Manages recurring job schedules:

- `scheduleSuggestionGeneration()` - Every 6 hours
- `scheduleBatchNotifications()` - Per user preferences (default: Sunday 9am)
- `scheduleCalendarSync()` - Every 30 minutes per user
- `initializeScheduler()` - Initialize all schedules on startup

### Processors

#### Suggestion Generation (`processors/suggestion-generation-processor.ts`)

Generates suggestions for all users in batches:

1. Gets users with Google Calendar connected
2. Fetches available time slots for each user
3. Generates timebound suggestions based on frequency preferences
4. Processes users in batches of 50

**Requirements:** 9.1-11.4

#### Batch Notification (`processors/batch-notification-processor.ts`)

Sends scheduled notifications to users:

1. Gets user's notification preferences
2. Finds pending suggestions without calendar events
3. Sends notifications via SMS and/or email
4. Tracks delivery status

**Requirements:** 12.1-12.5

#### Calendar Sync (`processors/calendar-sync-processor.ts`)

Refreshes calendar data from Google:

1. Gets user's OAuth token
2. Syncs calendar list from Google
3. Fetches events from selected calendars
4. Updates availability predictions

**Requirements:** 7.8, 8.1

## Usage

### Starting the Worker

```typescript
import { startWorker } from './jobs';

// Start processing jobs
startWorker();
```

### Initializing Schedules

```typescript
import { initializeScheduler } from './jobs';

// Set up all recurring jobs
await initializeScheduler();
```

### Scheduling User-Specific Jobs

```typescript
import {
  scheduleUserBatchNotification,
  scheduleUserCalendarSync,
} from './jobs';

// When a user connects Google Calendar
await scheduleUserCalendarSync(userId);

// When a user updates notification preferences
await scheduleUserBatchNotification(userId);
```

### Manual Job Triggering

```typescript
import {
  suggestionGenerationQueue,
  batchNotificationQueue,
  calendarSyncQueue,
} from './jobs';

// Trigger suggestion generation immediately
await suggestionGenerationQueue.add({
  batchSize: 50,
  offset: 0,
});

// Trigger batch notification for a user
await batchNotificationQueue.add({
  userId: 'user-id',
  dayOfWeek: 0,
  time: '09:00',
});

// Trigger calendar sync for a user
await calendarSyncQueue.add({
  userId: 'user-id',
});
```

## Configuration

### Environment Variables

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Alternative: Redis URL
REDIS_URL=redis://localhost:6379
```

### Job Options

Default job options are configured in `queue.ts`:

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 seconds
  },
  removeOnComplete: true,
  removeOnFail: false, // Keep failed jobs for debugging
}
```

## Monitoring

### Queue Events

All queues emit events for monitoring:

- `error` - Queue-level errors
- `failed` - Job failures with error details
- `completed` - Job completions with results

### Logging

All processors log:

- Job start and completion
- Processing statistics (users processed, suggestions generated, etc.)
- Errors and failures

## Error Handling

### Retry Strategy

Jobs automatically retry on failure with exponential backoff:

1. First retry: 2 seconds
2. Second retry: 4 seconds
3. Third retry: 8 seconds

After 3 failed attempts, the job is marked as failed and kept for debugging.

### Error Recovery

- **OAuth token errors**: Skip user and continue processing others
- **API failures**: Retry with backoff, log error if all attempts fail
- **Database errors**: Propagate to fail the job for retry

## Testing

### Running Tests

```bash
npm test src/jobs
```

### Manual Testing

```bash
# Start Redis
redis-server

# Start the worker
npm run dev

# Trigger jobs manually using Bull Board or Redis CLI
```

## Dependencies

- **Bull**: Job queue implementation
- **ioredis**: Redis client
- **Redis**: Message broker and job storage

## Future Enhancements

- [ ] Add Bull Board for web-based queue monitoring
- [ ] Implement job priority levels
- [ ] Add metrics collection (Prometheus/StatsD)
- [ ] Implement job result caching
- [ ] Add dead letter queue for permanently failed jobs
