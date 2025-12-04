# SMS/MMS Load Testing

## Overview

This load testing script simulates high-volume SMS/MMS message processing to verify the performance optimizations implemented for the SMS/MMS enrichment feature.

## Prerequisites

1. **Running Server**: The CatchUp server must be running
2. **Test Phone Numbers**: Phone numbers must be verified in the system
3. **Environment Variables**: Twilio credentials must be configured

## Setup

### 1. Verify Test Phone Numbers

Before running load tests, ensure test phone numbers are verified:

```bash
# Add test phone numbers via API
curl -X POST http://localhost:3000/api/user/phone-number \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15555551001"}'

# Verify with code
curl -X POST http://localhost:3000/api/user/phone-number/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15555551001", "code": "123456"}'
```

### 2. Configure Environment

Create a `.env.test` file or export variables:

```bash
# Required
export LOAD_TEST_URL=http://localhost:3000/api/sms/webhook
export TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Optional (with defaults)
export LOAD_TEST_CONCURRENT=10      # Messages per batch
export LOAD_TEST_DURATION=60        # Test duration in seconds
export LOAD_TEST_DELAY=1000         # Delay between batches (ms)
```

## Running Load Tests

### Basic Load Test

```bash
npm run test:load
```

### Custom Configuration

```bash
# High load test (100 concurrent messages)
LOAD_TEST_CONCURRENT=100 LOAD_TEST_DURATION=120 npm run test:load

# Sustained load test (10 messages for 5 minutes)
LOAD_TEST_CONCURRENT=10 LOAD_TEST_DURATION=300 npm run test:load

# Burst test (50 messages for 30 seconds)
LOAD_TEST_CONCURRENT=50 LOAD_TEST_DURATION=30 npm run test:load
```

## Test Scenarios

### Scenario 1: Normal Load
```bash
LOAD_TEST_CONCURRENT=10 LOAD_TEST_DURATION=60 npm run test:load
```
- Simulates normal usage
- 10 messages per second
- 1 minute duration
- Expected: All targets met

### Scenario 2: Peak Load
```bash
LOAD_TEST_CONCURRENT=50 LOAD_TEST_DURATION=120 npm run test:load
```
- Simulates peak usage
- 50 messages per second
- 2 minute duration
- Expected: Some rate limiting

### Scenario 3: Stress Test
```bash
LOAD_TEST_CONCURRENT=100 LOAD_TEST_DURATION=60 npm run test:load
```
- Simulates extreme load
- 100 messages per second
- 1 minute duration
- Expected: Significant rate limiting

## Understanding Results

### Sample Output

```
Starting load test...
Target: http://localhost:3000/api/sms/webhook
Concurrent messages: 10
Test duration: 60s
Phone numbers: 5

[10s] Sent 100 requests, 95 successful, 5 failed
[20s] Sent 200 requests, 190 successful, 10 failed
...

=== Load Test Results ===
Total Requests: 600
Successful: 585 (97.50%)
Failed: 15 (2.50%)
Rate Limited: 12

Response Times:
  Average: 3,245ms
  Min: 1,234ms
  Max: 8,901ms
  P50: 2,987ms
  P95: 6,543ms
  P99: 8,234ms

=== Performance Assessment ===
✓ Average response time is under 5 seconds (target met)
✓ Success rate is above 95%
✓ P95 response time is under 10 seconds
```

### Metrics Explained

- **Total Requests**: Total number of webhook requests sent
- **Successful**: Requests that returned HTTP 200
- **Failed**: Requests that failed or timed out
- **Rate Limited**: Requests rejected due to rate limiting
- **Average Response Time**: Mean time to receive TwiML response
- **P50/P95/P99**: 50th, 95th, 99th percentile response times

### Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Avg Response Time | < 5s | ✓ 3.2s |
| P95 Response Time | < 10s | ✓ 6.5s |
| Success Rate | > 95% | ✓ 97.5% |

## Monitoring During Tests

### Real-time Performance Monitoring

Open a second terminal and monitor performance:

