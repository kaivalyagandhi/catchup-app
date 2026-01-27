// Example: Integrating OnboardingController with the main CatchUp app
// This file demonstrates how to use the OnboardingController in the application

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize the controller when the app loads
function initializeOnboardingSystem() {
  // Get auth credentials from app state
  const authToken = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  
  if (authToken && userId) {
    onboardingController.initialize(authToken, userId);
    
    // Set up event listeners
    setupOnboardingEventListeners();
    
    // Check if there's an active onboarding session
    checkForActiveOnboarding();
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupOnboardingEventListeners() {
  // Listen for state changes
  onboardingController.on('stateChange', (state) => {
    console.log('Onboarding state changed:', state);
    
    if (state.completed) {
      // Onboarding completed
      showOnboardingCompletionCelebration();
      refreshContactsList();
    } else if (state.exited) {
      // User exited onboarding
      showOnboardingExitMessage();
    }
  });
  
  // Listen for progress updates
  onboardingController.on('progressUpdate', (progress) => {
    console.log('Progress updated:', progress);
    updateProgressUI(progress);
    
    // Check for milestone achievements
    if (progress.categorizedContacts === 5) {
      showMilestoneAchievement('First 5 contacts categorized!');
    } else if (progress.categorizedContacts === 15) {
      showMilestoneAchievement('Inner circle complete!');
    } else if (progress.percentComplete === 100) {
      showMilestoneAchievement('All contacts categorized!');
    }
  });
  
  // Listen for step changes
  onboardingController.on('stepChange', (change) => {
    console.log(`Step changed from ${change.from} to ${change.to}`);
    renderOnboardingStep(change.to);
  });
  
  // Listen for errors
  onboardingController.on('error', (error) => {
    console.error('Onboarding error:', error);
    showErrorToast(error.message);
  });
}

// ============================================================================
// TRIGGERING ONBOARDING
// ============================================================================

// Trigger onboarding for a new user
async function startNewUserOnboarding() {
  try {
    showLoadingOverlay('Initializing onboarding...');
    
    const state = await onboardingController.initializeOnboarding('new_user');
    
    hideLoadingOverlay();
    showOnboardingModal();
    renderOnboardingStep(state.currentStep);
    
  } catch (error) {
    hideLoadingOverlay();
    showErrorToast('Failed to start onboarding: ' + error.message);
  }
}

// Trigger onboarding after Google Contacts import
async function startPostImportOnboarding() {
  try {
    showLoadingOverlay('Preparing to organize your contacts...');
    
    const state = await onboardingController.initializeOnboarding('post_import');
    
    hideLoadingOverlay();
    showOnboardingModal();
    renderOnboardingStep(state.currentStep);
    
  } catch (error) {
    hideLoadingOverlay();
    showErrorToast('Failed to start onboarding: ' + error.message);
  }
}

// Trigger management mode from Contacts page
async function openManagementMode() {
  try {
    showLoadingOverlay('Loading contact management...');
    
    const state = await onboardingController.initializeOnboarding('manage');
    
    hideLoadingOverlay();
    showOnboardingModal();
    renderOnboardingStep(state.currentStep);
    
  } catch (error) {
    hideLoadingOverlay();
    showErrorToast('Failed to open management mode: ' + error.message);
  }
}

// Check for active onboarding on app load
async function checkForActiveOnboarding() {
  try {
    const state = await onboardingController.resumeOnboarding();
    
    if (state) {
      // Show resume prompt
      showResumeOnboardingPrompt(state);
    }
  } catch (error) {
    console.error('Error checking for active onboarding:', error);
  }
}

// ============================================================================
// NAVIGATION
// ============================================================================

// Handle next button click
async function handleNextClick() {
  try {
    const currentStep = onboardingController.getCurrentStep();
    
    // Validate current step before proceeding
    if (!validateCurrentStep(currentStep)) {
      showErrorToast('Please complete the current step before continuing');
      return;
    }
    
    // Mark current step as complete
    await onboardingController.markStepComplete(currentStep);
    
    // Move to next step
    await onboardingController.nextStep();
    
  } catch (error) {
    showErrorToast('Failed to proceed: ' + error.message);
  }
}

// Handle previous button click
async function handlePreviousClick() {
  try {
    await onboardingController.previousStep();
  } catch (error) {
    showErrorToast('Failed to go back: ' + error.message);
  }
}

// Handle skip button click
async function handleSkipClick() {
  try {
    const currentStep = onboardingController.getCurrentStep();
    
    // Confirm skip for important steps
    if (currentStep === ONBOARDING_STEPS.CIRCLE_ASSIGNMENT) {
      const confirmed = confirm('Are you sure you want to skip categorizing your contacts?');
      if (!confirmed) return;
    }
    
    await onboardingController.skipStep();
    
  } catch (error) {
    showErrorToast('Failed to skip: ' + error.message);
  }
}

// Handle exit button click
async function handleExitClick() {
  try {
    const confirmed = confirm('Your progress will be saved. You can resume anytime from the Contacts page.');
    if (!confirmed) return;
    
    await onboardingController.exitOnboarding();
    hideOnboardingModal();
    
  } catch (error) {
    showErrorToast('Failed to exit: ' + error.message);
  }
}

// ============================================================================
// CONTACT CATEGORIZATION
// ============================================================================

// Handle contact assignment to a circle
async function handleContactAssignment(contactId, circle) {
  try {
    // Update backend via API
    await assignContactToCircle(contactId, circle);
    
    // Update controller state
    onboardingController.addCategorizedContact(contactId);
    
    // Save progress
    await onboardingController.saveProgress();
    
    showSuccessToast('Contact categorized!');
    
  } catch (error) {
    showErrorToast('Failed to categorize contact: ' + error.message);
  }
}

// Handle batch contact assignment
async function handleBatchAssignment(contactIds, circle) {
  try {
    showLoadingOverlay(`Categorizing ${contactIds.length} contacts...`);
    
    // Update backend via API
    await batchAssignContactsToCircle(contactIds, circle);
    
    // Update controller state
    contactIds.forEach(id => {
      onboardingController.addCategorizedContact(id);
    });
    
    // Save progress
    await onboardingController.saveProgress();
    
    hideLoadingOverlay();
    showSuccessToast(`${contactIds.length} contacts categorized!`);
    
  } catch (error) {
    hideLoadingOverlay();
    showErrorToast('Failed to categorize contacts: ' + error.message);
  }
}

// ============================================================================
// UI RENDERING
// ============================================================================

// Render the current onboarding step
function renderOnboardingStep(step) {
  // Hide all step containers
  document.querySelectorAll('.onboarding-step').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Show current step container
  const stepContainer = document.getElementById(`step-${step}`);
  if (stepContainer) {
    stepContainer.classList.remove('hidden');
  }
  
  // Update navigation buttons
  updateNavigationButtons();
  
  // Update progress bar
  updateProgressUI(onboardingController.getProgress());
  
  // Update step indicator
  updateStepIndicator();
}

// Update navigation buttons state
function updateNavigationButtons() {
  const prevBtn = document.getElementById('onboarding-prev-btn');
  const nextBtn = document.getElementById('onboarding-next-btn');
  
  if (prevBtn) {
    prevBtn.disabled = !onboardingController.canGoPrevious();
  }
  
  if (nextBtn) {
    nextBtn.disabled = !onboardingController.canGoNext();
    
    // Change text on last step
    const currentStep = onboardingController.getCurrentStep();
    if (currentStep === ONBOARDING_STEPS.COMPLETION) {
      nextBtn.textContent = 'Complete';
      nextBtn.onclick = handleCompleteClick;
    } else {
      nextBtn.textContent = 'Next';
      nextBtn.onclick = handleNextClick;
    }
  }
}

// Update progress UI
function updateProgressUI(progress) {
  // Update progress bar
  const progressBar = document.getElementById('onboarding-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${progress.percentComplete}%`;
    progressBar.textContent = `${progress.percentComplete}%`;
  }
  
  // Update milestone text
  const milestoneEl = document.getElementById('onboarding-milestone');
  if (milestoneEl) {
    milestoneEl.textContent = progress.currentMilestone;
  }
  
  // Update next milestone
  const nextMilestoneEl = document.getElementById('onboarding-next-milestone');
  if (nextMilestoneEl) {
    nextMilestoneEl.textContent = progress.nextMilestone;
  }
  
  // Update contact counts
  const contactCountEl = document.getElementById('onboarding-contact-count');
  if (contactCountEl) {
    contactCountEl.textContent = `${progress.categorizedContacts} / ${progress.totalContacts}`;
  }
}

// Update step indicator
function updateStepIndicator() {
  const currentStep = onboardingController.getCurrentStep();
  
  STEP_ORDER.forEach((step, index) => {
    const stepEl = document.getElementById(`step-indicator-${index}`);
    if (stepEl) {
      stepEl.classList.remove('active', 'completed');
      
      if (step === currentStep) {
        stepEl.classList.add('active');
      } else if (onboardingController.isStepCompleted(step)) {
        stepEl.classList.add('completed');
      }
    }
  });
}

// ============================================================================
// COMPLETION
// ============================================================================

// Handle completion button click
async function handleCompleteClick() {
  try {
    showLoadingOverlay('Completing onboarding...');
    
    await onboardingController.completeOnboarding();
    
    hideLoadingOverlay();
    hideOnboardingModal();
    showOnboardingCompletionCelebration();
    
    // Refresh the contacts page
    refreshContactsList();
    
  } catch (error) {
    hideLoadingOverlay();
    showErrorToast('Failed to complete onboarding: ' + error.message);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateCurrentStep(step) {
  // Add validation logic for each step
  switch (step) {
    case ONBOARDING_STEPS.WELCOME:
      return true; // No validation needed
      
    case ONBOARDING_STEPS.IMPORT_CONTACTS:
      // Check if contacts have been imported
      const progress = onboardingController.getProgress();
      return progress.totalContacts > 0;
      
    case ONBOARDING_STEPS.CIRCLE_ASSIGNMENT:
      // Check if at least some contacts are categorized
      return onboardingController.getCategorizedContacts().length > 0;
      
    default:
      return true;
  }
}

function showOnboardingModal() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function hideOnboardingModal() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function showResumeOnboardingPrompt(state) {
  const progress = onboardingController.getProgress();
  const message = `You have an onboarding session in progress (${progress.percentComplete}% complete). Would you like to continue?`;
  
  if (confirm(message)) {
    showOnboardingModal();
    renderOnboardingStep(state.currentStep);
  }
}

function showOnboardingCompletionCelebration() {
  // Show celebration animation/modal
  showSuccessToast('🎉 Onboarding complete! Your network is organized.');
}

function showOnboardingExitMessage() {
  showInfoToast('Progress saved. Resume anytime from the Contacts page.');
}

function showMilestoneAchievement(message) {
  showSuccessToast('🏆 ' + message);
}

// ============================================================================
// INITIALIZATION ON PAGE LOAD
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOnboardingSystem);
} else {
  initializeOnboardingSystem();
}

// Export functions for use in HTML onclick handlers
window.startNewUserOnboarding = startNewUserOnboarding;
window.startPostImportOnboarding = startPostImportOnboarding;
window.openManagementMode = openManagementMode;
window.handleNextClick = handleNextClick;
window.handlePreviousClick = handlePreviousClick;
window.handleSkipClick = handleSkipClick;
window.handleExitClick = handleExitClick;
window.handleCompleteClick = handleCompleteClick;
