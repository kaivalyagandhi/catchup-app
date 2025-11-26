/**
 * Enrichment Review Interface
 * Displays enrichment proposals grouped by contact with inline editing and bulk actions
 */

class EnrichmentReview {
  constructor() {
    this.proposal = null;
    this.container = null;
    this.onApplyCallback = null;
    
    this.init();
  }
  
  init() {
    this.setupStyles();
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
    const container = document.getElementById('enrichment-review-container');
    if (!container) {
      console.error('Enrichment review container not found');
      return;
    }
    
    this.container = container;
    
    if (!this.proposal || !this.proposal.contactProposals || this.proposal.contactProposals.length === 0) {
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
    const icon = this.getItemIcon(type);
    
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
  
  getItemIcon(type) {
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
      
      @media (max-width: 768px) {
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
