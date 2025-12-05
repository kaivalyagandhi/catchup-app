/**
 * OnboardingStepIndicator Component
 * 
 * Displays a persistent 3-step onboarding indicator in the sidebar
 * showing progress through the onboarding flow.
 * 
 * Requirements: 1.1, 1.2, 16.1, 17.1
 */

class OnboardingStepIndicator {
  constructor(state) {
    this.state = state || this.getDefaultState();
    this.element = null;
    this.isDismissed = false;
  }
  
  /**
   * Get default onboarding state
   */
  getDefaultState() {
    return {
      isComplete: false,
      currentStep: 1,
      dismissedAt: null,
      steps: {
        integrations: {
          complete: false,
          googleCalendar: false,
          googleContacts: false
        },
        circles: {
          complete: false,
          contactsCategorized: 0,
          totalContacts: 0
        },
        groups: {
          complete: false,
          mappingsReviewed: 0,
          totalMappings: 0
        }
      }
    };
  }
  
  /**
   * Render the onboarding indicator
   */
  render() {
    // Don't render if onboarding is complete
    if (this.state.isComplete) {
      return '';
    }

    
    // If dismissed, show resume CTA instead
    if (this.isDismissed || this.state.dismissedAt) {
      return this.renderResumeCTA();
    }
    
    const completedSteps = [
      this.state.steps.integrations.complete,
      this.state.steps.circles.complete,
      this.state.steps.groups.complete
    ].filter(Boolean).length;
    
    const html = `
      <nav class="onboarding-indicator" 
           id="onboarding-indicator" 
           role="navigation" 
           aria-label="Onboarding progress">
        <div class="onboarding-indicator__header">
          <h2 class="onboarding-indicator__title" id="onboarding-title">Get Started</h2>
          <button class="onboarding-indicator__dismiss" 
                  aria-label="Dismiss onboarding setup" 
                  title="Dismiss onboarding">
            <svg xmlns="http://www.w3.org/2000/svg" 
                 viewBox="0 0 24 24" 
                 fill="none" 
                 stroke="currentColor" 
                 stroke-width="2" 
                 stroke-linecap="round" 
                 stroke-linejoin="round" 
                 style="width: 16px; height: 16px;"
                 aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="onboarding-indicator__steps" 
             role="list" 
             aria-label="Setup steps"
             aria-describedby="onboarding-title">
          <div class="sr-only" aria-live="polite" aria-atomic="true">
            ${completedSteps} of 3 steps completed
          </div>
          ${this.renderStep(1, 'Connect Accounts', this.state.steps.integrations.complete)}
          ${this.renderStep(2, 'Organize Circles', this.state.steps.circles.complete)}
          ${this.renderStep(3, 'Review Groups', this.state.steps.groups.complete)}
        </div>
      </nav>
    `;
    
    return html;
  }
  
  /**
   * Render a single step
   */
  renderStep(number, label, isComplete) {
    const status = isComplete ? 'complete' : 
                   (this.state.currentStep === number ? 'active' : 'incomplete');
    const icon = isComplete ? '✓' : 
                 (this.state.currentStep === number ? '→' : number);
    
    const statusText = isComplete ? 'completed' : 
                       (this.state.currentStep === number ? 'in progress' : 'not started');
    
    return `
      <button 
        class="onboarding-step onboarding-step--${status}"
        data-step="${number}"
        role="listitem"
        aria-label="Step ${number}: ${label}, ${statusText}"
        aria-current="${this.state.currentStep === number ? 'step' : 'false'}"
        tabindex="0"
      >
        <span class="onboarding-step__icon" aria-hidden="true">${icon}</span>
        <span class="onboarding-step__label">${number}. ${label}</span>
        <span class="sr-only">${statusText}</span>
      </button>
    `;
  }

  
  /**
   * Render resume CTA when onboarding is dismissed
   */
  renderResumeCTA() {
    return `
      <div class="onboarding-resume-cta" 
           id="onboarding-resume-cta" 
           role="region" 
           aria-label="Resume onboarding">
        <button class="onboarding-resume-btn" 
                aria-label="Resume onboarding setup"
                tabindex="0">
          <svg xmlns="http://www.w3.org/2000/svg" 
               viewBox="0 0 24 24" 
               fill="none" 
               stroke="currentColor" 
               stroke-width="2" 
               stroke-linecap="round" 
               stroke-linejoin="round" 
               style="width: 16px; height: 16px; margin-right: 8px;"
               aria-hidden="true">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
          <span>Resume Setup</span>
        </button>
      </div>
    `;
  }
  
