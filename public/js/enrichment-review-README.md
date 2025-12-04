# Enrichment Review UI - SMS/MMS Support

## Overview

The Enrichment Review UI has been enhanced to support enrichments from multiple sources: Web, SMS, and MMS. This allows users to review and manage contact enrichments captured through different channels.

## Features

### 1. Source Filtering

Users can filter enrichments by source:
- **All Sources** - View all pending enrichments
- **Web** - Enrichments created through the web interface
- **SMS** - Enrichments extracted from text messages
- **MMS** - Enrichments extracted from multimedia messages (voice notes, images, videos)

### 2. Source Badges

Each enrichment item displays a badge indicating its source:
- 🌐 **Web** - Blue badge for web-based enrichments
- 💬 **SMS** - Green badge for SMS enrichments
- 🎤 **Voice Note** - Pink badge for audio MMS
- 📷 **Image** - Pink badge for image MMS
- 🎥 **Video** - Pink badge for video MMS

### 3. Source Metadata Display

For SMS/MMS enrichments, additional metadata is displayed:
- **Original Message** - The original text message sent
- **Transcript** - Transcription of voice notes
- **From** - Masked phone number (last 4 digits shown for privacy)

### 4. Enrichment Management

Users can:
- **Accept/Reject** individual enrichments
- **Edit** enrichment values before applying
- **Accept All** - Accept all pending enrichments at once
- **Reject All** - Reject all pending enrichments at once
- **Apply Selected** - Apply only the accepted enrichments to contacts

## API Endpoints

### GET /api/enrichment-items

Fetch enrichment items with optional filters.

**Query Parameters:**
- `userId` (required) - User ID
- `source` (optional) - Filter by source: web, sms, mms
- `status` (optional) - Filter by status: pending, accepted, rejected
- `contactId` (optional) - Filter by contact ID

**Response:**
```json
[
  {
    "id": "uuid",
    "contactId": "uuid",
    "contactName": "John Doe",
    "itemType": "tag",
    "action": "add",
    "value": "hiking",
    "accepted": true,
    "applied": false,
    "source": "sms",
    "sourceMetadata": {
      "phoneNumber": "+15551234567",
      "originalMessage": "John loves hiking",
      "messageSid": "SM123456"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### PATCH /api/enrichment-items/:id

Update an enrichment item's acceptance status or value.

**Request Body:**
```json
{
  "userId": "uuid",
  "accepted": true,
  "value": "updated value"
}
```

**Response:**
```json
{
  "id": "uuid",
  "contactId": "uuid",
  "itemType": "tag",
  "value": "updated value",
  "accepted": true,
  "applied": false,
  "source": "sms",
  "sourceMetadata": {},
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### POST /api/enrichment-items/apply

Apply accepted enrichment items to contacts.

**Request Body:**
```json
{
  "userId": "uuid",
  "enrichmentIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "appliedCount": 3,
  "failedCount": 0,
  "errors": []
}
```

## Usage Example

### Loading Enrichments

```javascript
// Initialize enrichment review
const enrichmentReview = initEnrichmentReview();

// Load all pending enrichments
await enrichmentReview.loadEnrichmentItems('user-123', 'all');

// Load only SMS enrichments
await enrichmentReview.loadEnrichmentItems('user-123', 'sms');

// Load only MMS enrichments
await enrichmentReview.loadEnrichmentItems('user-123', 'mms');
```

### Filtering by Source

```javascript
// Filter by source using UI buttons
enrichmentReview.filterBySource('sms');
enrichmentReview.filterBySource('mms');
enrichmentReview.filterBySource('all');
```

### Applying Enrichments

```javascript
// Apply selected enrichments
await enrichmentReview.applySelectedItems();

// Accept all items
await enrichmentReview.acceptAllItems();

// Reject all items
await enrichmentReview.rejectAllItems();
```

## Database Schema

### enrichment_items Table

The `enrichment_items` table has been enhanced with source tracking:

```sql
ALTER TABLE enrichment_items 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB;
```

**Source Values:**
- `web` - Created through web interface
- `sms` - Extracted from SMS message
- `mms` - Extracted from MMS message

**Source Metadata Structure:**

For SMS:
```json
{
  "phoneNumber": "+15551234567",
  "originalMessage": "Text message content",
  "messageSid": "SM123456"
}
```

For MMS (Voice Note):
```json
{
  "phoneNumber": "+15551234567",
  "mediaType": "audio/ogg",
  "transcript": "Transcribed audio content",
  "messageSid": "MM123456"
}
```

For MMS (Image):
```json
{
  "phoneNumber": "+15551234567",
  "mediaType": "image/jpeg",
  "originalMessage": "Caption text",
  "messageSid": "MM123456"
}
```

For MMS (Video):
```json
{
  "phoneNumber": "+15551234567",
  "mediaType": "video/mp4",
  "transcript": "Transcribed audio from video",
  "messageSid": "MM123456"
}
```

## Testing

A test HTML file is provided at `public/js/enrichment-review.test.html` to verify the UI functionality.

**Test Scenarios:**
1. Load Web Enrichments - Display enrichments from web source
2. Load SMS Enrichments - Display enrichments from SMS messages
3. Load MMS Enrichments - Display enrichments from voice notes, images, and videos
4. Load Mixed Sources - Display enrichments from all sources
5. Filter by Source - Test source filtering functionality

**To Run Tests:**
1. Open `public/js/enrichment-review.test.html` in a browser
2. Click the test scenario buttons to load different data
3. Verify source badges, metadata display, and filtering work correctly

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 6.2** - Display all pending enrichments with their source information
- **Requirement 6.3** - Allow users to approve enrichments (update status to "approved")
- **Requirement 6.4** - Allow users to edit enrichments before applying
- **Requirement 6.5** - Allow users to reject enrichments (update status to "rejected")

## Privacy Considerations

- Phone numbers are masked in the UI (only last 4 digits shown)
- Original message content is displayed but can be hidden if needed
- Source metadata is stored securely in the database
- Users can only access their own enrichment items

## Future Enhancements

Potential improvements for future iterations:
1. Bulk editing of enrichment values
2. Enrichment history and audit trail
3. Smart suggestions based on source type
4. Automatic contact matching for unassigned enrichments
5. Rich media preview for image/video MMS
