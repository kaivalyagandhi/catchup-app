/**
 * Onboarding State Manager Usage Examples
 *
 * This file demonstrates how to use the OnboardingStateManager
 * for managing onboarding state across different storage mechanisms.
 */

import {
  OnboardingStateManager,
  getOnboardingStateManager,
  initializeOnboardingState,
  loadOnboardingState,
  updateGoogleCalendarConnection,
  updateGoogleContactsConnection,
  updateCircleProgress,
  incrementCircleProgress,
  updateGroupMappingProgress,
  getStepCompletionStatus,
  getCircleProgress,
  dismissOnboarding,
  resumeOnboarding,
} from './onboarding-state-manager';

/**
 * Example 1: Initialize onboarding for a new user
 */
async function example1_InitializeOnboarding() {
  const userId = 'user-123';

  // Initialize onboarding state
  const state = await initializeOnboardingState(userId);

  console.log('Initialized onboarding state:', state);
  console.log('Current step:', state.currentStep); // 1
  console.log('Is complete:', state.isComplete); // false
}

/**
 * Example 2: Load existing onboarding state
 */
async function example2_LoadState() {
  const userId = 'user-123';

  // Load state (tries localStorage → sessionStorage → memory → database)
  const state = await loadOnboardingState(userId);

  if (state) {
    console.log('Loaded state:', state);
    console.log('Current step:', state.currentStep);
    console.log('Dismissed:', state.dismissedAt ? 'Yes' : 'No');
  } else {
    console.log('No onboarding state found');
  }
}


/**
 * Example 3: Update Step 1 (Integrations)
 */
async function example3_UpdateStep1() {
  const userId = 'user-123';

  // User connects Google Calendar
  await updateGoogleCalendarConnection(userId, true);
  console.log('Google Calendar connected');

  // User connects Google Contacts
  await updateGoogleContactsConnection(userId, true);
  console.log('Google Contacts connected');

  // Check completion status
  const status = await getStepCompletionStatus(userId);
  console.log('Step 1 complete:', status.step1Complete); // true
  console.log('Current step should be 2');
}

/**
 * Example 4: Update Step 2 (Circles)
 */
async function example4_UpdateStep2() {
  const userId = 'user-123';

  // User has 100 contacts total
  const totalContacts = 100;

  // User categorizes contacts one by one
  for (let i = 0; i < 60; i++) {
    await incrementCircleProgress(userId);
  }

  // Or update in bulk
  await updateCircleProgress(userId, 60, totalContacts);

  // Check progress
  const progress = await getCircleProgress(userId);
  console.log('Circle progress:', progress);
  console.log('Percent complete:', progress.percentComplete); // 60%
  console.log('Step 2 complete:', progress.isComplete); // true (>50%)
}

/**
 * Example 5: Update Step 3 (Groups)
 */
async function example5_UpdateStep3() {
  const userId = 'user-123';

  // User has 5 group mapping suggestions
  const totalMappings = 5;

  // User reviews mappings
  await updateGroupMappingProgress(userId, 5, totalMappings);

  // Check completion
  const status = await getStepCompletionStatus(userId);
  console.log('Step 3 complete:', status.step3Complete); // true
  console.log('Overall complete:', status.overallComplete); // true
}


/**
 * Example 6: Dismiss and resume onboarding
 */
async function example6_DismissAndResume() {
  const userId = 'user-123';

  // User dismisses onboarding
  await dismissOnboarding(userId);
  console.log('Onboarding dismissed');

  // Later, user wants to resume
  const state = await resumeOnboarding(userId);
  if (state) {
    console.log('Onboarding resumed at step:', state.currentStep);
    console.log('Dismissed flag cleared:', state.dismissedAt === undefined);
  }
}

/**
 * Example 7: Using the manager directly for advanced use cases
 */
async function example7_AdvancedUsage() {
  const userId = 'user-123';

  // Get the manager instance
  const manager = getOnboardingStateManager();

  // Initialize state
  await manager.initializeState(userId);

  // Load state
  const state = await manager.loadState(userId);
  if (!state) {
    console.log('No state found');
    return;
  }

  // Update specific fields
  await manager.updateState(userId, {
    currentStep: 2,
    steps: {
      ...state.steps,
      integrations: {
        ...state.steps.integrations,
        complete: true,
      },
    },
  });

  // Force sync to database immediately (bypasses debouncing)
  await manager.syncToDatabase();

  // Get current cached state
  const cachedState = manager.getCurrentState();
  console.log('Cached state:', cachedState);
}


/**
 * Example 8: Complete workflow
 */
async function example8_CompleteWorkflow() {
  const userId = 'user-123';

  console.log('=== Starting Onboarding Workflow ===');

  // Step 1: Initialize
  console.log('\n1. Initializing onboarding...');
  await initializeOnboardingState(userId);

  // Step 2: Connect integrations
  console.log('\n2. Connecting integrations...');
  await updateGoogleCalendarConnection(userId, true);
  await updateGoogleContactsConnection(userId, true);

  let status = await getStepCompletionStatus(userId);
  console.log('Step 1 complete:', status.step1Complete);

  // Step 3: Categorize contacts
  console.log('\n3. Categorizing contacts...');
  await updateCircleProgress(userId, 75, 100);

  status = await getStepCompletionStatus(userId);
  console.log('Step 2 complete:', status.step2Complete);

  // Step 4: Review group mappings
  console.log('\n4. Reviewing group mappings...');
  await updateGroupMappingProgress(userId, 3, 3);

  status = await getStepCompletionStatus(userId);
  console.log('Step 3 complete:', status.step3Complete);
  console.log('Overall complete:', status.overallComplete);

  console.log('\n=== Onboarding Complete! ===');
}

/**
 * Example 9: Error handling
 */
async function example9_ErrorHandling() {
  const userId = 'user-123';

  try {
    // Try to update state that doesn't exist
    await updateCircleProgress('non-existent-user', 10, 100);
  } catch (error) {
    console.error('Error updating progress:', error);
    // Handle error appropriately
  }

  // Initialize state first
  await initializeOnboardingState(userId);

  // Now updates will work
  await updateCircleProgress(userId, 10, 100);
  console.log('Progress updated successfully');
}


/**
 * Example 10: Monitoring progress in real-time
 */
async function example10_MonitorProgress() {
  const userId = 'user-123';

  // Initialize
  await initializeOnboardingState(userId);

  // Simulate user categorizing contacts
  const totalContacts = 50;
  await updateCircleProgress(userId, 0, totalContacts);

  for (let i = 1; i <= totalContacts; i++) {
    await incrementCircleProgress(userId);

    // Check progress every 10 contacts
    if (i % 10 === 0) {
      const progress = await getCircleProgress(userId);
      console.log(`Progress: ${progress.contactsCategorized}/${progress.totalContacts} (${progress.percentComplete}%)`);

      if (progress.isComplete) {
        console.log('Step 2 complete! Moving to Step 3...');
        break;
      }
    }
  }
}

// Export examples for testing
export {
  example1_InitializeOnboarding,
  example2_LoadState,
  example3_UpdateStep1,
  example4_UpdateStep2,
  example5_UpdateStep3,
  example6_DismissAndResume,
  example7_AdvancedUsage,
  example8_CompleteWorkflow,
  example9_ErrorHandling,
  example10_MonitorProgress,
};
