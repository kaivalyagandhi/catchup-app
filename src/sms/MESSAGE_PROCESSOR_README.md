# Message Processor Service

## Overview

The Message Processor Service is responsible for routing incoming SMS/MMS messages to the appropriate AI processors, extracting enrichment data, and storing it in the database with proper metadata.

## Features

- **Message Type Detection**: Automatically detects SMS vs MMS messages
- **Content Type Detection**: Identifies text, audio, image, or video content
- **AI Processing**: Routes content to appropriate AI processor (Gemini, Speech-to-Text)
- **Media Handling**: Downloads and processes media files from Twilio URLs
- **Database Storage**: Stores enrichments with correct source metadata
- **Error Handling**: Implements retry logic with exponential backoff
- **Rate Limiting**: Integrates with SMS rate limiter

## Architecture

```
Webhook → Message Processor → Content Detection → AI Processor → Database Storage
                ↓
         Media Downloader (for MMS)
                ↓
         Temporary File Cleanup
```

## Message Flow

### SMS Messages (Text Only)

1. Webhook receives SMS from Twilio
2. Message processor detects message type: SMS
3. Content type detected: TEXT
4. Text sent directly to Gemini API for enrichment extraction
5. Enrichments stored with source: "sms"

### MMS Messages (Media)

1. Webhook receives MMS from Twilio
2. Message processor detects message type: MMS
3. Content type detected based on MIME type:
   - `audio/*` → AUDIO
   - `image/*` → IMAGE
   - `video/*` → VIDEO
4. Media downloaded from Twilio URL
5. Media processed by appropriate AI service:
   - Audio → Speech-to-Text → Gemini
   - Image → Gemini Vision
   - Video → Gemini Multimodal
6. Enrichments stored with source: "mms" and media type
7. Temporary files cleaned up

## Usage

### Basic Usage

```typescript
import { messageProcessor } from './message-processor';

// Process a message from Twilio webhook
const result = await messageProcessor.processMessage(twilioPayload, userId);

if (result.success) {
  console.log(`Created ${result.enrichmentIds.length} enrichments`);
} else {
  console.error(`Processing failed: ${result.error}`);
}
```

### Custom Configuration

```typescript
import { MessageProcessor } from './message-processor';
import { AIProcessor } from './ai-processor';
import { MediaDownloader } from './media-downloader';

// Create custom instances
const customAI = new AIProcessor();
const customDownloader = new MediaDownloader({
  maxSizeMB: 10,
  timeoutMs: 60000,
});

const processor = new MessageProcessor(customAI, customDownloader);
```

## Message Types

### SMS (Text)

```typescript
{
  MessageSid: "SM1234567890",
  From: "+15555551234",
  To: "+15555556789",
  Body: "Met Sarah at the coffee shop. She's into hiking and photography.",
  NumMedia: "0"
}
```

### MMS (Audio)

```typescript
{
  MessageSid: "MM1234567890",
  From: "+15555551234",
  To: "+15555556789",
  Body: "Voice note about John",
  NumMedia: "1",
  MediaUrl0: "https://api.twilio.com/...",
  MediaContentType0: "audio/ogg"
}
```

### MMS (Image)

```typescript
{
  MessageSid: "MM1234567890",
  From: "+15555551234",
  To: "+15555556789",
  Body: "Business card from networking event",
  NumMedia: "1",
  MediaUrl0: "https://api.twilio.com/...",
  MediaContentType0: "image/jpeg"
}
```

### MMS (Video)

```typescript
{
  MessageSid: "MM1234567890",
  From: "+15555551234",
  To: "+15555556789",
  Body: "Video from the party",
  NumMedia: "1",
  MediaUrl0: "https://api.twilio.com/...",
  MediaContentType0: "video/mp4"
}
```

## Database Storage

### Enrichment Items Schema

Enrichments are stored in the `enrichment_items` table with the following structure:

```sql
CREATE TABLE enrichment_items (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    item_type VARCHAR(20) NOT NULL,  -- 'field', 'tag', 'group', 'lastContactDate'
    action VARCHAR(10) NOT NULL,      -- 'add', 'update'
    field_name VARCHAR(50),           -- For field enrichments
    value TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'web', -- 'sms', 'mms', 'web', 'voice'
    source_metadata JSONB,            -- Additional metadata
    accepted BOOLEAN DEFAULT FALSE,   -- User approval status
    applied BOOLEAN DEFAULT FALSE,    -- Whether applied to contact
    created_at TIMESTAMP
);
```

### Source Metadata

#### SMS Messages

```json
{
  "phoneNumber": "+15555551234",
  "messageSid": "SM1234567890",
  "originalMessage": "Met Sarah at the coffee shop..."
}
```

#### MMS Messages (Audio)

