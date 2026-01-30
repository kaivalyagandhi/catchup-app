/**
 * BatchSuggestionCard Component
 * 
 * Displays a batch of contacts grouped by relationship signal strength.
 * Allows batch assignment to circles with expand/collapse functionality.
 * 
 * Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */

class BatchSuggestionCard {
  /**
   * Create a BatchSuggestionCard instance
   * @param {Object} batch - Batch data from API
   * @param {Object} options - Configuration options
   * @param {Function} options.onAccept - Callback when batch is accepted
   * @param {Function} options.onSkip - Callback when batch is skipped
   * @param {Function} options.onProgressUpdate - Callback for progress updates
   */
  constructor(batch, options = {}) {
    this.batch = batch;           // { id, name, contacts, suggestedCircle, signalType }
    this.expanded = false;
    this.onAccept = options.onAccept || (() => {});
    this.onSkip = options.onSkip || (() => {});
    this.onProgressUpdate = options.onProgressUpdate || (() => {});
    this.selectedContactIds = new Set(batch.contacts.map(c => c.id)); // All selected by default
    this.cardElement = null;
  }
  
  /**
   * Render the batch card
   * Requirements: 6.3, 6.4
   */
  render() {
    const card = document.createElement('div');
    card.className = 'batch-suggestion-card';
    card.dataset.batchId = this.batch.id;
    
    card.innerHTML = `
      <div class="batch-card-header" role="button" tabindex="0" aria-expanded="false">
        <div class="batch-card-title">
          <span class="batch-icon">${this.getSignalIcon()}</span>
          <h3>${this.escapeHtml(this.batch.name)}</h3>
          <span class="batch-count">${this.batch.contacts.length}</span>
        </div>
        <p class="batch-description">${this.escapeHtml(this.batch.description)}</p>
        <div class="batch-suggestion">
          <div class="batch-suggestion-row">
            <span class="suggestion-label">Suggested:</span>
            <span class="circle-badge circle-badge-${this.batch.suggestedCircle}">
              ${this.getCircleDisplayName(this.batch.suggestedCircle)}
            </span>
          </div>
          <span class="signal-strength signal-${this.batch.signalStrength}">
            ${this.batch.signalStrength} signal
          </span>
        </div>
        <div class="batch-expand-indicator">
          <span>Click to view contacts</span>
          <svg class="expand-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </div>
      </div>
      
      <div class="batch-card-contacts hidden">
        <div class="contacts-list">
          ${this.batch.contacts.map(contact => this.renderContactItem(contact)).join('')}
        </div>
      </div>
      
      <div class="batch-card-actions">
        <button class="batch-btn batch-btn-primary" data-action="accept">
          Accept ${this.batch.contacts.length} Contacts
        </button>
        <button class="batch-btn batch-btn-secondary" data-action="skip">
          Skip Batch
        </button>
      </div>
    `;
    
    this.cardElement = card;
    this.attachEventListeners();
    
    return card;
  }
  
