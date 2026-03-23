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
    this.aiSuggestions = options.aiSuggestions || { inner: [], close: [], active: [], casual: [] };
    this.acceptedSuggestions = new Set(); // Track accepted suggestion IDs
    
    // Groups context support (Task 7.1, Requirement 6.1)
    this.context = options.context || 'circles';
    this.groups = options.groups || [];
    this.groupSuggestions = options.groupSuggestions || {}; // { contactId: [{ groupId, groupName, confidence, signals }] }
    this.acceptedGroupSuggestions = new Set(); // Track accepted group suggestion keys "contactId:groupId"
    
    // Keyboard shortcuts mapping: { groupId: shortcutNumber } for showing shortcut numbers in search
    this.keyboardShortcuts = options.keyboardShortcuts || {};
    
    // Debug logging
    console.log('[CircleListView] Initialized with context:', this.context, 'aiSuggestions:', this.aiSuggestions);
    
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
      }

      /* Search Section — rendered in sticky header, not inside scrollable content */
      .clv-search-section {
        position: relative;
        background: var(--bg-surface, #ffffff);
        z-index: 10;
        padding: 8px 0 0 0;
      }

      /* Blur overlay when search is active — targets the scrollable content area */
      .manage-circles__scrollable-content.clv-search-active {
        position: relative;
      }
      .manage-circles__scrollable-content.clv-search-active > * {
        filter: blur(3px);
        opacity: 0.4;
        pointer-events: none;
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
        max-height: 350px;
        overflow-y: auto;
        z-index: 50;
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

      /* Group quick-assign buttons in search results */
      .clv-quick-assign-btn[data-group-id] {
        background: #eef2ff;
        font-size: 10px;
        font-weight: 600;
        color: #4338ca;
        min-width: 28px;
        width: auto;
        padding: 0 4px;
      }
      .clv-quick-assign-btn[data-group-id]:hover {
        background: #6366f1;
        color: white;
      }
      .clv-quick-assign-btn[data-group-id].active {
        background: #6366f1;
        color: white;
        box-shadow: 0 0 0 2px #6366f1;
      }
      .clv-quick-assign-groups {
        flex-wrap: wrap;
        gap: 3px;
      }
      .clv-more-groups {
        display: flex;
        align-items: center;
        font-size: 11px;
        color: var(--text-secondary, #6b7280);
        padding: 0 4px;
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

      /* Keyboard shortcut badge for group headers */
      .clv-group-shortcut-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        font-size: 0.6875rem;
        font-weight: 700;
        min-width: 20px;
        padding: 1px 5px;
        border-radius: 4px;
        border: 1.5px solid var(--accent-primary, #6366f1);
        color: var(--accent-primary, #6366f1);
        background: var(--bg-surface, #ffffff);
        line-height: 1.2;
      }

      /* Generate AI Button */
      .clv-generate-ai-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        margin-left: 12px;
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        border: none;
        border-radius: 16px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);
      }

      .clv-generate-ai-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
      }

      .clv-generate-ai-btn:active {
        transform: translateY(0);
      }

      .clv-generate-ai-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .clv-generate-ai-icon {
        font-size: 14px;
        animation: clvSparkle 2s ease-in-out infinite;
      }

      @keyframes clvSparkle {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }

      .clv-generate-ai-btn:hover .clv-generate-ai-icon {
        animation: clvSparkle 0.5s ease-in-out infinite;
      }

      .clv-generate-ai-text {
        white-space: nowrap;
      }

      /* Hide text on smaller screens */
      @media (max-width: 767px) {
        .clv-generate-ai-text {
          display: none;
        }
        
        .clv-generate-ai-btn {
          padding: 6px 10px;
        }
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

    // Fetch group suggestions when in groups context (Task 7.2)
    if (this.context === 'groups') {
      await this.fetchGroupSuggestions();
    }

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
   * Requirement: 6.2, 6.3 - Branch on context for circles vs groups rendering (Task 7.3)
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Render search section into sticky header area (below education tip)
    const stickyExtras = document.getElementById('sticky-extras-container');
    if (stickyExtras) {
      // Preserve existing education tip, append search after it
      let existingTip = stickyExtras.querySelector('.education-tip');
      const searchHtml = this.renderSearchSection();
      if (existingTip) {
        // Remove any previous search section
        const oldSearch = stickyExtras.querySelector('.clv-search-section');
        if (oldSearch) oldSearch.remove();
        existingTip.insertAdjacentHTML('afterend', searchHtml);
      } else {
        stickyExtras.innerHTML += searchHtml;
      }
    }

    if (this.context === 'groups') {
      // Groups context: render group sections + ungrouped section (Task 7.3)
      container.innerHTML = `
        <div class="circle-list-view">
          <div class="clv-circles-container">
            ${this.groups.map(group => this.renderGroupSection(group)).join('')}
          </div>
          ${this.renderUngroupedSection()}
        </div>
      `;
    } else {
      // Circles context: existing behavior unchanged
      container.innerHTML = `
        <div class="circle-list-view">
          <div class="clv-circles-container">
            ${this.circles.map(circle => this.renderCircleSection(circle)).join('')}
          </div>
          ${this.renderUncategorizedSection()}
        </div>
      `;
    }

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

    // Only show generate button for all circles (including casual)
    const showGenerateButton = ['inner', 'close', 'active', 'casual'].includes(circle.id);

    return `
      <div class="clv-circle-section" data-circle="${circle.id}">
        <div class="clv-circle-header">
          <h4 class="clv-circle-title">
            <span class="clv-circle-emoji">${circle.emoji}</span>
            ${circle.name}
            ${showGenerateButton ? `
              <button 
                class="clv-generate-ai-btn" 
                id="clv-generate-ai-${circle.id}"
                data-circle="${circle.id}"
                title="Generate AI suggestions for this circle"
                aria-label="Generate AI suggestions"
              >
                <span class="clv-generate-ai-icon">✨</span>
                <span class="clv-generate-ai-text">Generate AI Suggestions</span>
              </button>
            ` : ''}
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

    // Generate AI buttons
    const generateButtons = document.querySelectorAll('.clv-generate-ai-btn');
    generateButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const circleId = btn.dataset.circle;
        this.generateAISuggestions(circleId);
      });
    });

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

    // Groups context event listeners (Task 7.2, 7.5, 7.6)
    if (this.context === 'groups') {
      // Accept buttons on group suggestion chips
      const groupAcceptBtns = document.querySelectorAll('.clv-group-accept-btn');
      groupAcceptBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const contactId = btn.dataset.contactId;
          const groupId = btn.dataset.group;
          this.acceptGroupSuggestion(contactId, groupId);
        });
      });

      // Reject buttons on group suggestion chips
      const groupRejectBtns = document.querySelectorAll('.clv-group-reject-btn');
      groupRejectBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const contactId = btn.dataset.contactId;
          const groupId = btn.dataset.group;
          this.rejectGroupSuggestion(contactId, groupId);
        });
      });

      // Remove buttons on group contact chips
      const groupRemoveBtns = document.querySelectorAll('.clv-group-remove-btn');
      groupRemoveBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const contactId = btn.dataset.contactId;
          const groupId = btn.dataset.group;
          this.onContactRemove(contactId, groupId);
        });
      });

      // Generate AI Suggestions buttons for groups
      const groupGenerateBtns = document.querySelectorAll('.clv-generate-ai-btn[data-group]');
      groupGenerateBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const groupId = btn.dataset.group;
          this.generateGroupAISuggestions(groupId);
        });
      });
    }

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
   * Requirement: 6.8 - Filter across group sections in groups context (Task 7.7)
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

      if (this.context === 'groups') {
        // Groups context: filter contacts across all group sections (Task 7.7)
        this.filterGroupSections();
      } else {
        // Circles context: existing search results dropdown behavior
        this.renderSearchResults();
        // Toggle blur on scrollable content
        const scrollable = document.querySelector('.manage-circles__scrollable-content');
        if (scrollable) {
          if (query) {
            scrollable.classList.add('clv-search-active');
          } else {
            scrollable.classList.remove('clv-search-active');
          }
        }
      }
    }, 300);
  }

  /**
   * Filter contacts across all group sections in groups context (Task 7.7)
   * Shows only matching contacts, hides non-matching ones.
   */
  filterGroupSections() {
    const query = (this.searchQuery || '').toLowerCase().trim();

    // Filter within each group section
    this.groups.forEach(group => {
      const contactsContainer = document.getElementById(`clv-group-${group.id}-contacts`);
      if (!contactsContainer) return;

      const chips = contactsContainer.querySelectorAll('.clv-contact-chip, .clv-suggestion-chip');
      chips.forEach(chip => {
        const contactId = chip.dataset.contactId;
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
          chip.style.display = query ? 'none' : '';
          return;
        }

        const name = (contact.name || '').toLowerCase();
        const email = (contact.email || '').toLowerCase();
        const matches = !query || name.includes(query) || email.includes(query);
        chip.style.display = matches ? '' : 'none';
      });
    });

    // Filter ungrouped section
    const ungroupedContainer = document.getElementById('clv-ungrouped-contacts');
    if (ungroupedContainer) {
      const chips = ungroupedContainer.querySelectorAll('.clv-uncategorized-chip');
      chips.forEach(chip => {
        const contactId = chip.dataset.contactId;
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
          chip.style.display = query ? 'none' : '';
          return;
        }

        const name = (contact.name || '').toLowerCase();
        const email = (contact.email || '').toLowerCase();
        const matches = !query || name.includes(query) || email.includes(query);
        chip.style.display = matches ? '' : 'none';
      });
    }

    // Show search results dropdown with assignable contacts (like circles mode)
    this.renderGroupSearchResults();
    
    // Toggle blur effect based on whether search is active
    const scrollable = document.querySelector('.manage-circles__scrollable-content');
    if (scrollable) {
      if (query) {
        scrollable.classList.add('clv-search-active');
      } else {
        scrollable.classList.remove('clv-search-active');
      }
    }
  }

  /**
   * Render search results dropdown for groups context with quick-assign group buttons.
   * Shows matching contacts (including ungrouped) with buttons to assign to any group.
   */
  renderGroupSearchResults() {
    let resultsContainer = document.getElementById('clv-search-results');
    if (!resultsContainer) return;

    const query = (this.searchQuery || '').toLowerCase().trim();
    if (!query) {
      resultsContainer.classList.remove('visible');
      return;
    }

    // Find all matching contacts
    const matchingContacts = this.contacts.filter(c => {
      if (c.archived_at) return false;
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });

    if (matchingContacts.length === 0) {
      resultsContainer.innerHTML = `
        <div class="clv-search-result-item" style="justify-content: center; cursor: default;">
          <span style="color: var(--text-secondary);">No contacts found matching "${this.escapeHtml(query)}"</span>
        </div>
      `;
      resultsContainer.classList.add('visible');
      return;
    }

    resultsContainer.innerHTML = matchingContacts.slice(0, 10).map(contact => {
      const contactGroups = (contact.groups || []).map(g => {
        const group = this.groups.find(gr => gr.id === (g.id || g));
        return group ? group.name : '';
      }).filter(Boolean);
      const groupDisplay = contactGroups.length > 0 ? contactGroups.join(', ') : 'Ungrouped';

      return `
        <div class="clv-search-result-item" data-contact-id="${contact.id}">
          <div class="clv-search-result-avatar">${this.getInitials(contact.name)}</div>
          <div class="clv-search-result-info">
            <div class="clv-search-result-name">${this.escapeHtml(contact.name)}</div>
            <div class="clv-search-result-circle ${contactGroups.length > 0 ? 'in-circle' : ''}">${this.escapeHtml(groupDisplay)}</div>
          </div>
          <div class="clv-quick-assign-buttons clv-quick-assign-groups">
            ${this.groups.filter(group => {
              // Only show groups that have keyboard shortcuts assigned (0-9)
              const shortcutNum = this.keyboardShortcuts[group.id];
              return shortcutNum !== undefined && shortcutNum !== '';
            }).map(group => {
              const isInGroup = (contact.groups || []).some(g => (g.id || g) === group.id);
              const shortcutNum = this.keyboardShortcuts[group.id];
              return `
                <button 
                  class="clv-quick-assign-btn ${isInGroup ? 'active' : ''}" 
                  data-group-id="${group.id}" 
                  data-contact-id="${contact.id}"
                  title="${this.escapeHtml(group.name)}"
                >${shortcutNum}</button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    resultsContainer.classList.add('visible');

    // Attach click handlers to group quick-assign buttons
    const groupAssignBtns = resultsContainer.querySelectorAll('.clv-quick-assign-btn[data-group-id]');
    groupAssignBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.contactId;
        const groupId = btn.dataset.groupId;
        if (btn.classList.contains('active')) {
          // Already in group — remove
          await this.rejectGroupSuggestion(contactId, groupId);
          btn.classList.remove('active');
        } else {
          // Add to group
          await this.acceptGroupSuggestion(contactId, groupId);
          btn.classList.add('active');
        }
      });
    });
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
    
    // Also un-filter group sections when clearing search
    if (this.context === 'groups') {
      this.filterGroupSections();
    }
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
      const scrollable = document.querySelector('.manage-circles__scrollable-content');
      if (scrollable) scrollable.classList.add('clv-search-active');
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
    const scrollable = document.querySelector('.manage-circles__scrollable-content');
    if (scrollable) scrollable.classList.remove('clv-search-active');
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
   * Generate AI suggestions for a specific circle
   * @param {string} circleId - Circle ID to generate suggestions for
   */
  async generateAISuggestions(circleId) {
    const btn = document.getElementById(`clv-generate-ai-${circleId}`);
    if (!btn) return;

    // Disable button and show loading state
    btn.disabled = true;
    const originalText = btn.querySelector('.clv-generate-ai-text')?.textContent || 'Generate AI Suggestions';
    const textElement = btn.querySelector('.clv-generate-ai-text');
    if (textElement) {
      textElement.textContent = 'Generating...';
    }

    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');

      if (!userId || !authToken) {
        throw new Error('Not authenticated');
      }

      console.log(`[CircleListView] Generating AI suggestions for ${circleId}`);

      // Call the API to get suggestions
      const response = await fetch(`/api/ai/circle-suggestions?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to generate suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[CircleListView] Generated suggestions:', data);

      // Update aiSuggestions with new data
      if (data.suggestions) {
        this.aiSuggestions = data.suggestions;
        
        // Re-render to show new suggestions
        this.render();

        // Show success message
        const newSuggestions = this.aiSuggestions[circleId]?.length || 0;
        if (newSuggestions > 0) {
          if (typeof showToast === 'function') {
            showToast(`✨ Generated ${newSuggestions} AI suggestion${newSuggestions === 1 ? '' : 's'} for ${this.getCircleName(circleId)}`, 'success');
          }
        } else {
          if (typeof showToast === 'function') {
            showToast(`No new suggestions found for ${this.getCircleName(circleId)}. Try adding more contact details or calendar events.`, 'info');
          }
        }
      }

    } catch (error) {
      console.error('[CircleListView] Error generating AI suggestions:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to generate suggestions: ${error.message}`, 'error');
      }
    } finally {
      // Re-enable button
      if (btn) {
        btn.disabled = false;
        if (textElement) {
          textElement.textContent = originalText;
        }
      }
    }
  }

  // ============================================================================
  // GROUPS CONTEXT METHODS (Task 7.2, 7.4, 7.5, 7.6)
  // Requirement 6: Groups Support in List Mode
  // ============================================================================

  /**
   * Get contacts belonging to a specific group (Task 7.4)
   * Contacts can belong to multiple groups simultaneously.
   * @param {string} groupId - Group ID
   * @returns {Array} Contacts in this group
   */
  getContactsByGroup(groupId) {
    return this.contacts.filter(contact => {
      const groups = contact.groups || [];
      return groups.some(g => (g.id || g) === groupId);
    });
  }

  /**
   * Get contacts not in any group (Task 7.3)
   * @returns {Array} Ungrouped contacts
   */
  getUngroupedContacts() {
    return this.contacts.filter(contact => {
      const groups = contact.groups || [];
      return groups.length === 0;
    });
  }

  /**
   * Get AI group suggestions for a specific group
   * @param {string} groupId - Group ID
   * @returns {Array} Suggestions for this group
   */
  getGroupSuggestionsForGroup(groupId) {
    if (!this.groupSuggestions) return [];

    const suggestions = [];
    // groupSuggestions is keyed by contactId: [{ groupId, groupName, confidence, signals }]
    for (const [contactId, contactSuggestions] of Object.entries(this.groupSuggestions)) {
      if (!Array.isArray(contactSuggestions)) continue;
      for (const suggestion of contactSuggestions) {
        if (suggestion.groupId === groupId) {
          // Don't show suggestions for contacts already in this group
          const contact = this.contacts.find(c => c.id === contactId);
          const alreadyInGroup = contact && (contact.groups || []).some(g => (g.id || g) === groupId);
          if (!alreadyInGroup && !this.acceptedGroupSuggestions.has(`${contactId}:${groupId}`)) {
            suggestions.push({
              contactId,
              name: contact ? contact.name : 'Unknown',
              groupId: suggestion.groupId,
              groupName: suggestion.groupName,
              confidence: suggestion.confidence,
              signals: suggestion.signals
            });
          }
        }
      }
    }
    return suggestions;
  }

  /**
   * Render a group section with contacts and AI suggestion pills (Task 7.2)
   * Follows the same pattern as renderCircleSection() but for groups.
   * Requirement: 6.3, 6.4, 6.5
   * @param {Object} group - Group object { id, name, color? }
   * @returns {string} HTML for the group section
   */
  renderGroupSection(group) {
    const groupContacts = this.getContactsByGroup(group.id);
    const suggestions = this.getGroupSuggestionsForGroup(group.id);
    const count = groupContacts.length;
    const hasContent = count > 0 || suggestions.length > 0;
    const groupColor = group.color || '#6366f1';
    const shortcutNum = this.keyboardShortcuts[group.id];
    const shortcutBadge = shortcutNum !== undefined && shortcutNum !== ''
      ? `<span class="clv-group-shortcut-badge">${shortcutNum}</span>`
      : '';

    return `
      <div class="clv-circle-section" data-group="${group.id}">
        <div class="clv-circle-header">
          <h4 class="clv-circle-title">
            <span class="clv-circle-emoji">👥</span>
            ${this.escapeHtml(group.name)}
            ${shortcutBadge}
            <button 
              class="clv-generate-ai-btn" 
              id="clv-generate-ai-group-${group.id}"
              data-group="${group.id}"
              title="Generate AI suggestions for this group"
              aria-label="Generate AI suggestions"
            >
              <span class="clv-generate-ai-icon">✨</span>
              <span class="clv-generate-ai-text">Generate AI Suggestions</span>
            </button>
          </h4>
          <span class="clv-circle-count">${count}</span>
        </div>
        <div class="clv-circle-contacts ${!hasContent ? 'empty' : ''}" id="clv-group-${group.id}-contacts">
          ${!hasContent
            ? `<span class="clv-empty-message">No contacts in this group</span>`
            : groupContacts.map(contact => this.renderGroupContactChip(contact, group.id)).join('') +
              suggestions.map(suggestion => this.renderGroupSuggestionChip(suggestion, group.id)).join('')
          }
        </div>
      </div>
    `;
  }

  /**
   * Render a contact chip within a group section (Task 7.4)
   * @param {Object} contact - Contact object
   * @param {string} groupId - Group ID
   * @returns {string} HTML for the contact chip
   */
  renderGroupContactChip(contact, groupId) {
    return `
      <div class="clv-contact-chip" data-contact-id="${contact.id}" data-group="${groupId}">
        <span class="clv-contact-chip-name">${this.escapeHtml(contact.name)}</span>
        <button
          class="clv-remove-btn clv-group-remove-btn"
          data-contact-id="${contact.id}"
          data-group="${groupId}"
          title="Remove from group"
          aria-label="Remove ${this.escapeHtml(contact.name)} from group"
        >×</button>
      </div>
    `;
  }

  /**
   * Render an AI suggestion pill for a group (Task 7.2)
   * Requirement: 6.5 - Display AI suggestion pills with confidence badge
   * @param {Object} suggestion - { contactId, name, groupId, groupName, confidence }
   * @param {string} groupId - Target group ID
   * @returns {string} HTML for the suggestion pill
   */
  renderGroupSuggestionChip(suggestion, groupId) {
    return `
      <div class="clv-suggestion-chip"
           data-contact-id="${suggestion.contactId}"
           data-group="${groupId}"
           title="AI suggested">
        <span class="clv-suggestion-chip-name">${this.escapeHtml(suggestion.name)}</span>
        <span class="clv-ai-badge">AI</span>
        <button
          class="clv-accept-btn clv-group-accept-btn"
          data-contact-id="${suggestion.contactId}"
          data-group="${groupId}"
          title="Accept suggestion"
          aria-label="Accept ${this.escapeHtml(suggestion.name)} to group"
        >✓</button>
        <button
          class="clv-remove-btn clv-group-reject-btn"
          data-contact-id="${suggestion.contactId}"
          data-group="${groupId}"
          title="Reject suggestion"
          aria-label="Reject ${this.escapeHtml(suggestion.name)} suggestion"
        >×</button>
      </div>
    `;
  }

  /**
   * Render the ungrouped section for groups context (Task 7.3)
   * Shows contacts not in any group.
   * @returns {string} HTML for the ungrouped section
   */
  renderUngroupedSection() {
    const ungroupedContacts = this.getUngroupedContacts();
    const count = ungroupedContacts.length;

    return `
      <div class="clv-uncategorized-section">
        <div class="clv-uncategorized-header">
          <h4 class="clv-uncategorized-title">
            <span class="clv-circle-emoji">📋</span>
            Ungrouped
          </h4>
          <span class="clv-uncategorized-count">${count}</span>
        </div>
        <div class="clv-uncategorized-contacts" id="clv-ungrouped-contacts">
          ${count === 0
            ? `<span class="clv-empty-message">All contacts are in groups! 🎉</span>`
            : ungroupedContacts.map(contact => this.renderUncategorizedChip(contact)).join('')
          }
        </div>
      </div>
    `;
  }

  /**
   * Accept a group AI suggestion (Task 7.5)
   * POST to /api/contacts/:id/groups/:groupId, record accepted feedback,
   * move contact chip into group section with optimistic update.
   * Requirement: 6.6, 11.1
   * @param {string} contactId - Contact ID
   * @param {string} groupId - Target group ID
   */
  async acceptGroupSuggestion(contactId, groupId) {
    const key = `${contactId}:${groupId}`;

    // Optimistic UI update: remove suggestion pill
    const suggestionChip = document.querySelector(`.clv-suggestion-chip[data-contact-id="${contactId}"][data-group="${groupId}"]`);
    if (suggestionChip) {
      suggestionChip.remove();
    }

    // Track acceptance
    this.acceptedGroupSuggestions.add(key);

    // Update local contact data to include the group
    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      if (!contact.groups) contact.groups = [];
      const group = this.groups.find(g => g.id === groupId);
      if (group && !contact.groups.some(g => (g.id || g) === groupId)) {
        contact.groups.push({ id: groupId, name: group.name });
      }
    }

    try {
      const authToken = localStorage.getItem('authToken');

      // POST to assign contact to group
      const assignResponse = await fetch(`/api/contacts/${contactId}/groups/${groupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!assignResponse.ok) {
        throw new Error('Failed to assign contact to group');
      }

      // Record accepted feedback
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      await fetch('/api/contacts/batch-group-suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactId,
          groupId,
          feedback: 'accepted',
          userId
        })
      }).catch(err => console.warn('[CircleListView] Failed to record feedback:', err));

      // Notify callback
      this.onSuggestionAccept(contactId, groupId);

      // Re-render to show contact in group section
      this.render();

      if (typeof showToast === 'function') {
        const contactName = contact ? contact.name : 'Contact';
        const groupName = this.groups.find(g => g.id === groupId)?.name || 'group';
        showToast(`${contactName} added to ${groupName}`, 'success');
      }

    } catch (error) {
      console.error('[CircleListView] Error accepting group suggestion:', error);

      // Revert optimistic update
      this.acceptedGroupSuggestions.delete(key);
      if (contact) {
        contact.groups = (contact.groups || []).filter(g => (g.id || g) !== groupId);
      }
      this.render();

      if (typeof showToast === 'function') {
        showToast('Failed to save group assignment', 'error', {
          action: { label: 'Retry', callback: () => this.acceptGroupSuggestion(contactId, groupId) }
        });
      }
    }
  }

  /**
   * Reject a group AI suggestion (Task 7.6)
   * POST rejection to feedback API, remove suggestion pill from UI.
   * Requirement: 6.7
   * @param {string} contactId - Contact ID
   * @param {string} groupId - Group ID
   */
  async rejectGroupSuggestion(contactId, groupId) {
    // Optimistic UI update: remove suggestion pill
    const suggestionChip = document.querySelector(`.clv-suggestion-chip[data-contact-id="${contactId}"][data-group="${groupId}"]`);
    if (suggestionChip) {
      suggestionChip.style.opacity = '0';
      suggestionChip.style.transform = 'scale(0.8)';
      setTimeout(() => suggestionChip.remove(), 200);
    }

    // Remove from local groupSuggestions
    if (this.groupSuggestions[contactId]) {
      this.groupSuggestions[contactId] = this.groupSuggestions[contactId].filter(
        s => s.groupId !== groupId
      );
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const userId = this.userId || window.userId || localStorage.getItem('userId');

      // Record rejection feedback
      await fetch('/api/contacts/batch-group-suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactId,
          groupId,
          feedback: 'rejected',
          userId
        })
      });

    } catch (error) {
      console.error('[CircleListView] Error rejecting group suggestion:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to record rejection', 'error');
      }
    }
  }

  /**
   * Fetch group AI suggestions for all contacts (Task 7.2)
   * Called during mount() when in groups context.
   */
  async fetchGroupSuggestions() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');

      if (!authToken || !userId) return;

      // Get ungrouped contact IDs to fetch suggestions for
      const ungroupedContacts = this.getUngroupedContacts();
      if (ungroupedContacts.length === 0) return;

      const contactIds = ungroupedContacts.slice(0, 50).map(c => c.id); // Limit batch size

      const response = await fetch('/api/contacts/batch-group-suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds })
      });

      if (response.ok) {
        const data = await response.json();
        this.groupSuggestions = data.results || {};
        console.log('[CircleListView] Loaded group suggestions for', Object.keys(this.groupSuggestions).length, 'contacts');
      }
    } catch (error) {
      console.warn('[CircleListView] Failed to fetch group suggestions:', error);
    }
  }

  /**
   * Generate AI suggestions for a specific group
   * Calls the batch-group-suggestions API for ungrouped contacts,
   * then re-renders to show suggestions under the target group.
   * @param {string} groupId - The group to generate suggestions for
   */
  async generateGroupAISuggestions(groupId) {
    const btn = document.getElementById(`clv-generate-ai-group-${groupId}`);
    if (!btn) return;

    btn.disabled = true;
    const textEl = btn.querySelector('.clv-generate-ai-text');
    const originalText = textEl?.textContent || 'Generate AI Suggestions';
    if (textEl) textEl.textContent = 'Generating...';

    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      if (!userId || !authToken) throw new Error('Not authenticated');

      // Get ungrouped contacts to suggest for
      const ungroupedContacts = this.getUngroupedContacts();
      if (ungroupedContacts.length === 0) {
        if (typeof showToast === 'function') {
          showToast('All contacts are already in groups.', 'info');
        }
        return;
      }

      const contactIds = ungroupedContacts.slice(0, 50).map(c => c.id);

      const response = await fetch('/api/contacts/batch-group-suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      this.groupSuggestions = data.results || {};

      // Re-render to show new suggestions
      this.render();

      const newCount = this.getGroupSuggestionsForGroup(groupId).length;
      if (typeof showToast === 'function') {
        if (newCount > 0) {
          const group = this.groups.find(g => g.id === groupId);
          showToast(`✨ ${newCount} AI suggestion${newCount === 1 ? '' : 's'} for ${group?.name || 'this group'}`, 'success');
        } else {
          showToast('No new suggestions found. Try adding more contact details.', 'info');
        }
      }
    } catch (error) {
      console.error('[CircleListView] Error generating group AI suggestions:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to generate suggestions: ${error.message}`, 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        const t = btn.querySelector('.clv-generate-ai-text');
        if (t) t.textContent = originalText;
      }
    }
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

    // Remove search section from sticky header
    const stickyExtras = document.getElementById('sticky-extras-container');
    if (stickyExtras) {
      const searchSection = stickyExtras.querySelector('.clv-search-section');
      if (searchSection) searchSection.remove();
    }

    // Remove blur class from scrollable content
    const scrollable = document.querySelector('.manage-circles__scrollable-content');
    if (scrollable) scrollable.classList.remove('clv-search-active');

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
