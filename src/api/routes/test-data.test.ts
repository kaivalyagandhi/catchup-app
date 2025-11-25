/**
 * Test Data Routes Tests
 * 
 * Tests for environment-based endpoint control
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import testDataRouter from './test-data';

describe('Test Data Routes - Environment Control', () => {
  let app: Express;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original environment variable
    originalEnv = process.env.ENABLE_TEST_DATA_ENDPOINTS;
    
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/test-data', testDataRouter);
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv === undefined) {
      delete process.env.ENABLE_TEST_DATA_ENDPOINTS;
    } else {
      process.env.ENABLE_TEST_DATA_ENDPOINTS = originalEnv;
    }
  });

  it('should return 403 when ENABLE_TEST_DATA_ENDPOINTS is false', async () => {
    process.env.ENABLE_TEST_DATA_ENDPOINTS = 'false';

    const response = await request(app)
      .post('/api/test-data/seed')
      .send({ contactCount: 5 });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Test data endpoints are disabled');
  });

  it('should allow requests when ENABLE_TEST_DATA_ENDPOINTS is true', async () => {
    process.env.ENABLE_TEST_DATA_ENDPOINTS = 'true';

    const response = await request(app)
      .post('/api/test-data/seed')
      .send({ contactCount: 5 });

    // Should get past the environment check (will fail at auth, which is expected)
    expect(response.status).not.toBe(403);
  });

  it('should allow requests when ENABLE_TEST_DATA_ENDPOINTS is undefined', async () => {
    delete process.env.ENABLE_TEST_DATA_ENDPOINTS;

    const response = await request(app)
      .post('/api/test-data/seed')
      .send({ contactCount: 5 });

    // Should get past the environment check (will fail at auth, which is expected)
    expect(response.status).not.toBe(403);
  });

  it('should return 403 for generate-suggestions when disabled', async () => {
    process.env.ENABLE_TEST_DATA_ENDPOINTS = 'false';

    const response = await request(app)
      .post('/api/test-data/generate-suggestions')
      .send({ daysAhead: 7 });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Test data endpoints are disabled');
  });

  it('should return 403 for clear when disabled', async () => {
    process.env.ENABLE_TEST_DATA_ENDPOINTS = 'false';

    const response = await request(app)
      .post('/api/test-data/clear')
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Test data endpoints are disabled');
  });
});
