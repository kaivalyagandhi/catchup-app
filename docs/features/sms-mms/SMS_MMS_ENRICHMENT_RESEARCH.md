# SMS/MMS Enrichment Integration Research

**Date:** November 27, 2025  
**Purpose:** Research and recommendation for building SMS/MMS-based contact enrichment feature for CatchUp

---

## Executive Summary

This document provides comprehensive research on building an SMS/MMS integration that allows users to send voice notes, images, videos, and text messages to a dedicated phone number for automatic contact enrichment processing.

**Recommendation:** Start with SMS/MMS via Twilio, add WhatsApp later if needed.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Technical Capabilities](#technical-capabilities)
3. [Cost Analysis](#cost-analysis)
4. [User Experience](#user-experience)
5. [Implementation Architecture](#implementation-architecture)
6. [WhatsApp Comparison](#whatsapp-comparison)
7. [Recommendation & Roadmap](#recommendation--roadmap)
8. [Technical Specifications](#technical-specifications)

---

## Feature Overview

### What Users Can Do

Users can send enrichment information to a dedicated CatchUp phone number via:

1. **Voice Messages** - Record voice notes about contacts
2. **Text Messages** - Quick text updates about people
3. **Images** - Photos of business cards, events, people
4. **Videos** - Video messages from events or gatherings

### How It Works

```
User sends message → Twilio receives → Webhook to CatchUp server
                                              ↓
                                    Process with AI (Gemini)
                                              ↓
                                    Store in enrichment_items
                                              ↓
                                    Display on web app for review
```

---

## Technical Capabilities

### ✅ Supported Message Types

#### 1. SMS (Text Messages)
- **Character limit:** 160 characters per segment
- **Cost:** $0.0075 per message received (US)
- **Use case:** Quick text updates about contacts
- **Example:** "Just met Sarah at the conference, she's into photography now"

#### 2. MMS (Multimedia Messages)

**Voice/Audio:**
- **Formats:** audio/ogg, audio/mpeg, audio/mp4, audio/3gpp, audio/amr
- **Size limit:** 5 MB
- **Cost:** $0.01-0.02 per message received (US)
- **Use case:** Voice notes while driving or walking

**Images:**
- **Formats:** JPEG, PNG, GIF, BMP, TIFF, HEIC, HEIF
- **Size limit:** 5 MB
- **Cost:** $0.01-0.02 per message received (US)
- **Use case:** Business cards, event photos, screenshots

**Videos:**
- **Formats:** MP4, MPEG, WebM, QuickTime, 3GPP, H.264, H.265
- **Size limit:** 5 MB
- **Cost:** $0.01-0.02 per message received (US)
- **Use case:** Video messages from events, group gatherings

**Documents:**
- **Formats:** PDF, vCard, CSV (limited support)
- **Size limit:** 5 MB
- **Cost:** $0.01-0.02 per message received (US)
- **Use case:** Contact cards, notes

### ✅ Media Processing with Google Gemini

**Gemini Multimodal Capabilities:**

1. **Text Processing**
   - Entity extraction
   - Contact name identification
   - Tag/interest extraction
   - Location detection

2. **Audio Processing**
   - Google Speech-to-Text transcription
   - Then Gemini entity extraction

3. **Image Processing**
   - Visual analysis
   - OCR (text extraction from business cards)
   - Scene understanding
   - Object detection

4. **Video Processing**
   - Multimodal content analysis
   - Audio + visual understanding
   - Event detection with timestamps

---

## Cost Analysis

### Twilio SMS/MMS Pricing

**Monthly Costs:**

| Component | Cost |
|-----------|------|
| Phone Number (US) | $1.15/month |
| SMS Received | $0.0075 per message |
| MMS Received | $0.01-0.02 per message |
| SMS Sent | $0.0079 per message |
| MMS Sent | $0.02 per message |

**Projected Monthly Costs:**

#### Scenario 1: 100 Enrichments/Month
- 50 voice notes (MMS): $1.00
- 30 text messages (SMS): $0.23
- 15 images (MMS): $0.30
- 5 videos (MMS): $0.10
- Phone number: $1.15
- Confirmations sent: $1.00
- **Total: ~$3.78/month**

#### Scenario 2: 1,000 Enrichments/Month
- 500 voice notes (MMS): $10.00
- 300 text messages (SMS): $2.25
- 150 images (MMS): $3.00
- 50 videos (MMS): $1.00
- Phone number: $1.15
- Confirmations sent: $10.00
- **Total: ~$27.40/month**

### Google Cloud Costs

**AI Processing:**
- **Speech-to-Text:** $0.006 per 15 seconds (voice notes only)
- **Gemini API:**
  - Text input: ~$0.00001 per 1K characters
  - Image input: ~$0.0025 per image
  - Video input: ~$0.02 per minute

**Estimated AI Costs (100 enrichments/month):**
- 50 voice notes (30 sec avg): $0.60
- 30 text messages: $0.01
- 15 images: $0.04
- 5 videos (30 sec avg): $0.02
- **Total: ~$0.67/month**

### Total Cost Estimate

| Volume | Twilio | Google Cloud | **Total** |
|--------|--------|--------------|-----------|
| 100/month | $3.78 | $0.67 | **$4.45** |
| 1,000/month | $27.40 | $6.70 | **$34.10** |

---

## User Experience

### Advantages

1. **Universal Access**
   - ✅ Works on every phone (no app required)
   - ✅ No WhatsApp account needed
   - ✅ Familiar interface (native messaging app)
   - ✅ Works internationally

2. **Simple Workflow**
   - User saves CatchUp number in contacts
   - Send message like texting a friend
   - Receive confirmation within seconds
   - Review enrichments on web app

3. **Flexible Input**
   - Voice note while driving
   - Quick text while in meeting
   - Photo of business card
   - Video from event

### User Flow

```
1. User meets someone interesting
   ↓
2. Opens messaging app
   ↓
3. Sends to CatchUp number:
   - Voice: "Just met Mike, he's into rock climbing"
   - Text: "Sarah mentioned she's planning a trip to Japan"
   - Image: Photo of business card
   - Video: Group dinner video
   ↓
4. Receives confirmation: "Got it! Processing your enrichment."
   ↓
5. Reviews on web app later
   ↓
6. Approves/edits/rejects enrichment
```

---

## Implementation Architecture

### System Components

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
│  - Receives message                                          │
│  - Validates sender                                          │
│  - Sends webhook to CatchUp                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   CatchUp Backend (Node.js)                  │
│                                                              │
│  1. Webhook Handler (/api/sms-webhook)                      │
│     - Validate Twilio signature                             │
│     - Parse message type (SMS/MMS)                          │
│     - Extract media URLs                                    │
│                                                              │
│  2. Media Processor                                         │
│     - Download media files                                  │
│     - Determine content type                                │
│                                                              │
│  3. AI Processing Pipeline                                  │
│     ┌─────────────────────────────────────────┐            │
│     │ Voice → Speech-to-Text → Transcript     │            │
│     │ Text → Direct to Gemini                 │            │
│     │ Image → Gemini Vision                   │            │
│     │ Video → Gemini Multimodal               │            │
│     └─────────────────────────────────────────┘            │
│                                                              │
│  4. Enrichment Extraction (Gemini)                          │
│     - Extract contact names                                 │
│     - Identify tags/interests                               │
│     - Detect locations                                      │
│     - Parse relationship context                            │
│                                                              │
│  5. Database Storage                                        │
│     - Store in enrichment_items table                       │
│     - Link to user via phone number                         │
│     - Mark as pending review                                │
│                                                              │
│  6. Confirmation Response                                   │
│     - Send TwiML response                                   │
│     - Confirm receipt to user                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      CatchUp Web App                         │
│  - Display pending enrichments                               │
│  - Show source: "SMS" or "MMS"                              │
│  - Allow approve/edit/reject                                │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

**Existing Tables (No Changes Needed):**

```sql
-- enrichment_items table (already exists)
CREATE TABLE enrichment_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  contact_id INTEGER REFERENCES contacts(id),
  enrichment_type VARCHAR(50), -- 'tag', 'note', 'location', etc.
  content TEXT,
  source VARCHAR(50), -- NEW: 'sms', 'mms', 'web', 'whatsapp'
  source_metadata JSONB, -- NEW: { phone_number, media_type, etc. }
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**New Table for Phone Number Mapping:**

```sql
-- user_phone_numbers table (new)
CREATE TABLE user_phone_numbers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  verification_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_phone_numbers_phone ON user_phone_numbers(phone_number);
CREATE INDEX idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
```

### API Endpoints

**New Endpoints:**

```typescript
// Webhook endpoint (receives from Twilio)
POST /api/sms/webhook
  - Validates Twilio signature
  - Processes incoming SMS/MMS
  - Returns TwiML response

// User phone number management
POST /api/user/phone-number
  - Links user's phone number to account
  - Sends verification code via SMS
  
POST /api/user/phone-number/verify
  - Verifies phone number with code
  
GET /api/user/phone-number
  - Gets user's linked phone number
  
DELETE /api/user/phone-number
  - Unlinks phone number from account
```

### Code Structure

```
src/
├── api/
│   └── routes/
│       ├── sms-webhook.ts          # NEW: Twilio webhook handler
│       └── user-phone-numbers.ts   # NEW: Phone number management
│
├── sms/                             # NEW: SMS/MMS module
│   ├── webhook-handler.ts          # Parse Twilio webhooks
│   ├── media-downloader.ts         # Download MMS media
│   ├── message-processor.ts        # Route to appropriate processor
│   └── twiml-responder.ts          # Generate TwiML responses
│
├── voice/                           # EXISTING: Enhance for SMS
│   ├── transcription-service.ts    # Already exists
│   └── enrichment-service.ts       # Enhance for multimodal
│
└── integrations/                    # EXISTING
    └── twilio-client.ts            # NEW: Twilio SDK wrapper
```

---

## WhatsApp Comparison

### Why We're NOT Starting with WhatsApp

| Factor | SMS/MMS | WhatsApp | Winner |
|--------|---------|----------|--------|
| **Setup Time** | 2-4 hours | 2-3 days | SMS |
| **Complexity** | Low | High (Meta Business Manager) | SMS |
| **User Barrier** | None (universal) | Requires WhatsApp app | SMS |
| **Verification** | None required | Business verification needed | SMS |
| **Testing** | Immediate | Requires approval | SMS |
| **Cost (100 msgs)** | $3.78 | $0.00 | WhatsApp |
| **Cost (1000 msgs)** | $27.40 | $0.00 | WhatsApp |

### When to Add WhatsApp

Add WhatsApp **after** SMS/MMS when:

1. ✅ You have 100+ active users (cost savings matter)
2. ✅ Users explicitly request it
3. ✅ You have international users (WhatsApp is free for them)
4. ✅ You need larger file sizes (16MB vs 5MB)
5. ✅ You want richer features (read receipts, typing indicators)

**Estimated Timeline:** Add WhatsApp 3-6 months after SMS/MMS launch

---

## Recommendation & Roadmap

### Phase 1: SMS/MMS MVP (Week 1-2)

**Goal:** Launch basic SMS/MMS enrichment feature

**Tasks:**
1. Set up Twilio account and phone number
2. Build webhook endpoint
3. Implement phone number verification
4. Process text messages
5. Process voice messages (MMS)
6. Store enrichments in database
7. Display in web app

**Deliverables:**
- Users can send text and voice messages
- Automatic enrichment extraction
- Web app displays pending enrichments

---

### Phase 2: Enhanced Media Support (Week 3-4)

**Goal:** Add image and video processing

**Tasks:**
1. Implement image download and processing
2. Add Gemini Vision integration
3. Implement video processing
4. Add OCR for business cards
5. Enhanced error handling

**Deliverables:**
- Users can send images and videos
- Business card OCR
- Visual context extraction

---

### Phase 3: Polish & Optimization (Week 5-6)

**Goal:** Improve UX and reliability

**Tasks:**
1. Add retry logic for failed processing
2. Implement rate limiting
3. Add usage analytics
4. Improve confirmation messages
5. Add help/info responses

**Deliverables:**
- Robust error handling
- Usage tracking
- Better user feedback

---

### Phase 4: WhatsApp (Optional, Month 4-6)

**Goal:** Add WhatsApp as alternative channel

**Prerequisites:**
- 100+ active SMS users
- User demand for WhatsApp
- Budget for setup time

**Tasks:**
1. Set up Meta Business Manager
2. Create WhatsApp Business Account
3. Build WhatsApp webhook
4. Unified processing pipeline
5. Let users choose channel

---

## Technical Specifications

### Twilio Webhook Payload

**SMS Message:**
```json
{
  "MessageSid": "SM1234567890abcdef",
  "AccountSid": "AC1234567890abcdef",
  "MessagingServiceSid": "MG1234567890abcdef",
  "From": "+15555551234",
  "To": "+15555556789",
  "Body": "Just met Sarah at the conference",
  "NumMedia": "0"
}
```

**MMS Message (with media):**
```json
{
  "MessageSid": "MM1234567890abcdef",
  "AccountSid": "AC1234567890abcdef",
  "From": "+15555551234",
  "To": "+15555556789",
  "Body": "Check out this business card",
  "NumMedia": "1",
  "MediaUrl0": "https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...",
  "MediaContentType0": "image/jpeg"
}
```

### Webhook Handler Implementation

```typescript
// src/api/routes/sms-webhook.ts
import express from 'express';
import twilio from 'twilio';
import { processSmsEnrichment } from '../../sms/message-processor';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  // 1. Validate Twilio signature
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature as string,
    url,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).send('Forbidden');
  }
  
  // 2. Extract message data
  const {
    From: phoneNumber,
    Body: messageBody,
    NumMedia: numMedia,
    MediaUrl0: mediaUrl,
    MediaContentType0: mediaType
  } = req.body;
  
  // 3. Process message asynchronously
  processSmsEnrichment({
    phoneNumber,
    messageBody,
    numMedia: parseInt(numMedia || '0'),
    mediaUrl,
    mediaType
  }).catch(error => {
    console.error('Error processing SMS enrichment:', error);
  });
  
  // 4. Send immediate confirmation
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message('Got it! Processing your enrichment. Check the web app to review.');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

export default router;
```

### Message Processor

```typescript
// src/sms/message-processor.ts
import { downloadMedia } from './media-downloader';
import { transcribeAudio } from '../voice/transcription-service';
import { extractEnrichments } from '../voice/enrichment-service';
import { getUserByPhoneNumber } from '../db/user-repository';
import { storeEnrichment } from '../db/enrichment-repository';

interface SmsMessage {
  phoneNumber: string;
  messageBody?: string;
  numMedia: number;
  mediaUrl?: string;
  mediaType?: string;
}

export async function processSmsEnrichment(message: SmsMessage) {
  // 1. Find user by phone number
  const user = await getUserByPhoneNumber(message.phoneNumber);
  if (!user) {
    console.warn(`Unknown phone number: ${message.phoneNumber}`);
    return;
  }
  
  let contentForAI: string | Buffer;
  let messageType: 'text' | 'voice' | 'image' | 'video';
  
  // 2. Determine message type and prepare content
  if (message.numMedia > 0 && message.mediaUrl) {
    // MMS with media
    const mediaBuffer = await downloadMedia(message.mediaUrl);
    
    if (message.mediaType?.startsWith('audio/')) {
      // Voice message
      messageType = 'voice';
      const transcript = await transcribeAudio(mediaBuffer);
      contentForAI = transcript;
    } else if (message.mediaType?.startsWith('image/')) {
      // Image message
      messageType = 'image';
      contentForAI = mediaBuffer;
    } else if (message.mediaType?.startsWith('video/')) {
      // Video message
      messageType = 'video';
      contentForAI = mediaBuffer;
    } else {
      console.warn(`Unsupported media type: ${message.mediaType}`);
      return;
    }
  } else {
    // Plain SMS text
    messageType = 'text';
    contentForAI = message.messageBody || '';
  }
  
  // 3. Extract enrichments with Gemini
  const enrichments = await extractEnrichments(contentForAI, messageType);
  
  // 4. Store in database
  for (const enrichment of enrichments) {
    await storeEnrichment({
      userId: user.id,
      ...enrichment,
      source: message.numMedia > 0 ? 'mms' : 'sms',
      sourceMetadata: {
        phoneNumber: message.phoneNumber,
        mediaType: message.mediaType,
        originalMessage: message.messageBody
      },
      status: 'pending'
    });
  }
}
```

### Gemini Multimodal Processing

```typescript
// src/voice/enrichment-service.ts (enhanced)
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function extractEnrichments(
  content: string | Buffer,
  type: 'text' | 'voice' | 'image' | 'video'
) {
  const prompt = `
Extract contact enrichment information from this ${type} message.

Identify:
- Contact names mentioned
- Tags/interests (hobbies, activities, topics)
- Locations mentioned
- Relationship context
- Any notable events or plans

Return as JSON:
{
  "contacts": [
    {
      "name": "string",
      "context": "string"
    }
  ],
  "tags": ["string"],
  "locations": ["string"],
  "notes": "string"
}
`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  let parts: any[];
  
  if (type === 'text' || type === 'voice') {
    // Text-only request
    parts = [
      { text: prompt },
      { text: content as string }
    ];
  } else if (type === 'image') {
    // Image + text request
    parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: (content as Buffer).toString('base64')
        }
      }
    ];
  } else if (type === 'video') {
    // Video + text request
    parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: 'video/mp4',
          data: (content as Buffer).toString('base64')
        }
      }
    ];
  }
  
  const result = await model.generateContent({ contents: [{ parts }] });
  const response = result.response.text();
  
  // Parse JSON response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}
