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
      collapsedAt: null,
      userId: null,
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
    
    // If collapsed (finished later), show collapsed state
    if (this.state.collapsedAt) {
      return this.renderCollapsedState();
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
        <div class="sr-only" aria-live="polite" aria-atomic="true">
          ${completedSteps} of 2 steps completed
        </div>
        <div class="onboarding-indicator__row onboarding-indicator__header">
          <h2 class="onboarding-indicator__title" id="onboarding-title">Get Started</h2>
          <div class="onboarding-indicator__header-actions">
            <button class="onboarding-indicator__icon-btn onboarding-indicator__finish-later" 
                    type="button"
                    aria-label="Save progress and finish onboarding later"
                    title="Finish Later">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12h18"/>
              </svg>
            </button>
            <button class="onboarding-indicator__icon-btn onboarding-indicator__dismiss-btn" 
                    type="button"
                    aria-label="Dismiss onboarding (can restart from Preferences)"
                    title="Dismiss">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="onboarding-indicator__steps" 
             role="list" 
             aria-label="Setup steps"
             aria-describedby="onboarding-title">
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
        <span class="onboarding-step__label">${label}</span>
        <span class="sr-only">${statusText}</span>
      </button>
    `;
  }

  
  /**
   * Render collapsed state when user clicks "Finish Later"
   */
  renderCollapsedState() {
    return `
      <div class="onboarding-collapsed" 
           id="onboarding-collapsed" 
           role="region" 
           aria-label="Continue onboarding">
        <button class="onboarding-continue-btn" 
                aria-label="Continue onboarding setup"
                tabindex="0">
          <span>Continue Onboarding</span>
        </button>
      </div>
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
  async mount(container) {
    if (!container) {
      console.error('OnboardingStepIndicator: No container provided');
      return;
    }
    
    // Check completion status before rendering
    await this.checkStepCompletion();
    
    // Render and insert HTML
    container.innerHTML = this.render();
    
    // Store reference to element
    this.element = container.querySelector('.onboarding-indicator') || 
                   container.querySelector('.onboarding-collapsed') ||
                   container.querySelector('.onboarding-resume-cta');
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Check and update step completion status
   * Requirements: Groups & Preferences UI Improvements - Auto-detect completion
   */
  async checkStepCompletion() {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;
      
      // Check Step 2: Organize Circles
      // A step is complete if user has categorized contacts into circles
      if (!this.state.steps.circles.complete) {
        try {
          const response = await fetch(`${window.API_BASE || '/api'}/contacts`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          if (response.ok) {
            const contacts = await response.json();
            const categorized = contacts.filter(c => c.circle && c.circle !== 'uncategorized').length;
            const total = contacts.length;
            
            // Mark complete if at least 50% of contacts are categorized
            if (total > 0 && categorized >= total * 0.5) {
              this.state.steps.circles.complete = true;
              this.state.steps.circles.contactsCategorized = categorized;
              this.state.steps.circles.totalContacts = total;
              this.saveState();
            }
          }
        } catch (error) {
          console.error('Error checking circles completion:', error);
        }
      }
      
      // Check Step 3: Review Groups
      // A step is complete if user has reviewed group mappings
      if (!this.state.steps.groups.complete) {
        try {
          const response = await fetch(
            `${window.API_BASE || '/api'}/google-contacts/reviewed-mappings?userId=${this.state.userId}`,
            {
              headers: { Authorization: `Bearer ${authToken}` }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const reviewedCount = data.mappings?.length || 0;
            
            // Mark complete if user has reviewed at least one mapping
            if (reviewedCount > 0) {
              this.state.steps.groups.complete = true;
              this.state.steps.groups.mappingsReviewed = reviewedCount;
              this.saveState();
            }
          }
        } catch (error) {
          console.error('Error checking groups completion:', error);
        }
      }
      
      // Update overall completion status
      if (this.state.steps.integrations.complete &&
          this.state.steps.circles.complete &&
          this.state.steps.groups.complete) {
        this.state.isComplete = true;
        this.saveState();
      }
    } catch (error) {
      console.error('Error checking step completion:', error);
    }
  }
  
  /**
   * Set up event listeners for the indicator
   */
  setupEventListeners() {
    if (!this.element) {
      console.warn('OnboardingStepIndicator: No element found for event listeners');
      return;
    }
    
    // Get the parent container for querying
    const container = this.element.parentElement || this.element;
    
    // Step click handlers
    const stepButtons = container.querySelectorAll('.onboarding-step');
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
    
    // Finish Later button handler (Requirements: Groups & Preferences UI Improvements - 6.3, 6.7, 6.9)
    const finishLaterBtn = container.querySelector('.onboarding-indicator__finish-later');
    if (finishLaterBtn) {
      finishLaterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleFinishLater();
      });
      
      finishLaterBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleFinishLater();
        }
      });
    }
    
    // Dismiss button handler (Requirements: Groups & Preferences UI Improvements - 6.4, 6.6, 6.8, 6.10)
    const dismissBtn = container.querySelector('.onboarding-indicator__dismiss-btn');
    console.log('Dismiss button found:', dismissBtn);
    if (dismissBtn) {
      dismissBtn.addEventListener('click', (e) => {
        console.log('Dismiss button click event fired');
        e.preventDefault();
        e.stopPropagation();
        this.handleDismissWithConfirmation();
      });
      
      dismissBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleDismissWithConfirmation();
        }
      });
    }
    
    // Continue button handler (for collapsed state)
    const continueBtn = container.querySelector('.onboarding-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleContinue();
      });
      
      continueBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleContinue();
        }
      });
    }
    
    // Resume button handler
    const resumeBtn = container.querySelector('.onboarding-resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
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

  /**
   * Handle Finish Later - Collapse onboarding into "Continue Onboarding" button
   * Requirements: Groups & Preferences UI Improvements - 6.3, 6.7, 6.9
   */
  async handleFinishLater() {
    try {
      // Mark as collapsed
      this.state.collapsedAt = new Date().toISOString();
      
      // Save current state
      await this.saveState();
      
      // Re-render to show collapsed state
      if (this.element && this.element.parentElement) {
        this.mount(this.element.parentElement);
      }
      
      // Show success toast
      if (typeof showToast === 'function') {
        showToast('Progress saved. Click "Continue Onboarding" to resume.', 'info');
      }
      
      // Emit event
      window.dispatchEvent(new CustomEvent('onboarding-finished-later', {
        detail: { state: this.state }
      }));
    } catch (error) {
      console.error('Failed to save progress:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to save progress', 'error');
      }
    }
  }
  
  /**
   * Handle Continue - Expand onboarding from collapsed state
   */
  handleContinue() {
    // Remove collapsed state
    this.state.collapsedAt = null;
    
    // Save state
    this.saveState();
    
    // Re-render to show full onboarding
    if (this.element && this.element.parentElement) {
      this.mount(this.element.parentElement);
    }
    
    // Emit event
    window.dispatchEvent(new CustomEvent('onboarding-continued', {
      detail: { state: this.state }
    }));
  }

  /**
   * Handle Dismiss with Confirmation Dialog
   * Requirements: Groups & Preferences UI Improvements - 6.4, 6.6, 6.10
   */
  handleDismissWithConfirmation() {
    console.log('Dismiss button clicked - showing confirmation dialog');
    this.showConfirmDialog({
      title: 'Dismiss Onboarding',
      message: 'You can continue onboarding anytime from Preferences.',
      confirmText: 'Dismiss',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        console.log('User confirmed dismiss');
        try {
          // Save progress first
          await this.saveState();
          
          // Mark as dismissed
          this.handleDismiss();
          
          // Show toast with information about resuming from Preferences
          if (typeof showToast === 'function') {
            showToast('Onboarding dismissed. You can continue anytime from Preferences.', 'info', 5000);
          }
        } catch (error) {
          console.error('Failed to dismiss onboarding:', error);
          if (typeof showToast === 'function') {
            showToast('Failed to dismiss onboarding. Please try again.', 'error');
          }
        }
      },
      onCancel: () => {
        console.log('User cancelled dismiss');
      }
    });
  }

  /**
   * Show confirmation dialog
   * Requirements: Groups & Preferences UI Improvements - 6.5, 6.6, 6.11
   */
  showConfirmDialog(options) {
    const {
      title = 'Confirm',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'default',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.cssText = `
      background: var(--bg-surface);
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: var(--text-primary);">
        ${this.escapeHtml(title)}
      </h3>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5;">
        ${this.escapeHtml(message)}
      </p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn-cancel" style="
          padding: 8px 16px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">${this.escapeHtml(cancelText)}</button>
        <button class="btn-confirm" style="
          padding: 8px 16px;
          background: ${type === 'warning' ? 'var(--status-warning)' : 'var(--accent-primary)'};
          color: var(--text-inverse);
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        ">${this.escapeHtml(confirmText)}</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Event handlers
    const closeDialog = () => overlay.remove();
    
    dialog.querySelector('.btn-cancel').addEventListener('click', () => {
      closeDialog();
      onCancel();
    });
    
    dialog.querySelector('.btn-confirm').addEventListener('click', () => {
      closeDialog();
      onConfirm();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDialog();
        onCancel();
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnboardingStepIndicator;
}
