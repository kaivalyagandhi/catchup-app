/**
 * Email Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendGridEmailService } from './email-service';

// Mock the SendGrid module
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}));

describe('SendGridEmailService', () => {
  describe('constructor', () => {
    it('should throw error if API key not provided', () => {
      // Temporarily remove env vars to test validation
      const originalApiKey = process.env.SENDGRID_API_KEY;
      delete process.env.SENDGRID_API_KEY;
      
      expect(() => {
        new SendGridEmailService('', 'test@example.com');
      }).toThrow('SendGrid API key not configured');
      
      // Restore env var
      if (originalApiKey) process.env.SENDGRID_API_KEY = originalApiKey;
    });

    it('should throw error if from email not provided', () => {
      // Temporarily remove env vars to test validation
      const originalFromEmail = process.env.SENDGRID_FROM_EMAIL;
      delete process.env.SENDGRID_FROM_EMAIL;
      
      expect(() => {
        new SendGridEmailService('test_api_key', '');
      }).toThrow('SendGrid from email not configured');
      
      // Restore env var
      if (originalFromEmail) process.env.SENDGRID_FROM_EMAIL = originalFromEmail;
    });

    it('should create instance with valid configuration', () => {
      const service = new SendGridEmailService('test_api_key', 'from@example.com');
      expect(service).toBeDefined();
    });
  });

  describe('sendEmail', () => {
    it('should handle successful email delivery', async () => {
      const sgMail = await import('@sendgrid/mail');
      const mockSend = vi.fn().mockResolvedValue([
        {
          statusCode: 202,
          headers: { 'x-message-id': 'MSG123456' },
        },
      ]);
      (sgMail.default.send as any) = mockSend;

      const service = new SendGridEmailService('test_api_key', 'from@example.com');

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('MSG123456');
      expect(result.attempts).toBe(1);
      expect(mockSend).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        from: 'from@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: 'Test message',
      });
    });

    it('should include HTML content when provided', async () => {
      const sgMail = await import('@sendgrid/mail');
      const mockSend = vi.fn().mockResolvedValue([
        {
          statusCode: 202,
          headers: { 'x-message-id': 'MSG123456' },
        },
      ]);
      (sgMail.default.send as any) = mockSend;

      const service = new SendGridEmailService('test_api_key', 'from@example.com');

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        from: 'from@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });
    });

    it('should retry on retryable errors', async () => {
      const sgMail = await import('@sendgrid/mail');
      const mockSend = vi
        .fn()
        .mockRejectedValueOnce({ code: 503, message: 'Service unavailable' })
        .mockResolvedValueOnce([
          {
            statusCode: 202,
            headers: { 'x-message-id': 'MSG123456' },
          },
        ]);
      (sgMail.default.send as any) = mockSend;

      const service = new SendGridEmailService('test_api_key', 'from@example.com', 3, 10);

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const sgMail = await import('@sendgrid/mail');
      const mockSend = vi.fn().mockRejectedValue({
        code: 400,
        message: 'Invalid email address',
      });
      (sgMail.default.send as any) = mockSend;

      const service = new SendGridEmailService('test_api_key', 'from@example.com', 3, 10);

      const result = await service.sendEmail({
        to: 'invalid-email',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address');
      expect(result.attempts).toBe(1);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const sgMail = await import('@sendgrid/mail');
      const mockSend = vi.fn().mockRejectedValue({
        code: 503,
        message: 'Service unavailable',
      });
      (sgMail.default.send as any) = mockSend;

      const service = new SendGridEmailService('test_api_key', 'from@example.com', 3, 10);

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
      expect(result.attempts).toBe(3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });
  });
});
