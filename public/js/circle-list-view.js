/**
 * CircleListView Component
 * 
 * Unified interface for organizing contacts into circles with AI suggestions.
 * Displays contacts grouped by circle with search, add, and remove functionality.
 * AI suggestions appear as dotted-outline pills that can be accepted.
 * 
 * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7
 * - 5.3: Display all contacts in a searchable grid view
 * - 5.4: Allow users to assign contacts to circles via dropdown selectors
 * - 5.5: Display circle capacity indicators for all four circles
 * - 5.6: Provide search functionality to filter contacts by name
 * - 5.7: Show the current circle assignment for each contact
 */

class CircleListView {
  /**
   * Create a CircleListView instance
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element to render into
   * @param {Function} options.onContactMove - Callback when contact is moved (contactId, targetCircle)
   * @param {Function} options.onContactRemove - Callback when contact is removed from circle (contactId)
   * @param {Function} options.onSuggestionAccept - Callback when AI suggestion is accepted (contactId, circle)
   * @param {Function} options.onSave - Callback when save is clicked
   * @param {Function} options.onCancel - Callback when cancel is clicked
   * @param {string} options.userId - User ID for API calls
   * @param {Object} options.aiSuggestions - AI suggestions grouped by circle {inner: [], close: [], active: []}
   */
  constructor(options = {}) {
    this.containerId = options.containerId;
    this.onContactMove = options.onContactMove || (() => {});
    this.onContactRemove = options.onContactRemove || (() => {});
    this.onSuggestionAccept = options.onSuggestionAccept || (() => {});
    this.onSave = options.onSave || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.userId = options.userId;
    this.aiSuggestions = options.aiSuggestions || { inner: [], close: [], active: [] };
    this.acceptedSuggestions = new Set(); // Track accepted suggestion IDs
    
    // Debug logging
    console.log('[CircleListView] Initialized with aiSuggestions:', this.aiSuggestions);
    
    this.contacts = [];
    this.searchQuery = '';
    this.debounceTimer = null;
    this.isLoading = false;
    
    // Circle definitions with Dunbar capacities
    this.circles = [
      { id: 'inner', name: 'Inner Circle', emoji: '💜', capacity: 10, color: '#8b5cf6' },
      { id: 'close', name: 'Close Friends', emoji: '💗', capacity: 25, color: '#ec4899' },
      { id: 'active', name: 'Active Friends', emoji: '💚', capacity: 50, color: '#10b981' },
      { id: 'casual', name: 'Casual Network', emoji: '💙', capacity: 100, color: '#3b82f6' }
    ];
    
    this.init();
  }
  
  init() {
    this.injectStyles();
  }

