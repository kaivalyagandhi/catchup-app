/**
 * Tests for OnboardingStateManager step completion logic
 * Requirements: 2.5, 3.5, 5.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OnboardingStateManager } from './onboarding-state-manager';

describe('OnboardingStateManager - Step Completion Logic', () => {
  let manager: OnboardingStateManager;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    manager = new OnboardingStateManager();
    await manager.clearState(testUserId);
  });

  describe('Step 1: Integration Completion', () => {
    it('should mark Step 1 complete when both integrations are connected', async () => {
      // Initialize state
      await manager.initializeState(testUserId);

      // Connect both integrations
      await manager.markStep1Complete(testUserId, true, true);

      // Verify Step 1 is complete
      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step1Complete).toBe(true);
    });

    it('should not mark Step 1 complete when only Google Calendar is connected', async () => {
      await manager.initializeState(testUserId);

      await manager.updateGoogleCalendarConnection(testUserId, true);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step1Complete).toBe(false);
    });

    it('should not mark Step 1 complete when only Google Contacts is connected', async () => {
      await manager.initializeState(testUserId);

      await manager.updateGoogleContactsConnection(testUserId, true);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step1Complete).toBe(false);
    });

    it('should advance to Step 2 when both integrations are connected', async () => {
      await manager.initializeState(testUserId);

      await manager.markStep1Complete(testUserId, true, true);

      const state = await manager.loadState(testUserId);
      expect(state?.currentStep).toBe(2);
    });
  });

  describe('Step 2: Circle Progress Completion', () => {
    it('should mark Step 2 complete when 50% of contacts are categorized', async () => {
      await manager.initializeState(testUserId);

      // Categorize 50 out of 100 contacts (50%)
      await manager.updateCircleProgress(testUserId, 50, 100);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step2Complete).toBe(true);
    });

    it('should mark Step 2 complete when more than 50% of contacts are categorized', async () => {
      await manager.initializeState(testUserId);

      // Categorize 75 out of 100 contacts (75%)
      await manager.updateCircleProgress(testUserId, 75, 100);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step2Complete).toBe(true);
    });

    it('should not mark Step 2 complete when less than 50% of contacts are categorized', async () => {
      await manager.initializeState(testUserId);

      // Categorize 49 out of 100 contacts (49%)
      await manager.updateCircleProgress(testUserId, 49, 100);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step2Complete).toBe(false);
    });

    it('should advance to Step 3 when 50%+ contacts are categorized', async () => {
      await manager.initializeState(testUserId);
      
      // Complete Step 1 first
      await manager.markStep1Complete(testUserId, true, true);

      // Categorize 60 out of 100 contacts (60%)
      await manager.updateCircleProgress(testUserId, 60, 100);

      const state = await manager.loadState(testUserId);
      expect(state?.currentStep).toBe(3);
    });

    it('should correctly track incremental progress', async () => {
      await manager.initializeState(testUserId);

      // Set total contacts
      await manager.updateCircleProgress(testUserId, 0, 100);

      // Increment progress
      await manager.incrementCircleProgress(testUserId);
      await manager.incrementCircleProgress(testUserId);

      const progress = await manager.getCircleProgress(testUserId);
      expect(progress.contactsCategorized).toBe(2);
      expect(progress.totalContacts).toBe(100);
      expect(progress.percentComplete).toBe(2);
    });
  });

  describe('Step 3: Group Mapping Completion', () => {
    it('should mark Step 3 complete when all mappings are reviewed', async () => {
      await manager.initializeState(testUserId);

      // Review all 5 mappings
      await manager.updateGroupMappingProgress(testUserId, 5, 5);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step3Complete).toBe(true);
    });

    it('should not mark Step 3 complete when not all mappings are reviewed', async () => {
      await manager.initializeState(testUserId);

      // Review 4 out of 5 mappings
      await manager.updateGroupMappingProgress(testUserId, 4, 5);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step3Complete).toBe(false);
    });

    it('should correctly track incremental mapping progress', async () => {
      await manager.initializeState(testUserId);

      // Set total mappings
      await manager.updateGroupMappingProgress(testUserId, 0, 10);

      // Increment progress
      await manager.incrementGroupMappingProgress(testUserId);
      await manager.incrementGroupMappingProgress(testUserId);
      await manager.incrementGroupMappingProgress(testUserId);

      const progress = await manager.getGroupMappingProgress(testUserId);
      expect(progress.mappingsReviewed).toBe(3);
      expect(progress.totalMappings).toBe(10);
      expect(progress.percentComplete).toBe(30);
    });
  });

  describe('Overall Completion', () => {
    it('should mark onboarding complete when all 3 steps are complete', async () => {
      await manager.initializeState(testUserId);

      // Complete Step 1
      await manager.markStep1Complete(testUserId, true, true);

      // Complete Step 2
      await manager.updateCircleProgress(testUserId, 60, 100);

      // Complete Step 3
      await manager.updateGroupMappingProgress(testUserId, 5, 5);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step1Complete).toBe(true);
      expect(status.step2Complete).toBe(true);
      expect(status.step3Complete).toBe(true);
      expect(status.overallComplete).toBe(true);
    });

    it('should not mark onboarding complete when only 2 steps are complete', async () => {
      await manager.initializeState(testUserId);

      // Complete Step 1
      await manager.markStep1Complete(testUserId, true, true);

      // Complete Step 2
      await manager.updateCircleProgress(testUserId, 60, 100);

      // Step 3 incomplete
      await manager.updateGroupMappingProgress(testUserId, 2, 5);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step1Complete).toBe(true);
      expect(status.step2Complete).toBe(true);
      expect(status.step3Complete).toBe(false);
      expect(status.overallComplete).toBe(false);
    });
  });

  describe('checkStepCompletion', () => {
    it('should automatically check and update all step completion statuses', async () => {
      await manager.initializeState(testUserId);

      // Manually set state without triggering completion checks
      const state = await manager.loadState(testUserId);
      if (state) {
        state.steps.integrations.googleCalendar = true;
        state.steps.integrations.googleContacts = true;
        state.steps.circles.contactsCategorized = 60;
        state.steps.circles.totalContacts = 100;
        state.steps.groups.mappingsReviewed = 5;
        state.steps.groups.totalMappings = 5;
        await manager.saveState(state);
      }

      // Now trigger completion check
      await manager.checkStepCompletion(testUserId);

      const status = await manager.getStepCompletionStatus(testUserId);
      expect(status.step1Complete).toBe(true);
      expect(status.step2Complete).toBe(true);
      expect(status.step3Complete).toBe(true);
      expect(status.overallComplete).toBe(true);
    });
  });
});
