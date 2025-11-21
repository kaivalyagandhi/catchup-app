# Calendar Feed Implementation

## Overview

This implementation provides calendar feed publishing functionality for CatchUp suggestions. Users can subscribe to their suggestions via iCal or Google Calendar, and the feed updates automatically when suggestion statuses change.

**Requirements Implemented:** 8.1, 8.2, 8.3, 8.4

## Features

### 1. Feed Publishing (Requirement 8.1, 8.2)

Generate signed URLs for calendar subscription:

```typescript
import { publishSuggestionFeed } from './calendar/feed-service';

// Generate feed URLs for a user
const feedUrls = publishSuggestionFeed(userId);

console.log(feedUrls.iCalUrl);           // Direct iCal subscription URL
console.log(feedUrls.googleCalendarUrl); // Google Calendar subscription URL
console.log(feedUrls.expiresAt);         // Token expiration date
```

**Security Features:**
- Signed URLs with HMAC-SHA256 signatures
- Configurable expiration (default: 30 days / 720 hours)
- Token verification on each feed access
- No authentication required once subscribed (token-based access)

### 2. Feed Content Generation (Requirement 8.1, 8.4)

Generate iCal format content from suggestions:

```typescript
import { generateFeedContent } from './calendar/feed-service';

// Fetch user's suggestions and contacts
const suggestions = await getUserSuggestions(userId, [
  SuggestionStatus.PENDING,
  SuggestionStatus.ACCEPTED,
]);
const contacts = await getContactsByIds(userId, contactIds);
const contactMap = new Map(contacts.map(c => [c.id, c]));

// Generate iCal content
const iCalContent = generateFeedContent(suggestions, contactMap);
```

