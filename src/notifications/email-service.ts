/**
 * Email Service
 *
 * Handles email delivery via SendGrid with retry logic and error handling.
 */

import sgMail from '@sendgrid/mail';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  sendEmail(message: EmailMessage): Promise<EmailDeliveryResult>;
}

/**
 * SendGrid Email Service Implementation
 */
export class SendGridEmailService implements EmailService {
  private fromEmail: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(apiKey?: string, fromEmail?: string, maxRetries: number = 3, retryDelayMs: number = 1000) {
    const key = apiKey || process.env.SENDGRID_API_KEY;
    this.fromEmail = fromEmail || process.env.SENDGRID_FROM_EMAIL || '';

    if (!key) {
      throw new Error('SendGrid API key not configured');
    }

    if (!this.fromEmail) {
      throw new Error('SendGrid from email not configured');
    }

    sgMail.setApiKey(key);
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxRetries) {
      attempts++;

      try {
        const msg = {
          to: message.to,
          from: this.fromEmail,
          subject: message.subject,
          text: message.text,
          html: message.html || message.text,
        };

        const response = await sgMail.send(msg);

        // Extract message ID from response headers
        const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';

        // Log successful delivery
        console.log(`Email sent successfully to ${message.to}, ID: ${messageId}, attempts: ${attempts}`);

        return {
          success: true,
          messageId,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Email delivery attempt ${attempts} failed for ${message.to}:`, error);

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
    console.error(`Email delivery failed after ${attempts} attempts to ${message.to}: ${errorMessage}`);

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
    // Retry on rate limits and temporary server errors
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const statusCode = error?.code || error?.statusCode;

    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // Retry on network errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      return true;
    }

    // Don't retry on client errors (invalid email, etc.)
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
let _emailService: SendGridEmailService | null = null;

export const emailService = {
  get instance(): SendGridEmailService {
    if (!_emailService) {
      _emailService = new SendGridEmailService();
    }
    return _emailService;
  },
  sendEmail(message: EmailMessage) {
    return this.instance.sendEmail(message);
  },
};
