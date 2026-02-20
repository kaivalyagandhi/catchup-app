# Bull/BullMQ Cleanup Task

## Status
Cloud Tasks migration is complete and deployed. The following files still reference the old Bull/BullMQ queue system and should be cleaned up in a future task.

## Files to Clean Up

### 1. Job Monitoring (Obsolete with Cloud Tasks)
- `src/jobs/job-monitoring-service.ts` - Monitors Bull queues (not applicable to Cloud Tasks)
- `src/api/routes/job-monitoring.ts` - API routes for Bull queue monitoring
- **Action**: Remove these files and the route registration in `src/api/server.ts`
- **Replacement**: Cloud Tasks monitoring is done via GCP Console and Cloud Monitoring

### 2. Job Scheduler (Obsolete with Cloud Tasks)
- `src/jobs/scheduler.ts` - Schedules recurring Bull jobs
- **Action**: Remove this file
- **Replacement**: Cloud Tasks uses Cloud Scheduler for recurring jobs

### 3. Batch Service (Needs Refactoring)
- `src/notifications/batch-service.ts` - Uses Bull types
- **Action**: Refactor to use Cloud Tasks or remove Bull type dependencies
- **Note**: Check if this service is still used

### 4. Queue Factory (Partially Obsolete)
- `src/jobs/queue-factory.ts` - Creates Bull/BullMQ queues with feature flag
- **Action**: Simplify to only support Cloud Tasks, remove BullMQ code path
- **Note**: Feature flag `USE_CLOUD_TASKS` is always true in production

### 5. Google Contacts Sync Routes (Need Update)
- `src/api/routes/google-contacts-sync.ts` - Imports from deleted `queue.ts`
- `src/api/routes/google-contacts-oauth.ts` - Imports from deleted `queue.ts`
- **Action**: Update to use Cloud Tasks client directly

## Compilation Errors Fixed

The following files had Bull/BullMQ imports replaced with local `Job` type:
- ✅ All processor files in `src/jobs/processors/`
- ✅ Test file `src/jobs/processors/webhook-health-check-processor.test.ts`

## Remaining Compilation Errors

These files still have compilation errors due to missing `queue.ts`:
- `src/jobs/job-monitoring-service.ts` - Imports from `./queue`
- `src/jobs/scheduler.ts` - Imports from `./queue`
- `src/api/routes/google-contacts-sync.ts` - Imports from `../../jobs/queue`
- `src/api/routes/google-contacts-oauth.ts` - Imports from `../../jobs/queue`

## Impact Assessment

- **Production**: No impact - these files are not used in production with Cloud Tasks
- **Development**: TypeScript compilation warnings/errors in unused code
- **Testing**: May need to update tests that reference these files

## Recommended Approach

1. **Phase 1** (Immediate): Comment out route registrations in `server.ts` to prevent runtime errors
2. **Phase 2** (Future cleanup): Remove all Bull/BullMQ related files
3. **Phase 3** (Future enhancement): Implement Cloud Tasks monitoring dashboard if needed

## Notes

- Cloud Tasks provides built-in monitoring via GCP Console
- Cloud Scheduler handles recurring jobs
- No need for custom queue monitoring with Cloud Tasks
- Job retry logic is handled by Cloud Tasks configuration
