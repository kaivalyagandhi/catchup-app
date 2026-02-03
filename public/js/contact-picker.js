/**
 * Contact Picker Component
 * 
 * Multi-select contact picker with search, circle filters, and group filters.
 * Used in plan creation modal for selecting invitees.
 * 
 * Requirements: 2.2-2.8, 17.3, 17.4
 */

class ContactPicker {
  constructor(options = {}) {
    this.containerId = options.containerId;
    this.userId = options.userId || window.userId || localStorage.getItem('userId');
    this.onSelectionChange = options.onSelectionChange || (() => {});
    this.preSelectedContacts = options.preSelectedContacts || [];
    this.preSelectedCircle = options.preSelectedCircle || null;
    
    // State
    this.contacts = [];
    this.groups = [];
    this.selectedContacts = new Map();
    this.currentCircleFilter = 'all';
    this.currentGroupFilter = '';
    this.searchQuery = '';
    this.searchDebounceTimer = null;
    
    // Bind methods
    this.handleSearch = this.handleSearch.bind(this);
    this.handleCircleFilter = this.handleCircleFilter.bind(this);
    this.handleGroupFilter = this.handleGroupFilter.bind(this);
    this.handleContactClick = this.handleContactClick.bind(this);
    this.handleAddAll = this.handleAddAll.bind(this);
    this.handleRemoveContact = this.handleRemoveContact.bind(this);
  }
  
  /**
   * Initialize the contact picker
   */
  async init() {
    console.log('[ContactPicker] init() called');
    try {
      console.log('[ContactPicker] Starting to load contacts and groups...');
      await Promise.all([
        this.loadContacts(),
        this.loadGroups()
      ]);
      
      console.log('[ContactPicker] After loading - contacts count:', this.contacts.length);
      console.log('[ContactPicker] After loading - groups count:', this.groups.length);
      
      // Pre-select contacts if provided
      this.preSelectedContacts.forEach(contact => {
        this.selectedContacts.set(contact.id, {
          ...contact,
          attendanceType: 'must_attend'
        });
      });
      
      // Apply pre-selected circle filter
      if (this.preSelectedCircle) {
        this.currentCircleFilter = this.preSelectedCircle;
      }
      
      console.log('[ContactPicker] About to render with', this.contacts.length, 'contacts');
      this.render();
      this.attachEventListeners();
      console.log('[ContactPicker] init() complete');
    } catch (error) {
      console.error('[ContactPicker] Failed to initialize contact picker:', error);
    }
  }
  
  /**
   * Load contacts from API
   */
  async loadContacts() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      console.log('[ContactPicker] Loading contacts for userId:', userId);
      console.log('[ContactPicker] window.userId:', window.userId);
      console.log('[ContactPicker] localStorage userId:', localStorage.getItem('userId'));
      console.log('[ContactPicker] this.userId:', this.userId);
      
      if (!userId) {
        console.error('[ContactPicker] ERROR: No userId available!');
        this.contacts = [];
        return;
      }
      