**Feed Content Includes:**
- Contact name in event summary
- Reasoning and contact details in description
- Proposed timeslot (start/end times)
- Event status (TENTATIVE for pending, CONFIRMED for accepted)
- Unique event UIDs for proper calendar sync
- TRANSPARENT transparency (doesn't block time)

### 3. Real-time Feed Updates (Requirement 8.3)

Trigger feed updates when suggestion status changes:

```typescript
import { updateFeedEvent } from './calendar/feed-service';

// After accepting/dismissing/snoozing a suggestion
await updateSuggestionStatus(suggestionId, newStatus);
await updateFeedEvent(suggestionId);
```

**Update Behavior:**
- Feed is regenerated on-demand when accessed
- No caching by default (always fresh data)
- Future: Can add cache invalidation and webhook notifications

### 4. Token Verification (Security)

Verify signed tokens before serving feeds:

```typescript
import { verifySignedToken } from './calendar/feed-service';

const verified = verifySignedToken(token);

if (!verified) {
  // Token is invalid or expired
  return res.status(401).send('Invalid or expired feed token');
}

const { userId, expiresAt } = verified;
// Proceed to serve feed for this user
```

## API Integration Example

See `src/calendar/feed-api-example.ts` for complete Express.js integration:

```typescript
// Generate feed URLs
GET /api/calendar/feed/publish
Response: { iCalUrl, googleCalendarUrl, expiresAt }

// Serve iCal feed
GET /api/calendar/feed/:token.ics
Response: iCal format text/calendar

// Trigger feed update (called internally)
POST /api/suggestions/:id/accept
POST /api/suggestions/:id/dismiss
```

## Configuration

### Environment Variables

```bash
# Base URL for feed generation
BASE_URL=https://your-domain.com

# Secret key for signing feed tokens (REQUIRED in production)
FEED_SECRET=your-secure-random-secret-key
```

**Important:** Change `FEED_SECRET` in production! The default value is insecure.

### Token Expiration

Default expiration is 30 days (720 hours). Customize when publishing:

```typescript
// Generate feed with 7-day expiration
const feedUrls = publishSuggestionFeed(userId, 168); // 168 hours = 7 days
```

## iCal Format Details

The generated iCal feed follows RFC 5545 standards:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CatchUp//Relationship Manager//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:CatchUp Suggestions
X-WR-CALDESC:Intelligent suggestions for catching up with friends
X-WR-TIMEZONE:UTC

BEGIN:VEVENT
UID:catchup-{suggestion-id}@catchup.app
DTSTAMP:20250121T010000Z
DTSTART:20250122T140000Z
DTEND:20250122T150000Z
SUMMARY:Catch up with Alice Johnson
DESCRIPTION:It has been 2 weeks since you last connected\n\nContact: Alice Johnson\nPhone: +1234567890\nEmail: alice@example.com
STATUS:TENTATIVE
CREATED:20250121T010000Z
LAST-MODIFIED:20250121T010000Z
TRANSP:TRANSPARENT
END:VEVENT

END:VCALENDAR
```

### Event Status Mapping

| Suggestion Status | iCal Status |
|------------------|-------------|
| PENDING          | TENTATIVE   |
| ACCEPTED         | CONFIRMED   |
| DISMISSED        | CANCELLED   |
| SNOOZED          | TENTATIVE   |

### Special Characters

The implementation properly escapes special characters in iCal format:
- `;` → `\;`
- `,` → `\,`
- `\n` → `\\n`
- `\` → `\\`

## User Workflow

1. **Initial Setup**
   - User requests feed URLs via API
   - System generates signed URLs with expiration
   - User subscribes in their calendar app

2. **Subscription**
   - **iCal:** Copy URL and add to calendar app (Apple Calendar, Outlook, etc.)
   - **Google Calendar:** Click link to add directly to Google Calendar

3. **Viewing Suggestions**
   - Calendar app periodically fetches feed (typically every 15-60 minutes)
   - Pending suggestions appear as tentative events
   - Accepted suggestions appear as confirmed events

4. **Updates**
   - When user accepts/dismisses suggestions, feed is marked for update
   - Next time calendar app fetches, it gets latest data
   - Events automatically update in user's calendar

## Testing

Run the test suite:

```bash
npm test src/calendar/feed-service.test.ts
```

**Test Coverage:**
- ✓ Feed URL generation
- ✓ Token signing and verification
- ✓ Token expiration handling
- ✓ iCal format generation
- ✓ Suggestion filtering (pending/accepted only)
- ✓ Contact details inclusion
- ✓ Event status mapping
- ✓ Special character escaping
- ✓ Empty suggestions handling
- ✓ Missing contacts handling

## Future Enhancements

1. **Caching**
   - Add Redis caching for generated feeds
   - Invalidate cache on suggestion updates
   - Reduce database load for frequent fetches

2. **Webhook Notifications**
   - Send webhooks to calendar apps on updates
   - Enable real-time sync instead of polling
   - Implement CalDAV PUSH notifications

3. **Customization**
   - Allow users to filter which suggestions appear in feed
   - Support multiple feeds per user (e.g., by trigger type)
   - Custom event colors and categories

4. **Analytics**
   - Track feed subscription rates
   - Monitor feed access patterns
   - Measure calendar app engagement

## Architecture Notes

### Security Considerations

- **Token-based access:** No authentication required after subscription
- **Signed URLs:** HMAC prevents token tampering
- **Expiration:** Tokens expire to limit exposure
- **No PII in URLs:** User data only in feed content, not URL

### Performance Considerations

- **On-demand generation:** Feed generated when accessed, not pre-cached
- **Efficient queries:** Batch fetch suggestions and contacts
- **Minimal processing:** Simple iCal format generation
- **Stateless:** No server-side session management

### Scalability Considerations

- **Horizontal scaling:** Stateless design allows multiple instances
- **Database optimization:** Indexed queries for suggestions and contacts
- **Future caching:** Can add Redis for high-traffic scenarios
- **CDN-friendly:** Static feed content can be cached at edge

## Related Files

- `src/calendar/feed-service.ts` - Core feed generation logic
- `src/calendar/feed-service.test.ts` - Comprehensive test suite
- `src/calendar/feed-api-example.ts` - API endpoint examples
- `src/calendar/suggestion-repository.ts` - Suggestion data access
- `src/contacts/repository.ts` - Contact data access (with `getContactsByIds`)
- `src/calendar/calendar-service.ts` - Main calendar service exports

## Requirements Validation

✅ **Requirement 8.1:** Suggestions published to dynamically updating calendar feed  
✅ **Requirement 8.2:** Both iCal and Google Calendar subscription formats supported  
✅ **Requirement 8.3:** Feed updates immediately on suggestion status changes  
✅ **Requirement 8.4:** Feed displays contact name, reasoning, and proposed timeslot
