/**
 * Contact Selector Interface
 * Displays contact list with search, multi-select, and filtering by groups/tags
 * Used when contact disambiguation fails during voice note processing
 */

class ContactSelector {
  constructor() {
    this.contacts = [];
    this.groups = [];
    this.tags = [];
    this.selectedContactIds = new Set();
    this.onConfirmCallback = null;
    this.container = null;
    this.filteredContacts = [];
    this.currentGroupFilter = null;
    this.currentTagFilter = null;
    
    this.init();
  }
  
  init() {
    this.setupStyles();
  }
  
  /**
   * Display contact selector
   * @param {Array} contacts - List of user's contacts
   * @param {Array} groups - List of user's groups
   * @param {Array} tags - List of user's tags
   * @param {Function} onConfirm - Callback when contacts are selected
   */
  async display(contacts, groups, tags, onConfirm) {
    this.contacts = contacts || [];
    this.groups = groups || [];
    this.tags = tags || [];
    this.selectedContactIds.clear();
    this.onConfirmCallback = onConfirm;
    this.currentGroupFilter = null;
    this.currentTagFilter = null;
    this.filteredContacts = [...this.contacts];
    
    this.render();
  }
  
  render() {
    const container = document.getElementById('contact-selector-container');
    if (!container) {
      console.error('Contact selector container not found');
      return;
    }
    
    this.container = container;
    
    if (this.contacts.length === 0) {
      container.innerHTML = `
        <div class="contact-selector-empty">
          <p>No contacts available. Please add contacts first.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="contact-selector">
        <div class="contact-selector-header">
          <h2>Select Contacts</h2>
          <p class="contact-selector-subtitle">Choose the contacts mentioned in your voice note</p>
        </div>
        
        <!-- Search Bar -->
        <div class="contact-selector-search">
          <input 
            type="text" 
            id="contact-selector-search-input" 
            placeholder="Search by name, email, phone, or tags..." 
            oninput="contactSelector.handleSearch()"
          />
        </div>
        
        <!-- Filters -->
        <div class="contact-selector-filters">
          <div class="filter-section">
            <label>Filter by Group:</label>
            <select id="contact-selector-group-filter" onchange="contactSelector.handleGroupFilter()">
              <option value="">All Groups</option>
              ${this.groups.map(group => `
                <option value="${group.id}">${this.escapeHtml(group.name)}</option>
              `).join('')}
            </select>
          </div>
          
          <div class="filter-section">
            <label>Filter by Tag:</label>
            <select id="contact-selector-tag-filter" onchange="contactSelector.handleTagFilter()">
              <option value="">All Tags</option>
              ${this.tags.map(tag => `
                <option value="${tag.id}">${this.escapeHtml(tag.text)}</option>
              `).join('')}
            </select>
          </div>
          
          <button class="clear-filters-btn" onclick="contactSelector.clearFilters()">
            Clear Filters
          </button>
        </div>
        
        <!-- Selected Counter -->
        <div class="contact-selector-counter">
          <span id="selected-count">0</span> contact(s) selected
        </div>
        
        <!-- Contact List -->
        <div class="contact-selector-list" id="contact-selector-list">
          ${this.renderContactList()}
        </div>
        
        <!-- Actions -->
        <div class="contact-selector-actions">
          <button class="btn btn-secondary" onclick="contactSelector.cancel()">
            Cancel
          </button>
          <button 
            class="btn btn-primary" 
            id="confirm-selection-btn"
            onclick="contactSelector.confirmSelection()"
            disabled
          >
            Confirm Selection
          </button>
        </div>
      </div>
    `;
    
    this.updateSelectedCount();
  }
  
  renderContactList() {
    if (this.filteredContacts.length === 0) {
      return `
        <div class="contact-selector-empty">
          <p>No contacts match your search or filters.</p>
        </div>
      `;
    }
    
    return this.filteredContacts.map(contact => {
      const isSelected = this.selectedContactIds.has(contact.id);
      
      // Get contact's groups
      const contactGroups = contact.groups || [];
      const groupNames = contactGroups
        .map(groupId => {
          const group = this.groups.find(g => g.id === groupId);
          return group ? group.name : null;
        })
        .filter(name => name !== null);
      
      // Get contact's tags
      const contactTags = contact.tags || [];
      
      // Build details string
      const details = [];
      if (contact.email) details.push(contact.email);
      if (contact.phone) details.push(contact.phone);
      if (contact.location) details.push(contact.location);
      
      return `
        <div class="contact-selector-item ${isSelected ? 'selected' : ''}" data-contact-id="${contact.id}">
          <div class="contact-selector-checkbox">
            <input 
              type="checkbox" 
              id="contact-checkbox-${contact.id}" 
              ${isSelected ? 'checked' : ''}
              onchange="contactSelector.toggleContact('${contact.id}')"
            />
          </div>
          
          <div class="contact-selector-avatar">
            ${this.getInitials(contact.name)}
          </div>
          
          <div class="contact-selector-info" onclick="contactSelector.toggleContact('${contact.id}')">
            <div class="contact-selector-name">${this.escapeHtml(contact.name)}</div>
            ${details.length > 0 ? `
              <div class="contact-selector-details">${this.escapeHtml(details.join(' • '))}</div>
            ` : ''}
            
            ${groupNames.length > 0 || contactTags.length > 0 ? `
              <div class="contact-selector-badges">
                ${groupNames.map(name => `
                  <span class="contact-group-badge">${this.escapeHtml(name)}</span>
                `).join('')}
                ${contactTags.map(tag => `
                  <span class="contact-tag-badge">${this.escapeHtml(tag.text)}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  toggleContact(contactId) {
    if (this.selectedContactIds.has(contactId)) {
      this.selectedContactIds.delete(contactId);
    } else {
      this.selectedContactIds.add(contactId);
    }
    
    // Update UI
    const checkbox = document.getElementById(`contact-checkbox-${contactId}`);
    if (checkbox) {
      checkbox.checked = this.selectedContactIds.has(contactId);
    }
    
    const item = document.querySelector(`[data-contact-id="${contactId}"]`);
    if (item) {
      if (this.selectedContactIds.has(contactId)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    }
    
    this.updateSelectedCount();
  }
  
  updateSelectedCount() {
    const countElement = document.getElementById('selected-count');
    if (countElement) {
      countElement.textContent = this.selectedContactIds.size;
    }
    
    const confirmBtn = document.getElementById('confirm-selection-btn');
    if (confirmBtn) {
      confirmBtn.disabled = this.selectedContactIds.size === 0;
    }
  }
  
  handleSearch() {
    const input = document.getElementById('contact-selector-search-input');
    if (!input) return;
    
    const query = input.value.toLowerCase().trim();
    
    // Apply search filter
    this.applyFilters(query);
  }
  
  handleGroupFilter() {
    const select = document.getElementById('contact-selector-group-filter');
    if (!select) return;
    
    this.currentGroupFilter = select.value || null;
    this.applyFilters();
  }
  
  handleTagFilter() {
    const select = document.getElementById('contact-selector-tag-filter');
    if (!select) return;
    
    this.currentTagFilter = select.value || null;
    this.applyFilters();
  }
  
  clearFilters() {
    // Clear search
    const searchInput = document.getElementById('contact-selector-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    
    // Clear group filter
    const groupSelect = document.getElementById('contact-selector-group-filter');
    if (groupSelect) {
      groupSelect.value = '';
    }
    
    // Clear tag filter
    const tagSelect = document.getElementById('contact-selector-tag-filter');
    if (tagSelect) {
      tagSelect.value = '';
    }
    
    this.currentGroupFilter = null;
    this.currentTagFilter = null;
    
    this.applyFilters();
  }
  
  applyFilters(searchQuery = null) {
    // Get search query if not provided
    if (searchQuery === null) {
      const searchInput = document.getElementById('contact-selector-search-input');
      searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    }
    
    // Start with all contacts
    let filtered = [...this.contacts];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(contact => {
        // Search in name
        if (contact.name && contact.name.toLowerCase().includes(searchQuery)) {
          return true;
        }
        
        // Search in email
        if (contact.email && contact.email.toLowerCase().includes(searchQuery)) {
          return true;
        }
        
        // Search in phone
        if (contact.phone && contact.phone.includes(searchQuery)) {
          return true;
        }
        
        // Search in tags
        if (contact.tags && contact.tags.some(tag => 
          tag.text.toLowerCase().includes(searchQuery)
        )) {
          return true;
        }
        
        return false;
      });
    }
    
    // Apply group filter
    if (this.currentGroupFilter) {
      filtered = filtered.filter(contact => 
        contact.groups && contact.groups.includes(this.currentGroupFilter)
      );
    }
    
    // Apply tag filter
    if (this.currentTagFilter) {
      filtered = filtered.filter(contact =>
        contact.tags && contact.tags.some(tag => tag.id === this.currentTagFilter)
      );
    }
    
    this.filteredContacts = filtered;
    
    // Re-render contact list
    const listContainer = document.getElementById('contact-selector-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderContactList();
    }
  }
  
  confirmSelection() {
    if (this.selectedContactIds.size === 0) {
      showToast('Please select at least one contact', 'warning');
      return;
    }
    
    // Get selected contact objects
    const selectedContacts = this.contacts.filter(contact =>
      this.selectedContactIds.has(contact.id)
    );
    
    // Call the callback with selected contacts
    if (this.onConfirmCallback) {
      this.onConfirmCallback(selectedContacts);
    }
    
    // Clear the selector
    this.clear();
  }
  
  cancel() {
    // Call callback with empty array to indicate cancellation
    if (this.onConfirmCallback) {
      this.onConfirmCallback([]);
    }
    
    this.clear();
  }
  
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.selectedContactIds.clear();
    this.filteredContacts = [];
    this.currentGroupFilter = null;
    this.currentTagFilter = null;
  }
  
  setupStyles() {
    if (document.getElementById('contact-selector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'contact-selector-styles';
    style.textContent = `
      .contact-selector {
        max-width: 800px;
        margin: 0 auto;
      }
      
      .contact-selector-header {
        margin-bottom: 25px;
      }
      
      .contact-selector-header h2 {
        margin-bottom: 8px;
        color: #1f2937;
      }
      
      .contact-selector-subtitle {
        color: #6b7280;
        font-size: 14px;
        margin: 0;
      }
      
      .contact-selector-empty {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
      }
      
      .contact-selector-search {
        margin-bottom: 20px;
      }
      
      .contact-selector-search input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 15px;
        transition: border-color 0.2s;
      }
      
      .contact-selector-search input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .contact-selector-filters {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        align-items: flex-end;
      }
      
      .filter-section {
        flex: 1;
        min-width: 200px;
      }
      
      .filter-section label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
      }
      
      .filter-section select {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        font-size: 14px;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s;
      }
      
      .filter-section select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .clear-filters-btn {
        padding: 10px 16px;
        background: #f3f4f6;
        color: #374151;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
        white-space: nowrap;
      }
      
      .clear-filters-btn:hover {
        background: #e5e7eb;
        border-color: #d1d5db;
      }
      
      .contact-selector-counter {
        padding: 12px 16px;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        margin-bottom: 20px;
        color: #0369a1;
        font-weight: 500;
        font-size: 14px;
      }
      
      .contact-selector-counter #selected-count {
        font-weight: 700;
        font-size: 16px;
        color: #0284c7;
      }
      
      .contact-selector-list {
        max-height: 500px;
        overflow-y: auto;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        margin-bottom: 20px;
      }
      
      .contact-selector-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        transition: all 0.2s;
        cursor: pointer;
      }
      
      .contact-selector-item:last-child {
        border-bottom: none;
      }
      
      .contact-selector-item:hover {
        background: #f9fafb;
      }
      
      .contact-selector-item.selected {
        background: #eff6ff;
        border-left: 4px solid #2563eb;
        padding-left: 12px;
      }
      
      .contact-selector-checkbox {
        padding-top: 2px;
      }
      
      .contact-selector-checkbox input[type="checkbox"] {
        width: 20px;
        height: 20px;
        cursor: pointer;
        margin: 0;
      }
      
      .contact-selector-avatar {
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
        flex-shrink: 0;
      }
      
      .contact-selector-info {
        flex: 1;
        min-width: 0;
      }
      
      .contact-selector-name {
        font-weight: 600;
        color: #1f2937;
        font-size: 16px;
        margin-bottom: 4px;
      }
      
      .contact-selector-details {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 8px;
      }
      
      .contact-selector-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      
      .contact-group-badge {
        display: inline-block;
        background: #fef3c7;
        color: #92400e;
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        border: 1px solid #fcd34d;
      }
      
      .contact-tag-badge {
        display: inline-block;
        background: #dbeafe;
        color: #1e40af;
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        border: 1px solid #93c5fd;
      }
      
      .contact-selector-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px;
        background: #f9fafb;
        border-radius: 8px;
      }
      
      .contact-selector-actions .btn {
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
      
      .btn-primary:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
      }
      
      .btn-primary:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        opacity: 0.6;
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
      
      @media (max-width: 768px) {
        .contact-selector-filters {
          flex-direction: column;
        }
        
        .filter-section {
          width: 100%;
        }
        
        .clear-filters-btn {
          width: 100%;
        }
        
        .contact-selector-item {
          flex-direction: column;
          gap: 12px;
        }
        
        .contact-selector-checkbox {
          order: -1;
        }
        
        .contact-selector-actions {
          flex-direction: column;
        }
        
        .contact-selector-actions .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize contact selector
let contactSelector = null;

function initContactSelector() {
  if (!contactSelector) {
    contactSelector = new ContactSelector();
  }
  return contactSelector;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.initContactSelector = initContactSelector;
  window.contactSelector = initContactSelector();
}
