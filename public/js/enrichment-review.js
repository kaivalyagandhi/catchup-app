/**
 * Enrichment Review Interface
 * Displays enrichment proposals grouped by contact with inline editing and bulk actions
 */

class EnrichmentReview {
  constructor() {
    this.proposal = null;
    this.container = null;
    this.onApplyCallback = null;
    this.isRecording = false;
    this.currentSessionId = null; // Store the voice recording session ID

    // Contact modal management
    this.contactModals = new Map(); // Map<contactId, ModalState>

    this.enrichmentItems = [];
    this.currentFilter = 'all'; // all, web, sms, mms

    this.init();
  }
  
  init() {
    this.setupStyles();
    this.setupToastEventListeners();
    this.setupContactModalEventListeners();
  }
  
  /**
   * Setup event delegation for contact modal buttons
   */
  setupContactModalEventListeners() {
    document.addEventListener('click', (e) => {
      // Handle contact modal close button
      if (e.target.classList.contains('contact-modal-close')) {
        const contactId = e.target.dataset.contactId;
        this.removeContactModal(contactId);
      }
      
      // Handle apply button (confirm selected + reject unselected)
      if (e.target.classList.contains('contact-modal-apply')) {
        const contactId = e.target.dataset.contactId;
        this.applyModalSelections(contactId);
      }
      
      // Handle individual suggestion checkbox
      if (e.target.classList.contains('contact-modal-suggestion-checkbox')) {
        const contactId = e.target.dataset.contactId;
        const suggestionId = e.target.dataset.suggestionId;
        const modalState = this.contactModals.get(contactId);
        
        if (modalState) {
          const suggestion = modalState.suggestions.find(s => s.id === suggestionId);
          if (suggestion) {
            suggestion.accepted = e.target.checked;
            
            // Update the suggestion item styling immediately
            const suggestionItem = e.target.closest('.contact-modal-suggestion');
            if (suggestionItem) {
              if (suggestion.accepted) {
                suggestionItem.classList.remove('rejected');
                suggestionItem.classList.add('accepted');
              } else {
                suggestionItem.classList.remove('accepted');
                suggestionItem.classList.add('rejected');
              }
            }
            
            this.updateContactModalSummary(contactId);
            this.updateContactModalButtons(contactId);
            
            // Reset auto-dismiss timer on user interaction
            this.resetAutoRemoveTimer(contactId);
          }
        }
      }
    });
  }
  
  /**
   * Setup event delegation for toast buttons
   */
  setupToastEventListeners() {
    document.addEventListener('click', (e) => {
      // Handle confirm button clicks
      if (e.target.classList.contains('toast-confirm-btn')) {
        const toastId = e.target.dataset.toastId;
        const suggestionJson = e.target.dataset.suggestion;
        
        try {
          const suggestion = JSON.parse(suggestionJson);
          this.confirmToastSuggestion(toastId, suggestion);
        } catch (error) {
          console.error('Error parsing suggestion from data attribute:', error);
          this.removeToast(toastId);
        }
      }
      
      // Handle reject button clicks
      if (e.target.classList.contains('toast-reject-btn')) {
        const toastId = e.target.dataset.toastId;
        this.rejectToastSuggestion(toastId);
      }
    });
  }
  
  /**
   * Get or create a contact modal
   * Requirements: 1.1, 1.2
   */
  getOrCreateContactModal(contactId, contactName) {
    if (this.contactModals.has(contactId)) {
      return this.contactModals.get(contactId);
    }
    
    const modalState = {
      contactId,
      contactName,
      suggestions: [],
      autoRemoveTimer: null,
      modalElement: null,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      isVisible: false,
    };
    
    this.contactModals.set(contactId, modalState);
    return modalState;
  }
  
  /**
   * Add a suggestion to a contact modal
   * Requirements: 1.2, 5.1, 9.1, 9.2, 9.3
   */
  addSuggestionToModal(contactId, suggestion) {
    const modalState = this.contactModals.get(contactId);
    if (!modalState) {
      console.warn(`Modal state not found for contact ${contactId}`);
      return;
    }
    
    // Deduplicate: check if suggestion already exists
    const existingIndex = modalState.suggestions.findIndex(
      s => s.type === suggestion.type && s.field === suggestion.field && s.value === suggestion.value
    );
    
    if (existingIndex !== -1) {
      console.log(`[EnrichmentReview] Skipping duplicate suggestion for ${contactId}: ${suggestion.type}`);
      return;
    }
    
    // Add suggestion
    modalState.suggestions.push(suggestion);
    modalState.lastUpdatedAt = new Date();
    
    console.log(`[EnrichmentReview] Added suggestion to modal for ${contactId}, total: ${modalState.suggestions.length}`);
  }
  
  /**
   * Show a contact modal
   * Requirements: 1.3, 1.4, 1.5
   */
  showContactModal(contactId) {
    const modalState = this.contactModals.get(contactId);
    if (!modalState) {
      console.warn(`Modal state not found for contact ${contactId}`);
      return;
    }
    
    // Create or update modal element
    let modalElement = document.getElementById(`contact-modal-${contactId}`);
    
    if (!modalElement) {
      // Create new modal
      const container = this.getOrCreateModalContainer();
      modalElement = this.createContactModalElement(modalState);
      container.appendChild(modalElement);
      modalState.modalElement = modalElement;
    } else {
      // Update existing modal with new suggestions
      this.updateContactModalContent(modalState);
    }
    
    // Show modal with animation
    modalElement.classList.add('visible');
    modalState.isVisible = true;
    
    // Reset auto-dismiss timer
    this.resetAutoRemoveTimer(contactId);
  }
  
  /**
   * Get or create the modal container
   */
  getOrCreateModalContainer() {
    let container = document.getElementById('enrichment-contact-modals-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'enrichment-contact-modals-container';
      container.className = 'enrichment-contact-modals-container';
      document.body.appendChild(container);
    }
    
    return container;
  }
  
  /**
   * Create a contact modal element
   */
  createContactModalElement(modalState) {
    const modal = document.createElement('div');
    modal.id = `contact-modal-${modalState.contactId}`;
    modal.className = 'contact-modal';
    
    const initials = this.getInitials(modalState.contactName);
    const suggestionsHtml = modalState.suggestions.map((s, idx) => 
      this.createSuggestionItemHtml(modalState.contactId, s, idx)
    ).join('');
    
    const acceptedCount = modalState.suggestions.filter(s => s.accepted).length;
    const rejectedCount = modalState.suggestions.length - acceptedCount;
    
    // Button text based on selected count
    const confirmBtnText = acceptedCount > 0 ? `✓ Confirm ${acceptedCount}` : '✓ Confirm All';
    const rejectBtnText = rejectedCount > 0 ? `✗ Reject ${rejectedCount}` : '✗ Reject All';
    
    modal.innerHTML = `
      <div class="contact-modal-header">
        <div class="contact-modal-avatar">${initials}</div>
        <div class="contact-modal-info">
          <div class="contact-modal-name">${this.escapeHtml(modalState.contactName)}</div>
          <div class="contact-modal-summary">${acceptedCount} of ${modalState.suggestions.length} selected</div>
        </div>
        <button class="contact-modal-close" data-contact-id="${modalState.contactId}" title="Close">✕</button>
      </div>
      <div class="contact-modal-countdown-bar" id="countdown-${modalState.contactId}"></div>
      <div class="contact-modal-suggestions">
        ${suggestionsHtml}
      </div>
      <div class="contact-modal-actions">
        <button class="contact-modal-apply" data-contact-id="${modalState.contactId}">✓ Confirm ${acceptedCount} ✗ Reject ${rejectedCount}</button>
      </div>
    `;
    
    return modal;
  }
  
  /**
   * Create a suggestion item HTML
   */
  createSuggestionItemHtml(contactId, suggestion, index) {
    const icon = this.getItemIcon(suggestion.type, suggestion.field);
    const displayText = this.formatSuggestionType(suggestion.type);
    const value = this.escapeHtml(suggestion.value);
    
    return `
      <div class="contact-modal-suggestion ${suggestion.accepted ? 'accepted' : 'rejected'}" data-suggestion-id="${suggestion.id}">
        <input 
          type="checkbox" 
          class="contact-modal-suggestion-checkbox"
          data-contact-id="${contactId}"
          data-suggestion-id="${suggestion.id}"
          ${suggestion.accepted ? 'checked' : ''}
        />
        <span class="suggestion-icon">${icon}</span>
        <span class="suggestion-type">${displayText}</span>
        <span class="suggestion-value">${value}</span>
      </div>
    `;
  }
  
