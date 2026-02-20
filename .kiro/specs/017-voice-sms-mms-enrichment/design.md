# Design Document

## Overview

The SMS/MMS Enrichment feature provides a mobile-first interface for capturing contact enrichment information through standard messaging. Users send text, voice, images, or videos to a dedicated Twilio phone number, which triggers a webhook to the CatchUp backend. The system processes the content using Google Cloud AI services (Speech-to-Text and Gemini), extracts structured enrichment data, and stores it for user review in the web application.

This design integrates with existing CatchUp infrastructure including the enrichment_items table, user authentication, and the web-based enrichment review interface.

## Architecture

### High-Level Flow

```
User Phone → Twilio Platform → CatchUp Webhook → Processing Pipeline → Database → Web App
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User's Phone                         │
│                    (Native Messaging App)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    SMS/MMS to Twilio Number
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Twilio Platform                         │
│  - Message Reception                                         │
│  - Media Hosting                                             │
│  - Webhook Delivery                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   CatchUp Backend (Node.js)                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Webhook Handler (/api/sms/webhook)                 │    │
│  │ - Signature validation                             │    │
│  │ - Message parsing                                  │    │
│  │ - User lookup                                      │    │
│  │ - Rate limiting                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Message Processor                                  │    │
│  │ - Content type detection                           │    │
│  │ - Media download                                   │    │
│  │ - Route to appropriate processor                   │    │
│  └────────────────────────────────────────────────────┘    │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ AI Processing Pipeline                             │    │
│  │ - Text → Gemini                                    │    │
│  │ - Audio → Speech-to-Text → Gemini                 │    │
│  │ - Image → Gemini Vision                            │    │
│  │ - Video → Gemini Multimodal                        │    │
│  └────────────────────────────────────────────────────┘    │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Enrichment Storage                                 │    │
│  │ - Store in enrichment_items                        │    │
│  │ - Link to user                                     │    │
│  │ - Set status: pending                              │    │
│  └────────────────────────────────────────────────────┘    │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Response Generator                                 │    │
│  │ - Generate TwiML response                          │    │
│  │ - Send confirmation to user                        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      CatchUp Web App                         │
│  - Display pending enrichments                               │
│  - Show source metadata                                      │
│  - Allow approve/edit/reject                                │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Webhook Handler Module

**Location:** `src/api/routes/sms-webhook.ts`

**Responsibilities:**
- Receive POST requests from Twilio
- Validate Twilio signature for security
- Parse message payload (SMS vs MMS)
- Look up user by phone number
- Apply rate limiting
- Queue message for processing
- Return TwiML response immediately

**Interface:**
```typescript
interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;  // User's phone number
  To: string;    // CatchUp phone number
  Body?: string; // Text content (SMS or MMS caption)
  NumMedia: string; // Number of media attachments
  MediaUrl0?: string;
  MediaContentType0?: string;
  // Additional media URLs for NumMedia > 1
}

interface WebhookResponse {
  statusCode: number;
  body: string; // TwiML XML
}
```

### 2. Phone Number Management Module

**Location:** `src/sms/phone-number-service.ts`

**Responsibilities:**
- Link phone numbers to user accounts
- Generate and send verification codes
- Validate verification codes
- Store verified phone numbers
- Handle phone number unlinking

**Interface:**
```typescript
interface PhoneNumberService {
  linkPhoneNumber(userId: number, phoneNumber: string): Promise<void>;
  sendVerificationCode(phoneNumber: string): Promise<void>;
  verifyCode(phoneNumber: string, code: string): Promise<boolean>;
  unlinkPhoneNumber(userId: number): Promise<void>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | null>;
}
```

### 3. Message Processor Module

**Location:** `src/sms/message-processor.ts`

**Responsibilities:**
- Determine message type (text, audio, image, video)
- Download media files from Twilio URLs
- Route to appropriate AI processor
- Handle processing errors with retries
- Store enrichments in database

**Interface:**
```typescript
interface MessageProcessor {
  processMessage(payload: TwilioWebhookPayload, user: User): Promise<void>;
}