```bash
# Watch cache statistics
watch -n 1 'curl -s http://localhost:3000/api/sms/performance/cache | jq'

# Watch database pool
watch -n 1 'curl -s http://localhost:3000/api/sms/performance/database | jq'

# Watch connection pools
watch -n 1 'curl -s http://localhost:3000/api/sms/performance/connections | jq'
```

### Server Logs

Monitor server logs for errors:

```bash
# If using npm run dev
tail -f logs/server.log

# If using Docker
docker logs -f catchup-server
```

## Troubleshooting

### High Failure Rate

**Symptom**: Failed requests > 10%

**Possible Causes**:
- Server not running
- Database connection issues
- Invalid Twilio signature

**Solutions**:
```bash
# Check server is running
curl http://localhost:3000/health

# Check database connection
npm run db:test

# Verify TWILIO_AUTH_TOKEN is correct
echo $TWILIO_AUTH_TOKEN
```

### Slow Response Times

**Symptom**: Average response time > 5s

**Possible Causes**:
- Database pool exhausted
- External API latency
- Low cache hit rate

**Solutions**:
```bash
# Check database pool
curl http://localhost:3000/api/sms/performance/database

# Check cache hit rate
curl http://localhost:3000/api/sms/performance/cache

# Increase pool sizes in .env
DATABASE_POOL_MAX=20
```

### Rate Limiting

**Symptom**: Many rate limited requests

**Expected Behavior**: Rate limiting is working correctly

**Note**: The system limits to 20 messages per hour per phone number. Use multiple test phone numbers to avoid rate limiting during load tests.

## Advanced Usage

### Custom Phone Numbers

Edit the script to use your test phone numbers:

```typescript
// In scripts/load-test-sms.ts
const config: LoadTestConfig = {
  phoneNumbers: [
    '+15555551001',
    '+15555551002',
    '+15555551003',
    // Add more test numbers
  ],
  // ...
};
```

### Custom Message Payloads

Modify the message generation functions:

```typescript
function generateSMSPayload(phoneNumber: string): any {
  const messages = [
    'Your custom message 1',
    'Your custom message 2',
    // Add more messages
  ];
  // ...
}
```

### Continuous Load Testing

Run load tests continuously:

```bash
# Run every 5 minutes
while true; do
  npm run test:load
  sleep 300
done
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Test

on:
  push:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Install dependencies
        run: npm install
      - name: Start server
        run: npm run dev &
      - name: Wait for server
        run: sleep 10
      - name: Run load test
        env:
          LOAD_TEST_URL: http://localhost:3000/api/sms/webhook
          TWILIO_AUTH_TOKEN: ${{ secrets.TWILIO_AUTH_TOKEN }}
        run: npm run test:load
```

## Best Practices

1. **Start Small**: Begin with low concurrency and increase gradually
2. **Monitor Resources**: Watch CPU, memory, and database connections
3. **Use Multiple Phone Numbers**: Avoid rate limiting
4. **Run During Off-Peak**: Don't impact production users
5. **Document Results**: Keep records of load test results
6. **Test Regularly**: Run load tests before major releases

## Performance Baselines

### Expected Results (Optimized System)

| Concurrent Messages | Avg Response Time | P95 Response Time | Success Rate |
|---------------------|-------------------|-------------------|--------------|
| 10 | 2-3s | 4-5s | > 98% |
| 50 | 3-4s | 6-8s | > 95% |
| 100 | 4-5s | 8-10s | > 90% |

### Red Flags

- Average response time > 10s
- P95 response time > 20s
- Success rate < 90%
- Database waiting clients > 10
- Cache hit rate < 50%

## Support

For issues or questions:
1. Check `docs/SMS_MMS_PERFORMANCE_OPTIMIZATION.md`
2. Review server logs
3. Check performance monitoring endpoints
4. Contact the development team

## Related Documentation

- [Performance Optimization Guide](../docs/SMS_MMS_PERFORMANCE_OPTIMIZATION.md)
- [Quick Reference](../docs/SMS_MMS_PERFORMANCE_QUICK_REFERENCE.md)
- [SMS/MMS Setup Guide](../docs/TWILIO_SMS_MMS_SETUP.md)
