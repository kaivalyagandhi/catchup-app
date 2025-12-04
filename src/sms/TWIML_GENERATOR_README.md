# TwiML Response Generator

## Overview

The TwiML Generator module creates valid TwiML (Twilio Markup Language) XML responses for SMS/MMS webhook handlers. It provides user-friendly messages for various scenarios including success confirmations, error messages, rate limiting, and more.

## Requirements

- **Requirement 2.5**: Send confirmation message to user within 5 seconds
- **Requirement 8.3**: Send notification explaining rate limit with reset time

## Features

- ✅ Generate success confirmation messages
- ✅ Generate error messages for various failure types
- ✅ Generate rate limit messages with reset time
- ✅ Generate unverified phone number messages
- ✅ XML special character escaping
- ✅ TwiML validation
- ✅ User-friendly time formatting

## Usage

### Basic Success Confirmation

```typescript
import { generateSuccessConfirmation } from './twiml-generator';

const twiml = generateSuccessConfirmation();
// Returns: <?xml version="1.0" encoding="UTF-8"?>
// <Response>
//   <Message>Got it! Processing your enrichment. Check the web app to review.</Message>
// </Response>
```

### Rate Limit Message

```typescript
import { generateRateLimitMessage } from './twiml-generator';

const resetTime = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now
const twiml = generateRateLimitMessage(resetTime);
// Returns: TwiML with message like "You've reached the limit of 20 messages per hour. Try again in 45 minutes."
```

### Custom Error Message

```typescript
import { generateErrorMessage } from './twiml-generator';

const twiml = generateErrorMessage('We encountered a temporary issue. Please try again.');
```

### Unverified Phone Number

```typescript
import { generateUnverifiedMessage } from './twiml-generator';

const twiml = generateUnverifiedMessage();
// Returns: TwiML with message about linking phone number in web app
```

### Invalid Media Type

```typescript
import { generateInvalidMediaMessage } from './twiml-generator';

const twiml = generateInvalidMediaMessage();
// Returns: TwiML with message about supported media types
```

### Media Too Large

```typescript
import { generateMediaTooLargeMessage } from './twiml-generator';

const twiml = generateMediaTooLargeMessage();
// Returns: TwiML with message about 5MB file size limit
```

### XML Escaping

The generator automatically escapes XML special characters to prevent injection attacks:

```typescript
import { escapeXML } from './twiml-generator';

const unsafe = 'Contact "John & Jane" <important>';
const safe = escapeXML(unsafe);
// Returns: "Contact &quot;John &amp; Jane&quot; &lt;important&gt;"
```

### Custom Messages

All generator functions accept optional custom messages:

```typescript
import { generateSuccessConfirmation } from './twiml-generator';

const twiml = generateSuccessConfirmation(
  'Thanks! We extracted 3 enrichments from your message.'
);
```

### TwiML Validation

Validate generated TwiML before sending:

```typescript
import { validateTwiML, generateSuccessConfirmation } from './twiml-generator';

const twiml = generateSuccessConfirmation();
const isValid = validateTwiML(twiml);
console.log('Valid:', isValid); // true
```

### Advanced Usage

For complete control, use the `generateTwiML` function:

```typescript
import { generateTwiML, TwiMLMessageType } from './twiml-generator';

const twiml = generateTwiML({
  messageType: TwiMLMessageType.SUCCESS,
  customMessage: 'Your custom message here',
});
```

## Message Types

The generator supports the following message types:

- `SUCCESS` - Confirmation that message was received and is being processed
- `ERROR` - General error message
- `RATE_LIMIT` - Rate limit exceeded message with reset time
- `UNVERIFIED` - Phone number not linked to account
- `PROCESSING` - Message is being processed
- `INVALID_MEDIA` - Unsupported media type
- `MEDIA_TOO_LARGE` - File size exceeds limit

## Default Messages

### Success
> "Got it! Processing your enrichment. Check the web app to review."

### Rate Limit
> "You've reached the limit of 20 messages per hour. Try again in [time]."

### Unverified
> "This phone number isn't linked to a CatchUp account. Visit the web app to link it."

### Invalid Media
> "We couldn't process this media type. Please send text, voice notes, images, or videos."

### Media Too Large
> "File size exceeds 5MB limit. Please send a smaller file."

### Error
> "Sorry, we couldn't process your message. Please try again later."

## Integration with Webhook Handler

Example integration with Express webhook handler:

```typescript
import express from 'express';
import { generateSuccessConfirmation, generateRateLimitMessage } from './twiml-generator';
import { checkSMSRateLimit } from './sms-rate-limiter';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  const phoneNumber = req.body.From;

  // Check rate limit
  const rateLimitResult = await checkSMSRateLimit(phoneNumber);

  if (!rateLimitResult.allowed) {
    // Send rate limit message
    const twiml = generateRateLimitMessage(rateLimitResult.resetAt);
    res.type('text/xml');
    res.send(twiml);
    return;
  }

  // Process message asynchronously
  processMessageAsync(req.body);

  // Send immediate confirmation
  const twiml = generateSuccessConfirmation();
  res.type('text/xml');
  res.send(twiml);
});
```

## Time Formatting

The generator automatically formats reset times in a user-friendly way:

- Less than 60 minutes: "X minutes"
- 60+ minutes: "X hours"

Examples:
- 15 minutes → "15 minutes"
- 45 minutes → "45 minutes"
- 90 minutes → "2 hours"
- 150 minutes → "3 hours"

## Security

### XML Injection Prevention

All user-provided text is automatically escaped to prevent XML injection attacks:

```typescript
// Unsafe input
const userInput = '<script>alert("xss")</script>';

// Safely escaped in TwiML
const twiml = generateSuccessConfirmation(userInput);
// Message will contain: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### Validation

The `validateTwiML` function performs basic structural validation:

- Checks for XML declaration
- Validates `<Response>` tags
- Validates `<Message>` tags
- Ensures balanced opening/closing tags

## Testing

Run the example file to see all message types:

```bash
npx ts-node src/sms/twiml-generator-example.ts
```

## Error Handling

The generator includes fallback behavior for invalid inputs:

```typescript
import { generateValidatedTwiML, TwiMLMessageType } from './twiml-generator';

// Generates and validates TwiML
// Returns safe fallback if validation fails
const twiml = generateValidatedTwiML({
  messageType: TwiMLMessageType.SUCCESS,
});
```

## Best Practices

1. **Always escape user input**: Use the built-in escaping (automatic in all generator functions)
2. **Validate before sending**: Use `validateTwiML` for critical paths
3. **Keep messages concise**: SMS has character limits (160 for single segment)
4. **Provide actionable information**: Tell users what to do next
5. **Include timing information**: For rate limits, always include reset time

## Related Modules

- `sms-rate-limiter.ts` - Rate limiting logic
- `sms-error-handler.ts` - Error handling and user notifications
- `sms-webhook.ts` - Webhook handler that uses TwiML generator

## References

- [Twilio TwiML Documentation](https://www.twilio.com/docs/messaging/twiml)
- [TwiML Message Element](https://www.twilio.com/docs/messaging/twiml/message)