```

---

## Security Considerations

### Webhook Security

1. **Validate Twilio Signature**
   - Every webhook must validate X-Twilio-Signature header
   - Prevents unauthorized requests
   - Use `twilio.validateRequest()`

2. **Phone Number Verification**
   - Users must verify phone number before use
   - Send verification code via SMS
   - Store verified numbers in database

3. **Rate Limiting**
   - Limit messages per phone number per hour
   - Prevent abuse and spam
   - Use Redis for rate limit tracking

### Data Privacy

1. **PII Protection**
   - Encrypt phone numbers at rest
   - Secure media file storage
   - Auto-delete processed media after 30 days

2. **User Consent**
   - Clear opt-in process
   - Easy opt-out mechanism
   - Privacy policy compliance

---

## Testing Strategy

### Unit Tests

```typescript
// Test message processor
describe('processSmsEnrichment', () => {
  it('should process text message', async () => {
    const message = {
      phoneNumber: '+15555551234',
      messageBody: 'Met Sarah at conference',
      numMedia: 0
    };
    
    await processSmsEnrichment(message);
    
    // Assert enrichment was created
    const enrichments = await getEnrichmentsByUser(userId);
    expect(enrichments).toHaveLength(1);
    expect(enrichments[0].source).toBe('sms');
  });
  
  it('should process voice message', async () => {
    const message = {
      phoneNumber: '+15555551234',
      numMedia: 1,
      mediaUrl: 'https://example.com/audio.ogg',
      mediaType: 'audio/ogg'
    };
    
    await processSmsEnrichment(message);
    
    // Assert enrichment was created from transcription
    const enrichments = await getEnrichmentsByUser(userId);
    expect(enrichments[0].source).toBe('mms');
  });
});
```

### Integration Tests

```typescript
// Test Twilio webhook
describe('POST /api/sms/webhook', () => {
  it('should accept valid Twilio webhook', async () => {
    const response = await request(app)
      .post('/api/sms/webhook')
      .set('X-Twilio-Signature', validSignature)
      .send(twilioPayload);
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('<Response>');
  });
  
  it('should reject invalid signature', async () => {
    const response = await request(app)
      .post('/api/sms/webhook')
      .set('X-Twilio-Signature', 'invalid')
      .send(twilioPayload);
    
    expect(response.status).toBe(403);
  });
});
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Usage Metrics**
   - Messages received per day
   - Message type breakdown (SMS/MMS/voice/image/video)
   - Active users per day
   - Average enrichments per user

