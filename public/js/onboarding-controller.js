// Onboarding Controller Module
// Manages the contact onboarding flow, state, and navigation

// Constants
const ONBOARDING_STORAGE_KEY = 'catchup-onboarding-state';
const API_BASE = '/api';

// Onboarding steps
const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  IMPORT_CONTACTS: 'import_contacts',
  CIRCLE_ASSIGNMENT: 'circle_assignment',
  PREFERENCE_SETTING: 'preference_setting',
  GROUP_OVERLAY: 'group_overlay',
  COMPLETION: 'completion'
};

// Step order for navigation
const STEP_ORDER = [
  ONBOARDING_STEPS.WELCOME,
  ONBOARDING_STEPS.IMPORT_CONTACTS,
  ONBOARDING_STEPS.CIRCLE_ASSIGNMENT,
  ONBOARDING_STEPS.PREFERENCE_SETTING,
  ONBOARDING_STEPS.GROUP_OVERLAY,
  ONBOARDING_STEPS.COMPLETION
];

// Trigger types
const TRIGGER_TYPES = {
  NEW_USER: 'new_user',
  POST_IMPORT: 'post_import',
  MANAGE: 'manage'
};

/**
 * Onboarding Controller Class
 * Manages the onboarding flow state, progress tracking, and navigation
 */
class OnboardingController {
  constructor() {
    this.state = null;
    this.authToken = null;
    this.userId = null;
    this.listeners = {
      stateChange: [],
      progressUpdate: [],
      stepChange: [],
      error: []
    };
  }

  /**
   * Initialize the onboarding controller with auth credentials
   * @param {string} authToken - JWT authentication token
   * @param {string} userId - User ID
   */
  initialize(authToken, userId) {
    this.authToken = authToken;
    this.userId = userId;
  }

