# SMS/MMS Monitoring System

## Overview

The SMS/MMS Monitoring System provides comprehensive tracking of message processing, AI API performance, costs, and alerts for the SMS/MMS enrichment feature.

## Features

### 1. Message Metrics Tracking

- **Messages Received**: Total count by type (SMS/MMS) and content type (text/audio/image/video)
- **Processing Success**: Success/failure rates and error rates
- **Processing Time**: Average processing time per message type
- **Content Distribution**: Breakdown by content type

### 2. AI Performance Monitoring

- **API Call Tracking**: Count of calls to Gemini and Speech-to-Text APIs
- **Latency Monitoring**: Average response times for each AI service
- **Error Tracking**: Error counts and rates for AI services
- **Service Breakdown**: Separate metrics for Gemini and Speech-to-Text

### 3. Cost Tracking

- **Twilio Costs**: Estimated costs for SMS and MMS messages
  - SMS: ~$0.0079 per message
  - MMS: ~$0.02 per message
- **Google Cloud Costs**: Estimated costs for AI services
  - Gemini: ~$0.00067 per call
  - Speech-to-Text: ~$0.006 per minute
- **Total Cost**: Combined estimated costs across all services

### 4. Alerting System

Automatic alerts for:
- **High Error Rate**: Triggered when error rate exceeds 5% (configurable)
- **High Latency**: Triggered when processing time exceeds 30 seconds (configurable)
- **Cost Threshold**: Triggered when daily costs exceed $50 (configurable)
- **Rate Limit Spike**: Triggered when rate limits are hit frequently

### 5. Usage Statistics

- **Top Users**: Users with highest message counts
- **Error Breakdown**: Distribution of error types
- **Time-based Analysis**: Metrics for hour/day/week/month periods

## API Endpoints

### GET /api/sms/monitoring/dashboard

Get comprehensive dashboard statistics.

**Query Parameters:**
- `period`: 'hour', 'day', 'week', 'month' (default: 'day')

**Response:**
```json
{
  "success": true,
  "period": "day",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-02T00:00:00Z",
  "statistics": {
    "messageMetrics": { ... },
    "aiPerformance": { ... },
    "costs": { ... },
    "topUsers": [ ... ],
    "errorBreakdown": [ ... ]
  }
}
```

### GET /api/sms/monitoring/messages

Get message processing metrics for a date range.

**Query Parameters:**
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "messagesReceived": 150,
    "messagesProcessed": 145,
    "messagesFailed": 5,
    "averageProcessingTime": 2500,
    "errorRate": 3.33,
    "byType": {
      "sms": 100,
      "mms": 50
    },
    "byContentType": {
      "text": 100,
      "audio": 30,
      "image": 15,
      "video": 5
    }
  }
}
```

### GET /api/sms/monitoring/ai-performance

Get AI API performance metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "totalCalls": 200,
    "averageLatency": 1500,
    "errorCount": 5,
    "errorRate": 2.5,
    "byService": {
      "gemini": {
        "calls": 150,
        "averageLatency": 1200,
        "errors": 3
      },
      "speechToText": {
        "calls": 50,
        "averageLatency": 2500,
        "errors": 2
      }
    }
  }
}
```

### GET /api/sms/monitoring/costs

Get cost tracking metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "twilio": {
      "smsCount": 100,
      "mmsCount": 50,
      "estimatedCost": 1.79
    },
    "googleCloud": {
      "geminiCalls": 150,
      "speechToTextMinutes": 5.2,
      "estimatedCost": 0.13
    },
    "totalEstimatedCost": 1.92
  }
}
```

### GET /api/sms/monitoring/alerts

Get recent alerts.

**Query Parameters:**
- `limit`: Number of alerts to return (default: 10)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "alerts": [
    {
      "type": "error_rate",
      "severity": "warning",
      "message": "High error rate detected: 6.50%",
      "value": 6.5,
      "threshold": 5,
      "timestamp": "2025-01-01T12:00:00Z"
    }
  ]
}
```

### POST /api/sms/monitoring/reset

Reset period metrics (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Period metrics reset successfully"
}
```

## Dashboard

A web-based dashboard is available at `/sms-monitoring-dashboard.html`.

Features:
- Real-time metrics display
- Period selection (hour/day/week/month)
- Auto-refresh every 30 seconds
- Visual breakdown of all metrics
- Alert notifications
- Top users table
- Error breakdown

## Integration

The monitoring service is automatically integrated into:

1. **Message Processor** (`message-processor.ts`)
   - Tracks message received
   - Tracks processing success/failure
   - Tracks processing time
   - Tracks errors

2. **AI Processor** (`ai-processor.ts`)
   - Tracks Gemini API calls
   - Tracks Speech-to-Text API calls
   - Tracks AI latency
   - Tracks AI errors
   - Tracks Google Cloud costs

3. **Webhook Handler** (`sms-webhook.ts`)
   - Tracks Twilio costs
   - Tracks rate limit events

## Configuration

Alert thresholds can be configured when creating the monitoring service:

```typescript
const monitoringService = new SMSMonitoringService({
  errorRateThreshold: 5, // 5%
  highLatencyThreshold: 30000, // 30 seconds
  costThreshold: 50, // $50/day
});
```

## Usage Example

```typescript
import { smsMonitoringService } from './sms-monitoring-service';

// Track a message received
smsMonitoringService.trackMessageReceived('sms', 'text');

// Track message processing
smsMonitoringService.trackMessageProcessed('sms', 'text', 2500, true);

// Track AI call
smsMonitoringService.trackAICall('gemini', 1200, true);

// Track costs
smsMonitoringService.trackTwilioCost('sms');
smsMonitoringService.trackGoogleCloudCost('gemini', 1);

// Track errors
smsMonitoringService.trackError('TRANSCRIPTION_FAILED', 'Audio format not supported', {
  userId: '123',
  messageType: 'mms',
});

// Get statistics
const stats = await smsMonitoringService.getUsageStatistics(
  new Date('2025-01-01'),
  new Date('2025-01-02')
);
```

## Monitoring Best Practices

1. **Regular Review**: Check the dashboard daily to identify trends
2. **Alert Response**: Investigate alerts promptly to prevent issues
3. **Cost Tracking**: Monitor costs to stay within budget
4. **Performance Optimization**: Use latency metrics to identify bottlenecks
5. **Error Analysis**: Review error breakdown to identify common issues

## Cost Estimation Accuracy

Cost estimates are approximate and based on:
- Twilio US pricing (rates vary by country)
- Google Cloud standard pricing (may vary with volume discounts)
- Actual costs may differ based on:
  - Message destination
  - Audio duration
  - Model selection
  - Volume discounts

For accurate cost tracking, integrate with billing APIs from Twilio and Google Cloud.

## Future Enhancements

- Integration with external monitoring services (Datadog, New Relic)
- Email/Slack notifications for alerts
- Historical trend analysis
- Predictive cost forecasting
- Custom metric definitions
- Export to CSV/JSON
- Grafana dashboard integration
