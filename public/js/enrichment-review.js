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
    
    this.init();
  }
  
  init() {
    this.setupStyles();
    this.setupToastEventListeners();
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
   * Show the panel in recording mode (waiting for suggestions)
   * Now just sets the flag - toasts will be shown as suggestions arrive
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
   * Add a live suggestion during recording as a toast
   * @param {Object} suggestion - Enrichment suggestion
   */
  addLiveSuggestion(suggestion) {
    if (!this.isRecording) return;
    
    const icon = this.getItemIcon(suggestion.type, suggestion.field);
    const displayText = this.formatSuggestionType(suggestion.type);
    const contactName = suggestion.contactHint || 'Unknown Contact';
    const value = this.escapeHtml(suggestion.value);
    
    // Create toast message
    const message = `${icon} <strong>${this.escapeHtml(contactName)}</strong><br>${displayText}: ${value}`;
    
    // Show as toast with confirm/reject buttons
    this.showEnrichmentToast(message, suggestion);
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
    
    container.innerHTML = `
      <div class="enrichment-review">
        <div class="enrichment-header">
          <h2>Review Enrichment Proposals</h2>
          <p class="enrichment-subtitle">Review and edit the information extracted from your voice note</p>
        </div>
        
        <div class="enrichment-contacts">
          ${contactsWithItems.map((contactProposal, index) => this.renderContactProposal(contactProposal, index)).join('')}
        </div>
        
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
  
  renderContactProposal(contactProposal, index) {
    const { contactId, contactName, items } = contactProposal;
    const acceptedCount = items.filter(item => item.accepted).length;
    
    // Get contact initials for avatar
    const initials = this.getInitials(contactName);
    
    return `
      <div class="contact-proposal" data-contact-index="${index}">
        <div class="contact-header" onclick="enrichmentReview.toggleContact(${index})">
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
          ${items.map((item, itemIndex) => this.renderEnrichmentItem(item, index, itemIndex)).join('')}
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
      <div class="enrichment-item ${accepted ? 'accepted' : 'rejected'}" data-item-id="${id}">
        <div class="item-checkbox">
          <input 
            type="checkbox" 
            id="item-${contactIndex}-${itemIndex}" 
            ${accepted ? 'checked' : ''}
            onchange="enrichmentReview.toggleItem(${contactIndex}, ${itemIndex})"
          />
        </div>
        
        <div class="item-icon">${icon}</div>
        
        <div class="item-content">
          <div class="item-header">
            <span class="item-type">${displayText}</span>
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
              data-type="${type}"
              data-field="${field || ''}"
            />
            <span class="validation-error hidden" id="error-${contactIndex}-${itemIndex}"></span>
          </div>
        </div>
        
        <div class="item-actions">
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
        </div>
      </div>
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
      
      .enrichment-empty {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
      }
      
      .enrichment-contacts {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .contact-proposal {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s;
      }
      
      .contact-proposal:hover {
        border-color: #d1d5db;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      
      .contact-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        cursor: pointer;
        user-select: none;
        background: #f9fafb;
        transition: background 0.2s;
      }
      
      .contact-header:hover {
        background: #f3f4f6;
      }
      
      .contact-info {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .contact-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 18px;
      }
      
      .contact-details {
        flex: 1;
      }
      
      .contact-name {
        margin: 0 0 4px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .contact-summary {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
      }
      
      .expand-icon {
        color: #9ca3af;
        transition: transform 0.2s;
      }
      
      .chevron {
        font-size: 14px;
      }
      
      .contact-items {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }
      
      .contact-items.expanded {
        max-height: 2000px;
        padding: 10px 20px 20px 20px;
      }
      
      .contact-items.collapsed {
        max-height: 0;
        padding: 0 20px;
      }
      
      .enrichment-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 12px;
        transition: all 0.2s;
      }
      
      .enrichment-item:last-child {
        margin-bottom: 0;
      }
      
      .enrichment-item.accepted {
        border-color: #10b981;
        background: #f0fdf4;
      }
      
      .enrichment-item.rejected {
        border-color: #e5e7eb;
        background: #f9fafb;
        opacity: 0.6;
      }
      
      .item-checkbox {
        padding-top: 2px;
      }
      
      .item-checkbox input[type="checkbox"] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
      
      .item-icon {
        font-size: 24px;
        padding-top: 2px;
      }
      
      .item-content {
        flex: 1;
        min-width: 0;
      }
      
      .item-header {
        margin-bottom: 6px;
      }
      
      .item-type {
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }
      
      .item-value-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .item-value {
        color: #1f2937;
        font-size: 15px;
        word-break: break-word;
      }
      
      .item-value-edit {
        width: 100%;
        padding: 8px 12px;
        border: 2px solid #3b82f6;
        border-radius: 6px;
        font-size: 15px;
        font-family: inherit;
      }
      
      .item-value-edit:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .validation-error {
        color: #ef4444;
        font-size: 13px;
        margin-top: 4px;
      }
      
      .item-actions {
        display: flex;
        gap: 6px;
        padding-top: 2px;
      }
      
      .btn-icon {
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 6px;
        font-size: 16px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .btn-icon:hover {
        background: #f3f4f6;
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
        gap: 12px;
        padding: 20px;
        background: #f9fafb;
        border-radius: 12px;
      }
      
      .enrichment-actions .btn {
        padding: 12px 24px;
        font-size: 15px;
        font-weight: 600;
        border-radius: 8px;
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
        border: 2px solid #e5e7eb;
      }
      
      .btn-secondary:hover {
        background: #f9fafb;
        border-color: #d1d5db;
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
      
      @media (max-width: 768px) {
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
