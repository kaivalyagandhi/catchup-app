/**
 * Step3GroupMappingHandler
 * 
 * Handles Step 3 of the onboarding flow: Group Mapping Review
 * - Navigates to Directory > Groups tab
 * - Fetches group mapping suggestions from API
 * - Displays mapping suggestions UI
 * - Handles accept/reject actions
 * - Tracks completion and marks onboarding complete
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 16.1
 */

class Step3GroupMappingHandler {
  constructor(onboardingStateManager, userId) {
    this.stateManager = onboardingStateManager;
    this.userId = userId;
    this.state = null;
    this.mappings = [];
    this.catchupGroups = [];
  }
  
  /**
   * Initialize the handler and load current state
   */
  async initialize() {
    this.state = await this.stateManager.loadState(this.userId);
    if (!this.state) {
      this.state = await this.stateManager.initializeState(this.userId);
    }
  }
  
  /**
   * Navigate to Step 3 and set up the group mapping review flow
   * Requirements: 5.1
   */
  async navigateToStep() {
    // Navigate to Directory > Groups tab
    window.location.hash = '#directory/groups';
    
    if (typeof navigateTo === 'function') {
      navigateTo('directory');
      
      // Wait for directory to load, then switch to groups tab
      setTimeout(async () => {
        if (typeof switchDirectoryTab === 'function') {
          switchDirectoryTab('groups');
        }
        
        // Load and display mapping suggestions after tab loads
        setTimeout(async () => {
          await this.loadMappingSuggestions();
        }, 300);
      }, 100);
    }
  }
  
  /**
   * Fetch group mapping suggestions from API
   * Requirements: 5.2
   */
  async loadMappingSuggestions() {
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      console.error('User not authenticated');
      this.handleEmptyMappings();
      return;
    }
    
