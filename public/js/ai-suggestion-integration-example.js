/**
 * AI Suggestion Integration Example
 * Demonstrates how to integrate the AI Suggestion UI with the onboarding flow
 */

// Example: Complete onboarding flow with AI suggestions

class OnboardingWithAISuggestions {
  constructor() {
    // Initialize components
    this.onboardingController = new OnboardingController();
    this.circularVisualizer = new CircularVisualizer('circular-visualizer');
    this.aiSuggestionUI = new AISuggestionUI('ai-suggestion-container');
    
    this.authToken = null;
    this.userId = null;
    this.contacts = [];
    this.currentContactIndex = 0;
    
    this.setupEventListeners();
  }
  
  /**
   * Initialize the onboarding flow
   */
  async initialize(authToken, userId) {
    this.authToken = authToken;
    this.userId = userId;
    
    // Initialize all components
    this.onboardingController.initialize(authToken, userId);
    this.aiSuggestionUI.initialize(authToken);
    
    // Start onboarding
    await this.onboardingController.initializeOnboarding('post_import');
    
    // Load contacts
    await this.loadContacts();
    
    // Show first contact
    this.showCurrentContact();
  }
  
  /**
   * Setup event listeners for all components
   */
  setupEventListeners() {
    // AI Suggestion events
    this.aiSuggestionUI.on('accept', async (data) => {
      await this.handleSuggestionAccept(data);
    });
    
    this.aiSuggestionUI.on('override', (data) => {
      this.handleSuggestionOverride(data);
    });
    
    this.aiSuggestionUI.on('error', (error) => {
      console.error('AI Suggestion error:', error);
      this.showError('Failed to load AI suggestion. You can still assign manually.');
    });
    
    // Circular Visualizer events
    this.circularVisualizer.on('contactDrag', async (data) => {
      await this.handleManualAssignment(data);
    });
    
    this.circularVisualizer.on('batchDrag', async (data) => {
      await this.handleBatchAssignment(data);
    });
    
    // Onboarding Controller events
    this.onboardingController.on('progressUpdate', (progress) => {
      this.updateProgressDisplay(progress);
    });
    
    this.onboardingController.on('stateChange', (state) => {
      if (state.completed) {
        this.handleOnboardingComplete();
      }
    });
  }
  
