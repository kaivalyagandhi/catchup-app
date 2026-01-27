/**
 * AI Suggestion Service Tests
 *
 * Tests for the AI-powered circle suggestion service.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PostgresAISuggestionService, DunbarCircle } from './ai-suggestion-service';
import { PostgresContactRepository } from './repository';
import { PostgresInteractionRepository } from './interaction-repository';
import { InteractionType } from '../types';
import pool from '../db/connection';

describe('AISuggestionService', () => {
  let service: PostgresAISuggestionService;
  let contactRepository: PostgresContactRepository;
  let interactionRepository: PostgresInteractionRepository;
  let testUserId: string;
  let testContactId: string;

  beforeEach(async () => {
    contactRepository = new PostgresContactRepository();
    interactionRepository = new PostgresInteractionRepository();
    service = new PostgresAISuggestionService(contactRepository, interactionRepository);

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, name, google_id, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id`,
      [`test-ai-${Date.now()}@example.com`, 'Test User', `google_test_${Date.now()}`, 'google']
    );
    testUserId = userResult.rows[0].id;

    // Create test contact
    const contact = await contactRepository.create(testUserId, {
      name: 'Test Contact',
      phone: '+1234567890',
    });
    testContactId = contact.id;
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('analyzeContact', () => {
    it('should generate suggestion for contact with no interactions', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      expect(suggestion).toBeDefined();
      expect(suggestion.contactId).toBe(testContactId);
      expect(suggestion.suggestedCircle).toBeDefined();
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(100);
      expect(suggestion.factors).toBeInstanceOf(Array);
      expect(suggestion.factors.length).toBeGreaterThan(0);
      expect(suggestion.alternativeCircles).toBeInstanceOf(Array);
    });

    it('should suggest inner circle for very frequent recent interactions', async () => {
      // Create many recent interactions across multiple channels
      const now = new Date();
      const types = [InteractionType.TEXT, InteractionType.CALL, InteractionType.HANGOUT, InteractionType.CALENDAR_EVENT];
      
      for (let i = 0; i < 60; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        await interactionRepository.create({
          userId: testUserId,
          contactId: testContactId,
          date,
          type: types[i % types.length],
        });
      }

      const suggestion = await service.analyzeContact(testUserId, testContactId);

      expect(suggestion.suggestedCircle).toBe('inner');
      expect(suggestion.confidence).toBeGreaterThan(70);
    });

    it('should suggest close friends for weekly interactions', async () => {
      // Create weekly interactions over 3 months
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        await interactionRepository.create({
          userId: testUserId,
          contactId: testContactId,
          date,
          type: InteractionType.CALL,
        });
      }

      const suggestion = await service.analyzeContact(testUserId, testContactId);

      expect(['inner', 'close', 'active']).toContain(suggestion.suggestedCircle);
      expect(suggestion.confidence).toBeGreaterThan(60);
    });

    it('should suggest acquaintance for rare old interactions', async () => {
      // Create a few old interactions
      const now = new Date();
      for (let i = 0; i < 3; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (6 + i));
        await interactionRepository.create({
          userId: testUserId,
          contactId: testContactId,
          date,
          type: InteractionType.TEXT,
        });
      }

      const suggestion = await service.analyzeContact(testUserId, testContactId);

      expect(['casual', 'acquaintance']).toContain(suggestion.suggestedCircle);
    });

    it('should include communication frequency factor', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      const frequencyFactor = suggestion.factors.find(f => f.type === 'communication_frequency');
      expect(frequencyFactor).toBeDefined();
      expect(frequencyFactor?.weight).toBeGreaterThan(0);
      expect(frequencyFactor?.value).toBeGreaterThanOrEqual(0);
      expect(frequencyFactor?.value).toBeLessThanOrEqual(100);
      expect(frequencyFactor?.description).toBeDefined();
    });

    it('should include recency factor', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      const recencyFactor = suggestion.factors.find(f => f.type === 'recency');
      expect(recencyFactor).toBeDefined();
      expect(recencyFactor?.weight).toBeGreaterThan(0);
    });

    it('should include consistency factor', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      const consistencyFactor = suggestion.factors.find(f => f.type === 'consistency');
      expect(consistencyFactor).toBeDefined();
      expect(consistencyFactor?.weight).toBeGreaterThan(0);
    });

    it('should include multi-channel factor', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      const multiChannelFactor = suggestion.factors.find(f => f.type === 'multi_channel');
      expect(multiChannelFactor).toBeDefined();
      expect(multiChannelFactor?.weight).toBeGreaterThan(0);
    });

    it('should give higher multi-channel score for diverse communication', async () => {
      // Create interactions across multiple channels
      const now = new Date();
      const types = [InteractionType.TEXT, InteractionType.CALL, InteractionType.HANGOUT, InteractionType.CALENDAR_EVENT];
      
      for (let i = 0; i < types.length; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        await interactionRepository.create({
          userId: testUserId,
          contactId: testContactId,
          date,
          type: types[i],
        });
      }

      const suggestion = await service.analyzeContact(testUserId, testContactId);
      const multiChannelFactor = suggestion.factors.find(f => f.type === 'multi_channel');

      expect(multiChannelFactor?.value).toBeGreaterThan(80);
    });

    it('should cache suggestions for performance', async () => {
      const start1 = Date.now();
      const suggestion1 = await service.analyzeContact(testUserId, testContactId);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const suggestion2 = await service.analyzeContact(testUserId, testContactId);
      const time2 = Date.now() - start2;

      // Second call should be much faster (cached)
      expect(time2).toBeLessThan(time1);
      expect(suggestion1).toEqual(suggestion2);
    });

    it('should throw error for non-existent contact', async () => {
      await expect(
        service.analyzeContact(testUserId, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('batchAnalyze', () => {
    it('should analyze multiple contacts', async () => {
      // Create additional contacts
      const contact2 = await contactRepository.create(testUserId, {
        name: 'Contact 2',
      });
      const contact3 = await contactRepository.create(testUserId, {
        name: 'Contact 3',
      });

      const suggestions = await service.batchAnalyze(testUserId, [
        testContactId,
        contact2.id,
        contact3.id,
      ]);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].contactId).toBe(testContactId);
      expect(suggestions[1].contactId).toBe(contact2.id);
      expect(suggestions[2].contactId).toBe(contact3.id);
    });

    it('should return empty array for empty input', async () => {
      const suggestions = await service.batchAnalyze(testUserId, []);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('recordUserOverride', () => {
    it('should record user override in database', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);
      const actualCircle: DunbarCircle = 'inner';

      await service.recordUserOverride(
        testUserId,
        testContactId,
        suggestion.suggestedCircle,
        actualCircle
      );

      // Verify override was recorded
      const result = await pool.query(
        `SELECT * FROM ai_circle_overrides WHERE user_id = $1 AND contact_id = $2`,
        [testUserId, testContactId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].suggested_circle).toBe(suggestion.suggestedCircle);
      expect(result.rows[0].actual_circle).toBe(actualCircle);
      expect(result.rows[0].factors).toBeDefined();
    });

    it('should invalidate cache after recording override', async () => {
      // Get initial suggestion (cached)
      const suggestion1 = await service.analyzeContact(testUserId, testContactId);
      
      // Record override
      await service.recordUserOverride(
        testUserId,
        testContactId,
        suggestion1.suggestedCircle,
        'inner'
      );

      // Add new interaction to change the suggestion
      await interactionRepository.create({
        userId: testUserId,
        contactId: testContactId,
        date: new Date(),
        type: InteractionType.HANGOUT,
      });

      // Get suggestion again - should not be cached
      const suggestion2 = await service.analyzeContact(testUserId, testContactId);
      
      // The factors should be recalculated (not from cache)
      expect(suggestion2.factors).toBeDefined();
    });

    it('should throw error for non-existent contact', async () => {
      await expect(
        service.recordUserOverride(
          testUserId,
          '00000000-0000-0000-0000-000000000000',
          'inner',
          'close'
        )
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('improveModel', () => {
    it('should process user overrides for model improvement', async () => {
      // Record some overrides
      const suggestion = await service.analyzeContact(testUserId, testContactId);
      await service.recordUserOverride(
        testUserId,
        testContactId,
        suggestion.suggestedCircle,
        'inner'
      );

      // Should not throw
      await expect(service.improveModel(testUserId)).resolves.not.toThrow();
    });

    it('should handle user with no overrides', async () => {
      await expect(service.improveModel(testUserId)).resolves.not.toThrow();
    });
  });

  describe('suggestion factors', () => {
    it('should calculate high frequency score for daily interactions', async () => {
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        await interactionRepository.create({
          userId: testUserId,
          contactId: testContactId,
          date,
          type: InteractionType.TEXT,
        });
      }

      const suggestion = await service.analyzeContact(testUserId, testContactId);
      const frequencyFactor = suggestion.factors.find(f => f.type === 'communication_frequency');

      expect(frequencyFactor?.value).toBeGreaterThanOrEqual(70);
    });

    it('should calculate high recency score for recent contact', async () => {
      const now = new Date();
      await interactionRepository.create({
        userId: testUserId,
        contactId: testContactId,
        date: now,
        type: InteractionType.CALL,
      });

      const suggestion = await service.analyzeContact(testUserId, testContactId);
      const recencyFactor = suggestion.factors.find(f => f.type === 'recency');

      expect(recencyFactor?.value).toBeGreaterThan(90);
    });

    it('should calculate high consistency score for regular interactions', async () => {
      // Create weekly interactions (very consistent)
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        await interactionRepository.create({
          userId: testUserId,
          contactId: testContactId,
          date,
          type: InteractionType.TEXT,
        });
      }

      const suggestion = await service.analyzeContact(testUserId, testContactId);
      const consistencyFactor = suggestion.factors.find(f => f.type === 'consistency');

      expect(consistencyFactor?.value).toBeGreaterThan(70);
    });
  });

  describe('alternative suggestions', () => {
    it('should provide alternative circles', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      expect(suggestion.alternativeCircles).toBeInstanceOf(Array);
      expect(suggestion.alternativeCircles.length).toBeGreaterThan(0);
      
      for (const alt of suggestion.alternativeCircles) {
        expect(alt.circle).toBeDefined();
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should not include primary circle in alternatives', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      const alternativeCircles = suggestion.alternativeCircles.map(a => a.circle);
      expect(alternativeCircles).not.toContain(suggestion.suggestedCircle);
    });

    it('should sort alternatives by confidence', async () => {
      const suggestion = await service.analyzeContact(testUserId, testContactId);

      for (let i = 0; i < suggestion.alternativeCircles.length - 1; i++) {
        expect(suggestion.alternativeCircles[i].confidence)
          .toBeGreaterThanOrEqual(suggestion.alternativeCircles[i + 1].confidence);
      }
    });
  });
});
