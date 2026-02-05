# Clear Redis Queue to Fix Memory Crash

## The Problem

The server crashed during "Processing suggestion regeneration job 3" - this is an OLD job from the previous run that's still in the Redis queue. When you restarted the server, it started processing these old jobs, which are trying to process data from the buggy duplicate syncs.

## The Solution

Clear the Redis queue to remove all old jobs:

### Option 1: Using Redis CLI (Recommended)

```bash
# Connect to Redis
redis-cli

# Clear all keys (this will remove all queued jobs)
FLUSHALL

# Exit Redis CLI
exit
```

### Option 2: Using npm script (if available)

```bash
# Check if there's a script to clear queues
npm run queue:clear
```

### Option 3: Restart Redis (Nuclear option)

```bash
# Stop Redis
brew services stop redis

# Start Redis
brew services start redis
```

## After Clearing Redis

1. **Restart your server**: `npm run dev`
2. **Test the integrations**: Disconnect and reconnect both Google Calendar and Google Contacts
3. **Monitor the logs**: You should see ONLY the immediate sync, no queued jobs

## Why This Happened

The previous run (with the buggy code) queued multiple sync jobs that are still in Redis:
- Duplicate calendar sync jobs
- Duplicate contacts sync jobs  
- Suggestion regeneration jobs

These jobs are trying to process data from the duplicate syncs, causing memory issues.

## Expected Behavior After Clearing

When you reconnect the integrations, you should see:
- ✅ ONE immediate sync per integration
- ✅ NO "Calendar sync job queued" message
- ✅ NO "Full sync job queued" message
- ✅ NO "Processing suggestion regeneration job" until AFTER the sync completes
- ✅ Normal memory usage

## Verification

After clearing Redis and restarting:

```bash
# Check Redis is empty
redis-cli
> KEYS *
(empty array or empty list)
> exit
```

Then test the integrations and monitor memory usage.