```json
{
  "phoneNumber": "+15555551234",
  "messageSid": "MM1234567890",
  "mediaType": "audio/ogg",
  "originalMessage": "Voice note about John",
  "transcript": "I just met John at the gym. He's really into CrossFit..."
}
```

#### MMS Messages (Image/Video)

```json
{
  "phoneNumber": "+15555551234",
  "messageSid": "MM1234567890",
  "mediaType": "image/jpeg",
  "originalMessage": "Business card from networking event"
}
```

## Error Handling

### Recoverable Errors

The following errors trigger automatic retry with exponential backoff:

- Network timeouts
- Temporary API unavailability
- Rate limits from external services
- Database connection pool exhaustion

**Retry Configuration:**
- Max attempts: 3
- Initial delay: 1000ms
- Max delay: 10000ms
- Backoff multiplier: 2x

### Unrecoverable Errors

The following errors fail immediately without retry:

- Invalid credentials
- Authentication failures
- Malformed media files
- Unsupported media types
- Quota exceeded
- Permission denied
- File size exceeds limit

### Error Logging

All errors are logged with context:

```typescript
{
  messageSid: "MM1234567890",
  userId: "user-123",
  messageType: "mms",
  contentType: "audio",
  error: "Failed to transcribe audio: ...",
  attempt: 2,
  maxAttempts: 3
}
```

## Performance Considerations

### Async Processing

The message processor runs asynchronously after the webhook returns a response to Twilio. This ensures:

- Webhook responds within 5 seconds (Twilio requirement)
- User receives immediate confirmation
- Processing happens in background
- Errors don't block webhook response

### Media File Cleanup

Temporary media files are automatically deleted after processing:

```typescript
try {
  const result = await this.aiProcessor.processContent(buffer, contentType);
  return result;
} finally {
  // Always cleanup, even if processing fails
  if (tempFilePath) {
    await this.mediaDownloader.deleteTempFile(tempFilePath);
  }
}
```

### Rate Limiting Integration

The processor increments the rate limit counter at the start of processing:

```typescript
await incrementSMSCounter(payload.From);
```

This ensures accurate tracking even if processing fails later.

## Testing

### Unit Tests

Test individual components:

```typescript
describe('MessageProcessor', () => {
  it('should detect SMS message type', () => {
    const payload = { NumMedia: '0' };
    const type = processor.detectMessageType(payload);
    expect(type).toBe(MessageType.SMS);
  });

  it('should detect audio content type', () => {
    const payload = {
      NumMedia: '1',
      MediaContentType0: 'audio/ogg',
    };
    const type = processor.detectContentType(payload);
    expect(type).toBe(ContentType.AUDIO);
  });
});
```

### Integration Tests

Test end-to-end flow:

```typescript
describe('Message Processing Flow', () => {
  it('should process SMS and store enrichments', async () => {
    const payload = {
      MessageSid: 'SM123',
      From: '+15555551234',
      Body: 'Met Sarah at coffee shop',
      NumMedia: '0',
    };

    const result = await messageProcessor.processMessage(payload, 'user-123');

    expect(result.success).toBe(true);
    expect(result.enrichmentIds.length).toBeGreaterThan(0);
  });
});
```

## Monitoring

### Key Metrics

- Messages processed per minute
- Processing success rate
- Average processing time
- Error rate by type
- Retry attempts
- Media file sizes

### Logging

All processing steps are logged:

```
Processing message: { messageSid: "MM123", userId: "user-123", messageType: "mms", contentType: "audio" }
Audio transcription completed in 2341ms: "I just met John..." (confidence: 0.95)
Image enrichment extraction completed in 1823ms
Stored 5 enrichment items for user user-123
```

## Requirements Mapping

- **Requirement 2.3**: Process messages and extract enrichments using AI
- **Requirement 2.4**: Store SMS enrichments with source type "sms"
- **Requirement 3.4**: Store audio MMS enrichments with source "mms" and media type "audio"
- **Requirement 4.4**: Store image MMS enrichments with source "mms" and media type "image"
- **Requirement 5.4**: Store video MMS enrichments with source "mms" and media type "video"
- **Requirement 6.1**: Store enrichments with status "pending" (accepted: false)
- **Requirement 9.1**: Log errors with context
- **Requirement 9.2**: Retry recoverable errors with exponential backoff
- **Requirement 10.2**: Delete temporary media files after processing

## Future Enhancements

1. **Queue-based Processing**: Use job queue (Bull, BullMQ) for better scalability
2. **Batch Processing**: Process multiple enrichments in a single transaction
3. **Smart Caching**: Cache AI responses for similar content
4. **Progress Tracking**: Real-time status updates for long-running processing
5. **Priority Queue**: Prioritize certain users or message types
6. **Dead Letter Queue**: Handle permanently failed messages
7. **Metrics Dashboard**: Real-time monitoring and alerting
