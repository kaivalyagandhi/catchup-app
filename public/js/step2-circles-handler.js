/**
 * Step 2: Circles Organization Handler
 * 
 * Handles Step 2 of the onboarding flow: organizing contacts into circles.
 * Auto-triggers the Manage Circles flow when user navigates to the Circles tab.
 * 
 * Requirements: 3.1, 3.2, 8.1, 8.2, 8.3, 9.3, 9.4, 10.5
 */

class Step2CirclesHandler {
  constructor(onboardingState) {
    this.state = onboardingState;
    this.manageCirclesFlow = null;
    this.contacts = [];
    this.currentAssignments = {};
    this.aiSuggestions = [];
  }
  
  /**
   * Navigate to Step 2 and auto-trigger Manage Circles flow
   * Requirements: 3.1, 3.2
   */
  async navigateToStep() {
    // Navigate to Directory > Circles tab
    window.location.hash = '#directory/circles';
    
    if (typeof navigateTo === 'function') {
      navigateTo('directory');
      
      // Wait for directory to load, then switch to circles tab
      setTimeout(async () => {
        if (typeof switchDirectoryTab === 'function') {
          switchDirectoryTab('circles');
        }
        
        // Auto-open Manage Circles flow after tab loads
        setTimeout(async () => {
          await this.openManageCirclesFlow();
        }, 300);
      }, 100);
    }
  }
  
