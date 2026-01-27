/**
 * QuickStartFlow Component
 * 
 * AI-powered initial onboarding that suggests top contacts for Inner Circle.
 * Displays top 10 AI suggestions with confidence scores and reasoning.
 * 
 * Requirements: 5.1, 5.6, 5.7, 5.8, 5.9, 5.10, 5.12, 10.1
 */

class QuickStartFlow {
  constructor(options = {}) {
    this.containerId = options.containerId || 'quick-start-container';
    this.userId = options.userId;
    this.contacts = [];           // Top 10 AI suggestions
    this.onAcceptAll = options.onAcceptAll || (() => {});
    this.onReview = options.onReview || (() => {});
    this.onSkip = options.onSkip || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.undoStack = [];          // For undo capability
    this.isReviewMode = false;    // Track if in review mode
    this.selectedContacts = new Map(); // Track individual selections in review mode
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  setupStyles() {
    // Check if styles already exist
    if (document.getElementById('quick-start-flow-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'quick-start-flow-styles';
    style.textContent = `
      .quick-start-flow {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      .quick-start-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .quick-start-header h2 {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.5rem;
      }
      
      .quick-start-header p {
        font-size: 1rem;
        color: var(--text-secondary, #6b7280);
      }
      
      .quick-start-suggestions {
        background: var(--bg-secondary, #ffffff);
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 1.5rem;
      }
      
      .suggestion-item {
        display: flex;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        transition: background-color 0.2s;
      }
      
      .suggestion-item:last-child {
        border-bottom: none;
      }
      
      .suggestion-item:hover {
        background-color: var(--bg-hover, #f9fafb);
      }
      
      .suggestion-item.selected {
        background-color: var(--bg-selected, #eff6ff);
        border-left: 3px solid var(--primary-color, #3b82f6);
      }
      
      .suggestion-checkbox {
        margin-right: 1rem;
        width: 20px;
        height: 20px;
        cursor: pointer;
        /* Ensure touch-friendly tap target */
        padding: 12px;
        margin: -12px 1rem -12px -12px;
      }
      
      .suggestion-content {
        flex: 1;
      }
      
      .suggestion-name {
        font-size: 1rem;
        font-weight: 500;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.25rem;
      }
      
      .suggestion-reasons {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 0.5rem;
      }
      
      .suggestion-confidence {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .confidence-bar {
        flex: 1;
        height: 6px;
        background-color: var(--bg-tertiary, #e5e7eb);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .confidence-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #3b82f6);
        transition: width 0.3s ease;
      }
      
      .confidence-value {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        min-width: 45px;
        text-align: right;
      }
      
      .quick-start-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .quick-start-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        min-width: 150px;
      }
      
      .quick-start-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .btn-primary {
        background-color: var(--primary-color, #3b82f6);
        color: white;
      }
      
      .btn-primary:hover:not(:disabled) {
        background-color: var(--primary-hover, #2563eb);
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .btn-secondary {
        background-color: var(--bg-secondary, #ffffff);
        color: var(--text-primary, #1f2937);
        border: 1px solid var(--border-color, #e5e7eb);
      }
      
      .btn-secondary:hover:not(:disabled) {
        background-color: var(--bg-hover, #f9fafb);
        border-color: var(--border-hover, #d1d5db);
      }
      
      .btn-text {
        background: transparent;
        color: var(--text-secondary, #6b7280);
        border: none;
      }
      
      .btn-text:hover:not(:disabled) {
        color: var(--text-primary, #1f2937);
        text-decoration: underline;
      }
      
      .quick-start-loading {
        text-align: center;
        padding: 3rem;
      }
      
      .quick-start-loading .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid var(--border-color, #e5e7eb);
        border-top-color: var(--primary-color, #3b82f6);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .quick-start-empty {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary, #6b7280);
      }
      
      .quick-start-empty h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.5rem;
      }
      
      .mini-visualizer {
        margin-top: 2rem;
        padding: 1.5rem;
        background: var(--bg-secondary, #ffffff);
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .mini-visualizer h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 1rem;
        text-align: center;
      }
      
      .circle-preview {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
      }
      
      .circle-stat {
        text-align: center;
      }
      
      .circle-stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: #8b5cf6;
      }
      
      .circle-stat-label {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
        margin-top: 0.25rem;
      }
      
      /* Mobile responsive - Requirements 20.1, 20.4 */
      @media (max-width: 768px) {
        .quick-start-flow {
          padding: 1rem;
        }
        
        .quick-start-header h2 {
          font-size: 1.5rem;
        }
        
        .quick-start-header p {
          font-size: 0.9375rem;
        }
        
        .quick-start-suggestions {
          padding: 1rem;
        }
        
        .quick-start-actions {
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .quick-start-btn {
          width: 100%;
          min-height: 44px; /* Touch-friendly minimum */
          padding: 0.875rem 1.5rem;
        }
        
        .suggestion-item {
          padding: 0.875rem;
        }
        
        .suggestion-checkbox {
          min-width: 44px; /* Touch-friendly minimum */
          min-height: 44px;
          width: 24px;
          height: 24px;
        }
        
        .circle-preview {
          flex-direction: column;
          gap: 0.75rem;
        }
      }
      
      /* Extra small devices (320px and up) */
      @media (max-width: 480px) {
        .quick-start-flow {
          padding: 0.75rem;
        }
        
        .quick-start-header h2 {
          font-size: 1.25rem;
        }
        
        .quick-start-header p {
          font-size: 0.875rem;
        }
        
        .quick-start-suggestions {
          padding: 0.75rem;
          border-radius: 8px;
        }
        
        .suggestion-item {
          padding: 0.75rem;
        }
        
        .suggestion-name {
          font-size: 0.9375rem;
        }
        
        .suggestion-reasons {
          font-size: 0.8125rem;
        }
        
        .confidence-value {
          font-size: 0.8125rem;
          min-width: 40px;
        }
        
        .quick-start-btn {
          font-size: 0.9375rem;
          padding: 0.875rem 1.25rem;
        }
        
        .mini-visualizer {
          padding: 1rem;
        }
        
        .circle-stat-value {
          font-size: 1.75rem;
        }
        
        .circle-stat-label {
          font-size: 0.8125rem;
        }
      }
      
      /* Landscape orientation on small devices */
      @media (max-width: 768px) and (orientation: landscape) {
        .quick-start-flow {
          padding: 0.75rem 1rem;
        }
        
        .quick-start-header {
          margin-bottom: 1rem;
        }
        
        .mini-visualizer {
          margin-top: 1rem;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Fetch AI suggestions from backend
   * Requirements: 5.1, 5.5, 5.6
   */
  async fetchSuggestions() {
    try {
      const response = await fetch(`/api/ai/quick-start-suggestions?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.contacts = data.suggestions || [];
      
      // Initialize all contacts as selected by default
      this.contacts.forEach(contact => {
        this.selectedContacts.set(contact.contactId, true);
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching quick start suggestions:', error);
      throw error;
    }
  }
  
  /**
   * Render the component
   * Requirements: 5.1, 5.6
   */
  async render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }
    
    // Show loading state
    container.innerHTML = this.renderLoading();
    
    try {
      // Fetch suggestions
      const data = await this.fetchSuggestions();
      
      // Render suggestions or empty state
      if (this.contacts.length === 0) {
        container.innerHTML = this.renderEmpty();
      } else {
        container.innerHTML = this.renderSuggestions();
        this.attachEventListeners();
      }
    } catch (error) {
      container.innerHTML = this.renderError(error.message);
    }
  }
  
  renderLoading() {
    return `
      <div class="quick-start-flow">
        <div class="quick-start-loading">
          <div class="spinner"></div>
          <p>Finding your closest connections...</p>
        </div>
      </div>
    `;
  }
  
  renderEmpty() {
    return `
      <div class="quick-start-flow">
        <div class="quick-start-empty">
          <h3>No Suggestions Available</h3>
          <p>We couldn't find enough contacts with high confidence scores.</p>
          <p>You can skip this step and organize contacts manually.</p>
          <div class="quick-start-actions" style="margin-top: 2rem;">
            <button class="quick-start-btn btn-primary" id="skip-quick-start">
              Continue to Manual Organization
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  renderError(message) {
    return `
      <div class="quick-start-flow">
        <div class="quick-start-empty">
          <h3>Error Loading Suggestions</h3>
          <p>${message}</p>
          <div class="quick-start-actions" style="margin-top: 2rem;">
            <button class="quick-start-btn btn-primary" id="retry-quick-start">
              Retry
            </button>
            <button class="quick-start-btn btn-text" id="skip-quick-start">
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  renderSuggestions() {
    const header = this.isReviewMode 
      ? `<h2>Review Your Inner Circle</h2>
         <p>Select which contacts to add to your Inner Circle</p>`
      : `<h2>Your Closest Connections</h2>
         <p>We found ${this.contacts.length} contacts who are likely your closest friends</p>`;
    
    return `
      <div class="quick-start-flow">
        <div class="quick-start-header">
          ${header}
        </div>
        
        <div class="quick-start-suggestions">
          ${this.contacts.map((contact, index) => this.renderSuggestionItem(contact, index)).join('')}
        </div>
        
        ${this.renderActions()}
        ${this.renderMiniVisualizer()}
      </div>
    `;
  }
  
  renderSuggestionItem(contact, index) {
    const isSelected = this.selectedContacts.get(contact.contactId);
    const checkboxHtml = this.isReviewMode 
      ? `<input type="checkbox" 
               class="suggestion-checkbox" 
               data-contact-id="${contact.contactId}"
               ${isSelected ? 'checked' : ''}>`
      : '';
    
    return `
      <div class="suggestion-item ${isSelected ? 'selected' : ''}" data-contact-id="${contact.contactId}">
        ${checkboxHtml}
        <div class="suggestion-content">
          <div class="suggestion-name">${this.escapeHtml(contact.name)}</div>
          <div class="suggestion-reasons">${this.formatReasons(contact.reasons)}</div>
          <div class="suggestion-confidence">
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${contact.confidence}%"></div>
            </div>
            <div class="confidence-value">${contact.confidence}%</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderActions() {
    if (this.isReviewMode) {
      const selectedCount = Array.from(this.selectedContacts.values()).filter(v => v).length;
      return `
        <div class="quick-start-actions">
          <button class="quick-start-btn btn-primary" id="accept-selected" ${selectedCount === 0 ? 'disabled' : ''}>
            Add ${selectedCount} to Inner Circle
          </button>
          <button class="quick-start-btn btn-text" id="skip-quick-start">
            Skip for Now
          </button>
        </div>
      `;
    }
    
    return `
      <div class="quick-start-actions">
        <button class="quick-start-btn btn-primary" id="accept-all">
          Accept All ${this.contacts.length}
        </button>
        <button class="quick-start-btn btn-secondary" id="review-individually">
          Review Individually
        </button>
        <button class="quick-start-btn btn-text" id="skip-quick-start">
          Skip for Now
        </button>
      </div>
    `;
  }
  
  renderMiniVisualizer() {
    const innerCircleCount = this.isReviewMode 
      ? Array.from(this.selectedContacts.values()).filter(v => v).length
      : this.contacts.length;
    
    return `
      <div class="mini-visualizer">
        <h3>Inner Circle Preview</h3>
        <div class="circle-preview">
          <div class="circle-stat">
            <div class="circle-stat-value">${innerCircleCount}</div>
            <div class="circle-stat-label">of 10 spots</div>
          </div>
        </div>
      </div>
    `;
  }
  
  attachEventListeners() {
    // Accept All button
    const acceptAllBtn = document.getElementById('accept-all');
    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', () => this.handleAcceptAll());
    }
    
    // Review Individually button
    const reviewBtn = document.getElementById('review-individually');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => this.handleReviewIndividually());
    }
    
    // Accept Selected button (in review mode)
    const acceptSelectedBtn = document.getElementById('accept-selected');
    if (acceptSelectedBtn) {
      acceptSelectedBtn.addEventListener('click', () => this.handleAcceptSelected());
    }
    
    // Skip button
    const skipBtn = document.getElementById('skip-quick-start');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.handleSkip());
    }
    
    // Retry button (in error state)
    const retryBtn = document.getElementById('retry-quick-start');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.render());
    }
    
    // Checkboxes (in review mode)
    if (this.isReviewMode) {
      const checkboxes = document.querySelectorAll('.suggestion-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => this.handleCheckboxChange(e));
      });
    }
  }
  
  handleCheckboxChange(event) {
    const contactId = event.target.dataset.contactId;
    const isChecked = event.target.checked;
    
    this.selectedContacts.set(contactId, isChecked);
    
    // Update UI
    const item = event.target.closest('.suggestion-item');
    if (isChecked) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
    
    // Update button state
    const selectedCount = Array.from(this.selectedContacts.values()).filter(v => v).length;
    const acceptBtn = document.getElementById('accept-selected');
    if (acceptBtn) {
      acceptBtn.disabled = selectedCount === 0;
      acceptBtn.textContent = `Add ${selectedCount} to Inner Circle`;
    }
    
    // Update mini visualizer
    const miniViz = document.querySelector('.mini-visualizer');
    if (miniViz) {
      miniViz.innerHTML = this.renderMiniVisualizer().match(/<div class="mini-visualizer">([\s\S]*)<\/div>/)[1];
    }
  }
  
  /**
   * Handle Accept All action
   * Requirements: 5.7, 5.10, 5.12
   */
  async handleAcceptAll() {
    const contactIds = this.contacts.map(c => c.contactId);
    await this.batchAssignToCircle(contactIds, 'inner');
  }
  
  /**
   * Handle Review Individually action
   * Requirements: 5.8
   */
  handleReviewIndividually() {
    this.isReviewMode = true;
    this.onReview();
    
    // Re-render in review mode
    const container = document.getElementById(this.containerId);
    container.innerHTML = this.renderSuggestions();
    this.attachEventListeners();
  }
  
  /**
   * Handle Accept Selected action (in review mode)
   * Requirements: 5.8
   */
  async handleAcceptSelected() {
    const selectedContactIds = Array.from(this.selectedContacts.entries())
      .filter(([_, isSelected]) => isSelected)
      .map(([contactId, _]) => contactId);
    
    if (selectedContactIds.length === 0) {
      return;
    }
    
    await this.batchAssignToCircle(selectedContactIds, 'inner');
  }
  
  /**
   * Handle Skip action
   * Requirements: 5.9, 10.1
   */
  handleSkip() {
    this.onSkip();
  }
  
  /**
   * Batch assign contacts to a circle
   * Requirements: 5.7, 5.10
   */
  async batchAssignToCircle(contactIds, circle) {
    try {
      const response = await fetch('/api/contacts/circles/batch-accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: this.userId,
          batchId: 'quick-start',
          circle: circle,
          contactIds: contactIds
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to assign contacts: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Store undo information
      this.undoStack.push({
        contactIds: contactIds,
        circle: circle,
        timestamp: Date.now()
      });
      
      // Notify parent component
      this.onAcceptAll(contactIds, circle);
      
      // Trigger visualizer update
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('contacts-updated'));
      }
      
      // Show success message
      if (typeof showToast === 'function') {
        showToast(`Successfully added ${contactIds.length} contacts to ${circle} circle`, 'success');
      }
      
      // Call completion callback
      this.onComplete(result);
      
    } catch (error) {
      console.error('Error assigning contacts:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to assign contacts: ${error.message}`, 'error');
      }
    }
  }
  
  /**
   * Format reasons for display
   */
  formatReasons(reasons) {
    if (!reasons || reasons.length === 0) {
      return 'Strong connection detected';
    }
    return reasons.join(' • ');
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
   * Destroy the component
   */
  destroy() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuickStartFlow;
}