  /**
   * Update contact modal content
   */
  updateContactModalContent(modalState) {
    const modalElement = modalState.modalElement;
    if (!modalElement) return;
    
    const suggestionsContainer = modalElement.querySelector('.contact-modal-suggestions');
    if (!suggestionsContainer) return;
    
    // Update each suggestion's checkbox state and styling
    modalState.suggestions.forEach((suggestion) => {
      let suggestionItem = modalElement.querySelector(
        `.contact-modal-suggestion[data-suggestion-id="${suggestion.id}"]`
      );
      
      if (suggestionItem) {
        // Update existing suggestion
        const checkbox = suggestionItem.querySelector('.contact-modal-suggestion-checkbox');
        if (checkbox) {
          checkbox.checked = suggestion.accepted;
        }
        
        // Update styling
        if (suggestion.accepted) {
          suggestionItem.classList.remove('rejected');
          suggestionItem.classList.add('accepted');
        } else {
          suggestionItem.classList.remove('accepted');
          suggestionItem.classList.add('rejected');
        }
      } else {
        // Add new suggestion if it doesn't exist
        const newSuggestionHtml = this.createSuggestionItemHtml(modalState.contactId, suggestion, 0);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newSuggestionHtml;
        suggestionsContainer.appendChild(tempDiv.firstElementChild);
      }
    });
    
    // Update summary and button text
    this.updateContactModalSummary(modalState.contactId);
    this.updateContactModalButtons(modalState.contactId);
  }
  
  /**
   * Update contact modal summary
   */
  updateContactModalSummary(contactId) {
    const modalState = this.contactModals.get(contactId);
    if (!modalState || !modalState.modalElement) return;
    
    const acceptedCount = modalState.suggestions.filter(s => s.accepted).length;
    const summary = modalState.modalElement.querySelector('.contact-modal-summary');
    if (summary) {
      summary.textContent = `${acceptedCount} of ${modalState.suggestions.length} selected`;
    }
  }
  
  /**
   * Update contact modal button text based on selected count
   */
  updateContactModalButtons(contactId) {
    const modalState = this.contactModals.get(contactId);
    if (!modalState || !modalState.modalElement) return;
    
    const acceptedCount = modalState.suggestions.filter(s => s.accepted).length;
    const rejectedCount = modalState.suggestions.length - acceptedCount;
    
    const applyBtn = modalState.modalElement.querySelector('.contact-modal-apply');
    
    if (applyBtn) {
      applyBtn.textContent = `✓ Confirm ${acceptedCount} ✗ Reject ${rejectedCount}`;
    }
  }
  
  /**
   * Reset auto-dismiss timer for a contact modal
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  resetAutoRemoveTimer(contactId) {
    const modalState = this.contactModals.get(contactId);
    if (!modalState) {
      console.warn(`[EnrichmentReview] Modal state not found for ${contactId} when resetting timer`);
      return;
    }
    
    // Clear existing timer
    if (modalState.autoRemoveTimer) {
      console.log(`[EnrichmentReview] Clearing existing timer for ${contactId}`);
      clearTimeout(modalState.autoRemoveTimer);
    }
    
    // Reset countdown bar animation
    const countdownBar = document.getElementById(`countdown-${contactId}`);
    if (countdownBar) {
      // Remove animation to reset it
      countdownBar.style.animation = 'none';
      // Trigger reflow to restart animation
      void countdownBar.offsetWidth;
      // Start countdown animation (10 seconds)
      countdownBar.style.animation = 'countdownDecrease 10s linear forwards';
    }
    
    // Start new 10-second timer
    console.log(`[EnrichmentReview] Starting 10-second auto-dismiss timer for ${contactId}`);
    modalState.autoRemoveTimer = setTimeout(() => {
      console.log(`[EnrichmentReview] Auto-dismissing modal for contact ${contactId}`);
      this.removeContactModal(contactId);
    }, 10000);
  }
  
  /**
   * Remove a contact modal
   * Requirements: 2.4, 2.5
   */
  removeContactModal(contactId) {
    const modalState = this.contactModals.get(contactId);
    if (!modalState) return;
    
    // Clear timer
    if (modalState.autoRemoveTimer) {
      clearTimeout(modalState.autoRemoveTimer);
      modalState.autoRemoveTimer = null;
    }
    
    // Animate out
    if (modalState.modalElement) {
      modalState.modalElement.classList.remove('visible');
      
      // Remove after animation
      setTimeout(() => {
        if (modalState.modalElement && modalState.modalElement.parentNode) {
          modalState.modalElement.remove();
        }
        // Remove from map after animation completes
        this.contactModals.delete(contactId);
      }, 300);
    } else {
      // No modal element, just remove from map
      this.contactModals.delete(contactId);
    }
  }
  