2. **Performance Metrics**
   - Webhook response time
   - AI processing time
   - Media download time
   - End-to-end processing time

3. **Quality Metrics**
   - Enrichment approval rate
   - Enrichment rejection rate
   - AI extraction accuracy
   - User satisfaction

4. **Cost Metrics**
   - Twilio costs per day
   - Google Cloud costs per day
   - Cost per enrichment
   - Cost per user

### Logging

```typescript
// Log all SMS/MMS events
logger.info('SMS received', {
  phoneNumber: message.phoneNumber,
  messageType: message.numMedia > 0 ? 'mms' : 'sms',
  mediaType: message.mediaType,
  userId: user.id
});

logger.info('Enrichment extracted', {
  userId: user.id,
  contactsFound: enrichments.contacts.length,
  tagsFound: enrichments.tags.length,
  processingTime: endTime - startTime
});
```

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ Review this research document
2. ✅ Create spec for SMS/MMS integration
3. ✅ Set up Twilio trial account
4. ✅ Purchase phone number
5. ✅ Test basic SMS receiving

### Development (Week 1-2)

1. Build webhook endpoint
2. Implement phone number verification
3. Process text and voice messages
4. Store enrichments in database
5. Display in web app

### Launch (Week 3)

1. Internal testing with team
2. Beta testing with 5-10 users
3. Gather feedback
4. Fix bugs
5. Public launch

