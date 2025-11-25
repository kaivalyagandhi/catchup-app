/**
 * SMS Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwilioSMSService } from './sms-service';

describe('TwilioSMSService', () => {
  describe('constructor', () => {
    it('should throw error if credentials not provided', () => {
      expect(() => {
        new TwilioSMSService('', '', '');
      }).toThrow(); // Twilio library throws its own validation error
    });

    it('should throw error if phone number not provided', () => {
      // Temporarily clear the env var to test validation
      const originalPhone = process.env.TWILIO_PHONE_NUMBER;
      delete process.env.TWILIO_PHONE_NUMBER;
      
      expect(() => {
        new TwilioSMSService('ACtest_sid', 'test_token', '');
      }).toThrow('Twilio phone number not configured');
      
      // Restore env var
      process.env.TWILIO_PHONE_NUMBER = originalPhone;
    });

    it('should create instance with valid credentials', () => {
      const service = new TwilioSMSService('ACtest_sid', 'test_token', '+1234567890');
      expect(service).toBeDefined();
    });
  });

  describe('sendSMS', () => {
    it('should handle successful SMS delivery', async () => {
      // Create a mock Twilio client
      const mockCreate = vi.fn().mockResolvedValue({
        sid: 'SM123456',
        status: 'sent',
      });

      const service = new TwilioSMSService('ACtest_sid', 'test_token', '+1234567890');
      
      // Mock the client.messages.create method
      (service as any).client = {
        messages: {
          create: mockCreate,
        },
      };

      const result = await service.sendSMS('+19876543210', 'Test message');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM123456');
      expect(result.attempts).toBe(1);
      expect(mockCreate).toHaveBeenCalledWith({
        body: 'Test message',
        from: '+1234567890',
        to: '+19876543210',
      });
    });

    it('should retry on retryable errors', async () => {
      const mockCreate = vi
        .fn()
        .mockRejectedValueOnce({ status: 503, message: 'Service unavailable' })
        .mockResolvedValueOnce({ sid: 'SM123456', status: 'sent' });

      const service = new TwilioSMSService('ACtest_sid', 'test_token', '+1234567890', 3, 10);
      
      (service as any).client = {
        messages: {
          create: mockCreate,
        },
      };

      const result = await service.sendSMS('+19876543210', 'Test message');

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockCreate = vi.fn().mockRejectedValue({
        status: 400,
        message: 'Invalid phone number',
      });

      const service = new TwilioSMSService('ACtest_sid', 'test_token', '+1234567890', 3, 10);
      
      (service as any).client = {
        messages: {
          create: mockCreate,
        },
      };

      const result = await service.sendSMS('+19876543210', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
      expect(result.attempts).toBe(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const mockCreate = vi.fn().mockRejectedValue({
        status: 503,
        message: 'Service unavailable',
      });

      const service = new TwilioSMSService('ACtest_sid', 'test_token', '+1234567890', 3, 10);
      
      (service as any).client = {
        messages: {
          create: mockCreate,
        },
      };

      const result = await service.sendSMS('+19876543210', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
      expect(result.attempts).toBe(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });
});