  /**
   * Load contacts to categorize
   */
  async loadContacts() {
    try {
      const response = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load contacts');
      }
      
      const allContacts = await response.json();
      
      // Filter uncategorized contacts
      this.contacts = allContacts.filter(contact => !contact.dunbarCircle);
      
      // Update total count in onboarding state
      this.onboardingController.updateProgressData({
        totalCount: this.contacts.length,
        categorizedCount: 0
      });
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      this.showError('Failed to load contacts');
    }
  }
  
  /**
   * Show current contact for categorization
   */
  async showCurrentContact() {
    if (this.currentContactIndex >= this.contacts.length) {
      // All contacts categorized
      await this.handleAllContactsCategorized();
      return;
    }
    
    const contact = this.contacts[this.currentContactIndex];
    
    // Display AI suggestion
    await this.aiSuggestionUI.displaySuggestion(contact);
    
    // Update visualizer to show current state
    await this.updateVisualizer();
  }
  
  /**
   * Handle AI suggestion acceptance
   */
  async handleSuggestionAccept(data) {
    const { contactId, circle, isOverride, suggestion } = data;
    
    try {
      // Show loading state
      this.showLoading('Assigning contact...');
      
      // Assign contact to circle via API
      const response = await fetch('/api/circles/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          contactId,
          circle
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign contact');
      }
      
      // If user overrode the suggestion, record it
      if (isOverride) {
        await this.recordOverride(contactId, suggestion.suggestedCircle, circle);
      }
      
      // Update local contact data
      const contact = this.contacts[this.currentContactIndex];
      contact.dunbarCircle = circle;
      contact.circle = circle;
      
      // Update onboarding progress
      this.onboardingController.addCategorizedContact(contactId);
      await this.onboardingController.saveProgress();
      
      // Show success animation
      this.showSuccess(`${contact.name} added to ${this.getCircleName(circle)}!`);
      
      // Move to next contact
      this.currentContactIndex++;
      setTimeout(() => {
        this.showCurrentContact();
      }, 1000);
      
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      this.showError('Failed to assign contact. Please try again.');
    } finally {
      this.hideLoading();
    }
  }
  
  /**
   * Handle AI suggestion override
   */
  handleSuggestionOverride(data) {
    const { contact, suggestedCircle } = data;
    
    // Show manual circle selection UI
    this.showCircleSelector(contact, suggestedCircle);
  }
  
  /**
   * Handle manual assignment via drag-and-drop
   */
  async handleManualAssignment(data) {
    const { contactId, fromCircle, toCircle } = data;
    
    try {
      // Show loading state
      this.showLoading('Assigning contact...');
      
      // Assign contact to circle via API
      const response = await fetch('/api/circles/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          contactId,
          circle: toCircle
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign contact');
      }
      
      // Find contact and update
      const contact = this.contacts.find(c => c.id === contactId);
      if (contact) {
        // If this was an AI-suggested contact, record override
        if (contact.aiSuggestion && contact.aiSuggestion.circle !== toCircle) {
          await this.recordOverride(contactId, contact.aiSuggestion.circle, toCircle);
        }
        
        contact.dunbarCircle = toCircle;
        contact.circle = toCircle;
        
        // Update onboarding progress
        this.onboardingController.addCategorizedContact(contactId);
        await this.onboardingController.saveProgress();
      }
      
      // Update visualizer
      await this.updateVisualizer();
      
      // Show success
      this.showSuccess(`Contact moved to ${this.getCircleName(toCircle)}!`);
      
    } catch (error) {
      console.error('Error assigning contact:', error);
      this.showError('Failed to assign contact. Please try again.');
    } finally {
      this.hideLoading();
    }
  }
  
  /**
   * Handle batch assignment via drag-and-drop
   */
  async handleBatchAssignment(data) {
    const { contactIds, toCircle } = data;
    
    try {
      // Show loading state
      this.showLoading(`Assigning ${contactIds.length} contacts...`);
      
      // Batch assign via API
      const response = await fetch('/api/circles/batch-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          assignments: contactIds.map(id => ({
            contactId: id,
            circle: toCircle
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch assign contacts');
      }
      
      // Update local contact data
      contactIds.forEach(contactId => {
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
          // Record override if needed
          if (contact.aiSuggestion && contact.aiSuggestion.circle !== toCircle) {
            this.recordOverride(contactId, contact.aiSuggestion.circle, toCircle);
          }
          
          contact.dunbarCircle = toCircle;
          contact.circle = toCircle;
          
          // Update onboarding progress
          this.onboardingController.addCategorizedContact(contactId);
        }
      });
      
      await this.onboardingController.saveProgress();
      
      // Update visualizer
      await this.updateVisualizer();
      
      // Show success
      this.showSuccess(`${contactIds.length} contacts moved to ${this.getCircleName(toCircle)}!`);
      
    } catch (error) {
      console.error('Error batch assigning contacts:', error);
      this.showError('Failed to assign contacts. Please try again.');
    } finally {
      this.hideLoading();
    }
  }
  
  /**
   * Record user override to help AI learn
   */
  async recordOverride(contactId, suggestedCircle, actualCircle) {
    try {
      await fetch('/api/ai/record-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          contactId,
          suggestedCircle,
          actualCircle
        })
      });
    } catch (error) {
      console.error('Error recording override:', error);
      // Don't show error to user - this is background tracking
    }
  }
  
  /**
   * Update circular visualizer with current contacts
   */
  async updateVisualizer() {
    // Get all contacts with circle assignments
    const categorizedContacts = this.contacts.filter(c => c.dunbarCircle);
    
    // Render visualizer
    this.circularVisualizer.render(categorizedContacts);
  }
  
  /**
   * Show circle selector for manual override
   */
  showCircleSelector(contact, suggestedCircle) {
    // Create modal with circle options
    const modal = document.createElement('div');
    modal.className = 'circle-selector-modal';
    modal.innerHTML = `
      <div class="circle-selector-overlay"></div>
      <div class="circle-selector-content">
        <h3>Choose a circle for ${this.escapeHtml(contact.name)}</h3>
        <p class="suggested-note">AI suggested: ${this.getCircleName(suggestedCircle)}</p>
        <div class="circle-options">
          ${this.renderCircleOptions(suggestedCircle)}
        </div>
        <button class="cancel-btn">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelectorAll('.circle-option').forEach(option => {
      option.addEventListener('click', async () => {
        const circle = option.getAttribute('data-circle');
        document.body.removeChild(modal);
        
        // Assign to selected circle
        await this.handleSuggestionAccept({
          contactId: contact.id,
          circle,
          isOverride: circle !== suggestedCircle,
          suggestion: { suggestedCircle }
        });
      });
    });
    
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }
  
  /**
   * Render circle options for selector
   */
  renderCircleOptions(suggestedCircle) {
    const circles = ['inner', 'close', 'active', 'casual', 'acquaintance'];
    return circles.map(circle => {
      const circleDef = CIRCLE_DEFINITIONS[circle];
      const isSuggested = circle === suggestedCircle;
      return `
        <div class="circle-option ${isSuggested ? 'suggested' : ''}" data-circle="${circle}">
          <div class="circle-badge" style="background: ${circleDef.color}">
            ${this.getCircleInitials(circleDef.name)}
          </div>
          <div class="circle-info">
            <div class="circle-name">${circleDef.name}</div>
            <div class="circle-desc">${circleDef.description}</div>
            ${isSuggested ? '<div class="suggested-badge">AI Suggested</div>' : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  
  /**
   * Handle all contacts categorized
   */
  async handleAllContactsCategorized() {
    // Mark onboarding step as complete
    await this.onboardingController.markStepComplete('circle_assignment');
    
    // Show completion message
    this.showSuccess('All contacts categorized! 🎉');
    
    // Move to next onboarding step
    await this.onboardingController.nextStep();
  }
  
  /**
   * Handle onboarding completion
   */
  handleOnboardingComplete() {
    // Show completion screen
    this.showCompletionScreen();
  }
  
  /**
   * Update progress display
   */
  updateProgressDisplay(progress) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const milestoneText = document.getElementById('milestone-text');
    
    if (progressBar) {
      progressBar.style.width = `${progress.percentComplete}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${progress.categorizedContacts} / ${progress.totalContacts} contacts`;
    }
    
    if (milestoneText) {
      milestoneText.textContent = progress.currentMilestone;
    }
  }
  
  /**
   * Helper methods
   */
  
  getCircleName(circleId) {
    return CIRCLE_DEFINITIONS[circleId]?.name || circleId;
  }
  
  getCircleInitials(circleName) {
    const words = circleName.split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  showLoading(message) {
    // Implementation depends on your UI framework
    console.log('Loading:', message);
  }
  
  hideLoading() {
    // Implementation depends on your UI framework
    console.log('Loading complete');
  }
  
  showSuccess(message) {
    // Implementation depends on your UI framework
    console.log('Success:', message);
  }
  
  showError(message) {
    // Implementation depends on your UI framework
    console.error('Error:', message);
  }
  
  showCompletionScreen() {
    // Implementation depends on your UI framework
    console.log('Onboarding complete!');
  }
}

// Example usage:
/*
const onboarding = new OnboardingWithAISuggestions();
await onboarding.initialize(authToken, userId);
*/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OnboardingWithAISuggestions };
}
