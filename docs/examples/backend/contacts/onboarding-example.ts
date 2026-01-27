/**
 * Onboarding Service Usage Example
 *
 * Demonstrates how to use the OnboardingService for managing
 * the contact onboarding flow.
 */

import {
  PostgresOnboardingService,
  OnboardingTrigger,
  CircleAssignment,
} from './onboarding-service';
import { PostgresContactRepository } from './repository';
import { PostgresAISuggestionService } from './ai-suggestion-service';

/**
 * Example 1: New User Onboarding
 */
async function newUserOnboarding(userId: string) {
  const service = new PostgresOnboardingService();

  // Initialize onboarding for new user
  const trigger: OnboardingTrigger = {
    type: 'new_user',
  };

  const state = await service.initializeOnboarding(userId, trigger);
  console.log('Onboarding started:', state.currentStep);

  // Get initial progress
  const progress = await service.getProgress(userId);
  console.log(`Progress: ${progress.percentComplete}%`);
  console.log(`Current milestone: ${progress.currentMilestone}`);
  console.log(`Next milestone: ${progress.nextMilestone}`);

  // Mark welcome step complete
  await service.markStepComplete(userId, 'welcome');

  // Move to next step
  await service.updateProgress(userId, 'import_contacts', {
    timeSpent: 30,
  });
}

/**
 * Example 2: Post-Import Onboarding
 */
async function postImportOnboarding(userId: string) {
  const service = new PostgresOnboardingService();
  const contactRepo = new PostgresContactRepository();

  // Initialize onboarding after Google Contacts import
  const trigger: OnboardingTrigger = {
    type: 'post_import',
    source: 'google',
    contactCount: 50,
  };

  const state = await service.initializeOnboarding(userId, trigger);
  console.log('Post-import onboarding started');

  // Get uncategorized contacts
  const uncategorized = await service.getUncategorizedContacts(userId);
  console.log(`${uncategorized.length} contacts need categorization`);

  // Batch categorize contacts
  const assignments: CircleAssignment[] = uncategorized.slice(0, 10).map((contact) => ({
    contactId: contact.id,
    circle: 'close', // In real app, this would come from AI or user selection
  }));

  await service.batchCategorizeContacts(userId, assignments);

  // Check updated progress
  const progress = await service.getProgress(userId);
  console.log(`Progress: ${progress.percentComplete}%`);
}

/**
 * Example 3: Management Mode
 */
async function managementMode(userId: string) {
  const service = new PostgresOnboardingService();

  // Initialize management mode
  const trigger: OnboardingTrigger = {
    type: 'manage',
  };

  const state = await service.initializeOnboarding(userId, trigger);
  console.log('Management mode started');

  // Get current distribution
  const progress = await service.getProgress(userId);
  console.log(`Total contacts: ${progress.totalContacts}`);
  console.log(`Categorized: ${progress.categorizedContacts}`);
  console.log(`Uncategorized: ${progress.uncategorizedContacts}`);
}

/**
 * Example 4: Resume Interrupted Onboarding
 */
async function resumeOnboarding(userId: string) {
  const service = new PostgresOnboardingService();

  // Try to resume existing onboarding
  const state = await service.resumeOnboarding(userId);

  if (state) {
    console.log('Resuming onboarding from:', state.currentStep);
    console.log('Completed steps:', state.completedSteps);

    // Get refreshed progress
    const progress = await service.getProgress(userId);
    console.log(`Progress: ${progress.percentComplete}%`);
  } else {
    console.log('No onboarding to resume');
  }
}

/**
 * Example 5: Complete Onboarding Flow
 */
async function completeOnboardingFlow(userId: string) {
  const service = new PostgresOnboardingService();
  const contactRepo = new PostgresContactRepository();
  const aiService = new PostgresAISuggestionService();

  // 1. Initialize
  const trigger: OnboardingTrigger = { type: 'new_user' };
  await service.initializeOnboarding(userId, trigger);

  // 2. Import contacts (simulated)
  const contact1 = await contactRepo.create(userId, { name: 'Alice Smith' });
  const contact2 = await contactRepo.create(userId, { name: 'Bob Jones' });
  const contact3 = await contactRepo.create(userId, { name: 'Carol White' });

  // 3. Get AI suggestions
  const suggestions = await aiService.batchAnalyze(userId, [
    contact1.id,
    contact2.id,
    contact3.id,
  ]);

  // 4. Apply suggestions
  const assignments: CircleAssignment[] = suggestions.map((suggestion) => ({
    contactId: suggestion.contactId,
    circle: suggestion.suggestedCircle,
    confidence: suggestion.confidence,
  }));

  await service.batchCategorizeContacts(userId, assignments);

  // 5. Check progress
  let progress = await service.getProgress(userId);
  console.log(`Progress: ${progress.percentComplete}%`);
  console.log(`Milestone: ${progress.currentMilestone}`);

  // 6. Complete onboarding
  if (progress.percentComplete === 100) {
    await service.completeOnboarding(userId);
    console.log('Onboarding completed!');
  }
}


/**
 * Example 6: Exit and Resume
 */
async function exitAndResume(userId: string) {
  const service = new PostgresOnboardingService();

  // Start onboarding
  const trigger: OnboardingTrigger = { type: 'new_user' };
  await service.initializeOnboarding(userId, trigger);

  // Do some work
  await service.updateProgress(userId, 'circle_assignment', {
    timeSpent: 120,
  });

  // User exits
  await service.exitOnboarding(userId);
  console.log('Onboarding exited, progress saved');

  // Later, user returns
  const resumed = await service.resumeOnboarding(userId);
  if (resumed) {
    console.log('Resumed from:', resumed.currentStep);
    console.log('Time spent so far:', resumed.progressData.timeSpent);
  }
}

/**
 * Example 7: Milestone Tracking
 */
async function trackMilestones(userId: string) {
  const service = new PostgresOnboardingService();
  const contactRepo = new PostgresContactRepository();

  // Initialize
  const trigger: OnboardingTrigger = { type: 'new_user' };
  await service.initializeOnboarding(userId, trigger);

  // Create 10 contacts
  const contacts = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      contactRepo.create(userId, { name: `Contact ${i + 1}` })
    )
  );

  // Categorize progressively and watch milestones
  for (let i = 0; i < contacts.length; i++) {
    await contactRepo.assignToCircle(contacts[i].id, userId, 'close');

    const progress = await service.getProgress(userId);
    console.log(
      `${progress.percentComplete}% - ${progress.currentMilestone} → ${progress.nextMilestone}`
    );

    // Update progress to record milestone
    await service.updateProgress(userId, 'circle_assignment', {});
  }

  // Check final state
  const state = await service.getOnboardingState(userId);
  console.log('Milestones reached:', state?.progressData.milestonesReached);
}

// Export examples
export {
  newUserOnboarding,
  postImportOnboarding,
  managementMode,
  resumeOnboarding,
  completeOnboardingFlow,
  exitAndResume,
  trackMilestones,
};