  /**
   * Apply modal selections (confirm checked + reject unchecked)
   * Accepted edits are submitted to history
   * Rejected edits are deleted from pending
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async applyModalSelections(contactId) {
    const modalState = this.contactModals.get(contactId);
    if (!modalState) return;
    
    const acceptedSuggestions = modalState.suggestions.filter(s => s.accepted);
    const rejectedSuggestions = modalState.suggestions.filter(s => !s.accepted);
    
    console.log(`[EnrichmentReview] Applying selections for ${contactId}: ${acceptedSuggestions.length} confirmed, ${rejectedSuggestions.length} rejected`);
    
    // Delete rejected edits from pending
    if (rejectedSuggestions.length > 0) {
      await this.deleteRejectedEdits(rejectedSuggestions);
    }
    
    // Submit accepted edits to history
    if (acceptedSuggestions.length > 0) {
      await this.submitAcceptedEdits(acceptedSuggestions);
    }
    
    // Show feedback
    const message = `Confirmed ${acceptedSuggestions.length}, Rejected ${rejectedSuggestions.length}`;
    showToast(message, 'success');
    
    // Close modal after applying
    this.removeContactModal(contactId);
  }
  
  /**
   * Delete rejected edits from pending
   * Removes the pending edits that correspond to rejected suggestions
   */
  async deleteRejectedEdits(rejectedSuggestions) {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      if (!token || !userId) {
        console.error('[EnrichmentReview] Missing auth token or userId');
        return;
      }
      
      // Delete each rejected edit
      for (const suggestion of rejectedSuggestions) {
        if (!suggestion.editId) {
          console.warn('[EnrichmentReview] Suggestion has no editId:', suggestion.id);
          continue;
        }
        
        try {
          const response = await fetch(`/api/edits/pending/${suggestion.editId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-user-id': userId,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log(`[EnrichmentReview] ✓ Deleted rejected edit ${suggestion.editId}`);
          } else {
            console.error(`[EnrichmentReview] ✗ Failed to delete edit ${suggestion.editId}:`, response.status);
          }
        } catch (err) {
          console.error(`[EnrichmentReview] ✗ Error deleting edit ${suggestion.editId}:`, err);
        }
      }
      
      // Refresh edits list
      window.dispatchEvent(new CustomEvent('edits-updated'));
    } catch (error) {
      console.error('[EnrichmentReview] Error deleting rejected edits:', error);
    }
  }
  
  /**
   * Submit accepted edits to history
   * Moves the pending edits to history so they're applied
   */
  async submitAcceptedEdits(acceptedSuggestions) {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      if (!token || !userId) {
        console.error('[EnrichmentReview] Missing auth token or userId');
        return;
      }
      
      // Submit each accepted edit
      for (const suggestion of acceptedSuggestions) {
        if (!suggestion.editId) {
          console.warn('[EnrichmentReview] Suggestion has no editId:', suggestion.id);
          continue;
        }
        
        try {
          const response = await fetch(`/api/edits/pending/${suggestion.editId}/submit`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-user-id': userId,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log(`[EnrichmentReview] ✓ Submitted edit ${suggestion.editId} to history`);
          } else {
            console.error(`[EnrichmentReview] ✗ Failed to submit edit ${suggestion.editId}:`, response.status);
          }
        } catch (err) {
          console.error(`[EnrichmentReview] ✗ Error submitting edit ${suggestion.editId}:`, err);
        }
      }
      
      // Wait a bit to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh edits list and reload contacts to show updated values
      window.dispatchEvent(new CustomEvent('edits-updated'));
      
      // Also dispatch a contacts-updated event to refresh the contacts list
      window.dispatchEvent(new CustomEvent('contacts-updated'));
    } catch (error) {
      console.error('[EnrichmentReview] Error submitting accepted edits:', error);
    }
  }
  
  /**
   * Apply accepted suggestions directly to contact data
   */



  
  /**
   * Show the panel in recording mode (waiting for suggestions)
   * Now just sets the flag - modals will be shown as suggestions arrive
   */
  showRecordingMode() {
    this.isRecording = true;
    this.proposal = null;
    
    const container = document.getElementById('enrichment-review-container');
    if (container) {
      container.innerHTML = '';
    }
  }
  
  /**
   * Add a live suggestion during recording to a contact modal
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   * @param {Object} suggestion - Enrichment suggestion
   */
  addLiveSuggestion(suggestion) {
    if (!this.isRecording) return;
    
    const contactName = suggestion.contactHint || 'Unknown Contact';
    const contactId = this.generateContactId(contactName);
    
    console.log(`[EnrichmentReview] Adding live suggestion for contact: ${contactName}`);
    
    // Get or create modal for this contact
    const modalState = this.getOrCreateContactModal(contactId, contactName);
    
    // Add suggestion to modal
    this.addSuggestionToModal(contactId, suggestion);
    
    // Show modal
    this.showContactModal(contactId);
  }
  
  /**
   * Generate a contact ID from contact name
   */
  generateContactId(contactName) {
    return contactName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  
  /**
   * Show enrichment suggestion as a toast with action buttons
   */
  showEnrichmentToast(message, suggestion) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('enrichment-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'enrichment-toast-container';
      toastContainer.className = 'enrichment-toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'enrichment-toast';
    
    const toastId = `toast-${suggestion.id || Date.now()}`;
    toast.id = toastId;
    
    // Store suggestion as JSON in data attribute
    const suggestionJson = JSON.stringify(suggestion);
    
    toast.innerHTML = `
      <div class="enrichment-toast-content">
        <div class="enrichment-toast-message">${message}</div>
        <div class="enrichment-toast-actions">
          <button class="toast-btn toast-confirm-btn" data-toast-id="${toastId}" data-suggestion='${suggestionJson}'>
            ✓ Confirm
          </button>
          <button class="toast-btn toast-reject-btn" data-toast-id="${toastId}">
            ✗ Reject
          </button>
        </div>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    // Auto-dismiss after 10 seconds if not interacted with
    const autoRemoveTimer = setTimeout(() => {
      this.removeToast(toastId);
    }, 10000);
    
    // Store timer for cleanup
    toast.dataset.autoRemoveTimer = autoRemoveTimer;
  }
  
  /**
   * Confirm a toast suggestion
   */
  confirmToastSuggestion(toastId, suggestion) {
    console.log('Confirmed suggestion:', suggestion);
    this.removeToast(toastId);
    showToast('Suggestion confirmed and saved', 'success');
  }
  
  /**
   * Reject a toast suggestion
   */
  rejectToastSuggestion(toastId) {
    console.log('Rejected suggestion');
    this.removeToast(toastId);
    showToast('Suggestion rejected', 'info');
  }
  
  /**
   * Remove a toast
   */
  removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    // Clear auto-remove timer if exists
    if (toast.dataset.autoRemoveTimer) {
      clearTimeout(parseInt(toast.dataset.autoRemoveTimer));
    }
    
    // Animate out
    toast.classList.remove('visible');
    
    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }
  
  /**
   * Format suggestion type for display
   */
  formatSuggestionType(type) {
    const typeMap = {
      'tag': 'Add Tag',
      'note': 'Add Note',
      'interest': 'Add Interest',
      'event': 'Add Event',
      'location': 'Location',
      'phone': 'Phone',
      'email': 'Email'
    };
    return typeMap[type] || 'Add Item';
  }
  
  /**
   * Hide the panel and clear toasts
   */
  hide() {
    this.isRecording = false;
    const container = document.getElementById('enrichment-review-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Clear any remaining toasts
    const toastContainer = document.getElementById('enrichment-toast-container');
    if (toastContainer) {
      toastContainer.innerHTML = '';
    }
  }
  
  /**
   * Load enrichment items from API
   * @param {string} userId - User ID
   * @param {string} source - Filter by source (all, web, sms, mms)
   */
  async loadEnrichmentItems(userId, source = 'all') {
    try {
      let url = `/api/enrichment-items?userId=${userId}&status=pending`;
      
      if (source !== 'all') {
        url += `&source=${source}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch enrichment items');
      }
      
      this.enrichmentItems = await response.json();
      this.currentFilter = source;
      this.renderEnrichmentItems();
    } catch (error) {
      console.error('Error loading enrichment items:', error);
      showToast('Failed to load enrichment items', 'error');
    }
  }
  
  /**
   * Render enrichment items from API
   */
  renderEnrichmentItems() {
    const container = document.getElementById('enrichment-review-container');
    if (!container) {
      console.error('Enrichment review container not found');
      return;
    }
    
    this.container = container;
    
    if (this.enrichmentItems.length === 0) {
      container.innerHTML = `
        <div class="enrichment-review">
          <div class="enrichment-header">
            <h2>Review Enrichments</h2>
            <p class="enrichment-subtitle">No pending enrichments to review</p>
          </div>
          ${this.renderSourceFilter()}
          <div class="enrichment-empty">
            <p>All caught up! No enrichments waiting for review.</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Group items by contact
    const groupedByContact = this.groupItemsByContact(this.enrichmentItems);
    
    container.innerHTML = `
      <div class="enrichment-review">
        <div class="enrichment-header">
          <h2>Review Enrichments</h2>
          <p class="enrichment-subtitle">${this.enrichmentItems.length} pending enrichment${this.enrichmentItems.length !== 1 ? 's' : ''}</p>
        </div>
        
        ${this.renderSourceFilter()}
        
        <div class="enrichment-contacts">
          ${Object.entries(groupedByContact).map(([contactKey, items], index) => 
            this.renderContactEnrichmentGroup(contactKey, items, index)
          ).join('')}
        </div>
        
        <div class="enrichment-actions">
          <button class="btn btn-secondary" onclick="enrichmentReview.acceptAllItems()">
            ✓ Accept All
          </button>
          <button class="btn btn-secondary" onclick="enrichmentReview.rejectAllItems()">
            ✗ Reject All
          </button>
          <button class="btn btn-primary" onclick="enrichmentReview.applySelectedItems()">
            Apply Selected
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render source filter buttons
   */
  renderSourceFilter() {
    const filters = [
      { value: 'all', label: 'All Sources', icon: '📋' },
      { value: 'web', label: 'Web', icon: '🌐' },
      { value: 'sms', label: 'SMS', icon: '💬' },
      { value: 'mms', label: 'MMS', icon: '📱' }
    ];
    
    return `
      <div class="source-filter">
        ${filters.map(filter => `
          <button 
            class="filter-btn ${this.currentFilter === filter.value ? 'active' : ''}"
            onclick="enrichmentReview.filterBySource('${filter.value}')"
          >
            <span class="filter-icon">${filter.icon}</span>
            <span class="filter-label">${filter.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Filter enrichments by source
   */
  async filterBySource(source) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      showToast('User not logged in', 'error');
      return;
    }
    
    await this.loadEnrichmentItems(userId, source);
  }
  
  /**
   * Group enrichment items by contact
   */
  groupItemsByContact(items) {
    const grouped = {};
    
    items.forEach(item => {
      const key = item.contactId || 'unassigned';
      if (!grouped[key]) {
        grouped[key] = {
          contactId: item.contactId,
          contactName: item.contactName || 'Unassigned',
          items: []
        };
      }
      grouped[key].items.push(item);
    });
    
    return grouped;
  }
  
  /**
   * Render a group of enrichment items for a contact
   */
  renderContactEnrichmentGroup(contactKey, group, index) {
    const { contactId, contactName, items } = group;
    const acceptedCount = items.filter(item => item.accepted).length;
    const initials = this.getInitials(contactName);
    
    return `
      <div class="contact-proposal" data-contact-index="${index}">
        <div class="contact-header" onclick="enrichmentReview.toggleContactGroup(${index})">
          <div class="contact-info">
            <div class="contact-avatar">${initials}</div>
            <div class="contact-details">
              <h3 class="contact-name">${this.escapeHtml(contactName)}</h3>
              <p class="contact-summary">${acceptedCount} of ${items.length} items selected</p>
            </div>
          </div>
          <div class="expand-icon">
            <span class="chevron">▼</span>
          </div>
        </div>
        
        <div class="contact-items expanded" id="contact-items-${index}">
          ${items.map((item, itemIndex) => this.renderEnrichmentItemFromAPI(item, index, itemIndex)).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Render an enrichment item from API data
   */
  renderEnrichmentItemFromAPI(item, contactIndex, itemIndex) {
    const { id, itemType, action, fieldName, value, accepted, source, sourceMetadata } = item;
    
    // Determine display text
    let displayText = '';
    let displayValue = value;
    
    switch (itemType) {
      case 'tag':
        displayText = 'Add Tag';
        break;
      case 'group':
        displayText = 'Add to Group';
        break;
      case 'field':
        displayText = action === 'update' ? `Update ${this.formatFieldName(fieldName)}` : `Add ${this.formatFieldName(fieldName)}`;
        break;
      case 'lastContactDate':
        displayText = action === 'update' ? 'Update Last Contact Date' : 'Add Last Contact Date';
        displayValue = this.formatDate(value);
        break;
    }
    
    // Get icon for item type
    const icon = this.getItemIcon(itemType, fieldName);
    
    // Get source badge
    const sourceBadge = this.renderSourceBadge(source, sourceMetadata);
    
    return `
      <div class="enrichment-item ${accepted ? 'accepted' : 'rejected'}" data-item-id="${id}">
        <div class="item-checkbox">
          <input 
            type="checkbox" 
            id="item-${contactIndex}-${itemIndex}" 
            ${accepted ? 'checked' : ''}
            onchange="enrichmentReview.toggleItemFromAPI(${contactIndex}, ${itemIndex}, '${id}')"
          />
        </div>
        
        <div class="item-icon">${icon}</div>
        
        <div class="item-content">
          <div class="item-header">
            <span class="item-type">${displayText}</span>
            ${sourceBadge}
          </div>
          
          <div class="item-value-container">
            <span class="item-value" id="value-display-${contactIndex}-${itemIndex}">
              ${this.escapeHtml(displayValue)}
            </span>
            <input 
              type="text" 
              class="item-value-edit hidden" 
              id="value-edit-${contactIndex}-${itemIndex}"
              value="${this.escapeHtml(value)}"
              data-type="${itemType}"
              data-field="${fieldName || ''}"
            />
            <span class="validation-error hidden" id="error-${contactIndex}-${itemIndex}"></span>
          </div>
          
          ${this.renderSourceMetadata(sourceMetadata)}
        </div>
        
        <div class="item-actions">
          <button 
            class="btn-icon edit-btn" 
            id="edit-btn-${contactIndex}-${itemIndex}"
            onclick="enrichmentReview.startEditFromAPI(${contactIndex}, ${itemIndex}, '${id}')"
            title="Edit value"
          >
            ✏️
          </button>
          <button 
            class="btn-icon save-btn hidden" 
            id="save-btn-${contactIndex}-${itemIndex}"
            onclick="enrichmentReview.saveEditFromAPI(${contactIndex}, ${itemIndex}, '${id}')"
            title="Save changes"
          >
            ✓
          </button>
          <button 
            class="btn-icon cancel-btn hidden" 
            id="cancel-btn-${contactIndex}-${itemIndex}"
            onclick="enrichmentReview.cancelEdit(${contactIndex}, ${itemIndex})"
            title="Cancel editing"
          >
            ✗
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render source badge
   */
  renderSourceBadge(source, sourceMetadata) {
    if (!source || source === 'web') {
      return '<span class="source-badge source-web">🌐 Web</span>';
    }
    
    if (source === 'sms') {
      return '<span class="source-badge source-sms">💬 SMS</span>';
    }
    
    if (source === 'mms') {
      const mediaType = sourceMetadata?.mediaType || '';
      let icon = '📱';
      let label = 'MMS';
      
      if (mediaType.includes('audio')) {
        icon = '🎤';
        label = 'Voice Note';
      } else if (mediaType.includes('image')) {
        icon = '📷';
        label = 'Image';
      } else if (mediaType.includes('video')) {
        icon = '🎥';
        label = 'Video';
      }
      
      return `<span class="source-badge source-mms">${icon} ${label}</span>`;
    }
    
    return '';
  }
  
  /**
   * Render source metadata
   */
  renderSourceMetadata(sourceMetadata) {
    if (!sourceMetadata || Object.keys(sourceMetadata).length === 0) {
      return '';
    }
    
    const parts = [];
    
    if (sourceMetadata.originalMessage) {
      parts.push(`
        <div class="metadata-item">
          <span class="metadata-label">Original Message:</span>
          <span class="metadata-value">${this.escapeHtml(sourceMetadata.originalMessage)}</span>
        </div>
      `);
    }
    
    if (sourceMetadata.transcript) {
      parts.push(`
        <div class="metadata-item">
          <span class="metadata-label">Transcript:</span>
          <span class="metadata-value">${this.escapeHtml(sourceMetadata.transcript)}</span>
        </div>
      `);
    }
    
    if (sourceMetadata.phoneNumber) {
      // Mask phone number for privacy
      const masked = this.maskPhoneNumber(sourceMetadata.phoneNumber);
      parts.push(`
        <div class="metadata-item">
          <span class="metadata-label">From:</span>
          <span class="metadata-value">${masked}</span>
        </div>
      `);
    }
    
    if (parts.length === 0) {
      return '';
    }
    
    return `
      <div class="source-metadata">
        ${parts.join('')}
      </div>
    `;
  }
  
  /**
   * Mask phone number for privacy
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 4) {
      return '****';
    }
    const lastFour = phoneNumber.slice(-4);
    return `****${lastFour}`;
  }
  
  /**
   * Toggle contact group expansion
   */
  toggleContactGroup(contactIndex) {
    const itemsContainer = document.getElementById(`contact-items-${contactIndex}`);
    const chevron = document.querySelector(`[data-contact-index="${contactIndex}"] .chevron`);
    
    if (itemsContainer) {
      itemsContainer.classList.toggle('expanded');
      itemsContainer.classList.toggle('collapsed');
    }
    
    if (chevron) {
      chevron.textContent = itemsContainer.classList.contains('expanded') ? '▼' : '▶';
    }
  }
  
  /**
   * Toggle item acceptance from API
   */
  async toggleItemFromAPI(contactIndex, itemIndex, itemId) {
    const checkbox = document.getElementById(`item-${contactIndex}-${itemIndex}`);
    const itemElement = checkbox.closest('.enrichment-item');
    
    try {
      // Update via API
      const userId = this.getCurrentUserId();
      const response = await fetch(`/api/enrichment-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accepted: checkbox.checked
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update enrichment item');
      }
      
      // Update UI
      if (checkbox.checked) {
        itemElement.classList.remove('rejected');
        itemElement.classList.add('accepted');
      } else {
        itemElement.classList.remove('accepted');
        itemElement.classList.add('rejected');
      }
      
      // Update local data
      const item = this.enrichmentItems.find(i => i.id === itemId);
      if (item) {
        item.accepted = checkbox.checked;
      }
      
      // Update contact summary
      this.updateContactSummaryFromAPI(contactIndex);
    } catch (error) {
      console.error('Error toggling item:', error);
      showToast('Failed to update item', 'error');
      // Revert checkbox
      checkbox.checked = !checkbox.checked;
    }
  }
  
  /**
   * Update contact summary from API data
   */
  updateContactSummaryFromAPI(contactIndex) {
    const contactElement = document.querySelector(`[data-contact-index="${contactIndex}"]`);
    if (!contactElement) return;
    
    const itemElements = contactElement.querySelectorAll('.enrichment-item');
    let acceptedCount = 0;
    
    itemElements.forEach(el => {
      const checkbox = el.querySelector('input[type="checkbox"]');
      if (checkbox && checkbox.checked) {
        acceptedCount++;
      }
    });
    
    const summaryElement = contactElement.querySelector('.contact-summary');
    if (summaryElement) {
      summaryElement.textContent = `${acceptedCount} of ${itemElements.length} items selected`;
    }
  }
  
  /**
   * Start editing item from API
   */
  startEditFromAPI(contactIndex, itemIndex, itemId) {
    this.startEdit(contactIndex, itemIndex);
  }
  
  /**
   * Save edit from API
   */
  async saveEditFromAPI(contactIndex, itemIndex, itemId) {
    const valueEdit = document.getElementById(`value-edit-${contactIndex}-${itemIndex}`);
    const newValue = valueEdit.value.trim();
    const type = valueEdit.dataset.type;
    const field = valueEdit.dataset.field;
    
    // Validate the new value
    const validation = this.validateValue(newValue, type, field);
    
    if (!validation.valid) {
      this.showValidationError(contactIndex, itemIndex, validation.error);
      return;
    }
    
    try {
      // Update via API
      const userId = this.getCurrentUserId();
      const response = await fetch(`/api/enrichment-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          value: newValue
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update enrichment item');
      }
      
      // Update display
      const valueDisplay = document.getElementById(`value-display-${contactIndex}-${itemIndex}`);
      if (type === 'lastContactDate') {
        valueDisplay.textContent = this.formatDate(newValue);
      } else {
        valueDisplay.textContent = newValue;
      }
      
      // Update local data
      const item = this.enrichmentItems.find(i => i.id === itemId);
      if (item) {
        item.value = newValue;
      }
      
      // Exit edit mode
      this.cancelEdit(contactIndex, itemIndex);
      
      showToast('Item updated successfully', 'success');
    } catch (error) {
      console.error('Error saving edit:', error);
      showToast('Failed to save changes', 'error');
    }
  }
  
  /**
   * Accept all items
   */
  async acceptAllItems() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      showToast('User not logged in', 'error');
      return;
    }
    
    try {
      // Update all items to accepted
      const updatePromises = this.enrichmentItems.map(item => 
        fetch(`/api/enrichment-items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, accepted: true })
        })
      );
      
      await Promise.all(updatePromises);
      
      // Reload items
      await this.loadEnrichmentItems(userId, this.currentFilter);
      
      showToast('All items accepted', 'success');
    } catch (error) {
      console.error('Error accepting all items:', error);
      showToast('Failed to accept all items', 'error');
    }
  }
  
  /**
   * Reject all items
   */
  async rejectAllItems() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      showToast('User not logged in', 'error');
      return;
    }
    
    try {
      // Update all items to rejected
      const updatePromises = this.enrichmentItems.map(item => 
        fetch(`/api/enrichment-items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, accepted: false })
        })
      );
      
      await Promise.all(updatePromises);
      
      // Reload items
      await this.loadEnrichmentItems(userId, this.currentFilter);
      
      showToast('All items rejected', 'info');
    } catch (error) {
      console.error('Error rejecting all items:', error);
      showToast('Failed to reject all items', 'error');
    }
  }
  
  /**
   * Apply selected items
   */
  async applySelectedItems() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      showToast('User not logged in', 'error');
      return;
    }
    
    // Get accepted items
    const acceptedItems = this.enrichmentItems.filter(item => item.accepted);
    
    if (acceptedItems.length === 0) {
      showToast('No items selected to apply', 'warning');
      return;
    }
    
    // Show confirmation
    const confirmed = confirm(
      `Apply ${acceptedItems.length} selected enrichment item${acceptedItems.length !== 1 ? 's' : ''}?\n\n` +
      'This will update your contact information.'
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch('/api/enrichment-items/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          enrichmentIds: acceptedItems.map(item => item.id)
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply enrichment items');
      }
      
      const result = await response.json();
      
      if (result.success) {
        showToast(`Successfully applied ${result.appliedCount} enrichment item${result.appliedCount !== 1 ? 's' : ''}!`, 'success');
        
        // Reload items
        await this.loadEnrichmentItems(userId, this.currentFilter);
      } else {
        showToast(`Applied ${result.appliedCount} items, ${result.failedCount} failed`, 'warning');
      }
    } catch (error) {
      console.error('Error applying enrichment items:', error);
      showToast('Failed to apply enrichment items', 'error');
    }
  }
  
  /**
   * Get current user ID (helper method)
   */
  getCurrentUserId() {
    // This should be implemented based on your auth system
    // For now, return a placeholder
    return localStorage.getItem('userId') || 'user-123';
  }
  
  /**
   * Display enrichment proposal
   * @param {Object} proposal - Multi-contact enrichment proposal
   * @param {Function} onApply - Callback when enrichment is applied
   */
  display(proposal, onApply) {
    this.proposal = proposal;
    this.onApplyCallback = onApply;
    
    this.render();
  }
  
  render() {
    let container = document.getElementById('enrichment-review-container');
    if (!container) {
      console.warn('Enrichment review container not found, attempting to create it');
      
      // Try to find chat window messages first
      let parent = document.querySelector('.chat-window__messages');
      
      // If chat window doesn't exist, try voice-content
      if (!parent) {
        parent = document.getElementById('voice-content');
      }
      
      // If still not found, create it
      if (!parent) {
        console.log('Creating chat-window__messages container');
        parent = document.createElement('div');
        parent.className = 'chat-window__messages';
        document.body.appendChild(parent);
      }
      
      // Now create the enrichment review container
      container = document.createElement('div');
      container.id = 'enrichment-review-container';
      container.style.marginTop = '30px';
      parent.appendChild(container);
      console.log('Created enrichment-review-container in', parent.className || parent.id);
    }
    
    this.container = container;
    
    if (!this.proposal || !this.proposal.contactProposals || this.proposal.contactProposals.length === 0) {
      // If recording, show waiting state instead of empty
      if (this.isRecording) {
        container.innerHTML = `
          <div class="enrichment-review">
            <div class="enrichment-header">
              <h2>🎤 Live Enrichment</h2>
              <p class="enrichment-subtitle">Suggestions will appear as you speak...</p>
            </div>
            
            <div class="enrichment-recording-state">
              <div class="recording-pulse"></div>
              <p>Listening for contact information, locations, and other details...</p>
            </div>
          </div>
        `;
        return;
      }
      
      container.innerHTML = `
        <div class="enrichment-empty">
          <p>No enrichment proposals available.</p>
        </div>
      `;
      return;
    }
    
    // Filter out contacts with no items
    const contactsWithItems = this.proposal.contactProposals.filter(
      cp => cp.items && cp.items.length > 0
    );
    
    if (contactsWithItems.length === 0) {
      // If recording, show waiting state
      if (this.isRecording) {
        container.innerHTML = `
          <div class="enrichment-review">
            <div class="enrichment-header">
              <h2>🎤 Live Enrichment</h2>
              <p class="enrichment-subtitle">Suggestions will appear as you speak...</p>
            </div>
            
            <div class="enrichment-recording-state">
              <div class="recording-pulse"></div>
              <p>Listening for contact information, locations, and other details...</p>
            </div>
          </div>
        `;
        return;
      }
      
      container.innerHTML = `
        <div class="enrichment-empty">
          <p>No enrichment items to review.</p>
        </div>
      `;
      return;
    }
    
    // Build all rows with contact grouping
    let allRows = '';
    let currentContact = null;
    
    contactsWithItems.forEach((contactProposal, contactIndex) => {
      const { contactName, items } = contactProposal;
      
      items.forEach((item, itemIndex) => {
        // Add contact group header if this is a new contact
        if (currentContact !== contactName) {
          if (currentContact !== null) {
            allRows += `<tr class="table-spacer"><td colspan="5"></td></tr>`;
          }
          const acceptedCount = items.filter(i => i.accepted).length;
          allRows += `<tr class="contact-group-header"><td colspan="5"><strong>${this.escapeHtml(contactName)}</strong> — ${acceptedCount} of ${items.length} selected</td></tr>`;
          currentContact = contactName;
        }
        
        allRows += this.renderEnrichmentItem(item, contactIndex, itemIndex);
      });
    });
    
    container.innerHTML = `
      <div class="enrichment-review">
        <div class="enrichment-header">
          <h2>Review Enrichment Proposals</h2>
          <p class="enrichment-subtitle">Review and edit the information extracted from your voice note</p>
        </div>
        
        <table class="enrichment-table">
          <tbody>
            ${allRows}
          </tbody>
        </table>
        
        <div class="enrichment-actions">
          <button class="btn btn-secondary" onclick="enrichmentReview.acceptAll()">
            ✓ Accept All
          </button>
          <button class="btn btn-secondary" onclick="enrichmentReview.rejectAll()">
            ✗ Reject All
          </button>
          <button class="btn btn-primary" onclick="enrichmentReview.applySelected()">
            Apply Selected
          </button>
        </div>
      </div>
    `;
  }
  

  
  renderEnrichmentItem(item, contactIndex, itemIndex) {
    const { id, type, action, field, value, accepted } = item;
    
    // Determine display text
    let displayText = '';
    let displayValue = value;
    
    switch (type) {
      case 'tag':
        displayText = 'Add Tag';
        break;
      case 'group':
        displayText = 'Add to Group';
        break;
      case 'field':
        displayText = action === 'update' ? `Update ${this.formatFieldName(field)}` : `Add ${this.formatFieldName(field)}`;
        break;
      case 'lastContactDate':
        displayText = action === 'update' ? 'Update Last Contact Date' : 'Add Last Contact Date';
        displayValue = this.formatDate(value);
        break;
    }
    
    // Get icon for item type
    const icon = this.getItemIcon(type, field);
    
    return `
      <tr class="enrichment-item ${accepted ? 'accepted' : 'rejected'}" data-item-id="${id}">
        <td class="cell-checkbox">
          <input 
            type="checkbox" 
            id="item-${contactIndex}-${itemIndex}" 
            ${accepted ? 'checked' : ''}
            onchange="enrichmentReview.toggleItem(${contactIndex}, ${itemIndex})"
          />
        </td>
        
        <td class="cell-icon">${icon}</td>
        
        <td class="cell-type">${displayText}</td>
        
        <td class="cell-value">
          <span class="item-value" id="value-display-${contactIndex}-${itemIndex}">
            ${this.escapeHtml(displayValue)}
          </span>
          <input 
            type="text" 
            class="item-value-edit hidden" 
            id="value-edit-${contactIndex}-${itemIndex}"
            value="${this.escapeHtml(value)}"
            data-type="${type}"
            data-field="${field || ''}"
          />
          <span class="validation-error hidden" id="error-${contactIndex}-${itemIndex}"></span>
        </td>
        
        <td class="cell-actions">
          <button 
            class="btn-icon edit-btn" 
            id="edit-btn-${contactIndex}-${itemIndex}"
            onclick="enrichmentReview.startEdit(${contactIndex}, ${itemIndex})"
            title="Edit value"
          >
            ✏️
          </button>
          <button 
            class="btn-icon save-btn hidden" 
            id="save-btn-${contactIndex}-${itemIndex}"
            onclick="enrichmentReview.saveEdit(${contactIndex}, ${itemIndex})"
            title="Save changes"
          >
            ✓
          </button>
          <button 
            class="btn-icon cancel-btn hidden" 
            id="cancel-btn-${contactIndex}-${itemIndex}"
            onclick="enrichmentReview.cancelEdit(${contactIndex}, ${itemIndex})"
            title="Cancel editing"
          >
            ✗
          </button>
        </td>
      </tr>
    `;
  }
  
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  getItemIcon(type, field) {
    // Field-specific icons
    if (type === 'field' && field) {
      const fieldIcons = {
        location: '📍',
        phone: '📞',
        email: '✉️',
        customNotes: '📝',
        linkedIn: '💼',
        instagram: '📷',
        xHandle: '🐦'
      };
      if (fieldIcons[field]) {
        return fieldIcons[field];
      }
    }
    
    const icons = {
      tag: '🏷️',
      group: '👥',
      field: '📝',
      lastContactDate: '📅'
    };
    return icons[type] || '📝';
  }
  
  formatFieldName(field) {
    if (!field) return '';
    // Convert camelCase to Title Case
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  formatDate(dateValue) {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateValue;
    }
  }
  
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  toggleContact(contactIndex) {
    const itemsContainer = document.getElementById(`contact-items-${contactIndex}`);
    const chevron = document.querySelector(`[data-contact-index="${contactIndex}"] .chevron`);
    
    if (itemsContainer) {
      itemsContainer.classList.toggle('expanded');
      itemsContainer.classList.toggle('collapsed');
    }
    
    if (chevron) {
      chevron.textContent = itemsContainer.classList.contains('expanded') ? '▼' : '▶';
    }
  }
  
  toggleItem(contactIndex, itemIndex) {
    const checkbox = document.getElementById(`item-${contactIndex}-${itemIndex}`);
    const itemElement = checkbox.closest('.enrichment-item');
    
    // Update proposal data
    if (this.proposal && this.proposal.contactProposals[contactIndex]) {
      const item = this.proposal.contactProposals[contactIndex].items[itemIndex];
      if (item) {
        item.accepted = checkbox.checked;
      }
    }
    
    // Update UI
    if (checkbox.checked) {
      itemElement.classList.remove('rejected');
      itemElement.classList.add('accepted');
    } else {
      itemElement.classList.remove('accepted');
      itemElement.classList.add('rejected');
    }
    
    // Update contact summary
    this.updateContactSummary(contactIndex);
  }
  
  updateContactSummary(contactIndex) {
    const contactProposal = this.proposal.contactProposals[contactIndex];
    if (!contactProposal) return;
    
    const acceptedCount = contactProposal.items.filter(item => item.accepted).length;
    const totalCount = contactProposal.items.length;
    
    const summaryElement = document.querySelector(
      `[data-contact-index="${contactIndex}"] .contact-summary`
    );
    
    if (summaryElement) {
      summaryElement.textContent = `${acceptedCount} of ${totalCount} items selected`;
    }
  }
  
  startEdit(contactIndex, itemIndex) {
    const valueDisplay = document.getElementById(`value-display-${contactIndex}-${itemIndex}`);
    const valueEdit = document.getElementById(`value-edit-${contactIndex}-${itemIndex}`);
    const editBtn = document.getElementById(`edit-btn-${contactIndex}-${itemIndex}`);
    const saveBtn = document.getElementById(`save-btn-${contactIndex}-${itemIndex}`);
    const cancelBtn = document.getElementById(`cancel-btn-${contactIndex}-${itemIndex}`);
    const errorDisplay = document.getElementById(`error-${contactIndex}-${itemIndex}`);
    
    // Hide display, show edit
    valueDisplay.classList.add('hidden');
    valueEdit.classList.remove('hidden');
    editBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
    errorDisplay.classList.add('hidden');
    
    // Focus input
    valueEdit.focus();
    valueEdit.select();
    
    // Allow Enter to save, Escape to cancel
    valueEdit.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveEdit(contactIndex, itemIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelEdit(contactIndex, itemIndex);
      }
    };
  }
  
  saveEdit(contactIndex, itemIndex) {
    const valueEdit = document.getElementById(`value-edit-${contactIndex}-${itemIndex}`);
    const newValue = valueEdit.value.trim();
    const type = valueEdit.dataset.type;
    const field = valueEdit.dataset.field;
    
    // Validate the new value
    const validation = this.validateValue(newValue, type, field);
    
    if (!validation.valid) {
      this.showValidationError(contactIndex, itemIndex, validation.error);
      return;
    }
    
    // Update proposal data
    if (this.proposal && this.proposal.contactProposals[contactIndex]) {
      const item = this.proposal.contactProposals[contactIndex].items[itemIndex];
      if (item) {
        item.value = newValue;
      }
    }
    
    // Update display
    const valueDisplay = document.getElementById(`value-display-${contactIndex}-${itemIndex}`);
    if (type === 'lastContactDate') {
      valueDisplay.textContent = this.formatDate(newValue);
    } else {
      valueDisplay.textContent = newValue;
    }
    
    // Exit edit mode
    this.cancelEdit(contactIndex, itemIndex);
  }
  
  cancelEdit(contactIndex, itemIndex) {
    const valueDisplay = document.getElementById(`value-display-${contactIndex}-${itemIndex}`);
    const valueEdit = document.getElementById(`value-edit-${contactIndex}-${itemIndex}`);
    const editBtn = document.getElementById(`edit-btn-${contactIndex}-${itemIndex}`);
    const saveBtn = document.getElementById(`save-btn-${contactIndex}-${itemIndex}`);
    const cancelBtn = document.getElementById(`cancel-btn-${contactIndex}-${itemIndex}`);
    const errorDisplay = document.getElementById(`error-${contactIndex}-${itemIndex}`);
    
    // Reset value to original
    if (this.proposal && this.proposal.contactProposals[contactIndex]) {
      const item = this.proposal.contactProposals[contactIndex].items[itemIndex];
      if (item) {
        valueEdit.value = item.value;
      }
    }
    
    // Show display, hide edit
    valueDisplay.classList.remove('hidden');
    valueEdit.classList.add('hidden');
    editBtn.classList.remove('hidden');
    saveBtn.classList.add('hidden');
    cancelBtn.classList.add('hidden');
    errorDisplay.classList.add('hidden');
  }
  
  validateValue(value, type, field) {
    if (!value) {
      return { valid: false, error: 'Value cannot be empty' };
    }
    
    // Field-specific validation
    if (type === 'field') {
      switch (field) {
        case 'email':
          if (!this.isValidEmail(value)) {
            return { valid: false, error: 'Invalid email format (e.g., user@example.com)' };
          }
          break;
        case 'phone':
          if (!this.isValidPhone(value)) {
            return { valid: false, error: 'Invalid phone format (e.g., +1-555-123-4567)' };
          }
          break;
        case 'linkedIn':
          if (!this.isValidLinkedIn(value)) {
            return { valid: false, error: 'Invalid LinkedIn URL' };
          }
          break;
        case 'instagram':
          if (!this.isValidInstagram(value)) {
            return { valid: false, error: 'Invalid Instagram handle' };
          }
          break;
        case 'xHandle':
          if (!this.isValidXHandle(value)) {
            return { valid: false, error: 'Invalid X/Twitter handle' };
          }
          break;
      }
    }
    
    if (type === 'lastContactDate') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid date format (e.g., 2024-01-15)' };
      }
      if (date > new Date()) {
        return { valid: false, error: 'Date cannot be in the future' };
      }
    }
    
    return { valid: true };
  }
  
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  isValidPhone(phone) {
    // Basic phone validation - accepts various formats
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
  
  isValidLinkedIn(url) {
    return url.includes('linkedin.com/') || /^[a-zA-Z0-9\-]+$/.test(url);
  }
  
  isValidInstagram(handle) {
    return /^@?[a-zA-Z0-9._]+$/.test(handle);
  }
  
  isValidXHandle(handle) {
    return /^@?[a-zA-Z0-9_]+$/.test(handle);
  }
  
  showValidationError(contactIndex, itemIndex, error) {
    const errorDisplay = document.getElementById(`error-${contactIndex}-${itemIndex}`);
    if (errorDisplay) {
      errorDisplay.textContent = error;
      errorDisplay.classList.remove('hidden');
    }
  }
  
  acceptAll() {
    if (!this.proposal) return;
    
    // Update all items to accepted
    this.proposal.contactProposals.forEach((contactProposal, contactIndex) => {
      contactProposal.items.forEach((item, itemIndex) => {
        item.accepted = true;
        
        // Update UI
        const checkbox = document.getElementById(`item-${contactIndex}-${itemIndex}`);
        if (checkbox) {
          checkbox.checked = true;
          const itemElement = checkbox.closest('.enrichment-item');
          itemElement.classList.remove('rejected');
          itemElement.classList.add('accepted');
        }
      });
      
      this.updateContactSummary(contactIndex);
    });
    
    showToast('All items accepted', 'success');
  }
  
  rejectAll() {
    if (!this.proposal) return;
    
    // Update all items to rejected
    this.proposal.contactProposals.forEach((contactProposal, contactIndex) => {
      contactProposal.items.forEach((item, itemIndex) => {
        item.accepted = false;
        
        // Update UI
        const checkbox = document.getElementById(`item-${contactIndex}-${itemIndex}`);
        if (checkbox) {
          checkbox.checked = false;
          const itemElement = checkbox.closest('.enrichment-item');
          itemElement.classList.remove('accepted');
          itemElement.classList.add('rejected');
        }
      });
      
      this.updateContactSummary(contactIndex);
    });
    
    showToast('All items rejected', 'info');
  }
  
  async applySelected() {
    if (!this.proposal) return;
    
    // Count accepted items
    const acceptedCount = this.proposal.contactProposals.reduce((total, cp) => {
      return total + cp.items.filter(item => item.accepted).length;
    }, 0);
    
    if (acceptedCount === 0) {
      showToast('No items selected to apply', 'warning');
      return;
    }
    
    // Show confirmation
    const confirmed = confirm(
      `Apply ${acceptedCount} selected enrichment item${acceptedCount !== 1 ? 's' : ''}?\n\n` +
      'This will update your contact information.'
    );
    
    if (!confirmed) return;
    
    // Show loading state
    const applyButton = event.target;
    const originalText = applyButton.textContent;
    applyButton.disabled = true;
    applyButton.textContent = 'Applying...';
    
    try {
      // Call the callback with the proposal
      if (this.onApplyCallback) {
        await this.onApplyCallback(this.proposal);
      }
      
      showToast(`Successfully applied ${acceptedCount} enrichment item${acceptedCount !== 1 ? 's' : ''}!`, 'success');
      
      // Clear the review
      if (this.container) {
        this.container.innerHTML = `
          <div class="enrichment-success">
            <div class="success-icon">✓</div>
            <h3>Enrichment Applied Successfully</h3>
            <p>${acceptedCount} item${acceptedCount !== 1 ? 's' : ''} applied to your contacts</p>
          </div>
        `;
      }
      
    } catch (error) {
      console.error('Error applying enrichment:', error);
      showToast('Failed to apply enrichment. Please try again.', 'error');
      
      // Restore button
      applyButton.disabled = false;
      applyButton.textContent = originalText;
    }
  }
  
  setupStyles() {
    if (document.getElementById('enrichment-review-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enrichment-review-styles';
    style.textContent = `
      .enrichment-review {
        max-width: 900px;
        margin: 0 auto;
      }
      
      /* Floating panel context */
      .enrichment-review-floating .enrichment-review {
        max-width: 100%;
        margin: 0;
        padding: 16px;
      }
      
      .enrichment-review-floating .enrichment-header {
        margin-bottom: 16px;
      }
      
      .enrichment-review-floating .enrichment-header h2 {
        font-size: 16px;
        margin-bottom: 4px;
      }
      
      .enrichment-review-floating .enrichment-subtitle {
        font-size: 12px;
      }
      
      .enrichment-review-floating .enrichment-recording-state {
        padding: 20px 0;
        text-align: center;
      }
      
      .enrichment-review-floating .recording-pulse {
        width: 40px;
        height: 40px;
        margin: 0 auto 12px;
      }
      
      .enrichment-review-floating .enrichment-recording-state p {
        font-size: 13px;
      }
      
      .enrichment-header {
        margin-bottom: 30px;
      }
      
      .enrichment-header h2 {
        margin-bottom: 8px;
        color: #1f2937;
      }
      
      .enrichment-subtitle {
        color: #6b7280;
        font-size: 14px;
      }
      
      .source-filter {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        padding: 16px;
        background: #f9fafb;
        border-radius: 8px;
        flex-wrap: wrap;
      }
      
      .filter-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }
      
      .filter-btn:hover {
        border-color: #d1d5db;
        background: #f9fafb;
      }
      
      .filter-btn.active {
        background: #2563eb;
        border-color: #2563eb;
        color: white;
      }
      
      .filter-icon {
        font-size: 18px;
      }
      
      .source-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      }
      
      .source-badge.source-web {
        background: #dbeafe;
        color: #1e40af;
      }
      
      .source-badge.source-sms {
        background: #d1fae5;
        color: #065f46;
      }
      
      .source-badge.source-mms {
        background: #fce7f3;
        color: #9f1239;
      }
      
      .source-metadata {
        margin-top: 12px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 6px;
        border-left: 3px solid #3b82f6;
      }
      
      .metadata-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
      }
      
      .metadata-item:last-child {
        margin-bottom: 0;
      }
      
      .metadata-label {
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .metadata-value {
        font-size: 14px;
        color: #1f2937;
        word-break: break-word;
      }
      
      .enrichment-empty {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
      }
      

      
      .contact-proposal:hover {
        border-color: #d1d5db;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      
      .contact-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        cursor: pointer;
        user-select: none;
        background: #fafbfc;
        transition: background 0.2s;
      }
      
      .contact-header {
        border-bottom: 1px solid #e5e7eb;
      }
      
      .contact-name {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .contact-summary {
        font-size: 12px;
        color: #9ca3af;
      }
      
      .enrichment-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .contact-group-header {
        background: #f9fafb;
        border-bottom: 2px solid #e5e7eb;
        padding: 10px 12px !important;
        font-weight: 600;
        color: #1f2937;
      }
      
      .contact-group-header td {
        padding: 10px 12px;
      }
      
      .table-spacer {
        height: 8px;
        background: white;
      }
      
      .table-spacer td {
        padding: 0;
        border: none;
      }
      
      .enrichment-item {
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
      }
      
      .enrichment-item:last-child {
        border-bottom: none;
      }
      
      .enrichment-item.accepted {
        background: #f0fdf4;
      }
      
      .enrichment-item.rejected {
        background: #fafafa;
        opacity: 0.5;
      }
      
      .enrichment-item:hover {
        background: #f9fafb;
      }
      
      .enrichment-item.accepted:hover {
        background: #ecfdf5;
      }
      
      .cell-checkbox {
        width: 40px;
        padding: 8px 10px;
        text-align: center;
      }
      
      .cell-checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #10b981;
      }
      
      .cell-icon {
        width: 40px;
        padding: 8px 10px;
        text-align: center;
        font-size: 16px;
      }
      
      .cell-type {
        padding: 8px 10px;
        font-weight: 500;
        color: #374151;
        width: 140px;
      }
      
      .cell-value {
        padding: 8px 10px;
        flex: 1;
      }
      
      .cell-actions {
        padding: 8px 10px;
        text-align: right;
        width: 80px;
      }
      
      .item-value {
        color: #1f2937;
        word-break: break-word;
        line-height: 1.3;
      }
      
      .item-value-edit {
        width: 100%;
        padding: 4px 6px;
        border: 1px solid #3b82f6;
        border-radius: 4px;
        font-size: 13px;
        font-family: inherit;
      }
      
      .item-value-edit:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
      
      .validation-error {
        color: #ef4444;
        font-size: 11px;
        margin-top: 2px;
      }
      
      .item-actions {
        display: flex;
        gap: 2px;
      }
      
      .btn-icon {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        font-size: 13px;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
      }
      
      .btn-icon:hover {
        opacity: 1;
        background: #f0f0f0;
      }
      
      .edit-btn:hover {
        background: #dbeafe;
      }
      
      .save-btn:hover {
        background: #d1fae5;
      }
      
      .cancel-btn:hover {
        background: #fee2e2;
      }
      
      .enrichment-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px;
        background: #fafbfc;
        border-radius: 8px;
        margin-top: 8px;
      }
      
      .enrichment-actions .btn {
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .btn-primary {
        background: #2563eb;
        color: white;
      }
      
      .btn-primary:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
      }
      
      .btn-secondary {
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      
      .btn-secondary:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }
      
      .enrichment-success {
        text-align: center;
        padding: 60px 20px;
      }
      
      .success-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        background: #10b981;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        font-weight: bold;
      }
      
      .enrichment-success h3 {
        margin-bottom: 8px;
        color: #1f2937;
      }
      
      .enrichment-success p {
        color: #6b7280;
      }
      
      /* Recording state styles */
      .enrichment-recording-state {
        text-align: center;
        padding: 40px 20px;
        color: #6b7280;
      }
      
      .enrichment-recording-state p {
        margin: 0;
        font-size: 15px;
      }
      
      .recording-pulse {
        width: 60px;
        height: 60px;
        margin: 0 auto 20px;
        background: #ef4444;
        border-radius: 50%;
        animation: recordingPulse 1.5s ease-in-out infinite;
      }
      
      @keyframes recordingPulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
          box-shadow: 0 0 0 20px rgba(239, 68, 68, 0);
        }
      }
      
      /* Live suggestions during recording */
      .enrichment-live-suggestions {
        margin-top: 12px;
        max-height: 300px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .enrichment-live-suggestion {
        padding: 10px 12px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transform: translateX(-20px);
        transition: all 0.3s ease;
      }
      
      .enrichment-live-suggestion.visible {
        opacity: 1;
        transform: translateX(0);
      }
      
      .live-suggestion-content {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      
      .live-suggestion-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .live-suggestion-info {
        flex: 1;
        min-width: 0;
      }
      
      .live-suggestion-contact {
        font-weight: 600;
        color: #1f2937;
        font-size: 12px;
      }
      
      .live-suggestion-type {
        color: #6b7280;
        font-size: 11px;
      }
      
      .live-suggestion-value {
        color: #374151;
        font-size: 12px;
        margin-top: 2px;
        word-break: break-word;
      }
      
      .live-suggestion-confidence {
        flex-shrink: 0;
      }
      
      .confidence-badge {
        display: inline-block;
        padding: 2px 6px;
        background: #dbeafe;
        color: #0369a1;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
      }
      
      /* Toast styles for live enrichment suggestions */
      .enrichment-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        pointer-events: none;
      }
      
      .enrichment-toast {
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
        pointer-events: auto;
      }
      
      .enrichment-toast.visible {
        opacity: 1;
        transform: translateX(0);
      }
      
      .enrichment-toast-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .enrichment-toast-message {
        font-size: 14px;
        line-height: 1.5;
        color: #1f2937;
      }
      
      .enrichment-toast-actions {
        display: flex;
        gap: 8px;
      }
      
      .toast-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .toast-confirm {
        background: #10b981;
        color: white;
      }
      
      .toast-confirm:hover {
        background: #059669;
        transform: translateY(-1px);
      }
      
      .toast-reject {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #e5e7eb;
      }
      
      .toast-reject:hover {
        background: #e5e7eb;
        transform: translateY(-1px);
      }
      
      /* Contact Modal Styles */
      .enrichment-contact-modals-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        pointer-events: none;
      }
      
      .contact-modal {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
        pointer-events: auto;
      }
      
      .contact-modal.visible {
        opacity: 1;
        transform: translateX(0);
      }
      
      .contact-modal-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #fafbfc;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .contact-modal-avatar {
        width: 32px;
        height: 32px;
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
      
      .contact-modal-info {
        flex: 1;
        min-width: 0;
      }
      
      .contact-modal-name {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .contact-modal-summary {
        margin: 0;
        font-size: 12px;
        color: #9ca3af;
      }
      
      .contact-modal-close {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
        color: #6b7280;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      
      .contact-modal-close:hover {
        background: #e5e7eb;
        color: #1f2937;
      }
      
      .contact-modal-countdown-bar {
        height: 3px;
        background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
        width: 100%;
        transform-origin: left;
        animation: countdownDecrease 10s linear forwards;
      }
      
      @keyframes countdownDecrease {
        0% {
          width: 100%;
          background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
        }
        70% {
          background: linear-gradient(90deg, #f59e0b 0%, #f97316 100%);
        }
        100% {
          width: 0%;
          background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
        }
      }
      
      .contact-modal-suggestions {
        max-height: 300px;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .contact-modal-suggestion {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .contact-modal-suggestion.accepted {
        background: #f0fdf4;
        border-color: #10b981;
      }
      
      .contact-modal-suggestion.rejected {
        background: #fafafa;
        border-color: #e5e7eb;
        opacity: 0.6;
      }
      
      .contact-modal-suggestion-checkbox {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #10b981;
        flex-shrink: 0;
      }
      
      .suggestion-icon {
        font-size: 14px;
        flex-shrink: 0;
      }
      
      .suggestion-type {
        font-weight: 500;
        color: #374151;
        font-size: 12px;
        flex-shrink: 0;
      }
      
      .suggestion-value {
        color: #1f2937;
        font-size: 12px;
        flex: 1;
        min-width: 0;
        word-break: break-word;
      }
      
      .contact-modal-actions {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: #fafbfc;
        border-top: 1px solid #e5e7eb;
      }
      
      .contact-modal-apply {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
        color: white;
      }
      
      .contact-modal-apply:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      
      .contact-modal-apply:active {
        transform: translateY(0);
      }
      
      @media (max-width: 768px) {
        .enrichment-contact-modals-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
        
        .contact-modal {
          max-width: 100%;
        }
        
        .enrichment-toast-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
        
        .enrichment-item {
          flex-direction: column;
          gap: 12px;
        }
        
        .item-actions {
          width: 100%;
          justify-content: flex-end;
        }
        
        .enrichment-actions {
          flex-direction: column;
        }
        
        .live-suggestion-content {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .live-suggestion-confidence {
          align-self: flex-start;
        }
        
        .enrichment-actions .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize enrichment review
let enrichmentReview = null;

function initEnrichmentReview() {
  if (!enrichmentReview) {
    enrichmentReview = new EnrichmentReview();
  }
  return enrichmentReview;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.initEnrichmentReview = initEnrichmentReview;
  window.enrichmentReview = initEnrichmentReview();
}
