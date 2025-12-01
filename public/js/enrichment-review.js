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
    this.enrichmentItems = [];
    this.currentFilter = 'all'; // all, web, sms, mms
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  /**
   * Show the panel in recording mode (waiting for suggestions)
   */
  showRecordingMode() {
    this.isRecording = true;
    this.proposal = null;
    
    const container = document.getElementById('enrichment-review-container');
    if (!container) return;
    
    this.container = container;
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
  }
  
  /**
   * Hide the panel
   */
  hide() {
    this.isRecording = false;
    const container = document.getElementById('enrichment-review-container');
    if (container) {
      container.innerHTML = '';
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
    const container = document.getElementById('enrichment-review-container');
    if (!container) {
      console.error('Enrichment review container not found');
      return;
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