interface ProcessingResult {
  enrichments: EnrichmentData[];
  processingTime: number;
  errors?: string[];
}
```

### 4. AI Processing Module

**Location:** `src/sms/ai-processor.ts`

**Responsibilities:**
- Transcribe audio using Speech-to-Text API
- Extract enrichments using Gemini API
- Handle multimodal content (images, videos)
- Parse structured responses from AI
- Handle AI service errors

**Interface:**
```typescript
interface AIProcessor {
  transcribeAudio(audioBuffer: Buffer): Promise<string>;
  extractFromText(text: string): Promise<EnrichmentData>;
  extractFromImage(imageBuffer: Buffer): Promise<EnrichmentData>;
  extractFromVideo(videoBuffer: Buffer): Promise<EnrichmentData>;
}

interface EnrichmentData {
  contacts: Array<{
    name: string;
    context: string;
  }>;
  tags: string[];
  locations: string[];
  notes: string;
}
```

### 5. Media Downloader Module

**Location:** `src/sms/media-downloader.ts`

**Responsibilities:**
- Download media files from Twilio URLs
- Validate file sizes (max 5MB)
- Handle download timeouts
- Temporary storage management
- Cleanup after processing

**Interface:**
```typescript
interface MediaDownloader {
  downloadMedia(url: string, authToken: string): Promise<Buffer>;
  validateMediaSize(buffer: Buffer, maxSizeMB: number): boolean;
  cleanupTempFiles(olderThanDays: number): Promise<void>;
}
```

### 6. Rate Limiter Module

**Location:** `src/sms/rate-limiter.ts`

**Responsibilities:**
- Track message counts per phone number
- Enforce hourly limits (20 messages/hour)
- Store counters in Redis or memory
- Reset counters after time window
- Provide rate limit status

**Interface:**
```typescript
interface RateLimiter {
  checkLimit(phoneNumber: string): Promise<boolean>;
  incrementCounter(phoneNumber: string): Promise<void>;
  getRemainingQuota(phoneNumber: string): Promise<number>;
}
```

### 7. TwiML Response Generator

**Location:** `src/sms/twiml-generator.ts`

**Responsibilities:**
- Generate TwiML XML responses
- Create confirmation messages
- Create error messages
- Create rate limit messages

**Interface:**
```typescript
interface TwiMLGenerator {
  generateConfirmation(): string;
  generateError(message: string): string;
  generateRateLimitMessage(resetTime: Date): string;
}
```

## Data Models

### Database Schema Changes

**New Table: user_phone_numbers**

```sql
CREATE TABLE user_phone_numbers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  encrypted_phone_number TEXT NOT NULL, -- AES-256 encrypted
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  verification_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX idx_user_phone_numbers_phone ON user_phone_numbers(phone_number);
```

**Enhanced Table: enrichment_items**

Existing table with new columns:

```sql
ALTER TABLE enrichment_items 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB;