  /**
   * Start a new onboarding session
   * @param {string} trigger - Trigger type ('new_user', 'post_import', 'manage')
   * @returns {Promise<Object>} Onboarding state
   */
  async initializeOnboarding(trigger) {
    if (!Object.values(TRIGGER_TYPES).includes(trigger)) {
      throw new Error(`Invalid trigger type: ${trigger}`);
    }

    try {
      const response = await fetch(`${API_BASE}/onboarding/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ trigger })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize onboarding');
      }

      this.state = await response.json();
      this.saveStateToLocalStorage();
      this.emit('stateChange', this.state);
      
      return this.state;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Resume an existing onboarding session
   * @returns {Promise<Object|null>} Onboarding state or null if no session exists
   */
  async resumeOnboarding() {
    try {
      const response = await fetch(`${API_BASE}/onboarding/state`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.status === 404) {
        // No onboarding session exists
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resume onboarding');
      }

      this.state = await response.json();
      this.saveStateToLocalStorage();
      this.emit('stateChange', this.state);
      
      return this.state;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Save current progress to backend
   * @returns {Promise<void>}
   */
  async saveProgress() {
    if (!this.state) {
      throw new Error('No onboarding state to save');
    }

    try {
      const response = await fetch(`${API_BASE}/onboarding/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          step: this.state.currentStep,
          data: this.state.progressData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save progress');
      }

      const updatedState = await response.json();
      this.state = updatedState;
      this.saveStateToLocalStorage();
      this.emit('progressUpdate', this.getProgress());
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Navigate to the next step
   * @returns {Promise<void>}
   */
  async nextStep() {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
    if (currentIndex === -1) {
      throw new Error(`Invalid current step: ${this.state.currentStep}`);
    }

    if (currentIndex >= STEP_ORDER.length - 1) {
      // Already at the last step
      return;
    }

    const nextStep = STEP_ORDER[currentIndex + 1];
    await this.goToStep(nextStep);
  }

  /**
   * Navigate to the previous step
   * @returns {Promise<void>}
   */
  async previousStep() {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
    if (currentIndex === -1) {
      throw new Error(`Invalid current step: ${this.state.currentStep}`);
    }

    if (currentIndex <= 0) {
      // Already at the first step
      return;
    }

    const previousStep = STEP_ORDER[currentIndex - 1];
    await this.goToStep(previousStep);
  }

  /**
   * Skip the current step
   * @returns {Promise<void>}
   */
  async skipStep() {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    // Mark current step as completed (even though skipped)
    await this.markStepComplete(this.state.currentStep);
    
    // Move to next step
    await this.nextStep();
  }

  /**
   * Navigate to a specific step
   * @param {string} step - Step to navigate to
   * @returns {Promise<void>}
   */
  async goToStep(step) {
    if (!STEP_ORDER.includes(step)) {
      throw new Error(`Invalid step: ${step}`);
    }

    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    const previousStep = this.state.currentStep;
    this.state.currentStep = step;
    this.state.lastUpdatedAt = new Date().toISOString();

    await this.saveProgress();
    this.emit('stepChange', { from: previousStep, to: step });
  }

  /**
   * Mark a step as complete
   * @param {string} step - Step to mark as complete
   * @returns {Promise<void>}
   */
  async markStepComplete(step) {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    if (!this.state.completedSteps.includes(step)) {
      this.state.completedSteps.push(step);
      await this.saveProgress();
    }
  }

  /**
   * Exit onboarding (save state and close)
   * @returns {Promise<void>}
   */
  async exitOnboarding() {
    if (!this.state) {
      return;
    }

    try {
      await this.saveProgress();
      this.emit('stateChange', { exited: true });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Complete the onboarding process
   * @returns {Promise<void>}
   */
  async completeOnboarding() {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    try {
      const response = await fetch(`${API_BASE}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete onboarding');
      }

      // Clear state
      this.state = null;
      this.clearLocalStorage();
      this.emit('stateChange', { completed: true });
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current progress information
   * @returns {Object} Progress information
   */
  getProgress() {
    if (!this.state) {
      return {
        totalContacts: 0,
        categorizedContacts: 0,
        percentComplete: 0,
        currentMilestone: 'Not started',
        nextMilestone: 'Start onboarding'
      };
    }

    const totalContacts = this.state.progressData?.totalCount || 0;
    const categorizedContacts = this.state.progressData?.categorizedCount || 0;
    const percentComplete = totalContacts > 0 
      ? Math.round((categorizedContacts / totalContacts) * 100)
      : 0;

    // Determine milestones
    let currentMilestone = 'Getting started';
    let nextMilestone = 'Categorize first contact';

    if (categorizedContacts === 0) {
      currentMilestone = 'Getting started';
      nextMilestone = 'Categorize first contact';
    } else if (categorizedContacts < 5) {
      currentMilestone = 'First contacts categorized';
      nextMilestone = 'Categorize 5 contacts';
    } else if (categorizedContacts < 15) {
      currentMilestone = 'Inner circle taking shape';
      nextMilestone = 'Complete inner circle (15)';
    } else if (categorizedContacts < 50) {
      currentMilestone = 'Close friends identified';
      nextMilestone = 'Categorize active friends (50)';
    } else if (categorizedContacts < totalContacts) {
      currentMilestone = 'Network well organized';
      nextMilestone = 'Complete all contacts';
    } else {
      currentMilestone = 'All contacts categorized!';
      nextMilestone = 'Maintain your network';
    }

    return {
      totalContacts,
      categorizedContacts,
      percentComplete,
      currentMilestone,
      nextMilestone,
      completedSteps: this.state.completedSteps.length,
      totalSteps: STEP_ORDER.length
    };
  }

  /**
   * Get current onboarding state
   * @returns {Object|null} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if onboarding is in progress
   * @returns {boolean} True if onboarding is active
   */
  isOnboardingActive() {
    return this.state !== null && !this.state.completedAt;
  }

  /**
   * Get current step
   * @returns {string|null} Current step
   */
  getCurrentStep() {
    return this.state?.currentStep || null;
  }

  /**
   * Check if a step is completed
   * @param {string} step - Step to check
   * @returns {boolean} True if step is completed
   */
  isStepCompleted(step) {
    return this.state?.completedSteps.includes(step) || false;
  }

  /**
   * Get step index (0-based)
   * @param {string} step - Step to get index for
   * @returns {number} Step index or -1 if not found
   */
  getStepIndex(step) {
    return STEP_ORDER.indexOf(step);
  }

  /**
   * Check if can navigate to next step
   * @returns {boolean} True if can go to next step
   */
  canGoNext() {
    if (!this.state) return false;
    const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
    return currentIndex < STEP_ORDER.length - 1;
  }

  /**
   * Check if can navigate to previous step
   * @returns {boolean} True if can go to previous step
   */
  canGoPrevious() {
    if (!this.state) return false;
    const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
    return currentIndex > 0;
  }

  /**
   * Save state to localStorage for offline persistence
   */
  saveStateToLocalStorage() {
    try {
      if (this.state) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (error) {
      console.warn('Failed to save onboarding state to localStorage:', error);
    }
  }

  /**
   * Load state from localStorage
   * @returns {Object|null} Saved state or null
   */
  loadStateFromLocalStorage() {
    try {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load onboarding state from localStorage:', error);
    }
    return null;
  }

  /**
   * Clear localStorage
   */
  clearLocalStorage() {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear onboarding state from localStorage:', error);
    }
  }

  /**
   * Register an event listener
   * @param {string} event - Event name ('stateChange', 'progressUpdate', 'stepChange', 'error')
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Unregister an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Update progress data
   * @param {Object} data - Progress data to update
   */
  updateProgressData(data) {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    this.state.progressData = {
      ...this.state.progressData,
      ...data
    };

    this.saveStateToLocalStorage();
    this.emit('progressUpdate', this.getProgress());
  }

  /**
   * Add a contact to categorized list
   * @param {string} contactId - Contact ID
   */
  addCategorizedContact(contactId) {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    if (!this.state.categorizedContacts) {
      this.state.categorizedContacts = [];
    }

    if (!this.state.categorizedContacts.includes(contactId)) {
      this.state.categorizedContacts.push(contactId);
      
      // Update progress data
      this.updateProgressData({
        categorizedCount: this.state.categorizedContacts.length
      });
    }
  }

  /**
   * Remove a contact from categorized list
   * @param {string} contactId - Contact ID
   */
  removeCategorizedContact(contactId) {
    if (!this.state) {
      throw new Error('No onboarding state available');
    }

    if (this.state.categorizedContacts) {
      this.state.categorizedContacts = this.state.categorizedContacts.filter(
        id => id !== contactId
      );
      
      // Update progress data
      this.updateProgressData({
        categorizedCount: this.state.categorizedContacts.length
      });
    }
  }

  /**
   * Get uncategorized contacts
   * @returns {Array<string>} Array of uncategorized contact IDs
   */
  getUncategorizedContacts() {
    return this.state?.uncategorizedContacts || [];
  }

  /**
   * Get categorized contacts
   * @returns {Array<string>} Array of categorized contact IDs
   */
  getCategorizedContacts() {
    return this.state?.categorizedContacts || [];
  }
}

// Create global onboarding controller instance
const onboardingController = new OnboardingController();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    OnboardingController, 
    onboardingController, 
    ONBOARDING_STEPS,
    STEP_ORDER,
    TRIGGER_TYPES
  };
}