  /**
   * Render individual contact item in expanded view
   * Requirements: 6.4, 6.6
   */
  renderContactItem(contact) {
    const isSelected = this.selectedContactIds.has(contact.id);
    
    return `
      <div class="batch-contact-item ${isSelected ? 'selected' : ''}" data-contact-id="${contact.id}">
        <input 
          type="checkbox" 
          class="contact-checkbox" 
          ${isSelected ? 'checked' : ''}
          aria-label="Select ${this.escapeHtml(contact.name)}"
        >
        <div class="contact-info">
          <div class="contact-name">${this.escapeHtml(contact.name)}</div>
          <div class="contact-details">
            ${contact.email ? `<span class="contact-email">${this.escapeHtml(contact.email)}</span>` : ''}
            ${contact.calendarEventCount ? `<span class="contact-stat">${contact.calendarEventCount} events</span>` : ''}
            ${contact.metadataScore ? `<span class="contact-stat">${contact.metadataScore}% complete</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Attach event listeners to card elements
   */
  attachEventListeners() {
    if (!this.cardElement) return;
    
    // Expand/collapse on header click
    const header = this.cardElement.querySelector('.batch-card-header');
    if (header) {
      header.addEventListener('click', () => this.toggleExpand());
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleExpand();
        }
      });
    }
    
    // Accept button
    const acceptBtn = this.cardElement.querySelector('[data-action="accept"]');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent header click
        this.handleAccept();
      });
    }
    
    // Skip button
    const skipBtn = this.cardElement.querySelector('[data-action="skip"]');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent header click
        this.handleSkip();
      });
    }
    
    // Contact checkboxes (when expanded)
    const checkboxes = this.cardElement.querySelectorAll('.contact-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation(); // Prevent header click
        this.handleCheckboxChange(e);
      });
    });
  }
  
  /**
   * Toggle expand/collapse state
   * Requirements: 6.4
   */
  toggleExpand() {
    this.expanded = !this.expanded;
    
    const contactsContainer = this.cardElement.querySelector('.batch-card-contacts');
    const header = this.cardElement.querySelector('.batch-card-header');
    
    if (this.expanded) {
      contactsContainer.classList.remove('hidden');
      header.setAttribute('aria-expanded', 'true');
    } else {
      contactsContainer.classList.add('hidden');
      header.setAttribute('aria-expanded', 'false');
    }
  }
  
  /**
   * Handle checkbox change for individual contact selection
   * Requirements: 6.6
   */
  handleCheckboxChange(event) {
    const checkbox = event.target;
    const contactItem = checkbox.closest('.batch-contact-item');
    const contactId = contactItem.dataset.contactId;
    
    if (checkbox.checked) {
      this.selectedContactIds.add(contactId);
      contactItem.classList.add('selected');
    } else {
      this.selectedContactIds.delete(contactId);
      contactItem.classList.remove('selected');
    }
    
    // Update accept button text
    const acceptBtn = this.cardElement.querySelector('[data-action="accept"]');
    if (acceptBtn) {
      const selectedCount = this.selectedContactIds.size;
      acceptBtn.textContent = `Accept Batch (${selectedCount})`;
      acceptBtn.disabled = selectedCount === 0;
    }
  }
  
  /**
   * Handle Accept Batch action
   * Requirements: 6.5, 6.8, 6.9
   */
  async handleAccept() {
    const acceptBtn = this.cardElement.querySelector('[data-action="accept"]');
    const skipBtn = this.cardElement.querySelector('[data-action="skip"]');
    
    // Disable buttons during processing
    acceptBtn.disabled = true;
    skipBtn.disabled = true;
    acceptBtn.textContent = 'Processing...';
    
    try {
      // Get selected contact IDs
      const selectedContactIds = Array.from(this.selectedContactIds);
      
      if (selectedContactIds.length === 0) {
        if (typeof showToast === 'function') {
          showToast('Please select at least one contact', 'warning');
        }
        acceptBtn.disabled = false;
        skipBtn.disabled = false;
        acceptBtn.textContent = `Accept Batch (0)`;
        return;
      }
      
      // Store previous state for undo
      const previousState = {
        contactIds: selectedContactIds,
        circle: this.batch.suggestedCircle
      };
      
      // Call batch-accept API endpoint
      const response = await fetch('/api/circles/batch-accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: window.userId || localStorage.getItem('userId'),
          batchId: this.batch.id,
          circle: this.batch.suggestedCircle,
          contactIds: selectedContactIds
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to accept batch: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Show undo toast (Requirement 6.8)
      if (typeof UndoToast !== 'undefined') {
        const undoToast = new UndoToast({
          message: `Added ${selectedContactIds.length} contacts to ${this.getCircleDisplayName(this.batch.suggestedCircle)}`,
          onUndo: async () => {
            await this.undoBatchAssignment(previousState);
          }
        });
        undoToast.show();
      }
      
      // Calculate progress update (20-30% per batch) - Requirement 6.9
      // Assuming 3-5 batches total, each batch is ~20-30%
      const progressIncrement = Math.round((selectedContactIds.length / this.batch.contacts.length) * 25);
      this.onProgressUpdate(progressIncrement);
      
      // Call the accept callback
      await this.onAccept({
        batchId: this.batch.id,
        circle: this.batch.suggestedCircle,
        contactIds: selectedContactIds,
        totalContacts: this.batch.contacts.length
      });
      
      // Mark card as accepted
      this.cardElement.classList.add('batch-accepted');
      acceptBtn.textContent = '✓ Accepted';
      
      // Trigger contacts update event
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('contacts-updated'));
      }
      
      // Show success message
      if (typeof showToast === 'function') {
        showToast(`Successfully added ${selectedContactIds.length} contacts to ${this.getCircleDisplayName(this.batch.suggestedCircle)}`, 'success');
      }
      
    } catch (error) {
      console.error('Error accepting batch:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to accept batch: ${error.message}`, 'error');
      }
      
      // Re-enable buttons
      acceptBtn.disabled = false;
      skipBtn.disabled = false;
      acceptBtn.textContent = `Accept Batch (${this.selectedContactIds.size})`;
    }
  }
  
  /**
   * Undo batch assignment
   * Requirements: 8.4
   */
  async undoBatchAssignment(previousState) {
    try {
      // Remove circle assignments for the contacts
      const response = await fetch('/api/circles/batch-remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: window.userId || localStorage.getItem('userId'),
          contactIds: previousState.contactIds
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to undo batch assignment');
      }
      
      // Reset card state
      this.cardElement.classList.remove('batch-accepted');
      const acceptBtn = this.cardElement.querySelector('[data-action="accept"]');
      const skipBtn = this.cardElement.querySelector('[data-action="skip"]');
      
      if (acceptBtn) {
        acceptBtn.disabled = false;
        acceptBtn.textContent = `Accept Batch (${this.selectedContactIds.size})`;
      }
      if (skipBtn) {
        skipBtn.disabled = false;
      }
      
      // Trigger contacts update event
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('contacts-updated'));
      }
      
      if (typeof showToast === 'function') {
        showToast('Batch assignment undone', 'success');
      }
      
    } catch (error) {
      console.error('Error undoing batch assignment:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to undo: ${error.message}`, 'error');
      }
    }
  }
  
  /**
   * Handle Skip Batch action
   * Requirements: 6.7
   */
  handleSkip() {
    // Mark card as skipped
    this.cardElement.classList.add('batch-skipped');
    
    // Disable buttons
    const acceptBtn = this.cardElement.querySelector('[data-action="accept"]');
    const skipBtn = this.cardElement.querySelector('[data-action="skip"]');
    
    if (acceptBtn) {
      acceptBtn.disabled = true;
    }
    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.textContent = 'Skipped';
    }
    
    // Call skip callback
    this.onSkip({
      batchId: this.batch.id,
      contactCount: this.batch.contacts.length
    });
    
    // Show feedback
    if (typeof showToast === 'function') {
      showToast(`Skipped batch of ${this.batch.contacts.length} contacts`, 'info');
    }
  }
  
  /**
   * Get icon for signal type
   */
  getSignalIcon() {
    const icons = {
      calendar: '📅',
      metadata: '📋',
      communication: '💬',
      mixed: '🔗'
    };
    return icons[this.batch.signalType] || '👥';
  }
  
  /**
   * Get display name for circle
   */
  getCircleDisplayName(circle) {
    const names = {
      inner: 'Inner Circle',
      close: 'Close Friends',
      active: 'Active Friends',
      casual: 'Casual Network'
    };
    return names[circle] || circle;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Destroy the card
   */
  destroy() {
    if (this.cardElement && this.cardElement.parentNode) {
      this.cardElement.parentNode.removeChild(this.cardElement);
    }
    this.cardElement = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchSuggestionCard;
}
