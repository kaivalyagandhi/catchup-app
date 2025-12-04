/**
 * Tests for Twilio SMS/MMS Webhook Handler
 *
 * Tests signature validation, user lookup, and TwiML response generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { validateTwilioSignature } from './sms-webhook';

describe('Twilio Webhook Handler', () => {
  describe('validateTwilioSignature', () => {
    const authToken = 'test_auth_token_12345';
    const url = 'https://example.com/api/sms/webhook';

    it('should validate correct signature', () => {
      const params = {
        MessageSid: 'SM1234567890',
        AccountSid: 'AC1234567890',
        From: '+15555551234',
        To: '+15555556789',
        Body: 'Test message',
        NumMedia: '0',
      };

      // Generate expected signature
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          return acc + key + params[key];
        }, url);

      const hmac = crypto.createHmac('sha1', authToken);
      hmac.update(data);
      const expectedSignature = hmac.digest('base64');

      // Validate
      const isValid = validateTwilioSignature(authToken, expectedSignature, url, params);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const params = {
        MessageSid: 'SM1234567890',
        AccountSid: 'AC1234567890',
        From: '+15555551234',
        To: '+15555556789',
        Body: 'Test message',
        NumMedia: '0',
      };

      const incorrectSignature = 'incorrect_signature_base64==';

      const isValid = validateTwilioSignature(authToken, incorrectSignature, url, params);

      expect(isValid).toBe(false);
    });

    it('should reject signature with modified parameters', () => {
      const params = {
        MessageSid: 'SM1234567890',
        AccountSid: 'AC1234567890',
        From: '+15555551234',
        To: '+15555556789',
        Body: 'Test message',
        NumMedia: '0',
      };

      // Generate signature for original params
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          return acc + key + params[key];
        }, url);

      const hmac = crypto.createHmac('sha1', authToken);
      hmac.update(data);
      const signature = hmac.digest('base64');

      // Modify params after signature generation
      const modifiedParams = { ...params, Body: 'Modified message' };

      // Validate with modified params
      const isValid = validateTwilioSignature(authToken, signature, url, modifiedParams);

      expect(isValid).toBe(false);
    });

    it('should handle empty body parameter', () => {
      const params = {
        MessageSid: 'SM1234567890',
        AccountSid: 'AC1234567890',
        From: '+15555551234',
        To: '+15555556789',
        Body: '',
        NumMedia: '0',
      };

      // Generate expected signature
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          return acc + key + params[key];
        }, url);

      const hmac = crypto.createHmac('sha1', authToken);
      hmac.update(data);
      const expectedSignature = hmac.digest('base64');

      // Validate
      const isValid = validateTwilioSignature(authToken, expectedSignature, url, params);

      expect(isValid).toBe(true);
    });

    it('should handle MMS with media URLs', () => {
      const params = {
        MessageSid: 'MM1234567890',
        AccountSid: 'AC1234567890',
        From: '+15555551234',
        To: '+15555556789',
        Body: 'Check this out',
        NumMedia: '1',
        MediaUrl0: 'https://api.twilio.com/media/MM123.jpg',
        MediaContentType0: 'image/jpeg',
      };

      // Generate expected signature
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          return acc + key + params[key];
        }, url);

      const hmac = crypto.createHmac('sha1', authToken);
      hmac.update(data);
      const expectedSignature = hmac.digest('base64');

      // Validate
      const isValid = validateTwilioSignature(authToken, expectedSignature, url, params);

      expect(isValid).toBe(true);
    });

    it('should handle different URL protocols', () => {
      const httpUrl = 'http://example.com/api/sms/webhook';
      const httpsUrl = 'https://example.com/api/sms/webhook';

      const params = {
        MessageSid: 'SM1234567890',
        From: '+15555551234',
        To: '+15555556789',
        Body: 'Test',
        NumMedia: '0',
      };

      // Generate signature for HTTP URL
      const httpData = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          return acc + key + params[key];
        }, httpUrl);

      const httpHmac = crypto.createHmac('sha1', authToken);
      httpHmac.update(httpData);
      const httpSignature = httpHmac.digest('base64');

      // Generate signature for HTTPS URL
      const httpsData = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          return acc + key + params[key];
        }, httpsUrl);

      const httpsHmac = crypto.createHmac('sha1', authToken);
      httpsHmac.update(httpsData);
      const httpsSignature = httpsHmac.digest('base64');

      // Validate HTTP
      const httpValid = validateTwilioSignature(authToken, httpSignature, httpUrl, params);
      expect(httpValid).toBe(true);

      // Validate HTTPS
      const httpsValid = validateTwilioSignature(
        authToken,
        httpsSignature,
        httpsUrl,
        params
      );
      expect(httpsValid).toBe(true);

      // Cross-validate (should fail)
      const crossValid = validateTwilioSignature(authToken, httpSignature, httpsUrl, params);
      expect(crossValid).toBe(false);
    });
  });
});
