/**
 * Onboarding Service Tests
 *
 * Tests for the onboarding service that orchestrates the contact onboarding flow.
 * 
 * Requirements: 1.1, 1.4, 1.5, 2.1, 3.2, 11.1, 11.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PostgresOnboardingService,
  OnboardingTrigger,
  CircleAssignment,
} from './onboarding-service';
import {
  PostgresOnboardingRepository,
  OnboardingStep,
} from './onboarding-repository';
import { PostgresContactRepository, DunbarCircle } from './repository';
import pool from '../db/connection';

describe('OnboardingService', () => {
  let service: PostgresOnboardingService;
  let onboardingRepo: PostgresOnboardingRepository;
  let contactRepo: PostgresContactRepository;
  let testUserId: string;

  beforeEach(async () => {
    onboardingRepo = new PostgresOnboardingRepository();
    contactRepo = new PostgresContactRepository();
    service = new PostgresOnboardingService(onboardingRepo, contactRepo);

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, name, google_id, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id`,
      [`test-onboarding-${Date.now()}@example.com`, 'Test User', `google_test_${Date.now()}`, 'google']
    );
    testUserId = userResult.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM onboarding_state WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('initializeOnboarding', () => {
    it('should create new onboarding state for new user', async () => {
      const trigger: OnboardingTrigger = {
        type: 'new_user',
      };

      const state = await service.initializeOnboarding(testUserId, trigger);

      expect(state).toBeDefined();
      expect(state.userId).toBe(testUserId);
      expect(state.triggerType).toBe('new_user');
      expect(state.currentStep).toBe('welcome');
      expect(state.completedSteps).toEqual([]);
      expect(state.progressData.categorizedCount).toBe(0);
      expect(state.progressData.totalCount).toBe(0);
      expect(state.progressData.milestonesReached).toContain('Getting Started');
    });

    it('should start at circle_assignment for post_import trigger', async () => {
      const trigger: OnboardingTrigger = {
        type: 'post_import',
        source: 'google',
        contactCount: 50,
      };

      const state = await service.initializeOnboarding(testUserId, trigger);

      expect(state.currentStep).toBe('circle_assignment');
      expect(state.triggerType).toBe('post_import');
    });

    it('should start at circle_assignment for manage trigger', async () => {
      const trigger: OnboardingTrigger = {
        type: 'manage',
      };

      const state = await service.initializeOnboarding(testUserId, trigger);

      expect(state.currentStep).toBe('circle_assignment');
      expect(state.triggerType).toBe('manage');
    });

    it('should resume existing incomplete onboarding', async () => {
      // Create initial onboarding
      const trigger: OnboardingTrigger = { type: 'new_user' };
      const initial = await service.initializeOnboarding(testUserId, trigger);

      // Try to initialize again
      const resumed = await service.initializeOnboarding(testUserId, trigger);

      expect(resumed.id).toBe(initial.id);
      expect(resumed.currentStep).toBe(initial.currentStep);
    });

    it('should calculate initial progress with existing contacts', async () => {
      // Create some contacts
      await contactRepo.create(testUserId, { name: 'Contact 1' });
      await contactRepo.create(testUserId, { name: 'Contact 2' });
      const contact3 = await contactRepo.create(testUserId, { name: 'Contact 3' });
      
      // Categorize one contact
      await contactRepo.assignToCircle(contact3.id, testUserId, 'close');

      const trigger: OnboardingTrigger = { type: 'manage' };
      const state = await service.initializeOnboarding(testUserId, trigger);

      expect(state.progressData.totalCount).toBe(3);
      expect(state.progressData.categorizedCount).toBe(1);
    });
  });

  describe('getOnboardingState', () => {
    it('should return null if no onboarding exists', async () => {
      const state = await service.getOnboardingState(testUserId);
      expect(state).toBeNull();
    });

    it('should return existing onboarding state', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      const state = await service.getOnboardingState(testUserId);

      expect(state).toBeDefined();
      expect(state?.userId).toBe(testUserId);
    });
  });

  describe('resumeOnboarding', () => {
    it('should return null if no onboarding exists', async () => {
      const state = await service.resumeOnboarding(testUserId);
      expect(state).toBeNull();
    });

    it('should return null if onboarding is completed', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);
      await service.completeOnboarding(testUserId);

      const state = await service.resumeOnboarding(testUserId);
      expect(state).toBeNull();
    });

    it('should refresh progress data when resuming', async () => {
      // Initialize onboarding
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      // Add contacts after initialization
      const contact1 = await contactRepo.create(testUserId, { name: 'Contact 1' });
      const contact2 = await contactRepo.create(testUserId, { name: 'Contact 2' });
      await contactRepo.assignToCircle(contact1.id, testUserId, 'inner');

      // Resume and check progress is updated
      const resumed = await service.resumeOnboarding(testUserId);

      expect(resumed).toBeDefined();
      expect(resumed?.progressData.totalCount).toBe(2);
      expect(resumed?.progressData.categorizedCount).toBe(1);
    });
  });

  describe('exitOnboarding', () => {
    it('should save progress when exiting', async () => {
      // Initialize and add contacts
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      const contact1 = await contactRepo.create(testUserId, { name: 'Contact 1' });
      await contactRepo.assignToCircle(contact1.id, testUserId, 'close');

      // Exit onboarding
      await service.exitOnboarding(testUserId);

      // Verify progress was saved
      const state = await service.getOnboardingState(testUserId);
      expect(state?.progressData.categorizedCount).toBe(1);
      expect(state?.progressData.totalCount).toBe(1);
    });

    it('should handle exit when no onboarding exists', async () => {
      await expect(service.exitOnboarding(testUserId)).resolves.not.toThrow();
    });
  });

  describe('updateProgress', () => {
    it('should update current step and progress data', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      await service.updateProgress(testUserId, 'circle_assignment', {
        timeSpent: 120,
      });

      const state = await service.getOnboardingState(testUserId);
      expect(state?.currentStep).toBe('circle_assignment');
      expect(state?.progressData.timeSpent).toBe(120);
    });

    it('should detect and record milestone achievements', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      // Create and categorize contacts to reach 25% milestone
      const contacts = await Promise.all([
        contactRepo.create(testUserId, { name: 'Contact 1' }),
        contactRepo.create(testUserId, { name: 'Contact 2' }),
        contactRepo.create(testUserId, { name: 'Contact 3' }),
        contactRepo.create(testUserId, { name: 'Contact 4' }),
      ]);

      // Categorize first contact (25%)
      await contactRepo.assignToCircle(contacts[0].id, testUserId, 'inner');

      await service.updateProgress(testUserId, 'circle_assignment', {});

      const state = await service.getOnboardingState(testUserId);
      // At 25%, we should have reached both First Contact and 25% Complete milestones
      expect(state?.progressData.milestonesReached).toContain('25% Complete');
      // Getting Started should still be there from initialization
      expect(state?.progressData.milestonesReached).toContain('Getting Started');
    });

    it('should throw error if onboarding state not found', async () => {
      await expect(
        service.updateProgress(testUserId, 'circle_assignment', {})
      ).rejects.toThrow('Onboarding state not found');
    });
  });

  describe('markStepComplete', () => {
    it('should mark a step as complete', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      await service.markStepComplete(testUserId, 'welcome');

      const state = await service.getOnboardingState(testUserId);
      expect(state?.completedSteps).toContain('welcome');
    });

    it('should not duplicate completed steps', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      await service.markStepComplete(testUserId, 'welcome');
      await service.markStepComplete(testUserId, 'welcome');

      const state = await service.getOnboardingState(testUserId);
      const welcomeCount = state?.completedSteps.filter(s => s === 'welcome').length;
      expect(welcomeCount).toBe(1);
    });
  });

  describe('completeOnboarding', () => {
    it('should mark onboarding as complete', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      await service.completeOnboarding(testUserId);

      const state = await service.getOnboardingState(testUserId);
      expect(state?.completedAt).toBeDefined();
      expect(state?.currentStep).toBe('completion');
      expect(state?.progressData.milestonesReached).toContain('Complete');
    });

    it('should mark all steps as complete', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      await service.completeOnboarding(testUserId);

      const state = await service.getOnboardingState(testUserId);
      const expectedSteps: OnboardingStep[] = [
        'welcome',
        'import_contacts',
        'circle_assignment',
        'preference_setting',
        'group_overlay',
        'completion',
      ];

      for (const step of expectedSteps) {
        expect(state?.completedSteps).toContain(step);
      }
    });

    it('should throw error if onboarding state not found', async () => {
      await expect(service.completeOnboarding(testUserId)).rejects.toThrow(
        'Onboarding state not found'
      );
    });
  });

  describe('getUncategorizedContacts', () => {
    it('should return contacts without circle assignment', async () => {
      const contact1 = await contactRepo.create(testUserId, { name: 'Uncategorized 1' });
      const contact2 = await contactRepo.create(testUserId, { name: 'Uncategorized 2' });
      const contact3 = await contactRepo.create(testUserId, { name: 'Categorized' });
      await contactRepo.assignToCircle(contact3.id, testUserId, 'close');

      const uncategorized = await service.getUncategorizedContacts(testUserId);

      expect(uncategorized).toHaveLength(2);
      expect(uncategorized.map(c => c.id)).toContain(contact1.id);
      expect(uncategorized.map(c => c.id)).toContain(contact2.id);
      expect(uncategorized.map(c => c.id)).not.toContain(contact3.id);
    });

    it('should return empty array if all contacts are categorized', async () => {
      const contact = await contactRepo.create(testUserId, { name: 'Contact' });
      await contactRepo.assignToCircle(contact.id, testUserId, 'active');

      const uncategorized = await service.getUncategorizedContacts(testUserId);

      expect(uncategorized).toHaveLength(0);
    });

    it('should not include archived contacts', async () => {
      const contact = await contactRepo.create(testUserId, { name: 'Archived' });
      await contactRepo.archive(contact.id, testUserId);

      const uncategorized = await service.getUncategorizedContacts(testUserId);

      expect(uncategorized).toHaveLength(0);
    });
  });

  describe('batchCategorizeContacts', () => {
    it('should assign multiple contacts to circles', async () => {
      const contact1 = await contactRepo.create(testUserId, { name: 'Contact 1' });
      const contact2 = await contactRepo.create(testUserId, { name: 'Contact 2' });
      const contact3 = await contactRepo.create(testUserId, { name: 'Contact 3' });

      const assignments: CircleAssignment[] = [
        { contactId: contact1.id, circle: 'inner' },
        { contactId: contact2.id, circle: 'close' },
        { contactId: contact3.id, circle: 'active' },
      ];

      await service.batchCategorizeContacts(testUserId, assignments);

      const updated1 = await contactRepo.findById(contact1.id, testUserId);
      const updated2 = await contactRepo.findById(contact2.id, testUserId);
      const updated3 = await contactRepo.findById(contact3.id, testUserId);

      expect(updated1?.dunbarCircle).toBe('inner');
      expect(updated2?.dunbarCircle).toBe('close');
      expect(updated3?.dunbarCircle).toBe('active');
    });

    it('should group assignments by circle for efficiency', async () => {
      const contacts = await Promise.all([
        contactRepo.create(testUserId, { name: 'Contact 1' }),
        contactRepo.create(testUserId, { name: 'Contact 2' }),
        contactRepo.create(testUserId, { name: 'Contact 3' }),
      ]);

      const assignments: CircleAssignment[] = [
        { contactId: contacts[0].id, circle: 'close' },
        { contactId: contacts[1].id, circle: 'close' },
        { contactId: contacts[2].id, circle: 'active' },
      ];

      await service.batchCategorizeContacts(testUserId, assignments);

      const updated = await Promise.all(
        contacts.map(c => contactRepo.findById(c.id, testUserId))
      );

      expect(updated[0]?.dunbarCircle).toBe('close');
      expect(updated[1]?.dunbarCircle).toBe('close');
      expect(updated[2]?.dunbarCircle).toBe('active');
    });

    it('should update progress after batch categorization', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      const contacts = await Promise.all([
        contactRepo.create(testUserId, { name: 'Contact 1' }),
        contactRepo.create(testUserId, { name: 'Contact 2' }),
      ]);

      const assignments: CircleAssignment[] = [
        { contactId: contacts[0].id, circle: 'inner' },
        { contactId: contacts[1].id, circle: 'close' },
      ];

      await service.batchCategorizeContacts(testUserId, assignments);

      const state = await service.getOnboardingState(testUserId);
      expect(state?.progressData.categorizedCount).toBe(2);
      expect(state?.progressData.totalCount).toBe(2);
    });

    it('should handle empty assignments array', async () => {
      await expect(
        service.batchCategorizeContacts(testUserId, [])
      ).resolves.not.toThrow();
    });
  });

  describe('getProgress', () => {
    it('should calculate progress correctly', async () => {
      const contacts = await Promise.all([
        contactRepo.create(testUserId, { name: 'Contact 1' }),
        contactRepo.create(testUserId, { name: 'Contact 2' }),
        contactRepo.create(testUserId, { name: 'Contact 3' }),
        contactRepo.create(testUserId, { name: 'Contact 4' }),
      ]);

      // Categorize 2 out of 4 (50%)
      await contactRepo.assignToCircle(contacts[0].id, testUserId, 'inner');
      await contactRepo.assignToCircle(contacts[1].id, testUserId, 'close');

      const progress = await service.getProgress(testUserId);

      expect(progress.totalContacts).toBe(4);
      expect(progress.categorizedContacts).toBe(2);
      expect(progress.uncategorizedContacts).toBe(2);
      expect(progress.percentComplete).toBe(50);
      expect(progress.currentMilestone).toBe('Halfway There');
      expect(progress.nextMilestone).toBe('75% Complete');
    });

    it('should return 0% for no contacts', async () => {
      const progress = await service.getProgress(testUserId);

      expect(progress.totalContacts).toBe(0);
      expect(progress.categorizedContacts).toBe(0);
      expect(progress.percentComplete).toBe(0);
      expect(progress.currentMilestone).toBe('Getting Started');
    });

    it('should return 100% when all contacts categorized', async () => {
      const contacts = await Promise.all([
        contactRepo.create(testUserId, { name: 'Contact 1' }),
        contactRepo.create(testUserId, { name: 'Contact 2' }),
      ]);

      await contactRepo.assignToCircle(contacts[0].id, testUserId, 'inner');
      await contactRepo.assignToCircle(contacts[1].id, testUserId, 'close');

      const progress = await service.getProgress(testUserId);

      expect(progress.percentComplete).toBe(100);
      expect(progress.currentMilestone).toBe('Complete');
    });

    it('should not count archived contacts', async () => {
      const contact1 = await contactRepo.create(testUserId, { name: 'Active' });
      const contact2 = await contactRepo.create(testUserId, { name: 'Archived' });
      await contactRepo.archive(contact2.id, testUserId);

      const progress = await service.getProgress(testUserId);

      expect(progress.totalContacts).toBe(1);
    });
  });

  describe('milestone detection', () => {
    it('should detect First Contact milestone', async () => {
      const trigger: OnboardingTrigger = { type: 'new_user' };
      await service.initializeOnboarding(testUserId, trigger);

      // Create multiple contacts so 1 categorized is not 100%
      await contactRepo.create(testUserId, { name: 'Contact 1' });
      await contactRepo.create(testUserId, { name: 'Contact 2' });
      await contactRepo.create(testUserId, { name: 'Contact 3' });
      await contactRepo.create(testUserId, { name: 'Contact 4' });
      await contactRepo.create(testUserId, { name: 'Contact 5' });
      await contactRepo.create(testUserId, { name: 'Contact 6' });
      await contactRepo.create(testUserId, { name: 'Contact 7' });
      await contactRepo.create(testUserId, { name: 'Contact 8' });
      await contactRepo.create(testUserId, { name: 'Contact 9' });
      const contact10 = await contactRepo.create(testUserId, { name: 'Contact 10' });
      
      // Categorize first contact (10%)
      await contactRepo.assignToCircle(contact10.id, testUserId, 'inner');

      const progress = await service.getProgress(testUserId);
      expect(progress.currentMilestone).toBe('First Contact');
    });

    it('should detect 75% Complete milestone', async () => {
      const contacts = await Promise.all([
        contactRepo.create(testUserId, { name: 'Contact 1' }),
        contactRepo.create(testUserId, { name: 'Contact 2' }),
        contactRepo.create(testUserId, { name: 'Contact 3' }),
        contactRepo.create(testUserId, { name: 'Contact 4' }),
      ]);

      // Categorize 3 out of 4 (75%)
      await contactRepo.assignToCircle(contacts[0].id, testUserId, 'inner');
      await contactRepo.assignToCircle(contacts[1].id, testUserId, 'close');
      await contactRepo.assignToCircle(contacts[2].id, testUserId, 'active');

      const progress = await service.getProgress(testUserId);
      expect(progress.currentMilestone).toBe('75% Complete');
      expect(progress.nextMilestone).toBe('Almost Done');
    });

    it('should detect Almost Done milestone at 90%', async () => {
      const contacts = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          contactRepo.create(testUserId, { name: `Contact ${i + 1}` })
        )
      );

      // Categorize 9 out of 10 (90%)
      for (let i = 0; i < 9; i++) {
        await contactRepo.assignToCircle(contacts[i].id, testUserId, 'close');
      }

      const progress = await service.getProgress(testUserId);
      expect(progress.currentMilestone).toBe('Almost Done');
      expect(progress.nextMilestone).toBe('Complete');
    });
  });
});
