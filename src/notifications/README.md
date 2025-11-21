# Notifications Module

The notifications module handles all notification delivery and processing for the CatchUp application, including SMS, email, batch notifications, real-time notifications, and reply processing.

## Components

### SMS Service (`sms-service.ts`)
- Integrates with Twilio for SMS delivery
- Implements retry logic with exponential backoff
- Handles delivery failures and logging
- Supports configurable retry attempts and delays

**Usage:**
```typescript
import { smsService } from './notifications';

const result = await smsService.sendSMS('+1234567890', 'Your message here');
if (result.success) {
  console.log('SMS sent:', result.messageId);
}
```

### Email Service (`email-service.ts`)
- Integrates with SendGrid for email delivery
- Implements retry logic with exponential backoff
- Supports both text and HTML email content
- Handles delivery failures and logging

**Usage:**
```typescript
import { emailService } from './notifications';

const result = await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Your Subject',
  text: 'Plain text content',
  html: '<p>HTML content</p>',
});
```

### Content Service (`content-service.ts`)
- Generates notification text for suggestions
- Formats timeslots, contact names, and reasoning
- Creates concise SMS messages and detailed email content
- Generates draft messages for accepted suggestions

**Usage:**
```typescript
import { generateNotificationContent } from './notifications';

const content = generateNotificationContent(suggestion, contact);
// Returns: { sms: string, email: { subject, text, html } }
```

### Batch Notification Service (`batch-service.ts`)
- Handles scheduled batch notification delivery
- Uses Bull job queue for reliable delivery
- Sends notifications for pending suggestions without calendar events
- Respects user notification preferences (SMS/email channels)

**Usage:**
```typescript
import { batchNotificationService } from './notifications';

// Schedule batch notification
await batchNotificationService.scheduleBatchNotification('user-id');

// Send immediately
const result = await batchNotificationService.sendBatchNotification('user-id');
```

### Real-time Notification Service (`realtime-service.ts`)
- Handles immediate notification delivery for event-tied suggestions
- Sends via SMS and/or email based on user preferences
- Publishes to in-app feed simultaneously
- Supports bulk notification delivery

**Usage:**
```typescript
import { realtimeNotificationService } from './notifications';

const result = await realtimeNotificationService.sendRealtimeNotification(
  'user-id',
  suggestion
);
```

### Reply Processing Service (`reply-service.ts`)
- Processes incoming SMS and email replies
- Parses suggestion actions (accept, dismiss, snooze)
- Extracts contact metadata using NLP
- Generates enrichment confirmations
- Supports modification requests via follow-up replies

**Usage:**
```typescript
import { replyProcessingService } from './notifications';

// Process SMS reply
const result = await replyProcessingService.processIncomingSMS(
  '+1234567890',
  'Accept',
  'user-id'
);

// Process email reply
const result = await replyProcessingService.processIncomingEmail(
  'user@example.com',
  'Re: Catch up with John?',
  'Yes, I accept!',
  'user-id'
);
```

### Preferences Service (`preferences-service.ts`)
- Manages notification preferences for users
- Supports SMS/email channel configuration
- Stores batch timing preferences (day and time)
- Validates preferences before saving

**Usage:**
```typescript
import { notificationPreferencesService } from './notifications';

// Get preferences
const prefs = await notificationPreferencesService.getPreferences('user-id');

// Update preferences
await notificationPreferencesService.updatePreferences('user-id', {
  smsEnabled: true,
  batchTime: '10:00',
});
```

## Environment Variables

Required environment variables for the notifications module:

```bash
# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# SendGrid Email
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@catchup.app

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# OpenAI (for NLP in reply processing)
OPENAI_API_KEY=your_openai_api_key
```

## Testing

All services include comprehensive unit tests:

```bash
# Run all notification tests
npm test -- src/notifications

# Run specific test file
npm test -- src/notifications/sms-service.test.ts
```

## Architecture

The notifications module follows a layered architecture:

1. **Service Layer**: Business logic for notification delivery and processing
2. **Repository Layer**: Data access for notification preferences
3. **Integration Layer**: External service integrations (Twilio, SendGrid, OpenAI)
4. **Queue Layer**: Job queue for reliable batch notification delivery

## Error Handling

All services implement robust error handling:

- **Retry Logic**: Automatic retries with exponential backoff for transient errors
- **Graceful Degradation**: Continue processing even if some notifications fail
- **Logging**: Comprehensive logging for debugging and monitoring
- **Validation**: Input validation before processing

## Future Enhancements

Potential improvements for the notifications module:

- [ ] Support for additional notification channels (push notifications, in-app)
- [ ] Advanced reply parsing with more sophisticated NLP
- [ ] Notification templates and customization
- [ ] A/B testing for notification content
- [ ] Analytics and delivery metrics
- [ ] Rate limiting and throttling
- [ ] Webhook support for delivery status updates