      const url = `/api/contacts?userId=${userId}`;
      console.log('[ContactPicker] Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      console.log('[ContactPicker] Response status:', response.status);
      console.log('[ContactPicker] Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ContactPicker] Raw response data type:', typeof data);
        console.log('[ContactPicker] Is array:', Array.isArray(data));
        console.log('[ContactPicker] Data length:', data?.length);
        
        if (Array.isArray(data)) {
          this.contacts = data;
          console.log('[ContactPicker] Loaded', this.contacts.length, 'contacts');
          if (this.contacts.length > 0) {
            console.log('[ContactPicker] First contact:', this.contacts[0]);
          }
        } else {
          console.error('[ContactPicker] Response is not an array:', data);
          this.contacts = [];
        }
      } else {
        const errorText = await response.text();
        console.error('[ContactPicker] Failed to load contacts, status:', response.status, 'body:', errorText);
        this.contacts = [];
      }
    } catch (error) {
      console.error('[ContactPicker] Exception loading contacts:', error);
      this.contacts = [];
    }
  }
  
  /**
   * Load groups from API
   */
  async loadGroups() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      console.log('[ContactPicker] Loading groups for userId:', userId);
      const response = await fetch(`/api/contacts/groups?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        this.groups = await response.json();
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      this.groups = [];
    }
  }
  
  /**
   * Render the contact picker
   */
  render() {
    console.log('[ContactPicker] render() called');
    console.log('[ContactPicker] this.contacts.length:', this.contacts.length);
    console.log('[ContactPicker] this.groups.length:', this.groups.length);
    
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('[ContactPicker] Container not found:', this.containerId);
      return;
    }
    
    console.log('[ContactPicker] Container found, rendering...');
    
    container.innerHTML = `
      <div class="contact-picker-container">
        <div class="picker-header">
          <input type="search" 
                 id="contact-search" 
                 placeholder="Search contacts..." 
                 class="contact-search-input"
                 value="${this.escapeHtml(this.searchQuery)}">
        </div>
        
        <div class="filter-section">
          <div class="circle-filters">
            ${this.renderCircleFilters()}
          </div>
          
          <div class="group-filter">
            <select id="group-filter">
              <option value="">All Groups</option>
              ${this.groups.map(g => `
                <option value="${g.id}" ${this.currentGroupFilter === g.id ? 'selected' : ''}>
                  ${this.escapeHtml(g.name)}
                </option>
              `).join('')}
            </select>
          </div>
          
          <button class="add-all-btn" id="add-all-filtered">Add All Visible</button>
        </div>
        
        <div class="contacts-grid" id="contacts-grid">
          ${this.renderContactsGrid()}
        </div>
        
        <div class="selected-contacts-summary">
          <h4>Selected (${this.selectedContacts.size})</h4>
          <div class="selected-chips" id="selected-chips">
            ${this.renderSelectedChips()}
          </div>
        </div>
      </div>
    `;
    
    console.log('[ContactPicker] render() complete');
  }
  
  /**
   * Render circle filter buttons
   */
  renderCircleFilters() {
    const circles = [
      { id: 'all', label: 'All', emoji: '' },
      { id: 'inner', label: 'Inner Circle', emoji: '💜' },
      { id: 'close', label: 'Close Friends', emoji: '💗' },
      { id: 'active', label: 'Active Friends', emoji: '💚' },
      { id: 'casual', label: 'Casual Network', emoji: '💙' }
    ];
    
    return circles.map(circle => `
      <button class="circle-filter-btn ${this.currentCircleFilter === circle.id ? 'active' : ''}" 
              data-circle="${circle.id}">
        ${circle.emoji} ${circle.label}
      </button>
    `).join('');
  }
  
  /**
   * Render contacts grid
   */
  renderContactsGrid() {
    const filteredContacts = this.getFilteredContacts();
    console.log('[ContactPicker] renderContactsGrid - filteredContacts.length:', filteredContacts.length);
    console.log('[ContactPicker] renderContactsGrid - this.contacts.length:', this.contacts.length);
    console.log('[ContactPicker] renderContactsGrid - searchQuery:', this.searchQuery);
    console.log('[ContactPicker] renderContactsGrid - currentCircleFilter:', this.currentCircleFilter);
    console.log('[ContactPicker] renderContactsGrid - currentGroupFilter:', this.currentGroupFilter);
    
    if (filteredContacts.length === 0) {
      console.log('[ContactPicker] No filtered contacts, showing empty state');
      return `
        <div class="empty-contacts">
          <p>No contacts found</p>
        </div>
      `;
    }
    
    console.log('[ContactPicker] Rendering', filteredContacts.length, 'contacts');
    
    return filteredContacts.map(contact => {
      const isSelected = this.selectedContacts.has(contact.id);
      const initials = this.getInitials(contact.name);
      
      return `
        <div class="contact-item ${isSelected ? 'selected' : ''}" 
             data-contact-id="${contact.id}">
          <div class="contact-avatar" style="background-color: ${this.getAvatarColor(contact.name)}">
            ${initials}
          </div>
          <span class="contact-name">${this.escapeHtml(contact.name)}</span>
        </div>
      `;
    }).join('');
  }
  
  /**
   * Render selected contact chips
   */
  renderSelectedChips() {
    if (this.selectedContacts.size === 0) {
      return '<span class="no-selection">No contacts selected</span>';
    }
    
    return Array.from(this.selectedContacts.values()).map(contact => `
      <div class="selected-chip" data-contact-id="${contact.id}">
        <span>${this.escapeHtml(contact.name)}</span>
        <button class="remove-btn" data-contact-id="${contact.id}">&times;</button>
      </div>
    `).join('');
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Search input
    const searchInput = container.querySelector('#contact-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearch);
    }
    
    // Circle filter buttons
    container.querySelectorAll('.circle-filter-btn').forEach(btn => {
      btn.addEventListener('click', this.handleCircleFilter);
    });
    
    // Group filter dropdown
    const groupFilter = container.querySelector('#group-filter');
    if (groupFilter) {
      groupFilter.addEventListener('change', this.handleGroupFilter);
    }
    
    // Add all button
    const addAllBtn = container.querySelector('#add-all-filtered');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', this.handleAddAll);
    }
    
    // Contact items
    container.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', this.handleContactClick);
    });
    
    // Remove buttons in chips
    container.querySelectorAll('.selected-chip .remove-btn').forEach(btn => {
      btn.addEventListener('click', this.handleRemoveContact);
    });
  }
  
  /**
   * Handle search input with debounce
   */
  handleSearch(e) {
    const query = e.target.value;
    
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Debounce search by 300ms
    this.searchDebounceTimer = setTimeout(() => {
      this.searchQuery = query;
      this.updateContactsGrid();
    }, 300);
  }
  
  /**
   * Handle circle filter change
   */
  handleCircleFilter(e) {
    const circle = e.currentTarget.dataset.circle;
    if (circle !== this.currentCircleFilter) {
      this.currentCircleFilter = circle;
      this.render();
      this.attachEventListeners();
    }
  }
  
  /**
   * Handle group filter change
   */
  handleGroupFilter(e) {
    this.currentGroupFilter = e.target.value;
    this.updateContactsGrid();
  }
  
  /**
   * Handle contact click (toggle selection)
   */
  handleContactClick(e) {
    const contactId = e.currentTarget.dataset.contactId;
    const contact = this.contacts.find(c => c.id === contactId);
    
    if (!contact) return;
    
    if (this.selectedContacts.has(contactId)) {
      this.selectedContacts.delete(contactId);
    } else {
      this.selectedContacts.set(contactId, {
        ...contact,
        attendanceType: 'must_attend'
      });
    }
    
    this.updateUI();
    this.notifySelectionChange();
  }
  
  /**
   * Handle add all visible contacts
   */
  handleAddAll() {
    const filteredContacts = this.getFilteredContacts();
    
    filteredContacts.forEach(contact => {
      if (!this.selectedContacts.has(contact.id)) {
        this.selectedContacts.set(contact.id, {
          ...contact,
          attendanceType: 'must_attend'
        });
      }
    });
    
    this.updateUI();
    this.notifySelectionChange();
  }
  
  /**
   * Handle remove contact from selection
   */
  handleRemoveContact(e) {
    e.stopPropagation();
    const contactId = e.currentTarget.dataset.contactId;
    
    if (this.selectedContacts.has(contactId)) {
      this.selectedContacts.delete(contactId);
      this.updateUI();
      this.notifySelectionChange();
    }
  }
  
  /**
   * Get filtered contacts based on current filters
   */
  getFilteredContacts() {
    let filtered = [...this.contacts];
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(query))
      );
    }
    
    // Apply circle filter - check both 'circle' and 'dunbarCircle' properties
    if (this.currentCircleFilter && this.currentCircleFilter !== 'all') {
      filtered = filtered.filter(contact => 
        contact.circle === this.currentCircleFilter ||
        contact.dunbarCircle === this.currentCircleFilter
      );
    }
    
    // Apply group filter
    if (this.currentGroupFilter) {
      filtered = filtered.filter(contact => 
        contact.groups && contact.groups.includes(this.currentGroupFilter)
      );
    }
    
    return filtered;
  }
  
  /**
   * Update contacts grid without full re-render
   */
  updateContactsGrid() {
    const grid = document.getElementById('contacts-grid');
    if (grid) {
      grid.innerHTML = this.renderContactsGrid();
      
      // Re-attach contact click listeners
      grid.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', this.handleContactClick);
      });
    }
  }
  
  /**
   * Update UI after selection change
   */
  updateUI() {
    // Update contacts grid selection state
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    container.querySelectorAll('.contact-item').forEach(item => {
      const contactId = item.dataset.contactId;
      if (this.selectedContacts.has(contactId)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
    
    // Update selected chips
    const chipsContainer = container.querySelector('#selected-chips');
    if (chipsContainer) {
      chipsContainer.innerHTML = this.renderSelectedChips();
      
      // Re-attach remove button listeners
      chipsContainer.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', this.handleRemoveContact);
      });
    }
    
    // Update count in header
    const summaryHeader = container.querySelector('.selected-contacts-summary h4');
    if (summaryHeader) {
      summaryHeader.textContent = `Selected (${this.selectedContacts.size})`;
    }
  }
  
  /**
   * Notify parent of selection change
   */
  notifySelectionChange() {
    this.onSelectionChange(Array.from(this.selectedContacts.values()));
  }
  
  /**
   * Get selected contacts
   */
  getSelectedContacts() {
    return Array.from(this.selectedContacts.values());
  }
  
  /**
   * Set attendance type for a contact
   */
  setAttendanceType(contactId, type) {
    const contact = this.selectedContacts.get(contactId);
    if (contact) {
      contact.attendanceType = type;
      this.selectedContacts.set(contactId, contact);
    }
  }
  
  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedContacts.clear();
    this.updateUI();
    this.notifySelectionChange();
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  
  /**
   * Get avatar background color based on name
   */
  getAvatarColor(name) {
    const colors = [
      '#d1fae5', // sage
      '#fef3c7', // sand
      '#fce7f3', // rose
      '#e7e5e4', // stone
      '#dbeafe', // blue
      '#f3e8ff', // purple
    ];
    
    if (!name) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
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
}

// Export for use in other modules
window.ContactPicker = ContactPicker;
