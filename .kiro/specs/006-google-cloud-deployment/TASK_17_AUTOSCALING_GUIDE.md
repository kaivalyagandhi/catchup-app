# Task 17: Configure Auto-Scaling - Implementation Guide

## Overview

This guide documents the auto-scaling configuration for the CatchUp Cloud Run service. Auto-scaling allows the service to automatically adjust the number of running instances based on traffic demand.

## Prerequisites

Before executing this task, ensure:
- ✅ Task 16 (Create Cloud Run service) is completed
- ✅ Cloud Run service `catchup` exists in `us-central1` region
- ✅ Service is deployed and responding to health checks

## Auto-Scaling Configuration

### Step 1: Configure Scaling Parameters

Update the Cloud Run service with scaling settings:

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=100 \
  --cpu-throttling
```

**Parameters Explained:**
- `--min-instances=0`: Scale down to zero instances when idle (cost optimization)
- `--max-instances=100`: Maximum 100 instances to handle traffic spikes
- `--cpu-throttling`: Enable CPU throttling to reduce costs (requests wait for CPU availability instead of scaling)

### Step 2: Configure Concurrency

Set the maximum number of concurrent requests per instance:

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --concurrency=80
```

**Concurrency Explained:**
- `--concurrency=80`: Each instance can handle up to 80 concurrent requests
- Cloud Run will create new instances when concurrency is exceeded
- Helps prevent request queuing and improves response times

### Step 3: Verify Configuration

Verify the auto-scaling settings were applied correctly:

```bash
gcloud run services describe catchup --region=us-central1
```

**Expected Output:**
Look for these fields in the output:
```
spec:
  template:
    spec:
      containerConcurrency: 80
      timeoutSeconds: 3600
  traffic:
  - percent: 100
    latestRevision: true

status:
  conditions:
  - type: Ready
    status: 'True'
  traffic:
  - percent: 100
    latestRevision: true
    revisionName: catchup-00001
```

## Auto-Scaling Behavior

### Scale Up
- **Trigger**: Request rate exceeds target threshold
- **Timeline**: New instances created within 2 minutes
- **Max**: 100 instances (configurable)

### Scale Down
- **Trigger**: Request rate drops below target threshold
- **Timeline**: Excess instances removed within 10 minutes
- **Min**: 0 instances (scales to zero when idle)

### Cost Implications

**With min-instances=0:**
- Pay only for actual usage
- Cold start latency (~1-2 seconds) on first request after idle period
- Ideal for hackathon/low-traffic scenarios

**Alternative: min-instances=1**
- Always have 1 instance running (~$10-15/month)
- No cold start latency
- Better for production with consistent traffic

## Monitoring Auto-Scaling

### View Current Instance Count

```bash
gcloud run services describe catchup --region=us-central1 \
  --format='value(status.traffic[0].revisionName)'
```

### View Scaling Metrics

```bash
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"' \
  --format='table(metric.labels.service_name, points[0].value.double_value)'
```

### View Logs for Scaling Events

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup" \
  --limit=50 --format=json | grep -i "scale\|instance"
```

## Troubleshooting

### Service Not Found
```
ERROR: (gcloud.run.services.update) Service [catchup] could not be found.
```
**Solution**: Complete task 16 (Create Cloud Run service) first.

### Concurrency Too Low
If you see many 429 (Too Many Requests) errors:
- Increase `--concurrency` value
- Example: `gcloud run services update catchup --region=us-central1 --concurrency=150`

### Cold Start Latency Issues
If cold starts are problematic:
- Set `--min-instances=1` to keep instance warm
- Trade-off: Higher monthly cost (~$10-15)

### Max Instances Reached
If service is hitting max instances limit:
- Increase `--max-instances` value
- Example: `gcloud run services update catchup --region=us-central1 --max-instances=200`
- Monitor costs as this increases billing

## Requirements Validation

This task validates the following requirements:

- **Requirement 5.1**: WHEN traffic to the CatchUp System increases THEN Cloud Run SHALL automatically create additional instances to handle the load
  - ✅ Configured with `--max-instances=100`

- **Requirement 5.2**: WHEN traffic decreases THEN Cloud Run SHALL automatically remove excess instances to reduce costs
  - ✅ Configured with `--min-instances=0`

- **Requirement 5.3**: WHEN an instance becomes unhealthy THEN the system SHALL automatically remove it and create a replacement
  - ✅ Cloud Run automatically replaces unhealthy instances (built-in behavior)

- **Requirement 11.1**: Auto-scaling configuration (implied)
  - ✅ Configured with scaling parameters

- **Requirement 11.2**: Concurrency settings (implied)
  - ✅ Configured with `--concurrency=80`

## Next Steps

After completing this task:
1. Monitor the service for 24 hours to observe scaling behavior
2. Adjust `--max-instances` or `--concurrency` based on traffic patterns
3. Consider setting `--min-instances=1` if cold start latency becomes an issue
4. Proceed to task 18 (Configure environment and secrets)

## References

- [Cloud Run Auto-Scaling Documentation](https://cloud.google.com/run/docs/about-auto-scaling)
- [Cloud Run Concurrency Documentation](https://cloud.google.com/run/docs/about-concurrency-and-requests)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