-- source values: 'web', 'sms', 'mms'
-- source_metadata example:
-- {
--   "phone_number": "+15555551234",
--   "media_type": "audio/ogg",
--   "message_sid": "MM1234567890",
--   "original_message": "Check out this business card"
-- }
```

### TypeScript Interfaces

```typescript
interface UserPhoneNumber {
  id: number;
  userId: number;
  phoneNumber: string;
  verified: boolean;
  verificationCode?: string;
  verificationExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface EnrichmentItem {
  id: number;
  userId: number;
  contactId?: number;
  enrichmentType: 'tag' | 'note' | 'location' | 'relationship';
  content: string;
  source: 'web' | 'sms' | 'mms';
  sourceMetadata?: {
    phoneNumber?: string;
    mediaType?: string;
    messageSid?: string;
    originalMessage?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the acceptance criteria, several properties are redundant or can be combined. Properties 8.1 and 8.2 both test rate limiting enforcement and can be combined. Properties 4.5 and 5.5 both test the same size validation logic and can be combined into a single property.

Property 1: Verification code generation
*For any* valid phone number provided by a user, the system should generate and send a verification code via SMS
**Validates: Requirements 1.1**

Property 2: Valid code acceptance
*For any* user with a pending verification code, when a valid code is entered, the phone number should be linked to their account and marked as verified
**Validates: Requirements 1.2**

Property 3: Invalid code rejection
*For any* user with a pending verification code, when an invalid code is entered, the verification should be rejected and the phone number should remain unverified
**Validates: Requirements 1.3**

Property 4: Code expiration enforcement
*For any* verification code older than 10 minutes, the system should reject it and require a new code to be requested
**Validates: Requirements 1.4**

Property 5: Phone number unlinking
*For any* user with a linked phone number, when they unlink it, the association should be removed and messages from that number should no longer be processed
**Validates: Requirements 1.5**

Property 6: Webhook signature validation
*For any* incoming webhook request, the system should validate the X-Twilio-Signature header before processing the message
**Validates: Requirements 7.1**

Property 7: Invalid signature rejection
*For any* webhook request with an invalid signature, the system should reject it with HTTP 403 status and not process the message
**Validates: Requirements 7.2**

Property 8: Valid signature processing
*For any* webhook request with a valid signature, the system should proceed with message processing
**Validates: Requirements 7.3**

Property 9: Security event logging
*For any* unauthorized webhook request, the system should log a security event with relevant details for audit purposes
**Validates: Requirements 7.5**

Property 10: SMS source tagging
*For any* text message processed, the resulting enrichment items should have source type "sms"
**Validates: Requirements 2.4**

Property 11: Voice note metadata tagging
*For any* audio MMS processed, the resulting enrichment items should have source type "mms" and media type "audio"
**Validates: Requirements 3.4**

Property 12: Audio transcription error handling
*For any* audio file where transcription fails, the system should log the error and notify the user of the processing failure
**Validates: Requirements 3.5**

Property 13: Image metadata tagging
*For any* image MMS processed, the resulting enrichment items should have source type "mms" and media type "image"
**Validates: Requirements 4.4**

Property 14: Media size validation
*For any* media file (image or video) exceeding 5MB, the system should reject the message and notify the user of the size limit
**Validates: Requirements 4.5, 5.5**

Property 15: Video metadata tagging
*For any* video MMS processed, the resulting enrichment items should have source type "mms" and media type "video"
**Validates: Requirements 5.4**

Property 16: Pending status initialization
*For any* enrichment extracted from a message, it should be stored with status "pending"
**Validates: Requirements 6.1**

Property 17: Approval status transition
*For any* pending enrichment, when a user approves it, the status should be updated to "approved"
**Validates: Requirements 6.3**

Property 18: Edit persistence
*For any* enrichment, when a user edits the content, the modified content should be saved before applying it to the contact
**Validates: Requirements 6.4**

Property 19: Rejection status transition
*For any* pending enrichment, when a user rejects it, the status should be updated to "rejected" and it should not be applied to contacts
**Validates: Requirements 6.5**

Property 20: Rate limit enforcement
*For any* phone number, when more than 20 messages are sent within an hour, the system should reject additional messages until the time window resets
**Validates: Requirements 8.1, 8.2**

Property 21: Rate limit notification
*For any* message that exceeds the rate limit, the system should send a notification explaining the limit and when it will reset
**Validates: Requirements 8.3**

Property 22: Rate limit reset
*For any* phone number that was rate limited, after the time window expires, the system should resume normal message processing
**Validates: Requirements 8.4**

Property 23: Error logging with context
*For any* message processing failure, the system should log the error with context including user ID, message type, and error details
**Validates: Requirements 9.1**

Property 24: Retry logic for recoverable errors
*For any* recoverable error during message processing, the system should retry up to 3 times with exponential backoff
**Validates: Requirements 9.2**

Property 25: Failure notification after retries
*For any* message where all retry attempts fail, the system should notify the user of the processing failure
**Validates: Requirements 9.3**

Property 26: Unrecoverable error handling
*For any* unrecoverable error during message processing, the system should immediately notify the user without retrying
**Validates: Requirements 9.4**

Property 27: Phone number encryption
*For any* phone number stored in the database, it should be encrypted at rest using AES-256 encryption
**Validates: Requirements 10.1**

Property 28: Temporary media cleanup
*For any* media file downloaded during processing, it should be deleted after the enrichments are extracted
**Validates: Requirements 10.2**

Property 29: Metadata-only retention
*For any* enrichment stored, it should contain only extracted metadata and not the original media file
**Validates: Requirements 10.3**

Property 30: Account deletion cascade
*For any* user account deletion, all associated phone numbers and enrichment data should be removed from the system
**Validates: Requirements 10.5**

## Error Handling

### Error Categories

**1. Validation Errors (4xx)**
- Invalid phone number format
- Missing verification code
- Expired verification code
- Invalid signature
- Rate limit exceeded
- Media file too large

**2. Processing Errors (5xx)**
- Twilio API unavailable
- Speech-to-Text API failure
- Gemini API failure
- Database connection error
- Media download timeout

**3. Recoverable vs Unrecoverable**

Recoverable (retry with exponential backoff):
- Network timeouts
- Temporary API unavailability
- Rate limit from external services
- Database connection pool exhaustion

Unrecoverable (fail immediately):
- Invalid credentials
- Malformed media files
- Unsupported media types
- Quota exceeded errors
- Authentication failures

### Error Response Strategy

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    userMessage: string; // Friendly message for SMS response
    retryable: boolean;
  };
}
```

### Retry Configuration

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'RATE_LIMIT_EXTERNAL',
    'CONNECTION_POOL_EXHAUSTED'
  ]
};
```

### User Notification Messages

```typescript
const USER_MESSAGES = {
  SUCCESS: "Got it! Processing your enrichment. Check the web app to review.",
  RATE_LIMIT: "You've reached the limit of 20 messages per hour. Try again at {resetTime}.",
  FILE_TOO_LARGE: "File size exceeds 5MB limit. Please send a smaller file.",
  PROCESSING_ERROR: "Sorry, we couldn't process your message. Please try again later.",
  INVALID_MEDIA: "We couldn't process this media type. Please send text, voice, image, or video.",
  UNVERIFIED_NUMBER: "This phone number isn't linked to a CatchUp account. Visit the web app to link it."
};
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific functionality in isolation:

**Phone Number Service:**
- Verification code generation (6-digit numeric)
- Code expiration logic (10-minute window)
- Phone number encryption/decryption
- User lookup by phone number

**Message Processor:**
- Message type detection (SMS vs MMS)
- Content type routing (text, audio, image, video)
- Error classification (recoverable vs unrecoverable)

**Rate Limiter:**
- Counter increment logic
- Limit enforcement (20 messages/hour)
- Time window reset
- Quota calculation

**TwiML Generator:**
- XML structure validation
- Message formatting
- Special character escaping

### Property-Based Tests

Property-based tests will verify universal properties across many inputs using the **fast-check** library for TypeScript. Each test will run a minimum of 100 iterations.

**Testing Framework:** fast-check (https://github.com/dubzzz/fast-check)

**Property Test Requirements:**
- Each property-based test must run at least 100 iterations
- Each test must be tagged with a comment referencing the design document property
- Tag format: `// Feature: sms-mms-enrichment, Property {number}: {property_text}`
- Each correctness property must be implemented by a single property-based test

**Key Properties to Test:**

1. **Verification Code Properties:**
   - All generated codes are 6 digits
   - Codes expire after exactly 10 minutes
   - Valid codes always succeed verification
   - Invalid codes always fail verification

2. **Signature Validation Properties:**
   - All webhook requests are validated
   - Invalid signatures always result in 403
   - Valid signatures always allow processing

3. **Source Tagging Properties:**
   - SMS messages always tagged with source "sms"
   - Audio MMS always tagged with source "mms" and media type "audio"
   - Image MMS always tagged with source "mms" and media type "image"
   - Video MMS always tagged with source "mms" and media type "video"

4. **Rate Limiting Properties:**
   - 21st message in an hour is always rejected
   - After time window reset, messages are always accepted
   - Rate limit notifications always include reset time

5. **Status Transition Properties:**
   - New enrichments always have status "pending"
   - Approved enrichments always transition to "approved"
   - Rejected enrichments always transition to "rejected"

6. **Error Handling Properties:**
   - Recoverable errors always trigger retries (up to 3)
   - Unrecoverable errors never trigger retries
   - All errors always generate logs with required fields

7. **Security Properties:**
   - Stored phone numbers are always encrypted
   - Temporary media files are always deleted after processing
   - Account deletion always removes all associated data

### Integration Tests

Integration tests will verify end-to-end workflows:

**Webhook Flow:**
- Receive webhook from Twilio
- Validate signature
- Process message
- Store enrichment
- Return TwiML response

**Phone Number Verification Flow:**
- Request verification code
- Receive SMS with code
- Submit code
- Verify phone number linked

**Media Processing Flow:**
- Download media from Twilio
- Process with AI services
- Extract enrichments
- Store in database
- Clean up temporary files

**Rate Limiting Flow:**
- Send 20 messages successfully
- 21st message rejected
- Wait for time window reset
- Next message accepted

### Mock Strategy

**External Services to Mock:**
- Twilio API (webhook delivery, SMS sending)
- Google Speech-to-Text API
- Google Gemini API
- Redis (for rate limiting)

**Real Services in Tests:**
- PostgreSQL database (use test database)
- Internal business logic
- Data validation

## Security Considerations

### Authentication & Authorization

1. **Webhook Authentication:**
   - Validate X-Twilio-Signature on every request
   - Use HMAC-SHA1 with Twilio auth token
   - Reject requests with invalid signatures

2. **Phone Number Verification:**
   - Require verification before processing messages
   - 6-digit numeric codes
   - 10-minute expiration
   - One-time use only

3. **User Authorization:**
   - Only process messages from verified phone numbers
   - Link phone numbers to specific user accounts
   - Prevent unauthorized access to enrichments

### Data Protection

1. **Encryption at Rest:**
   - Phone numbers encrypted with AES-256
   - Use application-level encryption key
   - Store encrypted values in database

2. **Encryption in Transit:**
   - HTTPS for all webhook endpoints
   - TLS for database connections
   - Secure media downloads from Twilio

3. **Data Retention:**
   - Delete temporary media files after processing
   - Retain only extracted metadata
   - Auto-delete old temp files after 30 days
   - Cascade delete on account removal

### Rate Limiting & Abuse Prevention

1. **Message Rate Limits:**
   - 20 messages per hour per phone number
   - Track in Redis with automatic expiration
   - Clear error messages when limit exceeded

2. **Media Size Limits:**
   - Maximum 5MB per media file
   - Validate before downloading
   - Reject oversized files immediately

3. **Audit Logging:**
   - Log all security events
   - Track unauthorized access attempts
   - Monitor rate limit violations
   - Include timestamp, phone number, event type

### PII Handling

1. **Phone Numbers:**
   - Encrypt at rest
   - Mask in logs (show last 4 digits only)
   - Secure deletion on account removal

2. **Message Content:**
   - Process in memory only
   - Don't store original messages
   - Delete media files after extraction
   - Retain only structured metadata

3. **Enrichment Data:**
   - Store only extracted information
   - User controls approval/rejection
   - Support data export and deletion

## Performance Considerations

### Response Time Targets

- Webhook response: < 5 seconds (TwiML returned)
- Background processing: < 30 seconds (enrichment stored)
- Verification code delivery: < 10 seconds
- Rate limit check: < 100ms

### Scalability

**Horizontal Scaling:**
- Stateless webhook handlers
- Queue-based message processing
- Distributed rate limiting (Redis)
- Load balancer for multiple instances

**Async Processing:**
- Immediate TwiML response
- Background job for AI processing
- Queue for retry logic
- Webhook acknowledgment decoupled from processing

### Resource Management

**Media File Handling:**
- Stream downloads (don't load entire file in memory)
- Process and delete immediately
- Cleanup job for orphaned files
- Monitor disk usage

**API Rate Limits:**
- Respect Google Cloud quotas
- Implement backoff for rate limits
- Queue requests during high load
- Monitor API usage

**Database Connections:**
- Connection pooling
- Prepared statements
- Index on phone_number for fast lookups
- Batch inserts for enrichments

## Deployment Considerations

### Environment Variables

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15555556789

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GEMINI_API_KEY=your_gemini_api_key

# Database Configuration (existing)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=catchup_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Security Configuration (existing)
ENCRYPTION_KEY=your_encryption_key_here

# Redis Configuration (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Feature Flags
SMS_ENRICHMENT_ENABLED=true
RATE_LIMIT_MESSAGES_PER_HOUR=20
MAX_MEDIA_SIZE_MB=5
VERIFICATION_CODE_EXPIRY_MINUTES=10
```

### Database Migrations

**Migration 018: SMS/MMS Enrichment Schema**
- Create user_phone_numbers table
- Add source and source_metadata columns to enrichment_items
- Create indexes for performance

### Monitoring & Alerts

**Key Metrics:**
- Messages received per minute
- Processing success rate
- AI API latency
- Error rate by type
- Rate limit violations
- Media file sizes

**Alerts:**
- Processing error rate > 5%
- Webhook response time > 5s
- AI API failures
- Disk usage > 80%
- Rate limit violations spike

### Rollout Strategy

**Phase 1: Internal Testing (Week 1)**
- Deploy to staging environment
- Test with team phone numbers
- Verify all message types
- Monitor error rates

**Phase 2: Beta Testing (Week 2-3)**
- Invite 10-20 beta users
- Gather feedback on UX
- Monitor costs and performance
- Fix bugs and iterate

**Phase 3: Public Launch (Week 4)**
- Enable for all users
- Announce feature in app
- Provide user documentation
- Monitor adoption and costs

## Cost Estimation

### Monthly Cost Projections

**100 Enrichments/Month:**
- Twilio: $3.78
- Google Cloud AI: $0.67
- Total: ~$4.45/month

**1,000 Enrichments/Month:**
- Twilio: $27.40
- Google Cloud AI: $6.70
- Total: ~$34.10/month

**10,000 Enrichments/Month:**
- Twilio: $274.00
- Google Cloud AI: $67.00
- Total: ~$341.00/month

### Cost Optimization Strategies

1. **Batch Processing:**
   - Process multiple enrichments together
   - Reduce API call overhead

2. **Caching:**
   - Cache AI responses for similar content
   - Reduce duplicate processing

3. **Compression:**
   - Compress media before sending to AI
   - Reduce bandwidth costs

4. **Smart Routing:**
   - Use cheaper models for simple text
   - Reserve advanced models for complex media

## Future Enhancements

### Phase 2 Features (3-6 months)

1. **WhatsApp Integration:**
   - Add WhatsApp Business API
   - Support larger file sizes (16MB)
   - Richer media types
   - Read receipts

2. **Smart Suggestions:**
   - AI suggests which contact the message is about
   - Auto-link enrichments to contacts
   - Reduce manual review time

3. **Voice Commands:**
   - "Add tag photography to Sarah"
   - "Note that Mike is moving to Seattle"
   - Structured voice input

4. **Batch Operations:**
   - Send multiple enrichments in one message
   - Process group photos
   - Extract multiple contacts from one video

5. **Analytics Dashboard:**
   - Track enrichment sources
   - Monitor usage patterns
   - Cost breakdown by user

### Long-term Vision

- Multi-language support
- Custom AI models trained on user data
- Integration with other messaging platforms (Telegram, Signal)
- Voice-to-contact matching using voice recognition
- Automatic contact creation from business cards
