/**
 * ContactSearchModal Component
 * 
 * Modal for searching and selecting contacts to add to Inner Circle during AI Quick Start.
 * Features search with 300ms debounce, multi-select checkboxes, and capacity indicator.
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.6, 2.7, 2.9, 2.11, 8.1
 */

class ContactSearchModal {
  constructor(options = {}) {
    this.onSelect = options.onSelect || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.excludeContactIds = options.excludeContactIds || [];
    this.maxSelections = options.maxSelections || 10;
    this.currentSelectionCount = options.currentSelectionCount || 0;
    this.selectedContacts = new Map();
    this.searchQuery = '';
    this.contacts = [];
    this.filteredContacts = [];
    this.debounceTimer = null;
    this.modalElement = null;
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  /**
   * Setup inline styles for the modal
   * Requirement: 8.1 - Mobile responsiveness (viewport >= 320px)
   */
  setupStyles() {
    if (document.getElementById('contact-search-modal-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'contact-search-modal-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  /**
   * Get CSS styles for the modal
   */
  getStyles() {
    return `
      .contact-search-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(28, 25, 23, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1100;
        padding: 20px;
        animation: csm-fadeIn 0.2s ease-out;
      }
      
      .contact-search-modal {
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 12px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        animation: csm-slideUp 0.3s ease-out;
      }
      
      .contact-search-modal__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }
      
      .contact-search-modal__title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
      }
      
      .contact-search-modal__close {
        background: none;
        border: none;
        color: var(--text-secondary, #6b7280);
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: background 0.2s, color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        line-height: 1;
      }
      
      .contact-search-modal__close:hover {
        background: var(--bg-hover, #f3f4f6);
        color: var(--text-primary, #1f2937);
      }
      
      .contact-search-modal__body {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding: 0;
      }

      .contact-search-modal__search {
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }
      
      .contact-search-modal__search-input {
        width: 100%;
        padding: 12px 16px;
        background: var(--bg-app, #f9fafb);
        border: 1px solid var(--border-subtle, #e5e7eb);
        border-radius: 8px;
        color: var(--text-primary, #1f2937);
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      
      .contact-search-modal__search-input:focus {
        outline: none;
        border-color: var(--accent-primary, #3b82f6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .contact-search-modal__search-input::placeholder {
        color: var(--text-tertiary, #9ca3af);
      }
      
      .contact-search-modal__capacity {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 24px;
        background: var(--accent-subtle, #eff6ff);
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }
      
      .contact-search-modal__capacity-text {
        font-size: 14px;
        color: var(--text-secondary, #6b7280);
      }
      
      .contact-search-modal__capacity-count {
        font-weight: 600;
        color: var(--accent-primary, #3b82f6);
        font-size: 15px;
      }
      
      .contact-search-modal__capacity-count.at-capacity {
        color: var(--status-warning, #f59e0b);
      }
      
      .contact-search-modal__capacity-count.over-capacity {
        color: var(--status-error, #ef4444);
      }

      .contact-search-modal__list {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }
      
      .contact-search-modal__empty {
        text-align: center;
        padding: 40px 24px;
        color: var(--text-secondary, #6b7280);
      }
      
      .contact-search-modal__empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      
      .contact-search-modal__empty-text {
        font-size: 14px;
        margin: 0;
      }
      
      .contact-search-modal__loading {
        text-align: center;
        padding: 40px 24px;
        color: var(--text-secondary, #6b7280);
      }
      
      .contact-search-modal__spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--border-subtle, #e5e7eb);
        border-top-color: var(--accent-primary, #3b82f6);
        border-radius: 50%;
        animation: csm-spin 0.8s linear infinite;
        margin: 0 auto 12px;
      }
      
      .contact-search-modal__item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      }
      
      .contact-search-modal__item:last-child {
        border-bottom: none;
      }
      
      .contact-search-modal__item:hover {
        background: var(--bg-hover, #f9fafb);
      }
      
      .contact-search-modal__item.selected {
        background: var(--accent-subtle, #eff6ff);
      }
      
      .contact-search-modal__item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .contact-search-modal__checkbox {
        width: 20px;
        height: 20px;
        cursor: pointer;
        flex-shrink: 0;
        accent-color: var(--accent-primary, #3b82f6);
      }
      
      .contact-search-modal__avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
        flex-shrink: 0;
      }
      
      .contact-search-modal__info {
        flex: 1;
        min-width: 0;
      }
      
      .contact-search-modal__name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #1f2937);
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .contact-search-modal__details {
        font-size: 12px;
        color: var(--text-secondary, #6b7280);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .contact-search-modal__circle-badge {
        display: inline-block;
        padding: 2px 8px;
        background: var(--bg-secondary, #f3f4f6);
        border-radius: 12px;
        font-size: 11px;
        color: var(--text-secondary, #6b7280);
        font-weight: 500;
        flex-shrink: 0;
      }

      .contact-search-modal__footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid var(--border-subtle, #e5e7eb);
        background: var(--bg-surface, #ffffff);
      }
      
      .contact-search-modal__btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        font-family: inherit;
        min-height: 44px;
      }
      
      .contact-search-modal__btn--cancel {
        background: transparent;
        color: var(--text-secondary, #6b7280);
        border: 1px solid var(--border-subtle, #e5e7eb);
      }
      
      .contact-search-modal__btn--cancel:hover {
        background: var(--bg-hover, #f3f4f6);
        color: var(--text-primary, #1f2937);
      }
      
      .contact-search-modal__btn--confirm {
        background: var(--accent-primary, #3b82f6);
        color: white;
      }
      
      .contact-search-modal__btn--confirm:hover:not(:disabled) {
        background: var(--accent-hover, #2563eb);
      }
      
      .contact-search-modal__btn--confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @keyframes csm-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes csm-slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes csm-spin {
        to { transform: rotate(360deg); }
      }

      /* Mobile responsive styles - Requirement 8.1 */
      @media (max-width: 768px) {
        .contact-search-modal-overlay {
          padding: 0;
          align-items: flex-end;
        }
        
        .contact-search-modal {
          max-width: 100%;
          max-height: 90vh;
          border-radius: 16px 16px 0 0;
        }
        
        .contact-search-modal__header {
          padding: 16px 20px;
        }
        
        .contact-search-modal__title {
          font-size: 1.125rem;
        }
        
        .contact-search-modal__search {
          padding: 12px 20px;
        }
        
        .contact-search-modal__capacity {
          padding: 10px 20px;
        }
        
        .contact-search-modal__item {
          padding: 12px 20px;
        }
        
        .contact-search-modal__footer {
          padding: 12px 20px;
          flex-direction: column;
        }
        
        .contact-search-modal__btn {
          width: 100%;
        }
        
        .contact-search-modal__checkbox {
          min-width: 44px;
          min-height: 44px;
          width: 22px;
          height: 22px;
        }
      }
      
      /* Extra small devices (320px and up) */
      @media (max-width: 480px) {
        .contact-search-modal__header {
          padding: 14px 16px;
        }
        
        .contact-search-modal__search {
          padding: 10px 16px;
        }
        
        .contact-search-modal__item {
          padding: 10px 16px;
          gap: 10px;
        }
        
        .contact-search-modal__avatar {
          width: 36px;
          height: 36px;
          font-size: 12px;
        }
        
        .contact-search-modal__name {
          font-size: 13px;
        }
        
        .contact-search-modal__details {
          font-size: 11px;
        }
      }
      
      /* Dark theme support */
      [data-theme="dark"] .contact-search-modal-overlay {
        background: rgba(0, 0, 0, 0.7);
      }
    `;
  }

  /**
   * Open modal and fetch contacts
   * Requirement: 2.2 - Display searchable contact list modal
   */
  async open() {
    // Create modal element
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'contact-search-modal-overlay';
    this.modalElement.innerHTML = this.renderModal();
    document.body.appendChild(this.modalElement);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Attach event listeners
    this.attachEventListeners();
    
    // Fetch contacts
    await this.fetchContacts();
  }
  
  /**
   * Render modal HTML
   */
  renderModal() {
    const remainingCapacity = this.maxSelections - this.currentSelectionCount;
    
    return `
      <div class="contact-search-modal" role="dialog" aria-modal="true" aria-labelledby="csm-title">
        <div class="contact-search-modal__header">
          <h2 class="contact-search-modal__title" id="csm-title">Search & Add Contacts</h2>
          <button class="contact-search-modal__close" id="csm-close" aria-label="Close modal">×</button>
        </div>
        
        <div class="contact-search-modal__body">
          <div class="contact-search-modal__search">
            <input 
              type="text" 
              class="contact-search-modal__search-input" 
              id="csm-search-input"
              placeholder="Search contacts by name..."
              aria-label="Search contacts"
            />
          </div>
          
          <div class="contact-search-modal__capacity">
            <span class="contact-search-modal__capacity-text">Inner Circle capacity:</span>
            <span class="contact-search-modal__capacity-count" id="csm-capacity-count">
              ${this.currentSelectionCount}/${this.maxSelections} selected
            </span>
          </div>
          
          <div class="contact-search-modal__list" id="csm-contact-list">
            <div class="contact-search-modal__loading">
              <div class="contact-search-modal__spinner"></div>
              <p>Loading contacts...</p>
            </div>
          </div>
        </div>
        
        <div class="contact-search-modal__footer">
          <button class="contact-search-modal__btn contact-search-modal__btn--cancel" id="csm-cancel">
            Cancel
          </button>
          <button class="contact-search-modal__btn contact-search-modal__btn--confirm" id="csm-confirm" disabled>
            Add Selected (0)
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = document.getElementById('csm-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('csm-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }
    
    // Confirm button
    const confirmBtn = document.getElementById('csm-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.handleConfirm());
    }
    
    // Search input with debounce - Requirement 2.4 (300ms debounce)
    const searchInput = document.getElementById('csm-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
      // Focus search input on open
      setTimeout(() => searchInput.focus(), 100);
    }
    
    // Close on overlay click
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });
    
    // Close on Escape key
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }
  
  /**
   * Handle search input with 300ms debounce
   * Requirement: 2.4 - Filter contacts in real-time (debounced at 300ms)
   */
  handleSearchInput(query) {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set new timer with 300ms debounce
    this.debounceTimer = setTimeout(() => {
      this.handleSearch(query);
    }, 300);
  }
  
  /**
   * Handle search after debounce
   * Requirement: 2.3 - Text input field for searching contacts by name
   */
  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.filterContacts();
    this.renderContactList();
  }

  /**
   * Fetch contacts from API
   */
  async fetchContacts() {
    try {
      const response = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.contacts = data.contacts || data || [];
      
      // Filter out excluded contacts - Requirement 2.11
      this.contacts = this.contacts.filter(contact => 
        !this.excludeContactIds.includes(contact.id)
      );
      
      // Filter out archived contacts
      this.contacts = this.contacts.filter(contact => !contact.archived_at);
      
      // Sort by name
      this.contacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      this.filterContacts();
      this.renderContactList();
      
    } catch (error) {
      console.error('Error fetching contacts:', error);
      this.renderError(error.message);
    }
  }
  
  /**
   * Filter contacts based on search query
   * Requirement: 2.4 - Filter contacts in real-time
   */
  filterContacts() {
    if (!this.searchQuery) {
      this.filteredContacts = [...this.contacts];
    } else {
      this.filteredContacts = this.contacts.filter(contact => {
        const name = (contact.name || '').toLowerCase();
        const email = (contact.email || '').toLowerCase();
        return name.includes(this.searchQuery) || email.includes(this.searchQuery);
      });
    }
  }

  /**
   * Render contact list
   * Requirement: 2.5 - Display matching contacts with current circle assignment
   */
  renderContactList() {
    const listContainer = document.getElementById('csm-contact-list');
    if (!listContainer) return;
    
    if (this.filteredContacts.length === 0) {
      listContainer.innerHTML = `
        <div class="contact-search-modal__empty">
          <div class="contact-search-modal__empty-icon">🔍</div>
          <p class="contact-search-modal__empty-text">
            ${this.searchQuery ? 'No contacts match your search.' : 'No contacts available.'}
          </p>
        </div>
      `;
      return;
    }
    
    const remainingCapacity = this.maxSelections - this.currentSelectionCount - this.selectedContacts.size;
    
    listContainer.innerHTML = this.filteredContacts.map(contact => {
      const isSelected = this.selectedContacts.has(contact.id);
      const isDisabled = !isSelected && remainingCapacity <= 0;
      const circleDisplay = this.getCircleDisplay(contact.dunbarCircle || contact.circle);
      
      return `
        <div class="contact-search-modal__item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
             data-contact-id="${contact.id}"
             role="option"
             aria-selected="${isSelected}">
          <input 
            type="checkbox" 
            class="contact-search-modal__checkbox"
            data-contact-id="${contact.id}"
            ${isSelected ? 'checked' : ''}
            ${isDisabled ? 'disabled' : ''}
            aria-label="Select ${this.escapeHtml(contact.name)}"
          />
          <div class="contact-search-modal__avatar">
            ${this.getInitials(contact.name)}
          </div>
          <div class="contact-search-modal__info">
            <div class="contact-search-modal__name">${this.escapeHtml(contact.name)}</div>
            <div class="contact-search-modal__details">
              ${this.escapeHtml(contact.email || contact.phone || '')}
            </div>
          </div>
          ${circleDisplay ? `<span class="contact-search-modal__circle-badge">${circleDisplay}</span>` : ''}
        </div>
      `;
    }).join('');
    
    // Attach click handlers to items
    this.attachItemListeners();
  }
  
  /**
   * Attach click listeners to contact items
   */
  attachItemListeners() {
    const items = document.querySelectorAll('.contact-search-modal__item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking directly on checkbox
        if (e.target.classList.contains('contact-search-modal__checkbox')) {
          return;
        }
        
        const contactId = item.dataset.contactId;
        const checkbox = item.querySelector('.contact-search-modal__checkbox');
        
        if (checkbox && !checkbox.disabled) {
          checkbox.checked = !checkbox.checked;
          this.handleContactSelect(contactId, checkbox.checked);
        }
      });
    });
    
    // Checkbox change handlers
    const checkboxes = document.querySelectorAll('.contact-search-modal__checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const contactId = e.target.dataset.contactId;
        this.handleContactSelect(contactId, e.target.checked);
      });
    });
  }

  /**
   * Handle contact selection
   * Requirement: 2.6 - Allow users to select multiple contacts via checkboxes
   * Requirement: 2.9 - Prevent selecting more contacts than remaining capacity
   */
  handleContactSelect(contactId, isSelected) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    if (isSelected) {
      // Check capacity before adding - Requirement 2.9
      const totalSelected = this.currentSelectionCount + this.selectedContacts.size;
      if (totalSelected >= this.maxSelections) {
        // Revert checkbox
        const checkbox = document.querySelector(`.contact-search-modal__checkbox[data-contact-id="${contactId}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }
        
        if (typeof showToast === 'function') {
          showToast('Inner Circle is at capacity. Remove a contact first.', 'warning');
        }
        return;
      }
      
      this.selectedContacts.set(contactId, contact);
    } else {
      this.selectedContacts.delete(contactId);
    }
    
    // Update UI
    this.updateCapacityDisplay();
    this.updateConfirmButton();
    this.updateItemStates();
  }
  
  /**
   * Update capacity indicator display
   * Requirement: 2.7 - Display current Inner Circle count and remaining capacity
   */
  updateCapacityDisplay() {
    const capacityCount = document.getElementById('csm-capacity-count');
    if (!capacityCount) return;
    
    const totalSelected = this.currentSelectionCount + this.selectedContacts.size;
    capacityCount.textContent = `${totalSelected}/${this.maxSelections} selected`;
    
    // Update styling based on capacity
    capacityCount.classList.remove('at-capacity', 'over-capacity');
    if (totalSelected >= this.maxSelections) {
      capacityCount.classList.add('at-capacity');
    } else if (totalSelected > this.maxSelections) {
      capacityCount.classList.add('over-capacity');
    }
  }
  
  /**
   * Update confirm button state
   */
  updateConfirmButton() {
    const confirmBtn = document.getElementById('csm-confirm');
    if (!confirmBtn) return;
    
    const selectedCount = this.selectedContacts.size;
    confirmBtn.disabled = selectedCount === 0;
    confirmBtn.textContent = `Add Selected (${selectedCount})`;
  }
  
  /**
   * Update item states (selected/disabled)
   */
  updateItemStates() {
    const remainingCapacity = this.maxSelections - this.currentSelectionCount - this.selectedContacts.size;
    
    const items = document.querySelectorAll('.contact-search-modal__item');
    items.forEach(item => {
      const contactId = item.dataset.contactId;
      const isSelected = this.selectedContacts.has(contactId);
      const checkbox = item.querySelector('.contact-search-modal__checkbox');
      
      // Update selected state
      if (isSelected) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
      
      // Update disabled state
      if (!isSelected && remainingCapacity <= 0) {
        item.classList.add('disabled');
        if (checkbox) checkbox.disabled = true;
      } else {
        item.classList.remove('disabled');
        if (checkbox) checkbox.disabled = false;
      }
    });
  }

  /**
   * Handle confirm selection
   * Requirement: 2.8 - Add selected contacts to AI Quick Start selection list
   */
  handleConfirm() {
    const selectedContactsArray = Array.from(this.selectedContacts.values());
    
    if (selectedContactsArray.length === 0) {
      return;
    }
    
    // Call the onSelect callback with selected contacts
    this.onSelect(selectedContactsArray);
    
    // Close the modal
    this.close();
  }
  
  /**
   * Handle cancel
   * Requirement: 2.10 - Provide a "Cancel" button to close without changes
   */
  handleCancel() {
    this.onCancel();
    this.close();
  }
  
  /**
   * Close modal
   */
  close() {
    // Remove escape key handler
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Remove modal element
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    
    // Clear state
    this.selectedContacts.clear();
    this.searchQuery = '';
    this.contacts = [];
    this.filteredContacts = [];
  }
  
  /**
   * Render error state
   */
  renderError(message) {
    const listContainer = document.getElementById('csm-contact-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = `
      <div class="contact-search-modal__empty">
        <div class="contact-search-modal__empty-icon">⚠️</div>
        <p class="contact-search-modal__empty-text">
          Failed to load contacts: ${this.escapeHtml(message)}
        </p>
      </div>
    `;
  }

  /**
   * Get circle display name
   * Requirement: 2.5 - Display current circle assignment
   */
  getCircleDisplay(circle) {
    if (!circle) return null;
    
    const circleNames = {
      'inner': 'Inner Circle',
      'close': 'Close Friends',
      'active': 'Active Friends',
      'casual': 'Casual Network'
    };
    
    return circleNames[circle.toLowerCase()] || circle;
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
   * Destroy the component
   */
  destroy() {
    this.close();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContactSearchModal;
}
