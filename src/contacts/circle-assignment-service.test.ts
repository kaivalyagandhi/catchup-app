/**
 * Circle Assignment Service Tests
 *
 * Tests for circle assignment business logic including:
 * - Single contact assignment
 * - Batch assignment operations
 * - Circle capacity validation
 * - Distribution calculations
 * - Rebalancing suggestions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import pool from '../db/connection';
import {
  CircleAssignmentServiceImpl,
  CIRCLE_DEFINITIONS,
  CircleAssignment,
} from './circle-assignment-service';
import { PostgresContactRepository, DunbarCircle } from './repository';
import { PostgresCircleAssignmentRepository } from './circle-assignment-repository';

describe('CircleAssignmentService', () => {
  let service: CircleAssignmentServiceImpl;
  let contactRepository: PostgresContactRepository;
  let assignmentRepository: PostgresCircleAssignmentRepository;
  let testUserId: string;
  let testContactIds: string[];

  beforeEach(async () => {
    contactRepository = new PostgresContactRepository();
    assignmentRepository = new PostgresCircleAssignmentRepository();
    service = new CircleAssignmentServiceImpl(contactRepository, assignmentRepository);

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, name, google_id, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id`,
      [`test-${Date.now()}@example.com`, 'Test User', `google_test_${Date.now()}`, 'google']
    );
    testUserId = userResult.rows[0].id;

    // Create test contacts
    testContactIds = [];
    for (let i = 0; i < 10; i++) {
      const contact = await contactRepository.create(testUserId, {
        name: `Test Contact ${i}`,
        email: `contact${i}@example.com`,
      });
      testContactIds.push(contact.id);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('assignToCircle', () => {
    it('should assign a contact to a circle', async () => {
      const contactId = testContactIds[0];
      const circle: DunbarCircle = 'inner';

      const result = await service.assignToCircle(testUserId, contactId, circle, 'user');

      expect(result.dunbarCircle).toBe(circle);
      expect(result.circleAssignedAt).toBeDefined();
    });

    it('should record assignment in history', async () => {
      const contactId = testContactIds[0];
      const circle: DunbarCircle = 'close';

      await service.assignToCircle(testUserId, contactId, circle, 'user', 0.9, 'Test reason');

      const history = await assignmentRepository.findByContactId(contactId, testUserId);
      expect(history.length).toBe(1);
      expect(history[0].toCircle).toBe(circle);
      expect(history[0].assignedBy).toBe('user');
      expect(history[0].confidence).toBe(0.9);
      expect(history[0].reason).toBe('Test reason');
    });

    it('should track circle changes', async () => {
      const contactId = testContactIds[0];

      // First assignment
      await service.assignToCircle(testUserId, contactId, 'inner', 'user');

      // Second assignment
      await service.assignToCircle(testUserId, contactId, 'close', 'user');

      const history = await assignmentRepository.findByContactId(contactId, testUserId);
      expect(history.length).toBe(2);
      expect(history[0].toCircle).toBe('close');
      expect(history[0].fromCircle).toBe('inner');
      expect(history[1].toCircle).toBe('inner');
      expect(history[1].fromCircle).toBeUndefined();
    });

    it('should throw error for invalid circle', async () => {
      const contactId = testContactIds[0];

      await expect(
        service.assignToCircle(testUserId, contactId, 'invalid' as DunbarCircle, 'user')
      ).rejects.toThrow('Invalid circle');
    });

    it('should throw error for non-existent contact', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        service.assignToCircle(testUserId, nonExistentId, 'inner', 'user')
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('batchAssign', () => {
    it('should assign multiple contacts to circles', async () => {
      const assignments: CircleAssignment[] = [
        { contactId: testContactIds[0], circle: 'inner' },
        { contactId: testContactIds[1], circle: 'inner' },
        { contactId: testContactIds[2], circle: 'close' },
      ];

      await service.batchAssign(testUserId, assignments, 'user');

      const contact0 = await contactRepository.findById(testContactIds[0], testUserId);
      const contact1 = await contactRepository.findById(testContactIds[1], testUserId);
      const contact2 = await contactRepository.findById(testContactIds[2], testUserId);

      expect(contact0?.dunbarCircle).toBe('inner');
      expect(contact1?.dunbarCircle).toBe('inner');
      expect(contact2?.dunbarCircle).toBe('close');
    });

    it('should record all assignments in history', async () => {
      const assignments: CircleAssignment[] = [
        { contactId: testContactIds[0], circle: 'inner', confidence: 0.9 },
        { contactId: testContactIds[1], circle: 'close', confidence: 0.8 },
      ];

      await service.batchAssign(testUserId, assignments, 'ai');

      const history0 = await assignmentRepository.findByContactId(testContactIds[0], testUserId);
      const history1 = await assignmentRepository.findByContactId(testContactIds[1], testUserId);

      expect(history0.length).toBe(1);
      expect(history0[0].assignedBy).toBe('ai');
      expect(history0[0].confidence).toBe(0.9);

      expect(history1.length).toBe(1);
      expect(history1[0].assignedBy).toBe('ai');
      expect(history1[0].confidence).toBe(0.8);
    });

    it('should handle empty assignments array', async () => {
      await expect(service.batchAssign(testUserId, [], 'user')).resolves.not.toThrow();
    });

    it('should throw error if any circle is invalid', async () => {
      const assignments: CircleAssignment[] = [
        { contactId: testContactIds[0], circle: 'inner' },
        { contactId: testContactIds[1], circle: 'invalid' as DunbarCircle },
      ];

      await expect(service.batchAssign(testUserId, assignments, 'user')).rejects.toThrow(
        'Invalid circle'
      );
    });

    it('should throw error if any contact does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const assignments: CircleAssignment[] = [
        { contactId: testContactIds[0], circle: 'inner' },
        { contactId: nonExistentId, circle: 'close' },
      ];

      await expect(service.batchAssign(testUserId, assignments, 'user')).rejects.toThrow(
        'Contact not found'
      );
    });
  });

  describe('validateCircleCapacity', () => {
    it('should return under status for empty circle', async () => {
      const result = await service.validateCircleCapacity(testUserId, 'inner');

      expect(result.circle).toBe('inner');
      expect(result.currentSize).toBe(0);
      expect(result.recommendedSize).toBe(CIRCLE_DEFINITIONS.inner.recommendedSize);
      expect(result.maxSize).toBe(CIRCLE_DEFINITIONS.inner.maxSize);
      expect(result.status).toBe('under');
      expect(result.message).toContain('room for');
    });

    it('should return optimal status for circle at recommended size', async () => {
      // Assign contacts to reach recommended size
      const assignments: CircleAssignment[] = [];
      for (let i = 0; i < CIRCLE_DEFINITIONS.inner.recommendedSize; i++) {
        if (i < testContactIds.length) {
          assignments.push({ contactId: testContactIds[i], circle: 'inner' });
        }
      }
      await service.batchAssign(testUserId, assignments, 'user');

      const result = await service.validateCircleCapacity(testUserId, 'inner');

      expect(result.status).toBe('optimal');
      expect(result.currentSize).toBe(CIRCLE_DEFINITIONS.inner.recommendedSize);
    });

    it('should return over status for circle exceeding max size', async () => {
      // Create more contacts to exceed max size
      const extraContacts: string[] = [];
      for (let i = 0; i < CIRCLE_DEFINITIONS.inner.maxSize + 5; i++) {
        const contact = await contactRepository.create(testUserId, {
          name: `Extra Contact ${i}`,
        });
        extraContacts.push(contact.id);
      }

      const assignments: CircleAssignment[] = extraContacts.map((id) => ({
        contactId: id,
        circle: 'inner' as DunbarCircle,
      }));
      await service.batchAssign(testUserId, assignments, 'user');

      const result = await service.validateCircleCapacity(testUserId, 'inner');

      expect(result.status).toBe('over');
      expect(result.currentSize).toBeGreaterThan(CIRCLE_DEFINITIONS.inner.maxSize);
      expect(result.message).toContain('more contacts than recommended');
    });

    it('should throw error for invalid circle', async () => {
      await expect(
        service.validateCircleCapacity(testUserId, 'invalid' as DunbarCircle)
      ).rejects.toThrow('Invalid circle');
    });
  });

  describe('getCircleDistribution', () => {
    it('should return distribution with all circles at zero initially', async () => {
      const distribution = await service.getCircleDistribution(testUserId);

      expect(distribution.inner).toBe(0);
      expect(distribution.close).toBe(0);
      expect(distribution.active).toBe(0);
      expect(distribution.casual).toBe(0);
      expect(distribution.acquaintance).toBe(0);
      expect(distribution.uncategorized).toBe(testContactIds.length);
      expect(distribution.total).toBe(testContactIds.length);
    });

    it('should return correct distribution after assignments', async () => {
      const assignments: CircleAssignment[] = [
        { contactId: testContactIds[0], circle: 'inner' },
        { contactId: testContactIds[1], circle: 'inner' },
        { contactId: testContactIds[2], circle: 'close' },
        { contactId: testContactIds[3], circle: 'close' },
        { contactId: testContactIds[4], circle: 'close' },
        { contactId: testContactIds[5], circle: 'active' },
      ];
      await service.batchAssign(testUserId, assignments, 'user');

      const distribution = await service.getCircleDistribution(testUserId);

      expect(distribution.inner).toBe(2);
      expect(distribution.close).toBe(3);
      expect(distribution.active).toBe(1);
      expect(distribution.casual).toBe(0);
      expect(distribution.acquaintance).toBe(0);
      expect(distribution.uncategorized).toBe(4);
      expect(distribution.total).toBe(10);
    });

    it('should not count archived contacts', async () => {
      // Assign and then archive a contact
      await service.assignToCircle(testUserId, testContactIds[0], 'inner', 'user');
      await contactRepository.archive(testContactIds[0], testUserId);

      const distribution = await service.getCircleDistribution(testUserId);

      expect(distribution.inner).toBe(0);
      expect(distribution.total).toBe(9);
    });
  });

  describe('suggestCircleRebalancing', () => {
    it('should return empty array when all circles are balanced', async () => {
      const assignments: CircleAssignment[] = [
        { contactId: testContactIds[0], circle: 'inner' },
        { contactId: testContactIds[1], circle: 'close' },
      ];
      await service.batchAssign(testUserId, assignments, 'user');

      const suggestions = await service.suggestCircleRebalancing(testUserId);

      expect(suggestions).toEqual([]);
    });

    it('should suggest rebalancing when circle exceeds 150% of recommended size', async () => {
      // Create enough contacts to exceed 150% of inner circle recommended size (5 * 1.5 = 7.5, so 8+)
      const extraContacts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const contact = await contactRepository.create(testUserId, {
          name: `Rebalance Contact ${i}`,
        });
        extraContacts.push(contact.id);
      }

      const assignments: CircleAssignment[] = extraContacts.map((id) => ({
        contactId: id,
        circle: 'inner' as DunbarCircle,
      }));
      await service.batchAssign(testUserId, assignments, 'user');

      const suggestions = await service.suggestCircleRebalancing(testUserId);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].currentCircle).toBe('inner');
      expect(suggestions[0].suggestedCircle).toBe('close');
      expect(suggestions[0].reason).toContain('over capacity');
      expect(suggestions[0].confidence).toBe(0.7);
    });

    it('should not suggest rebalancing for the largest circle', async () => {
      // Create many contacts in acquaintance circle
      const extraContacts: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const contact = await contactRepository.create(testUserId, {
          name: `Acquaintance ${i}`,
        });
        extraContacts.push(contact.id);
      }

      const assignments: CircleAssignment[] = extraContacts.map((id) => ({
        contactId: id,
        circle: 'acquaintance' as DunbarCircle,
      }));
      await service.batchAssign(testUserId, assignments, 'user');

      const suggestions = await service.suggestCircleRebalancing(testUserId);

      // Should not suggest moving from acquaintance (no larger circle)
      const acquaintanceSuggestions = suggestions.filter(
        (s) => s.currentCircle === 'acquaintance'
      );
      expect(acquaintanceSuggestions).toEqual([]);
    });
  });
});