  /**
   * Open the Manage Circles flow with AI suggestions
   * Requirements: 3.1, 8.1, 8.2, 8.3
   */
  async openManageCirclesFlow() {
    try {
      // Fetch contacts
      await this.fetchContacts();
      
      // Fetch AI suggestions
      await this.fetchAISuggestions();
      
      // Apply AI suggestions to contacts
      this.applyAISuggestionsToContacts();
      
      // Get current assignments
      this.loadCurrentAssignments();
      
      // Create and show Manage Circles flow
      this.manageCirclesFlow = new ManageCirclesFlow(this.contacts, this.currentAssignments, {
        isOnboarding: true,
        onSave: () => this.handleSaveAndContinue(),
        onSkip: () => this.handleSkip(),
        onClose: () => this.handleClose()
      });
      
      this.manageCirclesFlow.mount();
      
      // Set up event listeners for progress tracking
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error opening Manage Circles flow:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to load circle organization', 'error');
      }
    }
  }
  
  /**
   * Fetch contacts from API
   */
  async fetchContacts() {
    const userId = window.userId || localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${window.API_BASE || '/api'}/contacts?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch contacts');
    }
    
    this.contacts = await response.json();
  }
  
  /**
   * Fetch AI circle suggestions from backend with timeout and error handling
   * Requirements: 8.1, 8.2, 8.3, 13.4
   */
  async fetchAISuggestions() {
    const userId = window.userId || localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) {
      return; // Gracefully handle missing auth
    }
    
    try {
      // Add timeout to AI request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${window.API_BASE || '/api'}/ai/circle-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userId,
          contactIds: this.contacts.map(c => c.id)
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle AI service failures gracefully
        // Requirements: 9.4, 13.4
        console.warn('AI suggestions not available:', response.statusText);
        this.aiSuggestions = [];
        this.showAIServiceWarning('unavailable');
        return;
      }
      
      const data = await response.json();
      this.aiSuggestions = data.suggestions || [];
      
      if (this.aiSuggestions.length > 0) {
        if (typeof showToast === 'function') {
          showToast(`AI generated ${this.aiSuggestions.length} circle suggestions`, 'success');
        }
      }
      
    } catch (error) {
      // Handle AI service failures gracefully
      // Requirements: 9.4, 13.4
      console.warn('Failed to fetch AI suggestions:', error);
      this.aiSuggestions = [];
      
      // Determine error type
      if (error.name === 'AbortError') {
        this.showAIServiceWarning('timeout');
      } else if (error.message && error.message.includes('network')) {
        this.showAIServiceWarning('network');
      } else {
        this.showAIServiceWarning('error');
      }
    }
  }
  
  /**
   * Show warning about AI service issues
   * Requirements: 9.4, 13.4
   */
  showAIServiceWarning(type) {
    let message = '';
    
    switch (type) {
      case 'timeout':
        message = 'AI suggestions timed out. You can still organize contacts manually.';
        break;
      case 'network':
        message = 'Network issue prevented AI suggestions. You can still organize contacts manually.';
        break;
      case 'unavailable':
        message = 'AI suggestions temporarily unavailable. You can still organize contacts manually.';
        break;
      default:
        message = 'AI suggestions unavailable. You can still organize contacts manually.';
    }
    
    if (typeof showToast === 'function') {
      showToast(message, 'info');
    }
  }
  
  /**
   * Apply AI suggestions to contacts
   * Requirements: 8.1, 8.2, 8.3
   */
  applyAISuggestionsToContacts() {
    if (!this.aiSuggestions || this.aiSuggestions.length === 0) {
      return;
    }
    
    // Create a map of contact ID to suggestion
    const suggestionMap = new Map();
    this.aiSuggestions.forEach(suggestion => {
      suggestionMap.set(suggestion.contactId, suggestion);
    });
    
    // Apply suggestions to contacts
    this.contacts.forEach(contact => {
      const suggestion = suggestionMap.get(contact.id);
      if (suggestion) {
        contact.circle_ai_suggestion = suggestion.suggestedCircle;
        contact.circle_ai_confidence = suggestion.confidence;
        contact.circle_ai_reason = suggestion.reason;
        
        // Pre-select high-confidence suggestions (>= 80%)
        // Requirements: 8.3
        if (suggestion.confidence >= 80 && !contact.circle && !contact.dunbarCircle) {
          contact.circle = suggestion.suggestedCircle;
          contact.dunbarCircle = suggestion.suggestedCircle;
          contact.circle_assigned_by = 'ai';
        }
      }
    });
  }
  
  /**
   * Load current circle assignments from contacts
   */
  loadCurrentAssignments() {
    this.currentAssignments = {};
    
    this.contacts.forEach(contact => {
      const circle = contact.circle || contact.dunbarCircle;
      if (circle) {
        this.currentAssignments[contact.id] = circle;
      }
    });
  }
  
  /**
   * Set up event listeners for progress tracking
   * Requirements: 9.1, 9.2, 9.4
   */
  setupEventListeners() {
    // Listen for circle assignments
    window.addEventListener('circle-assigned', (e) => {
      this.handleCircleAssignment(e.detail);
    });
  }
  
  /**
   * Handle circle assignment and update progress
   * Requirements: 9.1, 9.2, 9.4
   */
  handleCircleAssignment(data) {
    const { contactId, circle } = data;
    
    // Update local assignments
    if (circle) {
      this.currentAssignments[contactId] = circle;
    } else {
      delete this.currentAssignments[contactId];
    }
    
    // Update contact in local array
    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      contact.circle = circle;
      contact.dunbarCircle = circle;
    }
    
    // Check for progress milestones
    this.checkProgressMilestones();
    
    // Check for capacity warnings
    this.checkCapacityWarnings();
  }
  
  /**
   * Check and display progress milestones
   * Requirements: 9.4
   */
  checkProgressMilestones() {
    const categorized = this.contacts.filter(c => c.circle || c.dunbarCircle).length;
    const total = this.contacts.length;
    
    if (total === 0) return;
    
    const percentage = (categorized / total) * 100;
    
    // Show encouraging messages at milestones
    if (percentage === 25 && !this.milestone25Shown) {
      this.milestone25Shown = true;
      if (typeof showToast === 'function') {
        showToast('🎉 Great start! You\'re 25% done organizing your circles.', 'success');
      }
    } else if (percentage >= 50 && percentage < 75 && !this.milestone50Shown) {
      this.milestone50Shown = true;
      if (typeof showToast === 'function') {
        showToast('🌟 Halfway there! Keep going!', 'success');
      }
    } else if (percentage >= 75 && percentage < 100 && !this.milestone75Shown) {
      this.milestone75Shown = true;
      if (typeof showToast === 'function') {
        showToast('✨ Almost done! Just a bit more!', 'success');
      }
    } else if (percentage === 100 && !this.milestone100Shown) {
      this.milestone100Shown = true;
      this.showCompletionCelebration();
    }
  }
  
  /**
   * Show completion celebration
   * Requirements: 9.4
   */
  showCompletionCelebration() {
    if (typeof showToast === 'function') {
      showToast('🎊 Congratulations! All contacts categorized!', 'success');
    }
    
    // Show a more prominent celebration modal
    setTimeout(() => {
      const celebrationHtml = `
        <div class="celebration-overlay" id="celebration-overlay">
          <div class="celebration-modal">
            <div class="celebration-icon">🎉</div>
            <h2>Amazing Work!</h2>
            <p>You've successfully organized all your contacts into circles.</p>
            <p>Your relationship network is now ready for intelligent suggestions!</p>
            <button class="btn-primary" id="celebration-continue">Continue to Next Step</button>
          </div>
        </div>
      `;
      
      const container = document.createElement('div');
      container.innerHTML = celebrationHtml;
      document.body.appendChild(container.firstElementChild);
      
      // Add click handler
      document.getElementById('celebration-continue').addEventListener('click', () => {
        document.getElementById('celebration-overlay').remove();
        this.handleSaveAndContinue();
      });
      
      // Close on overlay click
      document.getElementById('celebration-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'celebration-overlay') {
          document.getElementById('celebration-overlay').remove();
        }
      });
    }, 500);
  }
  
  /**
   * Check for capacity warnings
   * Requirements: 9.3, 10.5
   */
  checkCapacityWarnings() {
    const circles = [
      { id: 'inner', name: 'Inner Circle', capacity: 10 },
      { id: 'close', name: 'Close Friends', capacity: 25 },
      { id: 'active', name: 'Active Friends', capacity: 50 },
      { id: 'casual', name: 'Casual Network', capacity: 100 }
    ];
    
    // Count contacts in each circle
    const counts = {};
    circles.forEach(circle => {
      counts[circle.id] = 0;
    });
    
    this.contacts.forEach(contact => {
      const circleId = contact.circle || contact.dunbarCircle;
      if (circleId && counts[circleId] !== undefined) {
        counts[circleId]++;
      }
    });
    
    // Check for over-capacity circles
    circles.forEach(circle => {
      const count = counts[circle.id];
      
      // Show warning when exceeding capacity
      if (count > circle.capacity && !this[`warning_${circle.id}_shown`]) {
        this[`warning_${circle.id}_shown`] = true;
        
        if (typeof showToast === 'function') {
          showToast(
            `⚠️ ${circle.name} is over capacity (${count}/${circle.capacity}). Consider rebalancing for better relationship management.`,
            'warning'
          );
        }
      }
      
      // Reset warning flag if count drops back below capacity
      if (count <= circle.capacity) {
        this[`warning_${circle.id}_shown`] = false;
      }
    });
  }
  
  /**
   * Handle save and continue to Step 3
   * Requirements: 6.3, 6.4, 12.1
   */
  async handleSaveAndContinue() {
    // Update onboarding state
    if (window.onboardingIndicator) {
      const categorized = this.contacts.filter(c => c.circle || c.dunbarCircle).length;
      const total = this.contacts.length;
      
      const currentState = window.onboardingIndicator.state;
      currentState.steps.circles.complete = true;
      currentState.steps.circles.contactsCategorized = categorized;
      currentState.steps.circles.totalContacts = total;
      currentState.currentStep = 3;
      
      window.onboardingIndicator.updateState(currentState);
    }
    
    // Show success message
    if (typeof showToast === 'function') {
      showToast('Circles organized! Ready to review group mappings.', 'success');
    }
    
    // Prompt to continue to Step 3
    setTimeout(() => {
      if (confirm('Would you like to review group mapping suggestions now?')) {
        this.navigateToStep3();
      }
    }, 1500);
  }
  
  /**
   * Handle skip for now
   * Requirements: 6.4, 12.1
   */
  handleSkip() {
    if (typeof showToast === 'function') {
      showToast('Progress saved. You can continue organizing circles anytime.', 'info');
    }
  }
  
  /**
   * Handle modal close
   */
  handleClose() {
    // Clean up
    this.manageCirclesFlow = null;
  }
  
  /**
   * Navigate to Step 3 (Group Mappings)
   */
  navigateToStep3() {
    window.location.hash = '#directory/groups';
    if (typeof navigateTo === 'function') {
      navigateTo('directory');
      setTimeout(() => {
        if (typeof switchDirectoryTab === 'function') {
          switchDirectoryTab('groups');
        }
      }, 100);
    }
  }
  
  /**
   * Destroy the handler and clean up
   */
  destroy() {
    if (this.manageCirclesFlow) {
      this.manageCirclesFlow.destroy();
      this.manageCirclesFlow = null;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Step2CirclesHandler;
}