  /**
   * Mount the indicator to the DOM
   */
  mount(container) {
    if (!container) {
      console.error('OnboardingStepIndicator: No container provided');
      return;
    }
    
    // Render and insert HTML
    container.innerHTML = this.render();
    
    // Store reference to element
    this.element = container.querySelector('.onboarding-indicator') || 
                   container.querySelector('.onboarding-resume-cta');
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners for the indicator
   */
  setupEventListeners() {
    if (!this.element) return;
    
    // Step click handlers
    const stepButtons = this.element.querySelectorAll('.onboarding-step');
    stepButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const step = parseInt(btn.dataset.step);
        this.handleStepClick(step);
      });
      
      // Keyboard navigation
      btn.addEventListener('keydown', (e) => {
        this.handleKeyboardNavigation(e, btn);
      });
    });
    
    // Dismiss button handler
    const dismissBtn = this.element.querySelector('.onboarding-indicator__dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.handleDismiss();
      });
      
      dismissBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleDismiss();
        }
      });
    }
    
    // Resume button handler
    const resumeBtn = this.element.querySelector('.onboarding-resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.handleResume();
      });
      
      resumeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleResume();
        }
      });
    }
  }
  
  /**
   * Handle keyboard navigation for step buttons
   */
  handleKeyboardNavigation(e, currentButton) {
    const stepButtons = Array.from(this.element.querySelectorAll('.onboarding-step'));
    const currentIndex = stepButtons.indexOf(currentButton);
    
    let targetButton = null;
    
    switch(e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        // Move to next step
        if (currentIndex < stepButtons.length - 1) {
          targetButton = stepButtons[currentIndex + 1];
        }
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        // Move to previous step
        if (currentIndex > 0) {
          targetButton = stepButtons[currentIndex - 1];
        }
        break;
        
      case 'Home':
        e.preventDefault();
        // Move to first step
        targetButton = stepButtons[0];
        break;
        
      case 'End':
        e.preventDefault();
        // Move to last step
        targetButton = stepButtons[stepButtons.length - 1];
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Activate current step
        const step = parseInt(currentButton.dataset.step);
        this.handleStepClick(step);
        break;
    }
    
    // Focus target button if found
    if (targetButton) {
      targetButton.focus();
    }
  }

  
  /**
   * Handle step click - navigate to appropriate page
   * Requirements: 1.3, 2.1
   */
  handleStepClick(step) {
    switch(step) {
      case 1:
        // Navigate to Preferences page
        window.location.hash = '#preferences';
        if (typeof navigateTo === 'function') {
          navigateTo('preferences');
        }
        break;
      case 2:
        // Navigate to Directory > Circles tab
        window.location.hash = '#directory/circles';
        if (typeof navigateTo === 'function') {
          navigateTo('directory');
          setTimeout(() => {
            if (typeof switchDirectoryTab === 'function') {
              switchDirectoryTab('circles');
            }
          }, 100);
        }
        break;
      case 3:
        // Navigate to Directory > Groups tab
        window.location.hash = '#directory/groups';
        if (typeof navigateTo === 'function') {
          navigateTo('directory');
          setTimeout(() => {
            if (typeof switchDirectoryTab === 'function') {
              switchDirectoryTab('groups');
            }
          }, 100);
        }
        break;
    }
    
    // Emit event for tracking
    window.dispatchEvent(new CustomEvent('onboarding-step-clicked', {
      detail: { step }
    }));
  }
  
  /**
   * Handle dismiss - save state and show resume CTA
   * Requirements: 1.5, 12.1
   */
  handleDismiss() {
    this.isDismissed = true;
    this.state.dismissedAt = new Date().toISOString();
    
    // Save state
    this.saveState();
    
    // Re-render to show resume CTA
    if (this.element && this.element.parentElement) {
      this.mount(this.element.parentElement);
    }
    
    // Emit event
    window.dispatchEvent(new CustomEvent('onboarding-dismissed', {
      detail: { state: this.state }
    }));
    
    // Show toast notification
    if (typeof showToast === 'function') {
      showToast('Onboarding dismissed. You can resume anytime.', 'info');
    }
  }

  
  /**
   * Handle resume - restore onboarding indicator
   */
  handleResume() {
    this.isDismissed = false;
    this.state.dismissedAt = null;
    
    // Save state
    this.saveState();
    
    // Re-render to show indicator
    if (this.element && this.element.parentElement) {
      this.mount(this.element.parentElement);
    }
    
    // Emit event
    window.dispatchEvent(new CustomEvent('onboarding-resumed', {
      detail: { state: this.state }
    }));
    
    // Show toast notification
    if (typeof showToast === 'function') {
      showToast('Welcome back! Continue your setup.', 'success');
    }
  }
  
  /**
   * Update the onboarding state
   */
  updateState(newState) {
    this.state = { ...this.state, ...newState };
    
    // Check if onboarding is complete
    if (this.state.steps.integrations.complete &&
        this.state.steps.circles.complete &&
        this.state.steps.groups.complete) {
      this.state.isComplete = true;
    }
    
    // Save state
    this.saveState();
    
    // Re-render if mounted
    if (this.element && this.element.parentElement) {
      this.mount(this.element.parentElement);
    }
  }
  
  /**
   * Save state to localStorage with fallback chain
   * Requirements: 12.2
   */
  saveState() {
    let savedSuccessfully = false;
    const failedStorages = [];

    // Try localStorage first
    try {
      localStorage.setItem('catchup-onboarding', JSON.stringify(this.state));
      savedSuccessfully = true;
    } catch (error) {
      console.error('Failed to save onboarding state to localStorage:', error);
      failedStorages.push('localStorage');
      
      // Fall back to sessionStorage
      try {
        sessionStorage.setItem('catchup-onboarding', JSON.stringify(this.state));
        savedSuccessfully = true;
      } catch (sessionError) {
        console.error('Failed to save to sessionStorage:', sessionError);
        failedStorages.push('sessionStorage');
        
        // Keep in memory only as final fallback
        try {
          window.__onboardingState = this.state;
          savedSuccessfully = true;
        } catch (memoryError) {
          console.error('Failed to save to memory:', memoryError);
          failedStorages.push('memory');
        }
      }
    }

    // Show appropriate user message based on what failed
    if (failedStorages.includes('localStorage') && !failedStorages.includes('sessionStorage')) {
      // localStorage failed but sessionStorage worked
      if (typeof showToast === 'function') {
        showToast('Progress saved temporarily. It will be lost when you close this tab.', 'warning');
      }
    } else if (failedStorages.includes('localStorage') && failedStorages.includes('sessionStorage')) {
      // Both browser storages failed, using memory only
      if (typeof showToast === 'function') {
        showToast('Browser storage unavailable. Progress saved for this session only.', 'warning');
      }
    }

    if (!savedSuccessfully) {
      console.error('Failed to save state to any storage mechanism');
      if (typeof showToast === 'function') {
        showToast('Unable to save progress. Please check your browser settings.', 'error');
      }
    }
  }
  
  /**
   * Load state from localStorage
   */
  static loadState() {
    try {
      const saved = localStorage.getItem('catchup-onboarding');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load onboarding state from localStorage:', error);
    }
    
    // Try sessionStorage
    try {
      const saved = sessionStorage.getItem('catchup-onboarding');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load onboarding state from sessionStorage:', error);
    }
    
    // Try memory
    if (window.__onboardingState) {
      return window.__onboardingState;
    }
    
    return null;
  }
  
  /**
   * Destroy the indicator and clean up
   */
  destroy() {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.innerHTML = '';
    }
    this.element = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnboardingStepIndicator;
}
