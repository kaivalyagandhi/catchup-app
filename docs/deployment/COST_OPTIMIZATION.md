# Cloud Cost Optimization Guide

This guide documents the cost optimization strategies implemented for CatchUp's GCP deployment.

## Overview

**Before Optimization:** ~$110/month
**After Optimization:** ~$40-50/month (estimated)
**Total Savings:** ~$60-70/month (55-65%)

## Optimization Summary

| Optimization | Monthly Savings | Status |
|--------------|-----------------|--------|
| Upstash Redis (replace Cloud Memorystore) | $50-55 | Ready to deploy |
| Cloud Run scale-to-zero | $5-9 | Ready to deploy |
| Networking (automatic with Upstash) | $2-3 | Automatic |
| Cloud Build smaller machine | $0.77 | Ready to deploy |
| HTTP Response Caching | Indirect | Implemented |
| Job Concurrency Limits | Indirect | Implemented |

## 1. Upstash Redis Migration

### Why Upstash?
- **Cloud Memorystore cost:** $60.70/month (55% of total)
- **Upstash cost:** $0-10/month (free tier: 10K commands/day)
- **Savings:** ~$50-55/month

### Setup Instructions

1. **Create Upstash Account**
   - Go to https://upstash.com/
   - Sign up for free account
   - Create a new Redis database (select region closest to us-central1)

2. **Get Connection Details**
   - From Upstash dashboard, copy:
     - `UPSTASH_REDIS_REST_URL` (host)
     - `UPSTASH_REDIS_REST_TOKEN` (password)
     - Port: 6379 (default)

3. **Add Secrets to GCP Secret Manager**
   ```bash
   # Create secrets
   echo -n "your-database.upstash.io" | gcloud secrets create upstash-redis-host --data-file=-
   echo -n "6379" | gcloud secrets create upstash-redis-port --data-file=-
   echo -n "your-upstash-password" | gcloud secrets create upstash-redis-password --data-file=-
   ```

4. **Deploy**
   - Push to main branch to trigger Cloud Build
   - The updated `cloudbuild.yaml` will use Upstash credentials

### Rollback
If issues occur:
1. Update Cloud Run env vars to point back to Cloud Memorystore IP
2. Set `REDIS_TLS=false`
3. Redeploy

## 2. Cloud Run Optimization

### Configuration Changes
- `--min-instances=0` (scale to zero when idle)
- `--max-instances=10` (limit scaling)
- `--concurrency=80` (requests per instance)
- `--timeout=300` (5 minutes, down from 1 hour)

### Expected Behavior
- Cold starts: ~10-15 seconds
- Scale to zero after ~15 minutes of inactivity
- Automatic scaling up to 10 instances under load

### Memory Configuration
- Kept at 512Mi (required for contact sync with 1300+ contacts)
- Do NOT reduce - risk of OOM errors

## 3. App-Level Optimizations

### HTTP Response Caching
Added `Cache-Control` headers to reduce redundant API calls:
- `GET /api/contacts`: 60 seconds
- `GET /api/groups`: 60 seconds
- `GET /api/tags`: 60 seconds
- `GET /api/preferences/*`: 300 seconds (5 minutes)

### Job Concurrency Limits
Heavy jobs limited to 1 concurrent execution:
- `suggestionGenerationQueue`: 1 (AI processing)
- `googleContactsSyncQueue`: 1 (API calls + memory)
- `calendarSyncQueue`: 1 (API calls)
- `suggestionRegenerationQueue`: 1 (AI processing)

Lighter jobs keep default concurrency:
- `tokenRefreshQueue`: default
- `webhookRenewalQueue`: default
- `batchNotificationQueue`: default

## 4. Cloud Build Optimization

### Machine Type Change
- Before: `E2_HIGHCPU_8` (~$0.0323/min)
- After: `E2_MEDIUM` (~$0.0067/min)
- Build time increase: ~3 min → ~5-6 min
- Monthly savings: ~$0.77

## Monitoring

### GCP Budget Alerts
Set up alerts at:
- $60/month (50% of original - warning)
- $80/month (73% of original - critical)

### Key Metrics to Watch
1. **Cloud Run**
   - Instance count (should scale to 0 when idle)
   - Cold start latency
   - Memory usage

2. **Redis (Upstash)**
   - Commands per day (free tier: 10K)
   - Connection count

3. **Job Queues**
   - Job completion rate
   - Failed job count
   - Queue depth

## Troubleshooting

### Cold Start Issues
If cold starts are too slow:
1. Check Cloud Run logs for startup errors
2. Consider setting `--min-instances=1` (adds ~$5/month)

### Redis Connection Issues
If jobs fail with Redis errors:
1. Verify Upstash credentials in Secret Manager
2. Check `REDIS_TLS=true` is set
3. Test connection: `redis-cli -h your-db.upstash.io -p 6379 -a password ping`

### Memory Issues
If OOM errors occur:
1. Check job concurrency limits are in place
2. Monitor memory during contact sync
3. Consider increasing to 1Gi if needed (adds ~$8/month)

## Cost Breakdown (After Optimization)

| Service | Estimated Cost |
|---------|---------------|
| Cloud Run | $8-12/month |
| Cloud SQL | $15-16/month |
| Upstash Redis | $0-10/month |
| Networking | $2-5/month |
| Cloud Build | $1-2/month |
| Other | $2-5/month |
| **Total** | **$28-50/month** |

## Scaling Considerations

The optimizations support multi-user scaling:
- **10 users:** No changes needed
- **50 users:** Monitor Upstash usage, may need paid tier ($10/month)
- **100+ users:** Consider Cloud Run min-instances=1, Upstash Pro tier
- **500+ users:** Re-evaluate Cloud Memorystore vs Upstash Pro

## Related Documentation

- [GCP Deployment Guide](./README.md)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Upstash Documentation](https://docs.upstash.com/)
