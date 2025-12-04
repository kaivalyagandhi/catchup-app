/**
 * SMS Service
 *
 * Handles SMS delivery via Twilio with retry logic and error handling.
 */

import twilio from 'twilio';
import { checkSMSLimit } from '../utils/rate-limiter';

export interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

export interface SMSService {
  sendSMS(to: string, body: string): Promise<SMSDeliveryResult>;
}

/**
 * Twilio SMS Service Implementation
 */
export class TwilioSMSService implements SMSService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(
    accountSid?: string,
    authToken?: string,
    fromNumber?: string,
    maxRetries: number = 3,
    retryDelayMs: number = 1000
  ) {
    // Use explicit checks to properly handle empty strings
    const sid =
      accountSid !== undefined && accountSid !== '' ? accountSid : process.env.TWILIO_ACCOUNT_SID;
    const token =
      authToken !== undefined && authToken !== '' ? authToken : process.env.TWILIO_AUTH_TOKEN;
    const phone =
      fromNumber !== undefined && fromNumber !== '' ? fromNumber : process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token) {
      throw new Error('Twilio credentials not configured');
    }

    if (!phone) {
      throw new Error('Twilio phone number not configured');
    }

    this.fromNumber = phone;
    this.client = twilio(sid, token);
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Send SMS with retry logic and rate limiting
   */
  async sendSMS(to: string, body: string, userId?: string): Promise<SMSDeliveryResult> {
    // Check rate limit if userId provided
    if (userId) {
      const rateLimit = await checkSMSLimit(userId);
      if (!rateLimit.allowed) {
        console.log(`SMS rate limit exceeded for user ${userId}`);
        return {
          success: false,
          error: `SMS rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
          attempts: 0,
        };
      }
    }

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxRetries) {
      attempts++;

      try {
        const message = await this.client.messages.create({
          body,
          from: this.fromNumber,
          to,
        });

        // Log successful delivery
        console.log(`SMS sent successfully to ${to}, SID: ${message.sid}, attempts: ${attempts}`);

        return {
          success: true,
          messageId: message.sid,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`SMS delivery attempt ${attempts} failed for ${to}:`, error);

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempts < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempts - 1);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Unknown error';
    console.error(`SMS delivery failed after ${attempts} attempts to ${to}: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      attempts,
    };
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors, rate limits, and temporary server errors
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const statusCode = error?.status || error?.statusCode;

    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // Retry on network errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      return true;
    }

    // Don't retry on client errors (invalid phone number, etc.)
    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance (lazy initialization to avoid errors in tests)
let _smsService: TwilioSMSService | null = null;

export const smsService = {
  get instance(): TwilioSMSService {
    if (!_smsService) {
      _smsService = new TwilioSMSService();
    }
    return _smsService;
  },
  sendSMS(to: string, body: string) {
    return this.instance.sendSMS(to, body);
  },
};
