/**
 * Manage Circles Flow Component
 * 
 * Interface for assigning contacts to 4 simplified circles with search and educational tips.
 * Used both during onboarding (Step 2) and post-onboarding from the Circles section.
 * 
 * Requirements: 3.1, 3.4, 4.1, 4.2, 4.5, 6.1, 7.1, 7.4, 8.1, 8.2, 8.3, 9.1, 9.2, 
 *               10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 14.1, 14.2, 
 *               16.1, 16.4, 18.1, 18.2
 */

class ManageCirclesFlow {
  constructor(contacts, currentAssignments, options = {}) {
    this.contacts = contacts || [];
    this.assignments = currentAssignments || {};
    this.searchQuery = '';
    this.onSave = options.onSave || null;
    this.onSkip = options.onSkip || null;
    this.onClose = options.onClose || null;
    this.isOnboarding = options.isOnboarding || false;
    
    // Circle definitions with simplified 4-circle structure
    // Requirements: 10.1, 10.2, 10.3, 10.4
    this.circles = [
      { 
        id: 'inner', 
        name: 'Inner Circle', 
        capacity: 10, 
        count: 0,
        emoji: '💎',
        description: 'Your closest confidants—people you\'d call in a crisis',
        dunbarRange: '5-10',
        frequency: 'Weekly or more'
      },
      { 
        id: 'close', 
        name: 'Close Friends', 
        capacity: 25, 
        count: 0,
        emoji: '🌟',
        description: 'Good friends you regularly share life updates with',
        dunbarRange: '15-25',
        frequency: 'Bi-weekly to monthly'
      },
      { 
        id: 'active', 
        name: 'Active Friends', 
        capacity: 50, 
        count: 0,
        emoji: '✨',
        description: 'People you want to stay connected with regularly',
        dunbarRange: '30-50',
        frequency: 'Monthly to quarterly'
      },
      { 
        id: 'casual', 
        name: 'Casual Network', 
        capacity: 100, 
        count: 0,
        emoji: '🤝',
        description: 'Acquaintances you keep in touch with occasionally',
        dunbarRange: '50-100',
        frequency: 'Quarterly to annually'
      }
    ];
    
    // Calculate initial circle counts
    this.updateCircleCounts();
    
    // Modal element reference
    this.modalElement = null;
  }
  
