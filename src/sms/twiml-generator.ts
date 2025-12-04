/**
 * TwiML Response Generator
 *
 * Generates TwiML (Twilio Markup Language) XML responses for SMS/MMS messages.
 * Provides user-friendly confirmation and error messages.
 *
 * Requirements: 2.5, 8.3
 */

/**
 * TwiML message types
 */
export enum TwiMLMessageType {
  SUCCESS = 'success',
  ERROR = 'error',
  RATE_LIMIT = 'rate_limit',
  UNVERIFIED = 'unverified',
  PROCESSING = 'processing',
  INVALID_MEDIA = 'invalid_media',
  MEDIA_TOO_LARGE = 'media_too_large',
}

/**
 * TwiML generation options
 */
export interface TwiMLOptions {
  messageType: TwiMLMessageType;
  customMessage?: string;
  resetTime?: Date;
  errorDetails?: string;
}

/**
 * Escape XML special characters
 *
 * Prevents XML injection and ensures valid TwiML output
 */
export function escapeXML(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date/time for user-friendly display
 */
function formatResetTime(resetTime: Date): string {
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }

  const diffHours = Math.ceil(diffMinutes / 60);
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
}

/**
 * Get default message for message type
 */
function getDefaultMessage(messageType: TwiMLMessageType, resetTime?: Date): string {
  switch (messageType) {
    case TwiMLMessageType.SUCCESS:
      // Requirement 2.5: Send confirmation message within 5 seconds
      return "Got it! Processing your enrichment. Check the web app to review.";

    case TwiMLMessageType.PROCESSING:
      return "Processing your message. You'll receive a confirmation shortly.";

    case TwiMLMessageType.RATE_LIMIT:
      // Requirement 8.3: Rate limit message with reset time
      if (resetTime) {
        const timeUntilReset = formatResetTime(resetTime);
        return `You've reached the limit of 20 messages per hour. Try again in ${timeUntilReset}.`;
      }
      return "You've reached the limit of 20 messages per hour. Please try again later.";

    case TwiMLMessageType.UNVERIFIED:
      return "This phone number isn't linked to a CatchUp account. Visit the web app to link it.";

    case TwiMLMessageType.INVALID_MEDIA:
      return "We couldn't process this media type. Please send text, voice notes, images, or videos.";

    case TwiMLMessageType.MEDIA_TOO_LARGE:
      return "File size exceeds 5MB limit. Please send a smaller file.";

    case TwiMLMessageType.ERROR:
    default:
      return "Sorry, we couldn't process your message. Please try again later.";
  }
}

/**
 * Generate TwiML response
 *
 * Creates a valid TwiML XML response for Twilio webhook
 *
 * Requirements:
 * - 2.5: Send confirmation message to user within 5 seconds
 * - 8.3: Send notification explaining rate limit
 */
export function generateTwiML(options: TwiMLOptions): string {
  const message = options.customMessage || getDefaultMessage(options.messageType, options.resetTime);
  const escapedMessage = escapeXML(message);

  // Generate TwiML XML
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapedMessage}</Message>
</Response>`;

  return twiml;
}

/**
 * Generate success confirmation TwiML
 *
 * Requirement 2.5: Send confirmation message within 5 seconds
 */
export function generateSuccessConfirmation(customMessage?: string): string {
  return generateTwiML({
    messageType: TwiMLMessageType.SUCCESS,
    customMessage,
  });
}

/**
 * Generate error message TwiML
 */
export function generateErrorMessage(errorMessage?: string): string {
  return generateTwiML({
    messageType: TwiMLMessageType.ERROR,
    customMessage: errorMessage,
  });
}

/**
 * Generate rate limit message TwiML
 *
 * Requirement 8.3: Send notification explaining the limit with reset time
 */
export function generateRateLimitMessage(resetTime: Date, customMessage?: string): string {
  return generateTwiML({
    messageType: TwiMLMessageType.RATE_LIMIT,
    resetTime,
    customMessage,
  });
}

/**
 * Generate unverified number message TwiML
 */
export function generateUnverifiedMessage(customMessage?: string): string {
  return generateTwiML({
    messageType: TwiMLMessageType.UNVERIFIED,
    customMessage,
  });
}

/**
 * Generate processing message TwiML
 */
export function generateProcessingMessage(customMessage?: string): string {
  return generateTwiML({
    messageType: TwiMLMessageType.PROCESSING,
    customMessage,
  });
}

/**
 * Generate invalid media message TwiML
 */
export function generateInvalidMediaMessage(customMessage?: string): string {
  return generateTwiML({
    messageType: TwiMLMessageType.INVALID_MEDIA,
    customMessage,
  });
}

/**
 * Generate media too large message TwiML
 */
export function generateMediaTooLargeMessage(customMessage?: string): string {
  return generateTwiML({
    messageType: TwiMLMessageType.MEDIA_TOO_LARGE,
    customMessage,
  });
}

/**
 * Validate TwiML XML structure
 *
 * Basic validation to ensure generated TwiML is well-formed
 */
export function validateTwiML(twiml: string): boolean {
  // Check for required elements
  if (!twiml.includes('<?xml')) return false;
  if (!twiml.includes('<Response>')) return false;
  if (!twiml.includes('</Response>')) return false;
  if (!twiml.includes('<Message>')) return false;
  if (!twiml.includes('</Message>')) return false;

  // Check for balanced tags
  const openTags = (twiml.match(/<Response>/g) || []).length;
  const closeTags = (twiml.match(/<\/Response>/g) || []).length;
  if (openTags !== closeTags) return false;

  const openMsgTags = (twiml.match(/<Message>/g) || []).length;
  const closeMsgTags = (twiml.match(/<\/Message>/g) || []).length;
  if (openMsgTags !== closeMsgTags) return false;

  return true;
}

/**
 * Generate TwiML with validation
 *
 * Generates TwiML and validates the output
 */
export function generateValidatedTwiML(options: TwiMLOptions): string {
  const twiml = generateTwiML(options);

  if (!validateTwiML(twiml)) {
    console.error('Generated invalid TwiML:', twiml);
    // Return a safe fallback
    return generateErrorMessage('An error occurred processing your message.');
  }

  return twiml;
}
