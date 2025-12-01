/**
 * Twilio SMS/MMS Webhook Handler
 *
 * Receives incoming SMS and MMS messages from Twilio,
 * validates signatures, looks up users, and queues messages
 * for async processing.
 *
 * Requirements: 2.1, 2.2, 7.1, 7.2
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { phoneNumberService } from '../../sms/phone-number-service';
import { messageProcessor } from '../../sms/message-processor';
import { checkSMSRateLimit } from '../../sms/sms-rate-limiter';
import { asyncHandler } from '../middleware/error-handler';
import {
  generateSuccessConfirmation,
  generateErrorMessage,
  generateRateLimitMessage,
  generateUnverifiedMessage,
} from '../../sms/twiml-generator';
import { smsMonitoringService } from '../../sms/sms-monitoring-service';

const router = Router();

/**
 * Twilio webhook payload interface
 */
export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string; // User's phone number
  To: string; // CatchUp phone number
  Body?: string; // Text content (SMS or MMS caption)
  NumMedia: string; // Number of media attachments
  MediaUrl0?: string;
  MediaContentType0?: string;
  MediaUrl1?: string;
  MediaContentType1?: string;
  MediaUrl2?: string;
  MediaContentType2?: string;
  MediaUrl3?: string;
  MediaContentType3?: string;
  MediaUrl4?: string;
  MediaContentType4?: string;
  MediaUrl5?: string;
  MediaContentType5?: string;
  MediaUrl6?: string;
  MediaContentType6?: string;
  MediaUrl7?: string;
  MediaContentType7?: string;
  MediaUrl8?: string;
  MediaContentType8?: string;
  MediaUrl9?: string;
  MediaContentType9?: string;
}

/**
 * Validate Twilio signature
 * Requirement 7.1: Validate X-Twilio-Signature header
 * Requirement 7.2: Reject requests with invalid signatures
 *
 * @param authToken Twilio auth token
 * @param signature X-Twilio-Signature header value
 * @param url Full request URL
 * @param params Request body parameters
 * @returns true if signature is valid
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, any>
): boolean {
  // Sort parameters alphabetically and concatenate
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      return acc + key + params[key];
    }, url);

  // Create HMAC-SHA1 hash
  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(data);
  const expectedSignature = hmac.digest('base64');

  // Compare signatures using timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// TwiML generation is now handled by the twiml-generator module

/**
 * POST /api/sms/webhook
 * Receive incoming SMS/MMS messages from Twilio
 *
 * Requirement 2.1: Receive messages via Twilio webhook
 * Requirement 2.2: Validate Twilio signature before processing
 * Requirement 7.1: Validate X-Twilio-Signature header
 * Requirement 7.2: Reject invalid signatures with HTTP 403
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Check if Twilio is configured
    if (!authToken) {
      console.error('TWILIO_AUTH_TOKEN not configured');
      res.status(500).send(
        generateErrorMessage('Service temporarily unavailable. Please try again later.')
      );
      return;
    }

    // Requirement 7.1: Validate signature
    if (!twilioSignature) {
      console.error('Missing X-Twilio-Signature header');
      // Requirement 7.5: Log security event
      console.warn('Security event: Webhook request without signature', {
        from: req.body.From,
        timestamp: new Date().toISOString(),
      });
      res.status(403).send('Forbidden');
      return;
    }

    // Construct full URL for signature validation
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    // Requirement 7.2: Validate signature
    const isValid = validateTwilioSignature(
      authToken,
      twilioSignature,
      url,
      req.body
    );

    if (!isValid) {
      console.error('Invalid Twilio signature');
      // Requirement 7.5: Log security event
      console.warn('Security event: Invalid webhook signature', {
        from: req.body.From,
        url,
        timestamp: new Date().toISOString(),
      });
      res.status(403).send('Forbidden');
      return;
    }

    // Parse webhook payload
    const payload: TwilioWebhookPayload = req.body;

    console.log('Received Twilio webhook:', {
      messageSid: payload.MessageSid,
      from: payload.From,
      numMedia: payload.NumMedia,
    });

    // Look up user by phone number
    const userId = await phoneNumberService.getUserByPhoneNumber(payload.From);

    if (!userId) {
      console.log('Phone number not verified:', payload.From);
      res
        .status(200)
        .type('text/xml')
        .send(generateUnverifiedMessage());
      return;
    }

    // Check if phone number is verified
    const isVerified = await phoneNumberService.isPhoneNumberVerified(payload.From);

    if (!isVerified) {
      console.log('Phone number not verified:', payload.From);
      res
        .status(200)
        .type('text/xml')
        .send(
          generateUnverifiedMessage(
            "This phone number isn't verified. Please complete verification in the web app."
          )
        );
      return;
    }

    // Check rate limiting
    const rateLimitResult = await checkSMSRateLimit(payload.From);

    if (!rateLimitResult.allowed) {
      console.log('Rate limit exceeded for:', payload.From);

      // Track rate limit event
      smsMonitoringService.trackRateLimit(payload.From);

      res
        .status(200)
        .type('text/xml')
        .send(generateRateLimitMessage(rateLimitResult.resetAt));
      return;
    }

    // Track Twilio cost
    const messageType = parseInt(payload.NumMedia) > 0 ? 'mms' : 'sms';
    smsMonitoringService.trackTwilioCost(messageType);

    // Process message asynchronously (don't await - return response immediately)
    messageProcessor
      .processMessage(payload, userId)
      .then((result) => {
        if (result.success) {
          console.log('Message processed successfully:', {
            messageSid: payload.MessageSid,
            enrichmentIds: result.enrichmentIds,
            processingTime: result.processingTime,
          });
        } else {
          console.error('Message processing failed:', {
            messageSid: payload.MessageSid,
            error: result.error,
            processingTime: result.processingTime,
          });
        }
      })
      .catch((error) => {
        console.error('Unexpected error in message processing:', error);
      });

    console.log('Message queued for processing:', {
      userId,
      messageSid: payload.MessageSid,
      messageType: parseInt(payload.NumMedia) > 0 ? 'MMS' : 'SMS',
    });

    // Return TwiML response immediately (within 5 seconds)
    // Requirement 2.5: Send confirmation message
    res
      .status(200)
      .type('text/xml')
      .send(generateSuccessConfirmation());
  })
);

export default router;
