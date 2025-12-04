/**
 * Health Check Endpoint Tests
 * 
 * **Feature: google-cloud-deployment, Property 18: Health Check Endpoint Availability**
 * **Validates: Requirements 6.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from './server';
import pool from '../db/connection';

// Mock the database pool
vi.mock('../db/connection', () => ({
  default: {
    connect: vi.fn(),
  },
}));

describe('Health Check Endpoint', () => {
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a mock client
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 with healthy status when database is connected', async () => {
      // Mock successful database connection
      (pool.connect as any).mockResolvedValue(mockClient);

      const app = createServer();
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 503 with unhealthy status when database connection fails', async () => {
      // Mock failed database connection
      const dbError = new Error('Connection refused');
      (pool.connect as any).mockRejectedValue(dbError);

      const app = createServer();
      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('error', 'Database connection failed');
    });

    it('should return timestamp as a valid date', async () => {
      (pool.connect as any).mockResolvedValue(mockClient);

      const app = createServer();
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should release database connection after query', async () => {
      (pool.connect as any).mockResolvedValue(mockClient);

      const app = createServer();
      await request(app).get('/health');

      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle database query errors gracefully', async () => {
      // Mock query failure
      mockClient.query.mockRejectedValue(new Error('Query timeout'));
      (pool.connect as any).mockResolvedValue(mockClient);

      const app = createServer();
      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
    });
  });
});
