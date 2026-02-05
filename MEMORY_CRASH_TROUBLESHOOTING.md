# Memory Crash Troubleshooting Guide

## Current Situation

Your server crashed with "JavaScript heap out of memory" during "Processing suggestion regeneration job 3". This is happening because:

1. **Old jobs in Redis**: The previous buggy run queued multiple duplicate jobs
2. **Jobs still processing**: When you restarted, these old jobs started processing
3. **Memory exhaustion**: Processing old duplicate sync data causes memory overflow

## Root Cause

The crash log shows:
```
Processing suggestion regeneration job 3
<--- Last few GCs --->
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

This job is from the PREVIOUS run (before the fixes) and is trying to process data from the duplicate syncs.

## Solution Steps

### Step 1: Clear Redis Queue

**This is the most important step!**

```bash
# Connect to Redis
redis-cli

# Clear all keys
FLUSHALL

# Verify it's empty
KEYS *
# Should return: (empty array)

# Exit
exit
```

### Step 2: Verify Code Fixes Are in Place

Check that the duplicate sync job queues were removed:

```bash
# These should return "Not found"
grep -n "Calendar sync job queued" src/api/routes/google-calendar-oauth.ts
grep -n "Full sync job queued" src/api/routes/google-contacts-oauth.ts
```

Both should output: `Not found in file`

### Step 3: Restart Server

```bash
npm run dev
```

### Step 4: Test Integrations

1. **Disconnect both integrations** (if connected)
2. **Reconnect Google Calendar**
3. **Monitor logs** - should see only ONE sync
4. **Reconnect Google Contacts**
5. **Monitor logs** - should see only ONE sync

## Expected Logs After Fix

### Calendar Connection (Good):
```
[GoogleCalendarOAuth] First connection detected...
[SyncOrchestrator] Starting initial sync...
[SyncOrchestrator] Initial sync completed...
Suggestion regeneration queued...
✅ NO duplicate sync jobs
✅ NO immediate "Processing suggestion regeneration job"
```

### Contacts Connection (Good):
```
[GoogleContactsOAuthService] First connection detected...
[SyncOrchestrator] Starting full sync...
Progress: 100 contacts imported
Progress: 200 contacts imported
...
Progress: 1300 contacts imported
[SyncOrchestrator] Initial sync completed...
Future sync scheduled...
✅ NO duplicate sync jobs
✅ NO memory crash
```

## Bad Signs to Watch For

❌ "Calendar sync job queued" - means old code is still running
❌ "Full sync job queued" - means old code is still running
❌ "Processing suggestion regeneration job" immediately after connection - means old jobs in Redis
❌ Memory usage > 2GB - means duplicate processing
❌ "Progress: 100 contacts imported" appearing TWICE - means duplicate sync

## Memory Usage Monitoring

Normal memory usage for 1316 contacts:
- **During sync**: 500-800 MB
- **After sync**: 200-400 MB
- **Idle**: 100-200 MB

If you see memory > 2GB, something is wrong (likely duplicate processing).

## Alternative: Increase Node Memory (Temporary Workaround)

If you need to test before clearing Redis:

```bash
# Increase Node.js memory limit to 8GB
NODE_OPTIONS="--max-old-space-size=8192" npm run dev
```

**But this is NOT a fix** - it just delays the crash. You still need to clear Redis and fix the duplicate syncs.

## Why Redis Clearing is Necessary

Redis is a persistent queue - jobs survive server restarts. The old buggy code queued:
- Multiple calendar sync jobs
- Multiple contacts sync jobs (processing 1316 contacts multiple times)
- Multiple suggestion regeneration jobs

These jobs are still in Redis and will keep processing until cleared.

## Verification Checklist

After clearing Redis and restarting:

- [ ] Redis is empty (`redis-cli KEYS *` returns empty)
- [ ] Server starts without errors
- [ ] Calendar connection triggers only ONE sync
- [ ] Contacts connection triggers only ONE sync
- [ ] No "Calendar sync job queued" message
- [ ] No "Full sync job queued" message
- [ ] Memory stays under 1GB during sync
- [ ] No memory crash

## If Problems Persist

If you still see issues after clearing Redis:

1. **Check Redis is actually empty**:
   ```bash
   redis-cli
   > KEYS *
   > exit
   ```

2. **Verify server is using new code**:
   ```bash
   # Should show recent timestamp
   ls -la src/api/routes/google-calendar-oauth.ts
   ls -la src/api/routes/google-contacts-oauth.ts
   ```

3. **Check for other Redis instances**:
   ```bash
   ps aux | grep redis
   ```

4. **Nuclear option - restart everything**:
   ```bash
   # Stop server (Ctrl+C)
   # Stop Redis
   brew services stop redis
   # Start Redis
   brew services start redis
   # Clear Redis
   redis-cli FLUSHALL
   # Start server
   npm run dev
   ```

## Summary

The memory crash is caused by old jobs in Redis from the buggy code. Clear Redis, restart the server, and test again. The code fixes are in place, but the old jobs need to be cleared.