---

## Appendix

### Useful Links

- **Twilio SMS API:** https://www.twilio.com/docs/sms/api
- **Twilio MMS Guide:** https://www.twilio.com/docs/sms/accepted-mime-types
- **Twilio Webhooks:** https://www.twilio.com/docs/sms/tutorials/how-to-receive-and-reply
- **Google Gemini API:** https://ai.google.dev/gemini-api/docs
- **Google Speech-to-Text:** https://cloud.google.com/speech-to-text/docs

### Environment Variables Needed

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15555556789

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GEMINI_API_KEY=your_gemini_api_key

# Database (already configured)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=catchup_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Encryption (already configured)
ENCRYPTION_KEY=your_encryption_key
```

### Sample User Instructions

**How to Use CatchUp SMS Enrichment:**

1. **Save the Number**
   - Add +1-555-555-6789 to your contacts as "CatchUp"

2. **Send Enrichments**
   - Text: "Just met Mike, he's into photography"
   - Voice: Record a voice message about someone
   - Image: Send a photo of a business card
   - Video: Share a video from an event

3. **Get Confirmation**
   - You'll receive: "Got it! Processing your enrichment."

4. **Review on Web**
   - Log into CatchUp web app
   - Go to "Pending Enrichments"
   - Approve, edit, or reject

---

**End of Document**
