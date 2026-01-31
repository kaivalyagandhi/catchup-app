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
    this.contacts = [];           // Top AI suggestions (limited by maxSuggestions)
    this.maxSuggestions = options.maxSuggestions || 10; // Limit suggestions based on remaining capacity (Requirement 3.5)
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
        margin-bottom: 1.5rem;
      }
      
      .quick-start-header-main {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 2rem;
      }
      
      .quick-start-header-text {
        flex: 1;
      }
      
      .quick-start-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.25rem;
      }
      
      .quick-start-header p {
        font-size: 0.9375rem;
        color: var(--text-secondary, #6b7280);
        margin: 0;
      }
      
      .quick-start-preview-compact {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        border-radius: 12px;
        color: white;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
      }
      
      .preview-label {
        font-size: 0.875rem;
        opacity: 0.9;
      }
      
      .preview-count {
        font-size: 1.25rem;
        font-weight: 700;
      }
      
      .quick-start-suggestions-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }
      
      .suggestion-item {
        display: flex;
        align-items: flex-start;
        padding: 0.625rem 0.75rem;
        border: 2px solid var(--border-color, #e5e7eb);
        border-radius: 8px;
        background: var(--bg-secondary, #ffffff);
        transition: all 0.2s;
        cursor: pointer;
      }
      
      .suggestion-item:hover {
        border-color: var(--primary-color, #3b82f6);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
      }
      
      .suggestion-item.selected {
        background-color: var(--bg-selected, #eff6ff);
        border-color: var(--primary-color, #3b82f6);
      }
      
      .suggestion-checkbox {
        margin-right: 0.625rem;
        width: 16px;
        height: 16px;
        cursor: pointer;
        flex-shrink: 0;
        margin-top: 1px;
      }
      
      .suggestion-content {
        flex: 1;
        min-width: 0;
      }
      
      .suggestion-name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin-bottom: 0.125rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .suggestion-reasons {
        font-size: 0.8125rem;
        color: var(--text-secondary, #6b7280);
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
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
      
      /* Integrated Search Section */
      .quick-start-search-section {
        position: relative;
        margin-bottom: 1.5rem;
      }
      
      .quick-start-search-container {
        position: relative;
      }
      
      .quick-start-search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 16px;
        pointer-events: none;
      }
      
      .quick-start-search-input {
        width: 100%;
        padding: 12px 40px 12px 44px;
        background: var(--bg-secondary, #f9fafb);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 10px;
        color: var(--text-primary, #1f2937);
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      
      .quick-start-search-input:focus {
        outline: none;
        border-color: var(--primary-color, #3b82f6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .quick-start-search-input::placeholder {
        color: var(--text-tertiary, #9ca3af);
      }
      
      .quick-start-search-clear {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-tertiary, #9ca3af);
        cursor: pointer;
        padding: 4px;
        font-size: 18px;
        line-height: 1;
        display: none;
      }
      
      .quick-start-search-clear:hover {
        color: var(--text-primary, #1f2937);
      }
      
      .quick-start-search-results {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 10px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        max-height: 300px;
        overflow-y: auto;
        z-index: 20;
        display: none;
      }
      
      .quick-start-search-results.visible {
        display: block;
        animation: qsSlideDown 0.2s ease-out;
      }
      
      @keyframes qsSlideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .qs-search-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      }
      
      .qs-search-result-item:last-child {
        border-bottom: none;
      }
      
      .qs-search-result-item:hover {
        background: var(--bg-hover, #f9fafb);
      }
      
      .qs-search-result-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 13px;
        flex-shrink: 0;
      }
      
      .qs-search-result-info {
        flex: 1;
        min-width: 0;
      }
      
      .qs-search-result-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #1f2937);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .qs-search-result-circle {
        font-size: 12px;
        color: var(--text-secondary, #6b7280);
      }
      
      .qs-search-add-btn {
        padding: 6px 12px;
        background: var(--primary-color, #3b82f6);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;
        flex-shrink: 0;
      }
      
      .qs-search-add-btn:hover {
        background: var(--primary-hover, #2563eb);
      }
      
      .qs-search-empty {
        padding: 20px;
        text-align: center;
        color: var(--text-secondary, #6b7280);
        font-size: 14px;
      }
      
      /* Mobile responsive - Requirements 20.1, 20.4 */
      @media (max-width: 768px) {
        .quick-start-flow {
          padding: 1rem;
        }
        
        .quick-start-header-main {
          flex-direction: column;
          gap: 1rem;
        }
        
        .quick-start-preview-compact {
          align-self: flex-start;
        }
        
        .quick-start-header h2 {
          font-size: 1.25rem;
        }
        
        .quick-start-header p {
          font-size: 0.875rem;
        }
        
        .quick-start-suggestions-grid {
          grid-template-columns: 1fr;
          gap: 0.625rem;
        }
        
        .suggestion-item {
          padding: 0.75rem;
        }
        
        .quick-start-actions {
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .quick-start-btn {
          width: 100%;
          min-height: 44px;
          padding: 0.875rem 1.5rem;
        }
        
        .suggestion-checkbox {
          min-width: 44px;
          min-height: 44px;
          width: 20px;
          height: 20px;
        }
      }
      
      /* Extra small devices (320px and up) */
      @media (max-width: 480px) {
        .quick-start-flow {
          padding: 0.75rem;
        }
        
        .quick-start-header h2 {
          font-size: 1.125rem;
        }
        
        .quick-start-header p {
          font-size: 0.8125rem;
        }
        
        .suggestion-item {
          padding: 0.625rem;
        }
        
        .suggestion-name {
          font-size: 0.875rem;
        }
        
        .suggestion-reasons {
          font-size: 0.75rem;
        }
        
        .confidence-value {
          font-size: 0.75rem;
          min-width: 35px;
        }
        
        .quick-start-btn {
          font-size: 0.9375rem;
          padding: 0.875rem 1.25rem;
        }
        
        .preview-label {
          font-size: 0.8125rem;
        }
        
        .preview-count {
          font-size: 1.125rem;
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
        
        .quick-start-suggestions-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Fetch AI suggestions from backend
   * Requirements: 3.5, 5.1, 5.5, 5.6
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
      let suggestions = data.suggestions || [];
      
      // Limit suggestions based on remaining Inner Circle capacity (Requirement 3.5)
      if (this.maxSuggestions < 10 && suggestions.length > this.maxSuggestions) {
        console.log(`[QuickStartFlow] Limiting suggestions from ${suggestions.length} to ${this.maxSuggestions} based on remaining capacity`);
        suggestions = suggestions.slice(0, this.maxSuggestions);
      }
      
      this.contacts = suggestions;
      
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
        this.attachEventListeners(); // Attach listeners for skip button
      } else {
        container.innerHTML = this.renderSuggestions();
        this.attachEventListeners();
      }
    } catch (error) {
      container.innerHTML = this.renderError(error.message);
      this.attachEventListeners(); // Attach listeners for retry/skip buttons
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
    const selectedCount = Array.from(this.selectedContacts.values()).filter(v => v).length;
    
    const header = this.isReviewMode 
      ? `<h2>Review Your Inner Circle</h2>
         <p>Select which contacts to add to your Inner Circle</p>`
      : `<h2>Your Closest Connections</h2>
         <p>We found ${this.contacts.length} contacts who are likely your closest friends. Uncheck any you don't want to add.</p>`;
    
    return `
      <div class="quick-start-flow">
        <div class="quick-start-header">
          <div class="quick-start-header-main">
            <div class="quick-start-header-text">
              ${header}
            </div>
            <div class="quick-start-preview-compact">
              <span class="preview-label">Inner Circle:</span>
              <span class="preview-count">${selectedCount}/10</span>
            </div>
          </div>
        </div>
        
        ${this.renderIntegratedSearch()}
        
        <div class="quick-start-suggestions-grid">
          ${this.contacts.map((contact, index) => this.renderSuggestionItem(contact, index)).join('')}
        </div>
        
        ${this.renderActions()}
      </div>
    `;
  }
  
  /**
   * Render integrated search bar within AI suggestions view
   */
  renderIntegratedSearch() {
    return `
      <div class="quick-start-search-section">
        <div class="quick-start-search-container">
          <span class="quick-start-search-icon">🔍</span>
          <input 
            type="text" 
            class="quick-start-search-input" 
            id="qs-search-input"
            placeholder="Search to add more contacts..."
            aria-label="Search contacts to add"
          />
          <button class="quick-start-search-clear" id="qs-search-clear" aria-label="Clear search">×</button>
        </div>
        <div class="quick-start-search-results" id="qs-search-results"></div>
      </div>
    `;
  }
  
  renderSuggestionItem(contact, index) {
    const isSelected = this.selectedContacts.get(contact.contactId);
    
    // Always show checkbox/remove button to allow deselection
    const checkboxHtml = `<input type="checkbox" 
               class="suggestion-checkbox" 
               data-contact-id="${contact.contactId}"
               ${isSelected ? 'checked' : ''}>`;
    
    return `
      <div class="suggestion-item ${isSelected ? 'selected' : ''}" data-contact-id="${contact.contactId}">
        ${checkboxHtml}
        <div class="suggestion-content">
          <div class="suggestion-name">${this.escapeHtml(contact.name)}</div>
          <div class="suggestion-reasons">${this.formatReasons(contact.reasons)}</div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render action buttons
   */
  renderActions() {
    const selectedCount = Array.from(this.selectedContacts.values()).filter(v => v).length;
    
    if (this.isReviewMode) {
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
        <button class="quick-start-btn btn-primary" id="accept-all" ${selectedCount === 0 ? 'disabled' : ''}>
          Accept All ${selectedCount}
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
    
    // Checkboxes - always attach handlers to allow deselection
    const checkboxes = document.querySelectorAll('.suggestion-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => this.handleCheckboxChange(e));
    });
    
    // Integrated search functionality
    this.attachSearchListeners();
  }
  
  /**
   * Attach search event listeners for integrated search
   */
  attachSearchListeners() {
    const searchInput = document.getElementById('qs-search-input');
    const clearBtn = document.getElementById('qs-search-clear');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
      searchInput.addEventListener('focus', () => this.showSearchResults());
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSearch());
    }
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      const searchSection = document.querySelector('.quick-start-search-section');
      if (searchSection && !searchSection.contains(e.target)) {
        this.hideSearchResults();
      }
    });
  }
  
  /**
   * Handle search input with debounce
   */
  handleSearchInput(query) {
    // Update clear button visibility
    const clearBtn = document.getElementById('qs-search-clear');
    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    }
    
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Set new timer with 300ms debounce
    this.searchDebounceTimer = setTimeout(() => {
      this.searchQuery = query;
      this.performSearch();
    }, 300);
  }
  
  /**
   * Perform search and render results
   */
  async performSearch() {
    const resultsContainer = document.getElementById('qs-search-results');
    if (!resultsContainer) return;
    
    if (!this.searchQuery || this.searchQuery.trim().length < 2) {
      resultsContainer.classList.remove('visible');
      return;
    }
    
    // Fetch all contacts if not already loaded
    if (!this.allContacts) {
      try {
        const response = await fetch(`/api/contacts?userId=${this.userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.allContacts = data.contacts || data || [];
        } else {
          this.allContacts = [];
        }
      } catch (error) {
        console.error('Error fetching contacts for search:', error);
        this.allContacts = [];
      }
    }
    
    // Filter contacts by search query
    const query = this.searchQuery.toLowerCase().trim();
    const existingIds = new Set(this.contacts.map(c => c.contactId));
    
    const filteredContacts = this.allContacts.filter(contact => {
      // Exclude contacts already in suggestions
      if (existingIds.has(contact.id)) return false;
      
      // Filter by name or email
      const name = (contact.name || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
    
    this.renderSearchResults(filteredContacts);
  }
  
  /**
   * Render search results
   */
  renderSearchResults(contacts) {
    const resultsContainer = document.getElementById('qs-search-results');
    if (!resultsContainer) return;
    
    if (contacts.length === 0) {
      resultsContainer.innerHTML = `
        <div class="qs-search-empty">No contacts found matching "${this.escapeHtml(this.searchQuery)}"</div>
      `;
      resultsContainer.classList.add('visible');
      return;
    }
    
    resultsContainer.innerHTML = contacts.slice(0, 8).map(contact => {
      const circle = contact.dunbarCircle || contact.circle;
      const circleDisplay = circle ? this.getCircleDisplayName(circle) : 'Uncategorized';
      
      return `
        <div class="qs-search-result-item" data-contact-id="${contact.id}">
          <div class="qs-search-result-avatar">${this.getInitials(contact.name)}</div>
          <div class="qs-search-result-info">
            <div class="qs-search-result-name">${this.escapeHtml(contact.name)}</div>
            <div class="qs-search-result-circle">${circleDisplay}</div>
          </div>
          <button class="qs-search-add-btn" data-contact-id="${contact.id}" data-contact-name="${this.escapeHtml(contact.name)}">
            + Add
          </button>
        </div>
      `;
    }).join('');
    
    resultsContainer.classList.add('visible');
    
    // Attach click handlers
    const addBtns = resultsContainer.querySelectorAll('.qs-search-add-btn');
    addBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.contactId;
        const contactName = btn.dataset.contactName;
        const contact = this.allContacts.find(c => c.id === contactId);
        if (contact) {
          this.addContactFromSearch(contact);
        }
      });
    });
  }
  
  /**
   * Add a contact from search results to suggestions
   */
  addContactFromSearch(contact) {
    // Add to contacts list
    this.contacts.push({
      contactId: contact.id,
      name: contact.name,
      reasons: ['Manually added'],
      confidence: 100
    });
    
    // Mark as selected
    this.selectedContacts.set(contact.id, true);
    
    // Clear search
    this.clearSearch();
    
    // Re-render
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = this.renderSuggestions();
      this.attachEventListeners();
    }
    
    // Show feedback
    if (typeof showToast === 'function') {
      showToast(`Added ${contact.name} to suggestions`, 'success');
    }
  }
  
  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    const searchInput = document.getElementById('qs-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    const clearBtn = document.getElementById('qs-search-clear');
    if (clearBtn) {
      clearBtn.style.display = 'none';
    }
    this.hideSearchResults();
  }
  
  /**
   * Show search results
   */
  showSearchResults() {
    if (this.searchQuery && this.searchQuery.trim().length >= 2) {
      this.performSearch();
    }
  }
  
  /**
   * Hide search results
   */
  hideSearchResults() {
    const resultsContainer = document.getElementById('qs-search-results');
    if (resultsContainer) {
      resultsContainer.classList.remove('visible');
    }
  }
  
  /**
   * Get circle display name
   */
  getCircleDisplayName(circle) {
    const names = {
      'inner': 'Inner Circle',
      'close': 'Close Friends',
      'active': 'Active Friends',
      'casual': 'Casual Network'
    };
    return names[circle] || circle || 'Uncategorized';
  }
  
  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
    
    // Update Accept Selected button (review mode)
    const acceptSelectedBtn = document.getElementById('accept-selected');
    if (acceptSelectedBtn) {
      acceptSelectedBtn.disabled = selectedCount === 0;
      acceptSelectedBtn.textContent = `Add ${selectedCount} to Inner Circle`;
    }
    
    // Update Accept All button (non-review mode)
    const acceptAllBtn = document.getElementById('accept-all');
    if (acceptAllBtn) {
      acceptAllBtn.disabled = selectedCount === 0;
      acceptAllBtn.textContent = `Accept All ${selectedCount}`;
    }
    
    // Update compact preview count
    const previewCount = document.querySelector('.preview-count');
    if (previewCount) {
      previewCount.textContent = `${selectedCount}/10`;
    }
  }
  
  /**
   * Handle Accept All action
   * Requirements: 5.7, 5.10, 5.12
   */
  async handleAcceptAll() {
    // Only accept selected contacts
    const contactIds = Array.from(this.selectedContacts.entries())
      .filter(([_, isSelected]) => isSelected)
      .map(([contactId, _]) => contactId);
    
    if (contactIds.length === 0) {
      return;
    }
    
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
      const response = await fetch('/api/circles/batch-accept', {
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