    try {
      // Fetch mapping suggestions
      const response = await fetch(`${window.API_BASE || '/api'}/google-contacts/mapping-suggestions?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.mappings = data.suggestions || data.mappings || [];
      
      // Also fetch existing CatchUp groups for the dropdowns
      await this.fetchCatchUpGroups();
      
      // Update state with total mappings
      this.state.steps.groups.totalMappings = this.mappings.length;
      await this.stateManager.saveState(this.userId, this.state);
      
      // Render the UI
      this.renderMappingSuggestions();
      
    } catch (error) {
      console.error('Failed to load mapping suggestions:', error);
      
      if (typeof showToast === 'function') {
        showToast('Unable to load group mappings. You can skip this step.', 'error');
      }
      
      // Handle empty mappings gracefully
      // Requirements: 5.2
      this.handleEmptyMappings();
    }
  }
  
  /**
   * Fetch existing CatchUp groups for dropdown options
   */
  async fetchCatchUpGroups() {
    const authToken = localStorage.getItem('authToken');
    
    try {
      const response = await fetch(`${window.API_BASE || '/api'}/groups?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        this.catchupGroups = await response.json();
      } else {
        this.catchupGroups = [];
      }
    } catch (error) {
      console.error('Failed to fetch CatchUp groups:', error);
      this.catchupGroups = [];
    }
  }
  
  /**
   * Handle empty mappings gracefully
   * Requirements: 5.2
   */
  handleEmptyMappings() {
    const container = this.getOrCreateContainer();
    
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
        <h3 style="margin: 0 0 12px 0; color: var(--text-primary);">No Group Mappings Available</h3>
        <p style="margin: 0 0 24px 0; color: var(--text-secondary); max-width: 400px; margin-left: auto; margin-right: auto;">
          We couldn't find any Google Contact groups to map, or you don't have Google Contacts connected yet.
        </p>
        <button class="btn-primary" id="complete-onboarding-btn">
          Complete Onboarding
        </button>
      </div>
    `;
    
    // Add event listener for complete button
    document.getElementById('complete-onboarding-btn').addEventListener('click', () => {
      this.completeOnboarding();
    });
  }
  
  /**
   * Get or create the container for mapping suggestions
   */
  getOrCreateContainer() {
    let container = document.getElementById('group-mappings-container');
    
    if (!container) {
      // Find the groups tab content area
      const groupsTab = document.querySelector('[data-tab="groups"]') ||
                       document.querySelector('.groups-content') ||
                       document.querySelector('#groups-tab-content');
      
      if (groupsTab) {
        container = document.createElement('div');
        container.id = 'group-mappings-container';
        container.style.cssText = 'margin-top: 24px;';
        
        // Insert at the beginning of the groups tab
        groupsTab.insertBefore(container, groupsTab.firstChild);
      } else {
        // Fallback: create in main content area
        const mainContent = document.querySelector('.main-content') || document.body;
        container = document.createElement('div');
        container.id = 'group-mappings-container';
        mainContent.appendChild(container);
      }
    }
    
    return container;
  }
  
  /**
   * Render mapping suggestions UI
   * Requirements: 5.3, 16.1
   */
  renderMappingSuggestions() {
    const container = this.getOrCreateContainer();
    
    if (this.mappings.length === 0) {
      this.handleEmptyMappings();
      return;
    }
    
    container.innerHTML = `
      <div class="mapping-suggestions">
        <div class="mapping-suggestions__header">
          <h3>Review Group Mappings</h3>
          <p>We've suggested how your Google Contact groups map to CatchUp groups. Review and accept or skip each suggestion.</p>
        </div>
        <div class="mapping-suggestions__list" id="mapping-suggestions-list">
          ${this.mappings.map(mapping => this.renderMappingCard(mapping)).join('')}
        </div>
        <div class="mapping-suggestions__actions">
          <button class="btn-secondary" id="skip-group-mappings-btn">
            Skip for Now
          </button>
          <button class="btn-primary" id="complete-onboarding-btn">
            Complete Onboarding
          </button>
        </div>
      </div>
    `;
    
    // Set up event listeners
    this.setupMappingListeners();
  }
  
  /**
   * Render a single mapping card
   * Requirements: 5.3, 16.1
   */
  renderMappingCard(mapping) {
    const confidenceLevel = this.getConfidenceLevel(mapping.confidence);
    const confidenceClass = `confidence-badge--${confidenceLevel}`;
    
    return `
      <div class="mapping-card" data-mapping-id="${mapping.id}" style="opacity: 1; transition: opacity 0.3s ease;">
        <div class="mapping-card__content">
          <div class="mapping-card__source">
            <span class="mapping-card__label">Google Group:</span>
            <span class="mapping-card__name">${this.escapeHtml(mapping.googleGroupName)}</span>
            <span class="mapping-card__count">${mapping.memberCount || 0} members</span>
          </div>
          <div class="mapping-card__arrow">→</div>
          <div class="mapping-card__target">
            <span class="mapping-card__label">CatchUp Group:</span>
            <select class="mapping-card__select" data-mapping-id="${mapping.id}">
              <option value="">Select group...</option>
              ${this.renderGroupOptions(mapping.suggestedGroupId)}
            </select>
          </div>
          <div class="mapping-card__confidence">
            <span class="confidence-badge ${confidenceClass}">
              ${mapping.confidence || 0}% match
            </span>
          </div>
        </div>
        <div class="mapping-card__actions">
          <button 
            class="btn-accept" 
            data-mapping-id="${mapping.id}"
            ${mapping.suggestedGroupId ? '' : 'disabled'}
          >
            Accept
          </button>
          <button class="btn-reject" data-mapping-id="${mapping.id}">
            Skip
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render group options for dropdown
   */
  renderGroupOptions(suggestedId) {
    return this.catchupGroups.map(group => `
      <option value="${group.id}" ${group.id === suggestedId ? 'selected' : ''}>
        ${this.escapeHtml(group.name)}
      </option>
    `).join('');
  }
  
  /**
   * Get confidence level (high/medium/low) from confidence score
   */
  getConfidenceLevel(confidence) {
    const score = confidence || 0;
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Set up event listeners for mapping actions
   * Requirements: 5.4
   */
  setupMappingListeners() {
    // Accept mapping buttons
    document.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mappingId = e.target.dataset.mappingId;
        this.acceptMapping(mappingId);
      });
    });
    
    // Reject/skip mapping buttons
    document.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mappingId = e.target.dataset.mappingId;
        this.rejectMapping(mappingId);
      });
    });
    
    // Group selection change
    document.querySelectorAll('.mapping-card__select').forEach(select => {
      select.addEventListener('change', (e) => {
        const mappingId = e.target.dataset.mappingId;
        const groupId = e.target.value;
        this.updateMappingSuggestion(mappingId, groupId);
      });
    });
    
    // Skip for now button
    const skipBtn = document.getElementById('skip-group-mappings-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.skipGroupMappings();
      });
    }
    
    // Complete onboarding button
    const completeBtn = document.getElementById('complete-onboarding-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        this.completeOnboarding();
      });
    }
  }
  
  /**
   * Update mapping suggestion when user changes dropdown
   */
  updateMappingSuggestion(mappingId, groupId) {
    const mapping = this.mappings.find(m => m.id === mappingId);
    if (mapping) {
      mapping.suggestedGroupId = groupId;
      
      // Enable/disable accept button based on selection
      const acceptBtn = document.querySelector(`.btn-accept[data-mapping-id="${mappingId}"]`);
      if (acceptBtn) {
        acceptBtn.disabled = !groupId;
      }
    }
  }
  
  /**
   * Accept a mapping suggestion
   * Requirements: 5.4
   */
  async acceptMapping(mappingId) {
    const mapping = this.mappings.find(m => m.id === mappingId);
    if (!mapping) return;
    
    const selectedGroupId = document.querySelector(
      `.mapping-card__select[data-mapping-id="${mappingId}"]`
    )?.value;
    
    if (!selectedGroupId) {
      if (typeof showToast === 'function') {
        showToast('Please select a group first', 'error');
      }
      return;
    }
    
    const authToken = localStorage.getItem('authToken');
    
    try {
      const response = await fetch(`${window.API_BASE || '/api'}/google-contacts/accept-mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userId: this.userId,
          googleGroupId: mapping.googleGroupId,
          catchupGroupId: selectedGroupId,
          mappingId: mapping.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to accept mapping');
      }
      
      // Mark as reviewed
      mapping.reviewed = true;
      mapping.accepted = true;
      
      // Update progress
      await this.updateProgress();
      
      // Remove card with fade animation
      // Requirements: 5.4
      this.removeCardWithAnimation(mappingId);
      
      if (typeof showToast === 'function') {
        showToast('✓ Mapping accepted', 'success');
      }
      
    } catch (error) {
      console.error('Failed to accept mapping:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to accept mapping. Please try again.', 'error');
      }
    }
  }
  
  /**
   * Reject/skip a mapping suggestion
   * Requirements: 5.4
   */
  async rejectMapping(mappingId) {
    const mapping = this.mappings.find(m => m.id === mappingId);
    if (!mapping) return;
    
    const authToken = localStorage.getItem('authToken');
    
    try {
      const response = await fetch(`${window.API_BASE || '/api'}/google-contacts/reject-mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userId: this.userId,
          mappingId: mapping.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject mapping');
      }
      
      // Mark as reviewed and rejected
      mapping.reviewed = true;
      mapping.rejected = true;
      
      // Update progress
      await this.updateProgress();
      
      // Remove card with fade animation
      // Requirements: 5.4
      this.removeCardWithAnimation(mappingId);
      
      if (typeof showToast === 'function') {
        showToast('Mapping skipped', 'info');
      }
      
    } catch (error) {
      console.error('Failed to reject mapping:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to skip mapping. Please try again.', 'error');
      }
    }
  }
  
  /**
   * Remove card with fade animation
   * Requirements: 5.4
   */
  removeCardWithAnimation(mappingId) {
    const card = document.querySelector(`[data-mapping-id="${mappingId}"]`);
    if (card) {
      card.style.opacity = '0';
      setTimeout(() => {
        card.remove();
        
        // Check if all cards are gone
        const remainingCards = document.querySelectorAll('.mapping-card');
        if (remainingCards.length === 0) {
          this.showAllMappingsReviewed();
        }
      }, 300);
    }
  }
  
  /**
   * Show message when all mappings are reviewed
   */
  showAllMappingsReviewed() {
    const listContainer = document.getElementById('mapping-suggestions-list');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <h3 style="margin: 0 0 12px 0; color: var(--text-primary);">All Mappings Reviewed!</h3>
          <p style="margin: 0; color: var(--text-secondary);">
            You've reviewed all group mapping suggestions. Ready to complete onboarding?
          </p>
        </div>
      `;
    }
  }
  
  /**
   * Update progress and check for completion
   * Requirements: 5.5
   */
  async updateProgress() {
    const reviewed = this.mappings.filter(m => m.reviewed).length;
    
    // Update state
    this.state.steps.groups.mappingsReviewed = reviewed;
    
    // Check if all mappings reviewed
    // Requirements: 5.5
    if (reviewed === this.mappings.length) {
      this.state.steps.groups.complete = true;
      await this.stateManager.saveState(this.userId, this.state);
      
      // Mark onboarding as complete
      // Requirements: 5.5
      await this.markOnboardingComplete();
    } else {
      await this.stateManager.saveState(this.userId, this.state);
    }
  }
  
  /**
   * Mark Step 3 complete and onboarding as complete
   * Requirements: 5.5
   */
  async markOnboardingComplete() {
    this.state.isComplete = true;
    this.state.steps.groups.complete = true;
    await this.stateManager.saveState(this.userId, this.state);
    
    // Hide onboarding indicator
    // Requirements: 5.5
    const indicator = document.querySelector('.onboarding-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    
    // Update global onboarding indicator if it exists
    if (window.onboardingIndicator) {
      window.onboardingIndicator.updateState(this.state);
    }
  }
  
  /**
   * Skip group mappings for now
   */
  skipGroupMappings() {
    if (typeof showToast === 'function') {
      showToast('Group mappings skipped. You can review them later from the Groups tab.', 'info');
    }
    
    // Still mark as complete to allow user to proceed
    this.completeOnboarding();
  }
  
  /**
   * Complete onboarding and show celebration
   * Requirements: 5.5, 8.1
   */
  async completeOnboarding() {
    // Mark onboarding as complete
    await this.markOnboardingComplete();
    
    // Show completion celebration
    // Requirements: 8.1
    this.showCompletionCelebration();
  }
  
  /**
   * Show completion celebration modal
   * Requirements: 8.1
   */
  showCompletionCelebration() {
    const modal = document.createElement('div');
    modal.className = 'completion-modal';
    modal.innerHTML = `
      <div class="completion-modal__content">
        <div class="completion-modal__icon">🎉</div>
        <h2>You're All Set!</h2>
        <p>Your CatchUp account is ready. We'll start suggesting connections based on your circles and preferences.</p>
        <div class="completion-modal__features">
          <div class="completion-feature">
            <span class="completion-feature__icon">📅</span>
            <span class="completion-feature__text">Smart scheduling based on your calendar</span>
          </div>
          <div class="completion-feature">
            <span class="completion-feature__icon">👥</span>
            <span class="completion-feature__text">Relationship management across your circles</span>
          </div>
          <div class="completion-feature">
            <span class="completion-feature__icon">🤖</span>
            <span class="completion-feature__text">AI-powered connection suggestions</span>
          </div>
        </div>
        <button class="btn-primary" id="get-started-btn">
          Get Started
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for get started button
    document.getElementById('get-started-btn').addEventListener('click', () => {
      modal.remove();
      
      // Navigate to home/dashboard
      window.location.hash = '#home';
      if (typeof navigateTo === 'function') {
        navigateTo('home');
      }
      
      // Emit completion event
      window.dispatchEvent(new CustomEvent('onboarding-complete', {
        detail: { userId: this.userId }
      }));
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    // Remove any event listeners if needed
    const container = document.getElementById('group-mappings-container');
    if (container) {
      container.remove();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Step3GroupMappingHandler;
}
