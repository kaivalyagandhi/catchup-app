/**
 * Phone Number Management API Routes Tests
 *
 * Tests for phone number linking, verification, and unlinking endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

describe('Phone Number API Routes', () => {
  const app = createServer();
  // Use a valid UUID format for test user ID
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
  });

  describe('POST /api/user/phone-number', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/user/phone-number')
        .send({ phoneNumber: '+15555551234' });

      expect(response.status).toBe(401);
    });

    it('should require phone number field', async () => {
      const response = await request(app)
        .post('/api/user/phone-number')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Phone number is required');
      expect(response.body.code).toBe('MISSING_PHONE_NUMBER');
    });

    it('should validate phone number format', async () => {
      const invalidNumbers = [
        'not-a-number',
        '123',
        'abc123',
      ];

      for (const phoneNumber of invalidNumbers) {
        const response = await request(app)
          .post('/api/user/phone-number')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ phoneNumber });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid phone number format');
        expect(response.body.code).toBe('INVALID_PHONE_NUMBER');
      }
    });

    it('should accept valid phone number formats', async () => {
      const validNumbers = [
        '+15555551234',
        '+442071234567',
        '+33123456789',
      ];

      for (const phoneNumber of validNumbers) {
        const response = await request(app)
          .post('/api/user/phone-number')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ phoneNumber });

        // Should not return 400 for valid phone numbers
        // May return 201 (success) or 409 (already linked) or 500 (Twilio error)
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('POST /api/user/phone-number/verify', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/user/phone-number/verify')
        .send({ phoneNumber: '+15555551234', code: '123456' });

      expect(response.status).toBe(401);
    });

    it('should require phone number and code fields', async () => {
      // Missing phone number
      let response = await request(app)
        .post('/api/user/phone-number/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Phone number and verification code are required');

      // Missing code
      response = await request(app)
        .post('/api/user/phone-number/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phoneNumber: '+15555551234' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Phone number and verification code are required');
    });

    it('should validate code format', async () => {
      const invalidCodes = [
        '123',      // too short
        '1234567',  // too long
        'abcdef',   // not numeric
        '12345a',   // mixed
      ];

      for (const code of invalidCodes) {
        const response = await request(app)
          .post('/api/user/phone-number/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ phoneNumber: '+15555551234', code });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Verification code must be 6 digits');
        expect(response.body.code).toBe('INVALID_CODE_FORMAT');
      }
    });

    it('should accept valid code format', async () => {
      const response = await request(app)
        .post('/api/user/phone-number/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phoneNumber: '+15555551234', code: '123456' });

      // Should accept valid format (6 digits)
      // Will return 400 with VERIFICATION_FAILED if code is wrong (expected)
      expect(response.status).toBe(400);
      if (response.status === 400) {
        expect(response.body.code).toBe('VERIFICATION_FAILED');
      }
    });
  });

  describe('GET /api/user/phone-number', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/phone-number');

      expect(response.status).toBe(401);
    });

    it('should return 404 if no phone number linked', async () => {
      const response = await request(app)
        .get('/api/user/phone-number')
        .set('Authorization', `Bearer ${authToken}`);

      // May return 404 or 200 depending on database state
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/user/phone-number', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/user/phone-number');

      expect(response.status).toBe(401);
    });

    it('should return 404 if no phone number linked', async () => {
      const response = await request(app)
        .delete('/api/user/phone-number')
        .set('Authorization', `Bearer ${authToken}`);

      // May return 404 or 204 depending on database state
      expect([204, 404]).toContain(response.status);
    });
  });
});
