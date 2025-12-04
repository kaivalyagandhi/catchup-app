/**
 * Onboarding Repositories Test
 *
 * Basic integration tests for onboarding repositories.
 * Tests CRUD operations and data integrity.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '../db/connection';
import {
  PostgresOnboardingRepository,
  PostgresCircleAssignmentRepository,
  PostgresWeeklyCatchupRepository,
  PostgresAchievementRepository,
} from './onboarding-repositories';
import { PostgresContactRepository } from './repository';

describe('Onboarding Repositories', () => {
  let testUserId: string;
  let testContactId: string;

  const onboardingRepo = new PostgresOnboardingRepository();
  const circleAssignmentRepo = new PostgresCircleAssignmentRepository();
  const weeklyCatchupRepo = new PostgresWeeklyCatchupRepository();
  const achievementRepo = new PostgresAchievementRepository();
  const contactRepo = new PostgresContactRepository();

  beforeAll(async () => {
    // Create a test user
    const userResult = await pool.query(
      `INSERT INTO users (email, name) 
       VALUES ($1, $2) 
       RETURNING id`,
      ['test-onboarding@example.com', 'Test User']
    );
    testUserId = userResult.rows[0].id;

    // Create a test contact
    const contact = await contactRepo.create(testUserId, {
      name: 'Test Contact',
      email: 'test@example.com',
    });
    testContactId = contact.id;
  });

  afterAll(async () => {
    // Cleanup test data (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('OnboardingRepository', () => {
    it('should create and retrieve onboarding state', async () => {
      const state = await onboardingRepo.create({
        userId: testUserId,
        triggerType: 'new_user',
        currentStep: 'welcome',
      });

      expect(state.userId).toBe(testUserId);
      expect(state.triggerType).toBe('new_user');
      expect(state.currentStep).toBe('welcome');

      const retrieved = await onboardingRepo.findByUserId(testUserId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(state.id);
    });

    it('should update onboarding state', async () => {
      const updated = await onboardingRepo.update(testUserId, {
        currentStep: 'circle_assignment',
        completedSteps: ['welcome', 'import_contacts'],
      });

      expect(updated.currentStep).toBe('circle_assignment');
      expect(updated.completedSteps).toContain('welcome');
      expect(updated.completedSteps).toContain('import_contacts');
    });

    it('should mark step as complete', async () => {
      await onboardingRepo.markStepComplete(testUserId, 'circle_assignment');

      const state = await onboardingRepo.findByUserId(testUserId);
      expect(state?.completedSteps).toContain('circle_assignment');
    });
  });

  describe('CircleAssignmentRepository', () => {
    it('should create circle assignment', async () => {
      const assignment = await circleAssignmentRepo.create({
        userId: testUserId,
        contactId: testContactId,
        toCircle: 'close',
        assignedBy: 'user',
        confidence: 0.85,
      });

      expect(assignment.userId).toBe(testUserId);
      expect(assignment.contactId).toBe(testContactId);
      expect(assignment.toCircle).toBe('close');
      expect(assignment.confidence).toBe(0.85);
    });

    it('should get circle distribution', async () => {
      // Assign contact to circle
      await contactRepo.assignToCircle(testContactId, testUserId, 'close');

      const distribution = await circleAssignmentRepo.getCircleDistribution(testUserId);

      expect(distribution.close).toBeGreaterThan(0);
      expect(distribution.total).toBeGreaterThan(0);
    });

    it('should find assignments by contact', async () => {
      const assignments = await circleAssignmentRepo.findByContactId(testContactId, testUserId);

      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments[0].contactId).toBe(testContactId);
    });
  });

  describe('WeeklyCatchupRepository', () => {
    it('should create weekly catchup session', async () => {
      const session = await weeklyCatchupRepo.create({
        userId: testUserId,
        weekNumber: 1,
        year: 2025,
        contactsToReview: [
          {
            contactId: testContactId,
            reviewType: 'categorize',
          },
        ],
      });

      expect(session.userId).toBe(testUserId);
      expect(session.weekNumber).toBe(1);
      expect(session.year).toBe(2025);
      expect(session.contactsToReview.length).toBe(1);
    });

    it('should mark contact as reviewed', async () => {
      const session = await weeklyCatchupRepo.findByWeek(testUserId, 2025, 1);
      expect(session).not.toBeNull();

      if (session) {
        await weeklyCatchupRepo.markContactReviewed(session.id, testUserId, testContactId);

        const updated = await weeklyCatchupRepo.findById(session.id, testUserId);
        expect(updated?.reviewedContacts).toContain(testContactId);
      }
    });

    it('should get unreviewed contacts', async () => {
      const session = await weeklyCatchupRepo.findByWeek(testUserId, 2025, 1);
      expect(session).not.toBeNull();

      if (session) {
        const unreviewed = await weeklyCatchupRepo.getUnreviewedContacts(session.id, testUserId);
        expect(Array.isArray(unreviewed)).toBe(true);
      }
    });
  });

  describe('AchievementRepository', () => {
    it('should create achievement', async () => {
      const achievement = await achievementRepo.createAchievement({
        userId: testUserId,
        achievementType: 'first_contact_categorized',
        achievementData: { contactId: testContactId },
      });

      expect(achievement.userId).toBe(testUserId);
      expect(achievement.achievementType).toBe('first_contact_categorized');
    });

    it('should check if user has achievement', async () => {
      const hasIt = await achievementRepo.hasAchievement(
        testUserId,
        'first_contact_categorized'
      );

      expect(hasIt).toBe(true);
    });

    it('should get achievement count', async () => {
      const count = await achievementRepo.getAchievementCount(testUserId);

      expect(count).toBeGreaterThan(0);
    });

    it('should create network health score', async () => {
      const score = await achievementRepo.createNetworkHealthScore({
        userId: testUserId,
        score: 85,
        circleBalanceScore: 80,
        engagementScore: 90,
        maintenanceScore: 85,
      });

      expect(score.userId).toBe(testUserId);
      expect(score.score).toBe(85);
    });

    it('should get latest network health score', async () => {
      const latest = await achievementRepo.getLatestNetworkHealthScore(testUserId);

      expect(latest).not.toBeNull();
      expect(latest?.score).toBe(85);
    });
  });

  describe('ContactRepository Circle Methods', () => {
    it('should assign contact to circle', async () => {
      const contact = await contactRepo.assignToCircle(
        testContactId,
        testUserId,
        'inner',
        0.95
      );

      expect(contact.dunbarCircle).toBe('inner');
      expect(contact.circleConfidence).toBe(0.95);
      expect(contact.circleAssignedAt).toBeDefined();
    });

    it('should find uncategorized contacts', async () => {
      // Create a contact without circle
      const newContact = await contactRepo.create(testUserId, {
        name: 'Uncategorized Contact',
      });

      const uncategorized = await contactRepo.findUncategorized(testUserId);

      expect(uncategorized.some((c) => c.id === newContact.id)).toBe(true);

      // Cleanup
      await contactRepo.delete(newContact.id, testUserId);
    });

    it('should find contacts by circle', async () => {
      const innerCircle = await contactRepo.findByCircle(testUserId, 'inner');

      expect(innerCircle.some((c) => c.id === testContactId)).toBe(true);
    });

    it('should batch assign contacts to circle', async () => {
      const contact1 = await contactRepo.create(testUserId, { name: 'Batch 1' });
      const contact2 = await contactRepo.create(testUserId, { name: 'Batch 2' });

      await contactRepo.batchAssignToCircle(
        [contact1.id, contact2.id],
        testUserId,
        'active'
      );

      const retrieved1 = await contactRepo.findById(contact1.id, testUserId);
      const retrieved2 = await contactRepo.findById(contact2.id, testUserId);

      expect(retrieved1?.dunbarCircle).toBe('active');
      expect(retrieved2?.dunbarCircle).toBe('active');

      // Cleanup
      await contactRepo.delete(contact1.id, testUserId);
      await contactRepo.delete(contact2.id, testUserId);
    });
  });
});