  /**
   * Render the complete Manage Circles modal
   * Requirements: 3.1, 16.1, 18.1
   */
  render() {
    const html = `
      <div class="manage-circles-overlay" 
           id="manage-circles-overlay" 
           role="dialog" 
           aria-modal="true" 
           aria-labelledby="manage-circles-title">
        <div class="manage-circles-modal" id="manage-circles-modal">
          <div class="manage-circles__header">
            <h2 id="manage-circles-title">Organize Your Circles</h2>
            <button class="btn-close" 
                    aria-label="Close circle organization dialog" 
                    id="manage-circles-close"
                    tabindex="0">
              <svg xmlns="http://www.w3.org/2000/svg" 
                   viewBox="0 0 24 24" 
                   fill="none" 
                   stroke="currentColor" 
                   stroke-width="2" 
                   stroke-linecap="round" 
                   stroke-linejoin="round" 
                   style="width: 20px; height: 20px;"
                   aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          ${this.renderEducationalTip()}
          ${this.renderSearchBar()}
          ${this.renderProgress()}
          ${this.renderCircleCapacities()}
          ${this.renderContactGrid()}
          
          <div class="manage-circles__actions">
            <button class="btn-secondary" 
                    id="manage-circles-skip"
                    tabindex="0">Skip for Now</button>
            <button class="btn-primary" 
                    id="manage-circles-save"
                    tabindex="0">Save & Continue</button>
          </div>
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Render educational tip panel with Dunbar & Aristotle content
   * Requirements: 7.1, 7.4, 16.1
   */
  renderEducationalTip() {
    return `
      <div class="educational-tip">
        <div class="educational-tip__icon">💡</div>
        <div class="educational-tip__content">
          <h4>Understanding Your Circles</h4>
          <p>Based on Dunbar's research, most people maintain 10-25 close friendships. Our simplified 4-circle system helps you focus on relationships that matter most.</p>
          <details class="educational-tip__details">
            <summary>Learn more about the science</summary>
            <div class="educational-tip__expanded">
              <p><strong>Inner Circle (up to 10):</strong> Your closest confidants—people you'd call in a crisis. These are often virtue-based friendships built on mutual respect and shared values (Aristotle's highest form of friendship).</p>
              <p><strong>Close Friends (up to 25):</strong> Good friends you regularly share life updates with. Mix of virtue and pleasure-based friendships—people you enjoy spending time with and trust.</p>
              <p><strong>Active Friends (up to 50):</strong> People you want to stay connected with regularly. Often pleasure-based friendships around shared activities or interests.</p>
              <p><strong>Casual Network (up to 100):</strong> Acquaintances you keep in touch with occasionally. Often utility-based professional or contextual relationships.</p>
            </div>
          </details>
        </div>
      </div>
    `;
  }
  
  /**
   * Render search bar with icon
   * Requirements: 4.1, 4.2
   */
  renderSearchBar() {
    return `
      <div class="search-bar" role="search">
        <label for="manage-circles-search" class="sr-only">Search contacts</label>
        <svg class="search-bar__icon" 
             xmlns="http://www.w3.org/2000/svg" 
             viewBox="0 0 24 24" 
             fill="none" 
             stroke="currentColor" 
             stroke-width="2" 
             stroke-linecap="round" 
             stroke-linejoin="round"
             aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          type="search" 
          class="search-bar__input"
          id="manage-circles-search"
          placeholder="Search contacts..."
          aria-label="Search contacts by name"
          aria-describedby="search-results-count"
          value="${this.escapeHtml(this.searchQuery)}"
        />
      </div>
    `;
  }
  
  /**
   * Render progress tracking with bar and percentage
   * Requirements: 9.1, 9.2
   */
  renderProgress() {
    const categorized = this.contacts.filter(c => this.getContactCircle(c)).length;
    const total = this.contacts.length;
    const percentage = total > 0 ? Math.round((categorized / total) * 100) : 0;
    
    return `
      <div class="progress-section">
        <div class="progress-label">
          Progress: ${categorized}/${total} contacts categorized
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-percentage">${percentage}%</div>
      </div>
    `;
  }
  
  /**
   * Render circle capacities display with counts and warnings
   * Requirements: 3.3, 10.1, 10.2, 10.3, 10.4, 10.5
   */
  renderCircleCapacities() {
    return `
      <div class="circle-capacities">
        <h4>Circle Capacities:</h4>
        <ul class="circle-capacities__list">
          ${this.circles.map(circle => `
            <li class="circle-capacity">
              <span class="circle-capacity__name">
                <span class="circle-capacity__emoji">${circle.emoji}</span>
                ${circle.name}:
              </span>
              <span class="circle-capacity__count">
                ${circle.count}/${circle.capacity}
              </span>
              ${circle.count > circle.capacity ? 
                '<span class="circle-capacity__warning" title="Over recommended capacity">⚠️ Over capacity</span>' : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  
  /**
   * Render contact grid with cards
   * Requirements: 4.3, 4.4, 6.1, 8.1, 8.2, 8.3, 18.1, 18.2
   */
  renderContactGrid() {
    const filteredContacts = this.filterContacts();
    
    if (filteredContacts.length === 0) {
      // Requirements: 4.5
      return `
        <div class="contact-grid-empty">
          <p>No contacts found matching "${this.escapeHtml(this.searchQuery)}"</p>
        </div>
      `;
    }
    
    return `
      <div class="contact-grid" id="manage-circles-grid">
        ${filteredContacts.map(contact => this.renderContactCard(contact)).join('')}
      </div>
    `;
  }
  
  /**
   * Render individual contact card
   * Requirements: 4.3, 4.4, 8.1, 8.2, 8.3, 18.1, 18.2
   */
  renderContactCard(contact) {
    const currentCircle = this.getContactCircle(contact);
    const aiSuggestion = contact.circle_ai_suggestion || contact.circleAiSuggestion;
    const aiConfidence = contact.circle_ai_confidence || contact.circleAiConfidence || 0;
    
    return `
      <div class="contact-card" data-contact-id="${contact.id}">
        <div class="contact-card__avatar ${this.getAvatarColor(contact)}">
          ${this.getContactInitials(contact)}
        </div>
        <div class="contact-card__name" title="${this.escapeHtml(contact.name)}">${this.escapeHtml(contact.name)}</div>
        <select class="contact-card__circle-select" data-contact-id="${contact.id}">
          <option value="">Select circle...</option>
          ${this.circles.map(circle => `
            <option value="${circle.id}" ${currentCircle === circle.id ? 'selected' : ''}>
              ${circle.emoji} ${circle.name}
            </option>
          `).join('')}
        </select>
        ${aiSuggestion && aiConfidence > 0 ? this.renderAISuggestion(aiSuggestion, aiConfidence) : ''}
      </div>
    `;
  }
  
  /**
   * Render AI suggestion badge
   * Requirements: 8.1, 8.2, 8.3
   */
  renderAISuggestion(suggestedCircle, confidence) {
    const circle = this.circles.find(c => c.id === suggestedCircle);
    if (!circle) return '';
    
    return `
      <div class="ai-suggestion">
        <span class="ai-suggestion__label">Suggested:</span>
        <span class="ai-suggestion__circle">${circle.emoji} ${circle.name}</span>
        <span class="ai-suggestion__confidence">${confidence}%</span>
      </div>
    `;
  }
  
  /**
   * Get contact initials for avatar
   * Requirements: 18.2
   */
  getContactInitials(contact) {
    const name = contact.name || '';
    const parts = name.trim().split(' ');
    
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      return parts[0][0].toUpperCase();
    }
    
    return '?';
  }
  
  /**
   * Get avatar color class based on contact name
   * Requirements: 18.2
   */
  getAvatarColor(contact) {
    const colors = ['avatar--sage', 'avatar--sand', 'avatar--rose', 'avatar--stone'];
    const name = contact.name || '';
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
  
  /**
   * Get current circle assignment for a contact
   */
  getContactCircle(contact) {
    // Check assignments object first
    if (this.assignments[contact.id]) {
      return this.assignments[contact.id];
    }
    
    // Check contact object properties
    return contact.circle || contact.dunbarCircle || null;
  }
  
  /**
   * Filter contacts based on search query
   * Requirements: 4.2
   */
  filterContacts() {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      return this.contacts;
    }
    
    const query = this.searchQuery.toLowerCase().trim();
    return this.contacts.filter(contact => {
      const name = (contact.name || '').toLowerCase();
      return name.includes(query);
    });
  }
  
  /**
   * Update circle counts based on current assignments
   * Requirements: 14.1, 14.2
   */
  updateCircleCounts() {
    // Reset counts
    this.circles.forEach(circle => {
      circle.count = 0;
    });
    
    // Count assignments
    this.contacts.forEach(contact => {
      const circleId = this.getContactCircle(contact);
      if (circleId) {
        const circle = this.circles.find(c => c.id === circleId);
        if (circle) {
          circle.count++;
        }
      }
    });
  }
  
  /**
   * Mount the modal to the DOM and set up event listeners
   */
  mount() {
    // Create modal element
    const container = document.createElement('div');
    container.innerHTML = this.render();
    this.modalElement = container.firstElementChild;
    
    // Add to body
    document.body.appendChild(this.modalElement);
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Focus on search input
    setTimeout(() => {
      const searchInput = document.getElementById('manage-circles-search');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }
  
  /**
   * Set up all event listeners
   * Requirements: 3.5, 4.2, 6.3, 6.4, 12.1, 14.1, 14.2
   */
  setupEventListeners() {
    if (!this.modalElement) return;
    
    // Close button
    const closeBtn = this.modalElement.querySelector('#manage-circles-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    // Overlay click to close
    this.modalElement.addEventListener('click', (e) => {
      if (e.target.id === 'manage-circles-overlay') {
        this.close();
      }
    });
    
    // Search input
    const searchInput = this.modalElement.querySelector('#manage-circles-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
    
    // Circle selection dropdowns
    const selects = this.modalElement.querySelectorAll('.contact-card__circle-select');
    selects.forEach(select => {
      select.addEventListener('change', (e) => {
        const contactId = e.target.dataset.contactId; // Keep as string, don't parse
        const circleId = e.target.value;
        this.handleCircleAssignment(contactId, circleId);
      });
    });
    
    // Save button
    const saveBtn = this.modalElement.querySelector('#manage-circles-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }
    
    // Skip button
    const skipBtn = this.modalElement.querySelector('#manage-circles-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.handleSkip());
    }
    
    // Escape key to close
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }
  
  /**
   * Handle search input
   * Requirements: 4.2
   */
  handleSearch(query) {
    this.searchQuery = query;
    this.refresh();
  }
  
  /**
   * Handle circle assignment for a contact with validation
   * Requirements: 3.5, 14.1, 14.2, All requirements (data integrity)
   */
  async handleCircleAssignment(contactId, circleId) {
    // Ensure contactId is a string (UUIDs are strings)
    contactId = String(contactId);
    
    // Validate inputs
    const validationResult = this.validateCircleAssignment(contactId, circleId);
    if (!validationResult.isValid) {
      console.error('Invalid circle assignment:', validationResult.errors);
      if (typeof showToast === 'function') {
        showToast(validationResult.errors[0], 'error');
      }
      return;
    }
    
    // Show warnings if any
    if (validationResult.warnings.length > 0 && typeof showToast === 'function') {
      validationResult.warnings.forEach(warning => {
        showToast(warning, 'warning');
      });
    }
    
    // Update local assignments
    if (circleId) {
      this.assignments[contactId] = circleId;
    } else {
      delete this.assignments[contactId];
    }
    
    // Update circle counts
    this.updateCircleCounts();
    
    // Save to backend
    try {
      const userId = window.userId || localStorage.getItem('userId');
      const response = await fetch(`${window.API_BASE || '/api'}/contacts/${contactId}/circle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: userId,
          circle: circleId || null,
          assignedBy: 'user'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to save circle assignment';
        throw new Error(errorMessage);
      }
      
      // Update contact in local array
      const contact = this.contacts.find(c => c.id === contactId);
      if (contact) {
        contact.circle = circleId;
        contact.dunbarCircle = circleId;
      }
      
      // Emit event for progress tracking
      window.dispatchEvent(new CustomEvent('circle-assigned', {
        detail: { contactId, circle: circleId }
      }));
      
      // Update onboarding state if in onboarding mode
      if (this.isOnboarding && window.onboardingIndicator) {
        const categorized = this.contacts.filter(c => this.getContactCircle(c)).length;
        const total = this.contacts.length;
        
        const currentState = window.onboardingIndicator.state;
        currentState.steps.circles.contactsCategorized = categorized;
        currentState.steps.circles.totalContacts = total;
        
        window.onboardingIndicator.updateState(currentState);
      }
      
      // Refresh UI to show updated counts and progress
      this.refresh();
      
    } catch (error) {
      console.error('Error saving circle assignment:', error);
      if (typeof showToast === 'function') {
        showToast(error.message || 'Failed to save circle assignment', 'error');
      }
      
      // Revert the UI change on error
      this.refresh();
    }
  }
  
  /**
   * Handle save and continue
   * Requirements: 6.3, 6.4, 12.1
   */
  async handleSave() {
    // Save all assignments
    await this.saveAllAssignments();
    
    // Mark Step 2 complete if in onboarding mode
    if (this.isOnboarding && window.onboardingIndicator) {
      const categorized = this.contacts.filter(c => this.getContactCircle(c)).length;
      const total = this.contacts.length;
      
      const currentState = window.onboardingIndicator.state;
      currentState.steps.circles.complete = true;
      currentState.steps.circles.contactsCategorized = categorized;
      currentState.steps.circles.totalContacts = total;
      currentState.currentStep = 3;
      
      window.onboardingIndicator.updateState(currentState);
      
      // Show success message
      if (typeof showToast === 'function') {
        showToast('Circles organized! Ready to review group mappings.', 'success');
      }
      
      // Prompt to continue to Step 3
      setTimeout(() => {
        if (confirm('Would you like to review group mapping suggestions now?')) {
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
      }, 1500);
    } else {
      // Post-onboarding save
      if (typeof showToast === 'function') {
        showToast('Circle assignments saved successfully', 'success');
      }
    }
    
    // Call onSave callback if provided
    if (this.onSave) {
      this.onSave(this.assignments);
    }
    
    // Close modal
    this.close();
  }
  
  /**
   * Handle skip for now
   * Requirements: 6.4, 12.1
   */
  async handleSkip() {
    // Save current progress
    await this.saveAllAssignments();
    
    if (typeof showToast === 'function') {
      showToast('Progress saved. You can continue organizing circles anytime.', 'info');
    }
    
    // Call onSkip callback if provided
    if (this.onSkip) {
      this.onSkip(this.assignments);
    }
    
    // Close modal
    this.close();
  }
  
  /**
   * Save all assignments to backend
   */
  async saveAllAssignments() {
    const userId = window.userId || localStorage.getItem('userId');
    const assignmentsToSave = Object.entries(this.assignments).map(([contactId, circleId]) => ({
      contactId: String(contactId), // Keep as string (UUID)
      circle: circleId
    }));
    
    if (assignmentsToSave.length === 0) {
      return;
    }
    
    try {
      const response = await fetch(`${window.API_BASE || '/api'}/contacts/circles/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          userId: userId,
          assignments: assignmentsToSave 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to save assignments';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      throw error;
    }
  }
  
  /**
   * Refresh the modal content
   */
  refresh() {
    if (!this.modalElement) return;
    
    // Update circle counts
    this.updateCircleCounts();
    
    // Re-render content sections
    const modal = this.modalElement.querySelector('.manage-circles-modal');
    if (!modal) return;
    
    // Update progress
    const progressSection = modal.querySelector('.progress-section');
    if (progressSection) {
      progressSection.outerHTML = this.renderProgress();
    }
    
    // Update circle capacities
    const capacitiesSection = modal.querySelector('.circle-capacities');
    if (capacitiesSection) {
      capacitiesSection.outerHTML = this.renderCircleCapacities();
    }
    
    // Update contact grid
    const gridContainer = modal.querySelector('.contact-grid, .contact-grid-empty');
    if (gridContainer) {
      gridContainer.outerHTML = this.renderContactGrid();
    }
    
    // Re-attach event listeners for new elements
    this.setupEventListeners();
  }
  
  /**
   * Close the modal
   */
  close() {
    if (this.modalElement) {
      // Remove escape key listener
      if (this.escapeHandler) {
        document.removeEventListener('keydown', this.escapeHandler);
      }
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Remove modal from DOM
      this.modalElement.remove();
      this.modalElement = null;
    }
    
    // Call onClose callback if provided
    if (this.onClose) {
      this.onClose();
    }
  }
  
  /**
   * Destroy the component and clean up
   */
  destroy() {
    this.close();
  }
  
  /**
   * Validate circle assignment
   * Requirements: All requirements (data integrity)
   */
  validateCircleAssignment(contactId, circle) {
    const errors = [];
    const warnings = [];
    
    // Validate contact ID (can be string UUID or number)
    if (!contactId || (typeof contactId !== 'string' && typeof contactId !== 'number')) {
      errors.push('Invalid contact ID');
    }
    
    // Validate circle value (only 4 circles now)
    const validCircles = ['inner', 'close', 'active', 'casual', null, ''];
    if (circle && !validCircles.includes(circle)) {
      errors.push(`Invalid circle: ${circle}`);
    }
    
    // Check capacity warnings
    if (circle) {
      const circleObj = this.circles.find(c => c.id === circle);
      if (circleObj) {
        const newCount = circleObj.count + 1;
        if (newCount > circleObj.capacity) {
          warnings.push(
            `${circleObj.name} will be over capacity (${newCount}/${circleObj.capacity}). Consider rebalancing.`
          );
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ManageCirclesFlow;
}