  /**
   * Inject component styles into the document head
   */
  injectStyles() {
    const styleId = 'circle-list-view-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      /* ============================================================================
         CIRCLE LIST VIEW COMPONENT
         Manual mode interface for organizing contacts into circles
         Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 8.4
         ============================================================================ */

      .circle-list-view {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 0;
        max-height: calc(80vh - 200px);
        overflow-y: auto;
      }

      /* Search Section */
      .clv-search-section {
        position: sticky;
        top: 0;
        background: var(--bg-surface, #ffffff);
        z-index: 10;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }

      .clv-search-container {
        position: relative;
      }

      .clv-search-input {
        width: 100%;
        padding: 12px 16px 12px 44px;
        background: var(--bg-app, #f9fafb);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 10px;
        color: var(--text-primary, #1f2937);
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .clv-search-input:focus {
        outline: none;
        border-color: var(--accent-primary, #fb923c);
        box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.1);
      }

      .clv-search-input::placeholder {
        color: var(--text-tertiary, #9ca3af);
      }

      .clv-search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-tertiary, #9ca3af);
        pointer-events: none;
        font-size: 18px;
      }

      .clv-search-clear {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-tertiary, #9ca3af);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        font-size: 16px;
        line-height: 1;
        display: none;
      }

      .clv-search-clear.visible {
        display: block;
      }

      .clv-search-clear:hover {
        color: var(--text-primary, #1f2937);
        background: var(--bg-hover, #f3f4f6);
      }

      /* Search Results Dropdown */
      .clv-search-results {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 10px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        max-height: 300px;
        overflow-y: auto;
        z-index: 20;
        display: none;
      }

      .clv-search-results.visible {
        display: block;
        animation: clvSlideDown 0.2s ease-out;
      }

      .clv-search-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }

      .clv-search-result-item:last-child {
        border-bottom: none;
      }

      .clv-search-result-item:hover {
        background: var(--bg-hover, #f9fafb);
      }

      .clv-search-result-avatar {
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

      .clv-search-result-info {
        flex: 1;
        min-width: 0;
      }

      .clv-search-result-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #1f2937);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .clv-search-result-circle {
        font-size: 12px;
        color: var(--text-secondary, #6b7280);
      }

      .clv-search-result-circle.in-circle {
        color: var(--accent-primary, #fb923c);
        font-weight: 500;
      }

      /* Quick Assign Buttons in Search Results */
      .clv-quick-assign-buttons {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .clv-quick-assign-btn {
        width: 32px;
        height: 32px;
        min-width: 32px;
        border: none;
        border-radius: 6px;
        background: var(--bg-secondary, #f3f4f6);
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
      }

      .clv-quick-assign-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .clv-quick-assign-btn.active {
        box-shadow: 0 0 0 2px var(--accent-primary, #fb923c);
      }

      .clv-quick-assign-btn[data-circle="inner"]:hover {
        background: #8b5cf6;
      }

      .clv-quick-assign-btn[data-circle="close"]:hover {
        background: #ec4899;
      }

      .clv-quick-assign-btn[data-circle="active"]:hover {
        background: #10b981;
      }

      .clv-quick-assign-btn[data-circle="casual"]:hover {
        background: #3b82f6;
      }

      /* Circles Container */
      .clv-circles-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Circle Section */
      .clv-circle-section {
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 12px;
        overflow: hidden;
        transition: box-shadow 0.2s;
      }

      .clv-circle-section:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .clv-circle-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: var(--bg-secondary, #f9fafb);
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }

      .clv-circle-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin: 0;
      }

      .clv-circle-emoji {
        font-size: 18px;
      }

      .clv-circle-count {
        font-size: 13px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 12px;
        background: var(--bg-app, #f3f4f6);
        color: var(--text-secondary, #6b7280);
      }

      .clv-circle-count.near-capacity {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
      }

      .clv-circle-count.at-capacity {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
      }

      .clv-circle-count.over-capacity {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      /* Inline Capacity Tip */
      .clv-capacity-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        font-size: 13px;
        line-height: 1.4;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
        animation: clvSlideDown 0.2s ease-out;
      }

      .clv-capacity-tip-icon {
        font-size: 16px;
        flex-shrink: 0;
      }

      .clv-capacity-tip-message {
        flex: 1;
      }

      .clv-capacity-tip--approaching {
        background: rgba(59, 130, 246, 0.08);
        color: #1e40af;
      }

      .clv-capacity-tip--full {
        background: rgba(16, 185, 129, 0.08);
        color: #065f46;
      }

      .clv-capacity-tip--warning {
        background: rgba(239, 68, 68, 0.08);
        color: #991b1b;
      }

      /* Dark theme capacity tip */
      [data-theme="dark"] .clv-capacity-tip--approaching {
        background: rgba(59, 130, 246, 0.15);
        color: #93c5fd;
      }

      [data-theme="dark"] .clv-capacity-tip--full {
        background: rgba(16, 185, 129, 0.15);
        color: #6ee7b7;
      }

      [data-theme="dark"] .clv-capacity-tip--warning {
        background: rgba(239, 68, 68, 0.15);
        color: #fca5a5;
      }

      /* Contact Chips Container */
      .clv-circle-contacts {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 14px 16px;
        min-height: 52px;
      }

      .clv-circle-contacts.empty {
        justify-content: center;
        align-items: center;
      }

      .clv-empty-message {
        font-size: 13px;
        color: var(--text-tertiary, #9ca3af);
        font-style: italic;
      }

      /* Contact Chip */
      .clv-contact-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px 6px 12px;
        background: var(--bg-app, #f3f4f6);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 20px;
        font-size: 13px;
        color: var(--text-primary, #1f2937);
        transition: background 0.15s, box-shadow 0.15s;
        animation: clvChipIn 0.2s ease-out;
      }

      .clv-contact-chip:hover {
        background: var(--bg-hover, #e5e7eb);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .clv-contact-chip-name {
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
      }

      .clv-remove-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        min-width: 20px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--text-tertiary, #9ca3af);
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        line-height: 1;
        transition: background 0.15s, color 0.15s;
      }

      .clv-remove-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      /* Add Contact Button in Circle */
      .clv-add-contact-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: transparent;
        border: 1px dashed var(--border-subtle, #d1d5db);
        border-radius: 20px;
        font-size: 13px;
        color: var(--text-secondary, #6b7280);
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
      }

      .clv-add-contact-btn:hover {
        border-color: var(--accent-primary, #fb923c);
        color: var(--accent-primary, #fb923c);
        background: rgba(251, 146, 60, 0.05);
      }

      /* Uncategorized Section */
      .clv-uncategorized-section {
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 12px;
        overflow: hidden;
      }

      .clv-uncategorized-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: var(--bg-secondary, #f9fafb);
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }

      .clv-uncategorized-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
        margin: 0;
      }

      .clv-uncategorized-count {
        font-size: 13px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 12px;
        background: rgba(107, 114, 128, 0.1);
        color: var(--text-secondary, #6b7280);
      }

      .clv-uncategorized-contacts {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 14px 16px;
        max-height: 200px;
        overflow-y: auto;
      }

      /* Uncategorized Contact Chip - Clickable to assign */
      .clv-uncategorized-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--bg-app, #f3f4f6);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 20px;
        font-size: 13px;
        color: var(--text-primary, #1f2937);
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
      }

      .clv-uncategorized-chip:hover {
        background: var(--accent-subtle, #fff7ed);
        border-color: var(--accent-primary, #fb923c);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      /* Loading State */
      .clv-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: var(--text-secondary, #6b7280);
      }

      .clv-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border-subtle, #e5e7eb);
        border-top-color: var(--accent-primary, #fb923c);
        border-radius: 50%;
        animation: clvSpin 0.8s linear infinite;
        margin-bottom: 16px;
      }

      /* Animations */
      @keyframes clvSlideDown {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes clvChipIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes clvSpin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ============================================================================
         DARK THEME SUPPORT
         ============================================================================ */

      [data-theme="dark"] .clv-search-results {
        background: var(--bg-surface, #1c1917);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      }

      [data-theme="dark"] .clv-circle-section:hover,
      [data-theme="dark"] .clv-uncategorized-section:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      [data-theme="dark"] .clv-contact-chip:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      /* ============================================================================
         RESPONSIVE STYLES (Requirement 8.4)
         ============================================================================ */

      /* Mobile styles */
      @media (max-width: 767px) {
        .circle-list-view {
          gap: 16px;
        }

        .clv-search-input {
          padding: 14px 16px 14px 44px;
          font-size: 16px; /* Prevent zoom on iOS */
        }

        .clv-circle-header,
        .clv-uncategorized-header {
          padding: 12px 14px;
        }

        .clv-circle-title,
        .clv-uncategorized-title {
          font-size: 14px;
        }

        .clv-circle-contacts,
        .clv-uncategorized-contacts {
          padding: 12px 14px;
        }

        .clv-contact-chip,
        .clv-uncategorized-chip {
          padding: 8px 12px 8px 14px;
          font-size: 14px;
        }

        .clv-contact-chip-name {
          max-width: 120px;
        }

        .clv-remove-btn {
          width: 24px;
          height: 24px;
          min-width: 24px;
          font-size: 16px;
        }

        .clv-quick-assign-btn {
          width: 36px;
          height: 36px;
          min-width: 36px;
          font-size: 16px;
        }

        .clv-search-result-item {
          padding: 14px 16px;
        }

        /* Single column layout on mobile */
        .clv-circles-container {
          gap: 12px;
        }
      }

      /* Very small screens */
      @media (max-width: 359px) {
        .clv-contact-chip-name {
          max-width: 80px;
        }

        .clv-quick-assign-buttons {
          gap: 2px;
        }

        .clv-quick-assign-btn {
          width: 32px;
          height: 32px;
          min-width: 32px;
        }
      }

      /* Reduced motion preference */
      @media (prefers-reduced-motion: reduce) {
        .circle-list-view *,
        .clv-search-results,
        .clv-contact-chip,
        .clv-spinner {
          animation: none !important;
          transition: none !important;
        }
      }

      /* ============================================================================
         AI SUGGESTION CHIPS
         Dotted outline pills for AI-suggested contacts
         ============================================================================ */

      .clv-suggestion-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px 6px 12px;
        background: transparent;
        border: 2px dashed var(--border-subtle, #d1d5db);
        border-radius: 20px;
        font-size: 13px;
        color: var(--text-secondary, #6b7280);
        transition: all 0.2s ease;
        animation: clvChipIn 0.2s ease-out;
      }

      .clv-suggestion-chip:hover {
        border-color: var(--accent-primary, #fb923c);
        background: rgba(251, 146, 60, 0.05);
      }

      .clv-suggestion-chip.accepted {
        background: var(--bg-app, #f3f4f6);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-style: solid;
        color: var(--text-primary, #1f2937);
      }

      .clv-suggestion-chip-name {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
      }

      .clv-suggestion-chip .clv-ai-badge {
        font-size: 10px;
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        margin-left: 2px;
      }

      .clv-suggestion-chip.accepted .clv-ai-badge {
        display: none;
      }

      .clv-accept-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        min-width: 22px;
        border: none;
        border-radius: 50%;
        background: var(--accent-primary, #10b981);
        color: white;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        transition: transform 0.15s, background 0.15s;
      }

      .clv-accept-btn:hover {
        transform: scale(1.1);
        background: #059669;
      }

      .clv-suggestion-chip.accepted .clv-accept-btn {
        display: none;
      }

      .clv-suggestion-chip .clv-remove-btn {
        display: none;
      }

      .clv-suggestion-chip.accepted .clv-remove-btn {
        display: flex;
      }

      /* Suggestion chip colors by circle */
      .clv-suggestion-chip[data-circle="inner"] {
        border-color: rgba(139, 92, 246, 0.4);
      }
      .clv-suggestion-chip[data-circle="inner"]:hover {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.05);
      }

      .clv-suggestion-chip[data-circle="close"] {
        border-color: rgba(236, 72, 153, 0.4);
      }
      .clv-suggestion-chip[data-circle="close"]:hover {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.05);
      }

      .clv-suggestion-chip[data-circle="active"] {
        border-color: rgba(16, 185, 129, 0.4);
      }
      .clv-suggestion-chip[data-circle="active"]:hover {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.05);
      }

      /* Mobile responsive for suggestion chips */
      @media (max-width: 767px) {
        .clv-suggestion-chip {
          padding: 8px 12px 8px 14px;
          font-size: 14px;
        }

        .clv-suggestion-chip-name {
          max-width: 100px;
        }

        .clv-accept-btn {
          width: 26px;
          height: 26px;
          min-width: 26px;
          font-size: 14px;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Mount the component and fetch contacts
   */
  async mount() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`CircleListView: Container with id "${this.containerId}" not found`);
      return;
    }

    // Show loading state
    container.innerHTML = this.renderLoading();

    // Fetch contacts
    await this.fetchContacts();

    // Render the component
    this.render();
  }

  /**
   * Fetch contacts from API
   */
  async fetchContacts() {
    this.isLoading = true;
    
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        throw new Error('Not authenticated');
      }
      
      // Build URL with userId parameter
      let url = '/api/contacts';
      if (userId) {
        url += `?userId=${userId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
      }

      const data = await response.json();
      this.contacts = data.contacts || data || [];

      // Filter out archived contacts
      this.contacts = this.contacts.filter(contact => !contact.archived_at);

      // Sort by name
      this.contacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      console.log(`[CircleListView] Loaded ${this.contacts.length} contacts`);

    } catch (error) {
      console.error('CircleListView: Error fetching contacts:', error);
      this.contacts = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Render loading state
   */
  renderLoading() {
    return `
      <div class="clv-loading">
        <div class="clv-spinner"></div>
        <p>Loading contacts...</p>
      </div>
    `;
  }

  /**
   * Render the component
   * Requirement: 5.3 - Display all contacts in a searchable grid view
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="circle-list-view">
        ${this.renderSearchSection()}
        <div class="clv-circles-container">
          ${this.circles.map(circle => this.renderCircleSection(circle)).join('')}
        </div>
        ${this.renderUncategorizedSection()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render search section
   * Requirement: 5.6 - Provide search functionality to filter contacts by name
   */
  renderSearchSection() {
    return `
      <div class="clv-search-section">
        <div class="clv-search-container">
          <span class="clv-search-icon">🔍</span>
          <input 
            type="text" 
            class="clv-search-input" 
            id="clv-search-input"
            placeholder="Search contacts to add or move..."
            aria-label="Search contacts"
            value="${this.escapeHtml(this.searchQuery)}"
          />
          <button 
            class="clv-search-clear ${this.searchQuery ? 'visible' : ''}" 
            id="clv-search-clear"
            aria-label="Clear search"
          >×</button>
          <div class="clv-search-results" id="clv-search-results"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render a circle section with contacts and AI suggestions
   * Requirement: 5.5 - Display circle capacity indicators for all four circles
   * Requirement: 5.7 - Show the current circle assignment for each contact
   */
  renderCircleSection(circle) {
    const circleContacts = this.getContactsByCircle(circle.id);
    const suggestions = this.getSuggestionsForCircle(circle.id);
    const acceptedCount = suggestions.filter(s => this.acceptedSuggestions.has(s.contactId)).length;
    const count = circleContacts.length + acceptedCount;
    const isAtCapacity = count >= circle.capacity;
    const isOverCapacity = count > circle.capacity;
    const isNearCapacity = count >= circle.capacity * 0.8 && !isAtCapacity;

    let countClass = '';
    if (isOverCapacity) {
      countClass = 'over-capacity';
    } else if (isAtCapacity) {
      countClass = 'at-capacity';
    } else if (isNearCapacity) {
      countClass = 'near-capacity';
    }

    const hasContent = circleContacts.length > 0 || suggestions.length > 0;
    
    // Generate inline capacity tip
    const capacityTip = this.renderCapacityTip(circle, count, isNearCapacity, isAtCapacity, isOverCapacity);

    return `
      <div class="clv-circle-section" data-circle="${circle.id}">
        <div class="clv-circle-header">
          <h4 class="clv-circle-title">
            <span class="clv-circle-emoji">${circle.emoji}</span>
            ${circle.name}
          </h4>
          <span class="clv-circle-count ${countClass}">${count}/${circle.capacity}</span>
        </div>
        ${capacityTip}
        <div class="clv-circle-contacts ${!hasContent ? 'empty' : ''}" id="clv-circle-${circle.id}-contacts">
          ${!hasContent 
            ? `<span class="clv-empty-message">No contacts in this circle</span>`
            : circleContacts.map(contact => this.renderContactChip(contact, circle.id)).join('') +
              suggestions.map(suggestion => this.renderSuggestionChip(suggestion, circle.id)).join('')
          }
        </div>
      </div>
    `;
  }

  /**
   * Render inline capacity tip for a circle
   * @param {Object} circle - Circle definition
   * @param {number} count - Current count
   * @param {boolean} isNearCapacity - 80%+ of capacity
   * @param {boolean} isAtCapacity - At capacity
   * @param {boolean} isOverCapacity - Over capacity
   * @returns {string} HTML for capacity tip or empty string
   */
  renderCapacityTip(circle, count, isNearCapacity, isAtCapacity, isOverCapacity) {
    if (!isNearCapacity && !isAtCapacity && !isOverCapacity) {
      return '';
    }

    let tipClass = '';
    let tipIcon = '';
    let tipMessage = '';
    const remaining = circle.capacity - count;

    if (isOverCapacity) {
      tipClass = 'clv-capacity-tip--warning';
      tipIcon = '⚠️';
      tipMessage = `Over capacity by ${Math.abs(remaining)}. Consider moving some contacts to maintain meaningful relationships.`;
    } else if (isAtCapacity) {
      tipClass = 'clv-capacity-tip--full';
      tipIcon = '✅';
      tipMessage = `${circle.name} is full! Based on Dunbar's research, this is the ideal size for this circle.`;
    } else if (isNearCapacity) {
      tipClass = 'clv-capacity-tip--approaching';
      tipIcon = '💡';
      tipMessage = `Getting closer to ${circle.capacity} — only ${remaining} spot${remaining === 1 ? '' : 's'} left. Choose wisely!`;
    }

    return `
      <div class="clv-capacity-tip ${tipClass}">
        <span class="clv-capacity-tip-icon">${tipIcon}</span>
        <span class="clv-capacity-tip-message">${tipMessage}</span>
      </div>
    `;
  }

  /**
   * Get AI suggestions for a specific circle
   * @param {string} circleId - Circle ID
   * @returns {Array} Suggestions for this circle
   */
  getSuggestionsForCircle(circleId) {
    console.log(`[CircleListView] getSuggestionsForCircle(${circleId}), aiSuggestions:`, this.aiSuggestions);
    
    if (!this.aiSuggestions || !this.aiSuggestions[circleId]) {
      console.log(`[CircleListView] No suggestions for circle ${circleId}`);
      return [];
    }
    
    // Filter out suggestions for contacts already in a circle
    const existingContactIds = new Set(this.contacts
      .filter(c => c.dunbarCircle || c.circle)
      .map(c => c.id));
    
    const filtered = this.aiSuggestions[circleId].filter(s => !existingContactIds.has(s.contactId));
    console.log(`[CircleListView] Suggestions for ${circleId}:`, filtered);
    return filtered;
  }

  /**
   * Render an AI suggestion chip with accept button
   * @param {Object} suggestion - Suggestion object {contactId, name, confidence, reasons}
   * @param {string} circleId - Target circle ID
   */
  renderSuggestionChip(suggestion, circleId) {
    const isAccepted = this.acceptedSuggestions.has(suggestion.contactId);
    const acceptedClass = isAccepted ? 'accepted' : '';
    
    return `
      <div class="clv-suggestion-chip ${acceptedClass}" 
           data-contact-id="${suggestion.contactId}" 
           data-circle="${circleId}"
           title="${suggestion.reasons ? suggestion.reasons.join(', ') : 'AI suggested'}">
        <span class="clv-suggestion-chip-name">${this.escapeHtml(suggestion.name)}</span>
        <span class="clv-ai-badge">AI</span>
        <button 
          class="clv-accept-btn" 
          data-contact-id="${suggestion.contactId}" 
          data-circle="${circleId}"
          title="Accept suggestion"
          aria-label="Accept ${this.escapeHtml(suggestion.name)} to ${circleId}"
        >✓</button>
        <button 
          class="clv-remove-btn" 
          data-contact-id="${suggestion.contactId}" 
          data-circle="${circleId}"
          title="Remove from circle"
          aria-label="Remove ${this.escapeHtml(suggestion.name)} from ${circleId}"
        >×</button>
      </div>
    `;
  }

  /**
   * Render a contact chip with remove button
   */
  renderContactChip(contact, circleId) {
    return `
      <div class="clv-contact-chip" data-contact-id="${contact.id}" data-circle="${circleId}">
        <span class="clv-contact-chip-name">${this.escapeHtml(contact.name)}</span>
        <button 
          class="clv-remove-btn" 
          data-contact-id="${contact.id}" 
          data-circle="${circleId}"
          title="Remove from circle"
          aria-label="Remove ${this.escapeHtml(contact.name)} from ${circleId}"
        >×</button>
      </div>
    `;
  }

  /**
   * Render uncategorized section
   */
  renderUncategorizedSection() {
    const uncategorizedContacts = this.getUncategorizedContacts();
    const count = uncategorizedContacts.length;

    return `
      <div class="clv-uncategorized-section">
        <div class="clv-uncategorized-header">
          <h4 class="clv-uncategorized-title">
            <span class="clv-circle-emoji">📋</span>
            Uncategorized
          </h4>
          <span class="clv-uncategorized-count">${count}</span>
        </div>
        <div class="clv-uncategorized-contacts" id="clv-uncategorized-contacts">
          ${count === 0 
            ? `<span class="clv-empty-message">All contacts are categorized! 🎉</span>`
            : uncategorizedContacts.map(contact => this.renderUncategorizedChip(contact)).join('')
          }
        </div>
      </div>
    `;
  }

  /**
   * Render an uncategorized contact chip (clickable to assign)
   */
  renderUncategorizedChip(contact) {
    return `
      <div class="clv-uncategorized-chip" data-contact-id="${contact.id}" title="Click to assign to a circle">
        <span>${this.escapeHtml(contact.name)}</span>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('clv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
      searchInput.addEventListener('focus', () => this.showSearchResults());
      searchInput.addEventListener('blur', (e) => {
        // Delay hiding to allow click on results
        setTimeout(() => this.hideSearchResults(), 200);
      });
    }

    // Clear search button
    const clearBtn = document.getElementById('clv-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSearch());
    }

    // Remove buttons on contact chips
    const removeButtons = document.querySelectorAll('.clv-contact-chip .clv-remove-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.contactId;
        this.removeFromCircle(contactId);
      });
    });

    // Accept buttons on suggestion chips
    const acceptButtons = document.querySelectorAll('.clv-accept-btn');
    acceptButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.contactId;
        const circleId = btn.dataset.circle;
        this.acceptSuggestion(contactId, circleId);
      });
    });

    // Remove buttons on accepted suggestion chips
    const suggestionRemoveButtons = document.querySelectorAll('.clv-suggestion-chip .clv-remove-btn');
    suggestionRemoveButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.contactId;
        const circleId = btn.dataset.circle;
        this.rejectSuggestion(contactId, circleId);
      });
    });

    // Uncategorized chips (click to show assignment options)
    const uncategorizedChips = document.querySelectorAll('.clv-uncategorized-chip');
    uncategorizedChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const contactId = chip.dataset.contactId;
        this.showAssignmentPopup(contactId, chip);
      });
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      const searchContainer = document.querySelector('.clv-search-container');
      if (searchContainer && !searchContainer.contains(e.target)) {
        this.hideSearchResults();
      }
    });
  }

  /**
   * Accept an AI suggestion - assign contact to circle
   * @param {string} contactId - Contact ID
   * @param {string} circleId - Target circle ID
   */
  async acceptSuggestion(contactId, circleId) {
    // Mark as accepted locally
    this.acceptedSuggestions.add(contactId);
    
    // Update UI immediately
    const chip = document.querySelector(`.clv-suggestion-chip[data-contact-id="${contactId}"]`);
    if (chip) {
      chip.classList.add('accepted');
    }
    
    // Update count display
    this.updateCircleCount(circleId);
    
    // Call API to actually assign the contact
    try {
      await this.moveContact(contactId, circleId);
      
      // Notify callback
      this.onSuggestionAccept(contactId, circleId);
      
      // Show success toast
      if (typeof showToast === 'function') {
        const suggestion = this.findSuggestion(contactId);
        const circleName = this.getCircleName(circleId);
        showToast(`${suggestion?.name || 'Contact'} added to ${circleName}`, 'success');
      }
    } catch (error) {
      // Revert on error
      this.acceptedSuggestions.delete(contactId);
      if (chip) {
        chip.classList.remove('accepted');
      }
      this.updateCircleCount(circleId);
      
      if (typeof showToast === 'function') {
        showToast(`Failed to add contact: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Reject/remove an accepted suggestion
   * @param {string} contactId - Contact ID
   * @param {string} circleId - Circle ID
   */
  async rejectSuggestion(contactId, circleId) {
    // Remove from accepted set
    this.acceptedSuggestions.delete(contactId);
    
    // Call API to remove from circle
    try {
      await this.removeFromCircle(contactId);
      
      // Re-render to show as suggestion again
      this.render();
    } catch (error) {
      // Re-add on error
      this.acceptedSuggestions.add(contactId);
      
      if (typeof showToast === 'function') {
        showToast(`Failed to remove contact: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Find a suggestion by contact ID
   * @param {string} contactId - Contact ID
   * @returns {Object|null} Suggestion object or null
   */
  findSuggestion(contactId) {
    for (const circleId of ['inner', 'close', 'active']) {
      const suggestions = this.aiSuggestions[circleId] || [];
      const found = suggestions.find(s => s.contactId === contactId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Update circle count display
   * @param {string} circleId - Circle ID
   */
  updateCircleCount(circleId) {
    const circle = this.circles.find(c => c.id === circleId);
    if (!circle) return;
    
    const circleContacts = this.getContactsByCircle(circleId);
    const suggestions = this.getSuggestionsForCircle(circleId);
    const acceptedCount = suggestions.filter(s => this.acceptedSuggestions.has(s.contactId)).length;
    const count = circleContacts.length + acceptedCount;
    
    const countEl = document.querySelector(`.clv-circle-section[data-circle="${circleId}"] .clv-circle-count`);
    if (countEl) {
      countEl.textContent = `${count}/${circle.capacity}`;
      countEl.classList.toggle('at-capacity', count >= circle.capacity);
      countEl.classList.toggle('over-capacity', count > circle.capacity);
    }
  }

  /**
   * Handle search input with debounce
   * Requirement: 5.6 - Provide search functionality to filter contacts by name
   */
  handleSearchInput(query) {
    // Update clear button visibility
    const clearBtn = document.getElementById('clv-search-clear');
    if (clearBtn) {
      clearBtn.classList.toggle('visible', query.length > 0);
    }

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer with 300ms debounce
    this.debounceTimer = setTimeout(() => {
      this.searchQuery = query;
      this.renderSearchResults();
    }, 300);
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    const searchInput = document.getElementById('clv-search-input');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    const clearBtn = document.getElementById('clv-search-clear');
    if (clearBtn) {
      clearBtn.classList.remove('visible');
    }
    this.hideSearchResults();
  }

  /**
   * Focus search for a specific circle
   */
  focusSearchForCircle(circleId) {
    const searchInput = document.getElementById('clv-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.placeholder = `Search contacts to add to ${this.getCircleName(circleId)}...`;
    }
  }

  /**
   * Show search results dropdown
   */
  showSearchResults() {
    if (this.searchQuery) {
      this.renderSearchResults();
    }
  }

  /**
   * Hide search results dropdown
   */
  hideSearchResults() {
    const resultsContainer = document.getElementById('clv-search-results');
    if (resultsContainer) {
      resultsContainer.classList.remove('visible');
    }
  }

  /**
   * Render search results with quick-assign buttons
   * Requirement: 5.6 - Provide search functionality to filter contacts by name
   */
  renderSearchResults() {
    const resultsContainer = document.getElementById('clv-search-results');
    if (!resultsContainer) return;

    if (!this.searchQuery.trim()) {
      resultsContainer.classList.remove('visible');
      return;
    }

    const filteredContacts = this.filterContactsBySearch();
    
    console.log(`[CircleListView] Search query: "${this.searchQuery}", found ${filteredContacts.length} contacts`);

    if (filteredContacts.length === 0) {
      resultsContainer.innerHTML = `
        <div class="clv-search-result-item" style="justify-content: center; cursor: default;">
          <span style="color: var(--text-secondary);">No contacts found matching "${this.escapeHtml(this.searchQuery)}"</span>
        </div>
      `;
      resultsContainer.classList.add('visible');
      return;
    }

    resultsContainer.innerHTML = filteredContacts.slice(0, 10).map(contact => {
      const currentCircle = this.getContactCircle(contact);
      const circleDisplay = currentCircle ? this.getCircleName(currentCircle) : 'Uncategorized';
      const isInCircle = !!currentCircle;

      return `
        <div class="clv-search-result-item" data-contact-id="${contact.id}">
          <div class="clv-search-result-avatar">${this.getInitials(contact.name)}</div>
          <div class="clv-search-result-info">
            <div class="clv-search-result-name">${this.escapeHtml(contact.name)}</div>
            <div class="clv-search-result-circle ${isInCircle ? 'in-circle' : ''}">${circleDisplay}</div>
          </div>
          <div class="clv-quick-assign-buttons">
            ${this.circles.map(circle => `
              <button 
                class="clv-quick-assign-btn ${currentCircle === circle.id ? 'active' : ''}" 
                data-circle="${circle.id}" 
                data-contact-id="${contact.id}"
                title="${circle.name}"
              >${circle.emoji}</button>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    resultsContainer.classList.add('visible');

    // Attach click handlers to quick-assign buttons
    this.attachQuickAssignListeners();
  }

  /**
   * Attach listeners to quick-assign buttons in search results
   */
  attachQuickAssignListeners() {
    const quickAssignBtns = document.querySelectorAll('.clv-quick-assign-btn');
    quickAssignBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.contactId;
        const circleId = btn.dataset.circle;
        this.moveContact(contactId, circleId);
      });
    });
  }

  /**
   * Show assignment popup for uncategorized contact
   */
  showAssignmentPopup(contactId, chipElement) {
    // Remove any existing popup
    const existingPopup = document.querySelector('.clv-assignment-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'clv-assignment-popup';
    popup.innerHTML = `
      <div class="clv-assignment-popup-content">
        <div class="clv-assignment-popup-header">
          Assign ${this.escapeHtml(contact.name)} to:
        </div>
        <div class="clv-assignment-popup-buttons">
          ${this.circles.map(circle => `
            <button 
              class="clv-assignment-popup-btn" 
              data-circle="${circle.id}" 
              data-contact-id="${contactId}"
              style="border-color: ${circle.color}; color: ${circle.color};"
            >
              ${circle.emoji} ${circle.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Add popup styles if not present
    this.injectPopupStyles();

    // Position popup near the chip
    document.body.appendChild(popup);
    const chipRect = chipElement.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.top = `${chipRect.bottom + 8}px`;
    popup.style.left = `${Math.max(10, chipRect.left - 50)}px`;
    popup.style.zIndex = '1000';

    // Attach click handlers
    const buttons = popup.querySelectorAll('.clv-assignment-popup-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const circleId = btn.dataset.circle;
        this.moveContact(contactId, circleId);
        popup.remove();
      });
    });

    // Close popup when clicking outside
    const closeHandler = (e) => {
      if (!popup.contains(e.target) && e.target !== chipElement) {
        popup.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  /**
   * Inject popup styles
   */
  injectPopupStyles() {
    const styleId = 'clv-popup-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .clv-assignment-popup {
        animation: clvSlideDown 0.2s ease-out;
      }

      .clv-assignment-popup-content {
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
        padding: 12px;
        min-width: 200px;
      }

      .clv-assignment-popup-header {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }

      .clv-assignment-popup-buttons {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .clv-assignment-popup-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: transparent;
        border: 1px solid;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
        min-height: 44px;
      }

      .clv-assignment-popup-btn:hover {
        background: var(--bg-hover, #f9fafb);
        transform: translateX(4px);
      }

      [data-theme="dark"] .clv-assignment-popup-content {
        background: var(--bg-surface, #1c1917);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Move contact to a different circle
   * Requirement: 5.4 - Allow users to assign contacts to circles
   */
  async moveContact(contactId, targetCircle) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    try {
      // Call API to update circle
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/contacts/${contactId}/circle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ userId, circle: targetCircle })
      });

      if (!response.ok) {
        throw new Error(`Failed to update circle: ${response.statusText}`);
      }

      // Update local state
      contact.dunbarCircle = targetCircle;
      contact.circle = targetCircle;

      // Notify callback
      this.onContactMove(contactId, targetCircle);

      // Re-render
      this.render();

      // Show success toast
      if (typeof showToast === 'function') {
        const circleName = this.getCircleName(targetCircle);
        showToast(`${contact.name} moved to ${circleName}`, 'success');
      }

    } catch (error) {
      console.error('CircleListView: Error moving contact:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to move contact: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Remove contact from circle (set to uncategorized)
   */
  async removeFromCircle(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;

    try {
      // Call API to remove circle assignment
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/contacts/${contactId}/circle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ userId, circle: null })
      });

      if (!response.ok) {
        throw new Error(`Failed to remove from circle: ${response.statusText}`);
      }

      // Update local state
      contact.dunbarCircle = null;
      contact.circle = null;

      // Notify callback
      this.onContactRemove(contactId);

      // Re-render
      this.render();

      // Show success toast
      if (typeof showToast === 'function') {
        showToast(`${contact.name} removed from circle`, 'info');
      }

    } catch (error) {
      console.error('CircleListView: Error removing contact from circle:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to remove contact: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Refresh the view by re-fetching contacts
   */
  async refresh() {
    await this.fetchContacts();
    this.render();
  }

  /**
   * Get contacts by circle
   */
  getContactsByCircle(circleId) {
    return this.contacts.filter(contact => {
      const circle = (contact.dunbarCircle || contact.circle || '').toLowerCase();
      return circle === circleId.toLowerCase();
    });
  }

  /**
   * Get uncategorized contacts
   */
  getUncategorizedContacts() {
    return this.contacts.filter(contact => {
      const circle = contact.dunbarCircle || contact.circle;
      return !circle || circle === '' || circle === 'none';
    });
  }

  /**
   * Get uncategorized count
   */
  getUncategorizedCount() {
    return this.getUncategorizedContacts().length;
  }

  /**
   * Get contact's current circle
   */
  getContactCircle(contact) {
    return contact.dunbarCircle || contact.circle || null;
  }

  /**
   * Filter contacts by search query
   */
  filterContactsBySearch() {
    if (!this.searchQuery.trim()) {
      return this.contacts;
    }

    const query = this.searchQuery.toLowerCase().trim();
    return this.contacts.filter(contact => {
      const name = (contact.name || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }

  /**
   * Get circle name by ID
   */
  getCircleName(circleId) {
    if (!circleId) return 'Uncategorized';
    const circle = this.circles.find(c => c.id.toLowerCase() === circleId.toLowerCase());
    return circle ? circle.name : circleId;
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

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * Set contacts data directly (for testing or external data)
   */
  setContacts(contacts) {
    this.contacts = contacts || [];
    this.render();
  }

  /**
   * Get current contacts data
   */
  getContacts() {
    return this.contacts;
  }

  /**
   * Get circle counts for all circles
   */
  getCircleCounts() {
    const counts = {};
    this.circles.forEach(circle => {
      counts[circle.id] = this.getContactsByCircle(circle.id).length;
    });
    counts.uncategorized = this.getUncategorizedCount();
    return counts;
  }

  /**
   * Clean up the component
   */
  destroy() {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Remove popup if exists
    const popup = document.querySelector('.clv-assignment-popup');
    if (popup) {
      popup.remove();
    }

    // Clear container
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }

    // Clear state
    this.contacts = [];
    this.searchQuery = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CircleListView;
}
