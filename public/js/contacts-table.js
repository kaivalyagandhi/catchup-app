/**
 * ContactsTable Component
 * 
 * Displays contacts in a sortable, filterable, editable table format.
 * Implements Requirements: 1.1, 1.3, 1.4, 1.5, 8.1
 */

class ContactsTable {
  constructor(container, data = [], options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    this.data = data;
    this.filteredData = data;
    this.options = {
      sortBy: 'name',
      sortOrder: 'asc',
      onEdit: null,
      onDelete: null,
      onAdd: null,
      ...options
    };
    
    this.editingCell = null;
    this.addingContact = false;
    this.newContactRow = null;
    
    // Load sort preference from sessionStorage (Requirement 6.5)
    this.loadSortPreference();
  }

  /**
   * Render the complete table structure
   * Requirements: 1.1, 1.3, 5.1, 6.1
   */
  render() {
    if (!this.container) {
      console.error('ContactsTable: Container not found');
      return;
    }

    const tableHTML = `
      <div class="contacts-table-header">
        <div class="contacts-table-controls">
          <div class="header-actions">
            <button class="btn-add-contact" title="Add new contact">
              ➕ Add Contact
            </button>
          </div>
          <div class="sort-controls">
            <label for="sort-order-select">Sort by:</label>
            <select id="sort-order-select" class="sort-order-select">
              <option value="alphabetical" ${this.options.sortBy === 'name' ? 'selected' : ''}>Alphabetical</option>
              <option value="recently-added" ${this.options.sortBy === 'createdAt' ? 'selected' : ''}>Recently Added</option>
              <option value="recently-met" ${this.options.sortBy === 'lastInteractionAt' ? 'selected' : ''}>Recently Met</option>
            </select>
          </div>
        </div>
        <div id="search-filter-bar-container"></div>
      </div>
      <div class="contacts-table-layout">
        <div class="contacts-table-wrapper">
          <table class="contacts-table">
            <thead>
              <tr>
                <th class="sortable" data-column="name">Name <span class="sort-indicator"></span></th>
                <th data-column="phone">Phone</th>
                <th data-column="email">Email</th>
                <th class="sortable" data-column="location">Location <span class="sort-indicator"></span></th>
                <th class="sortable" data-column="timezone">Timezone <span class="sort-indicator"></span></th>
                <th class="sortable" data-column="frequencyPreference">Frequency <span class="sort-indicator"></span></th>
                <th class="sortable" data-column="dunbarCircle">Circle <span class="sort-indicator"></span></th>
                <th data-column="tags">Tags</th>
                <th data-column="groups">Groups</th>
                <th data-column="source">Source</th>
                <th data-column="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderRows()}
            </tbody>
          </table>
        </div>
        <div id="az-scrollbar-container"></div>
      </div>
    `;

    this.container.innerHTML = tableHTML;
    
    // Clear references to old DOM elements since we just recreated everything
    this.searchFilterBar = null;
    this.azScrollbar = null;
    
    // Initialize SearchFilterBar
    const searchContainer = this.container.querySelector('#search-filter-bar-container');
    if (searchContainer && typeof SearchFilterBar !== 'undefined') {
      this.searchFilterBar = new SearchFilterBar(searchContainer, {
        onSearch: (query) => this.handleSearch(query),
        onFilter: (filters) => this.handleFilter(filters),
        onFetchTags: () => this.getAvailableTags(),
        onFetchGroups: () => this.getAvailableGroups(),
        onGetLocations: () => this.getUniqueLocations()
      });
      this.searchFilterBar.render();
    }
    
    // Initialize AZScrollbar (only in alphabetical sort mode)
    const azContainer = this.container.querySelector('#az-scrollbar-container');
    if (azContainer) {
      // Show/hide based on sort order
      const shouldShowAZ = this.options.sortBy === 'name';
      
      if (shouldShowAZ) {
        azContainer.style.display = 'flex';
        const tableWrapper = this.container.querySelector('.contacts-table-wrapper');
        if (tableWrapper && typeof AZScrollbar !== 'undefined') {
          // Always create a new instance since we just recreated the DOM
          this.azScrollbar = new AZScrollbar(azContainer, tableWrapper, this.filteredData);
          this.azScrollbar.render();
        }
      } else {
        // Hide the scrollbar when not in alphabetical mode
        azContainer.style.display = 'none';
      }
    }
    
    this.attachEventListeners();
    this.updateSortIndicators();
  }

  /**
   * Render table rows for all contacts
   * Requirements: 1.1, 1.3
   */
  renderRows() {
    if (this.filteredData.length === 0) {
      return `
        <tr class="empty-state">
          <td colspan="11" style="text-align: center; padding: 40px; color: #6b7280;">
            No contacts found
          </td>
        </tr>
      `;
    }

    return this.filteredData.map(contact => this.renderRow(contact)).join('');
  }

  /**
   * Render a single contact row
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 17.1, 17.2
   */
  renderRow(contact) {
    try {
      // Render badges for circle, tags, groups, and source
      const circleBadge = this.renderCircleBadge(contact);
      const tagsBadges = this.renderTagsBadges(contact);
      const groupsBadges = this.renderGroupsBadges(contact);
      const sourceBadge = this.renderSourceBadge(contact);
      
      // Ensure all text values are properly escaped strings
      const name = this.escapeHtml(contact.name || '');
      const phone = this.escapeHtml(contact.phone || '');
      const email = this.escapeHtml(contact.email || '');
      const location = this.escapeHtml(contact.location || '');
      const timezone = this.escapeHtml(contact.timezone || '');
      const frequency = this.escapeHtml(contact.frequencyPreference || '');
      
      return `
        <tr data-contact-id="${contact.id}">
          <td class="contact-name editable" data-field="name" data-type="text" data-label="Name">${name || '<span class="empty-cell">—</span>'}</td>
          <td class="contact-phone editable" data-field="phone" data-type="phone" data-label="Phone">${phone || '<span class="empty-cell">—</span>'}</td>
          <td class="contact-email editable" data-field="email" data-type="email" data-label="Email">${email || '<span class="empty-cell">—</span>'}</td>
          <td class="contact-location editable" data-field="location" data-type="text" data-label="Location">${location || '<span class="empty-cell">—</span>'}</td>
          <td class="contact-timezone editable" data-field="timezone" data-type="dropdown" data-label="Timezone">${timezone || '<span class="empty-cell">—</span>'}</td>
          <td class="contact-frequency editable" data-field="frequencyPreference" data-type="dropdown" data-label="Frequency">${frequency || '<span class="empty-cell">—</span>'}</td>
          <td class="contact-circle" data-label="Circle">${circleBadge}</td>
          <td class="contact-tags editable" data-field="tags" data-type="multiselect" data-label="Tags">${tagsBadges}</td>
          <td class="contact-groups editable" data-field="groups" data-type="multiselect" data-label="Groups">${groupsBadges}</td>
          <td class="contact-source" data-label="Source">${sourceBadge}</td>
          <td class="contact-actions" data-label="Actions">
            <button class="btn-archive" data-contact-id="${contact.id}" title="Archive contact">📦</button>
            <button class="btn-delete" data-contact-id="${contact.id}" title="Delete contact">×</button>
          </td>
        </tr>
      `;
    } catch (error) {
      console.error('Error rendering row for contact:', contact, error);
      return '';
    }
  }

  /**
   * Render circle badge for a contact
   * Requirements: 8.1, 8.2
   */
  renderCircleBadge(contact) {
    // Always return a value, never undefined
    if (!contact.dunbarCircle) {
      return '<span class="badge badge-uncategorized">Uncategorized</span>';
    }

    const circleColors = {
      'inner': '#8b5cf6',      // purple
      'close': '#3b82f6',      // blue
      'active': '#10b981',     // green
      'casual': '#f59e0b',     // amber
      'acquaintance': '#6b7280' // gray
    };

    const circleLabels = {
      'inner': 'Inner Circle',
      'close': 'Close Friends',
      'active': 'Active Friends',
      'casual': 'Casual Network',
      'acquaintance': 'Acquaintances'
    };

    const color = circleColors[contact.dunbarCircle] || '#6b7280';
    const label = circleLabels[contact.dunbarCircle] || contact.dunbarCircle;

    return `<span class="badge badge-circle" style="background-color: ${color}; color: white;">${this.escapeHtml(label)}</span>`;
  }

  /**
   * Render source badge (Google badge for Google-sourced contacts)
   * Requirements: 1.4
   */
  renderSourceBadge(contact) {
    if (contact.source === 'google') {
      return `<span class="badge badge-google" title="Synced from Google Contacts">
  <svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 4px;">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Google
</span>`;
    } else if (contact.source === 'manual') {
      return `<span class="badge badge-manual" title="Manually added">Manual</span>`;
    }
    return '<span class="empty-cell">—</span>';
  }

  /**
   * Render tags as badges
   * Requirements: 1.5
   */
  renderTagsBadges(contact) {
    if (!contact.tags || contact.tags.length === 0) {
      return '<span class="empty-cell">—</span>';
    }

    const badges = contact.tags
      .map(tag => {
        const tagText = typeof tag === 'string' ? tag : (tag.text || '');
        return `<span class="badge badge-tag">${this.escapeHtml(tagText)}</span>`;
      })
      .join(' ');
    
    return badges || '<span class="empty-cell">—</span>';
  }

  /**
   * Render groups as badges
   * Requirements: 1.5
   */
  renderGroupsBadges(contact) {
    if (!contact.groups || contact.groups.length === 0) {
      return '<span class="empty-cell">—</span>';
    }

    // Resolve group IDs to names using global groups array
    const badges = contact.groups
      .map(groupId => {
        const group = this.getGroupById(groupId);
        const groupName = group ? group.name : groupId;
        return `<span class="badge badge-group">${this.escapeHtml(groupName)}</span>`;
      })
      .filter(badge => badge) // Remove any null/undefined badges
      .join(' ');
    
    return badges || '<span class="empty-cell">—</span>';
  }

  /**
   * Sort the table by a column
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  sort(column, order = 'asc') {
    this.options.sortBy = column;
    this.options.sortOrder = order;

    this.filteredData.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle special sorting for circle (Requirement 8.5)
      if (column === 'circle' || column === 'dunbarCircle') {
        const circleOrder = {
          'inner': 1,
          'close': 2,
          'active': 3,
          'casual': 4,
          'acquaintance': 5,
          '': 6,
          'undefined': 6,
          'null': 6
        };
        
        const aCircle = a.dunbarCircle || '';
        const bCircle = b.dunbarCircle || '';
        
        aVal = circleOrder[aCircle] || 6;
        bVal = circleOrder[bCircle] || 6;
        
        if (order === 'asc') {
          return aVal - bVal;
        } else {
          return bVal - aVal;
        }
      }

      // Handle date sorting for Recently Added and Recently Met (Requirements 6.2, 6.3)
      if (column === 'createdAt' || column === 'lastInteractionAt') {
        // Convert to timestamps for comparison
        const aTime = aVal ? new Date(aVal).getTime() : 0;
        const bTime = bVal ? new Date(bVal).getTime() : 0;
        
        if (order === 'asc') {
          return aTime - bTime;
        } else {
          return bTime - aTime;
        }
      }

      // Handle undefined/null values
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      // Convert to strings for comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Persist sort order to sessionStorage (Requirement 6.5)
    this.saveSortPreference(column, order);

    this.render();
  }

  /**
   * Save sort preference to sessionStorage
   * Requirements: 6.5
   */
  saveSortPreference(column, order) {
    try {
      sessionStorage.setItem('contactsTableSortBy', column);
      sessionStorage.setItem('contactsTableSortOrder', order);
    } catch (error) {
      console.error('Error saving sort preference:', error);
    }
  }

  /**
   * Load sort preference from sessionStorage
   * Requirements: 6.5
   */
  loadSortPreference() {
    try {
      const sortBy = sessionStorage.getItem('contactsTableSortBy');
      const sortOrder = sessionStorage.getItem('contactsTableSortOrder');
      
      if (sortBy && sortOrder) {
        this.options.sortBy = sortBy;
        this.options.sortOrder = sortOrder;
      }
    } catch (error) {
      console.error('Error loading sort preference:', error);
    }
  }

  /**
   * Update sort indicators in column headers
   * Requirements: 6.4
   */
  updateSortIndicators() {
    // Remove all existing indicators
    this.container.querySelectorAll('th.sortable .sort-indicator').forEach(indicator => {
      indicator.textContent = '';
      indicator.className = 'sort-indicator';
    });

    // Add indicator to current sort column
    const currentHeader = this.container.querySelector(`th.sortable[data-column="${this.options.sortBy}"]`);
    if (currentHeader) {
      const indicator = currentHeader.querySelector('.sort-indicator');
      if (indicator) {
        indicator.className = `sort-indicator sort-${this.options.sortOrder}`;
        indicator.textContent = this.options.sortOrder === 'asc' ? '▲' : '▼';
      }
    }
  }

  /**
   * Filter the table data
   */
  filter(query, filters = {}) {
    // Simple text search across name, email, phone
    this.filteredData = this.data.filter(contact => {
      // Text search
      if (query) {
        const searchText = query.toLowerCase();
        const matchesText = 
          (contact.name && contact.name.toLowerCase().includes(searchText)) ||
          (contact.email && contact.email.toLowerCase().includes(searchText)) ||
          (contact.phone && contact.phone.toLowerCase().includes(searchText));
        
        if (!matchesText) return false;
      }

      // Apply additional filters
      if (filters.source && contact.source !== filters.source) {
        return false;
      }

      if (filters.circle && contact.dunbarCircle !== filters.circle) {
        return false;
      }

      return true;
    });

    this.render();
  }

  /**
   * Refresh the table with new data
   * Requirements: 6.5
   */
  refresh(data) {
    this.data = data;
    this.filteredData = data;
    // Re-apply current sort order (Requirement 6.5)
    this.sort(this.options.sortBy, this.options.sortOrder);
  }

  /**
   * Add a new contact row
   * Requirements: 5.1
   */
  addRow() {
    if (this.addingContact) {
      return; // Already adding a contact
    }

    this.addingContact = true;

    // Create a new row at the top of the table
    const tbody = this.container.querySelector('.contacts-table tbody');
    if (!tbody) {
      return;
    }

    const newRow = document.createElement('tr');
    newRow.className = 'new-contact-row';
    newRow.innerHTML = `
      <td class="contact-name" data-label="Name">
        <input type="text" class="new-contact-input" data-field="name" placeholder="Name *" required />
      </td>
      <td class="contact-phone" data-label="Phone">
        <input type="text" class="new-contact-input" data-field="phone" placeholder="Phone" />
      </td>
      <td class="contact-email" data-label="Email">
        <input type="email" class="new-contact-input" data-field="email" placeholder="Email" />
      </td>
      <td class="contact-location" data-label="Location">
        <input type="text" class="new-contact-input" data-field="location" placeholder="Location" />
      </td>
      <td class="contact-timezone" data-label="Timezone">
        <select class="new-contact-input" data-field="timezone">
          <option value="">Select timezone...</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="Europe/London">London</option>
          <option value="Europe/Paris">Paris</option>
          <option value="Asia/Tokyo">Tokyo</option>
          <option value="Australia/Sydney">Sydney</option>
        </select>
      </td>
      <td class="contact-frequency" data-label="Frequency">
        <select class="new-contact-input" data-field="frequencyPreference">
          <option value="">Select frequency...</option>
          <option value="na">N/A</option>
          <option value="flexible">Flexible</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </td>
      <td class="contact-circle" data-label="Circle"></td>
      <td class="contact-tags" data-label="Tags"></td>
      <td class="contact-groups" data-label="Groups"></td>
      <td class="contact-source" data-label="Source"></td>
      <td class="contact-actions">
        <button class="btn-save-new" title="Save contact">✓</button>
        <button class="btn-cancel-new" title="Cancel">×</button>
      </td>
    `;

    // Insert at the top of tbody
    tbody.insertBefore(newRow, tbody.firstChild);
    this.newContactRow = newRow;

    // Focus on name field
    const nameInput = newRow.querySelector('input[data-field="name"]');
    if (nameInput) {
      nameInput.focus();
    }

    // Attach event listeners for save and cancel
    const saveBtn = newRow.querySelector('.btn-save-new');
    const cancelBtn = newRow.querySelector('.btn-cancel-new');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveNewContact();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelNewContact();
      });
    }

    // Handle Enter key to save
    newRow.querySelectorAll('.new-contact-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveNewContact();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelNewContact();
        }
      });
    });
  }

  /**
   * Save the new contact
   * Requirements: 5.2, 5.4, 5.5
   */
  async saveNewContact() {
    if (!this.newContactRow) {
      return;
    }

    // Collect data from inputs
    const inputs = this.newContactRow.querySelectorAll('.new-contact-input');
    const contactData = {};

    inputs.forEach(input => {
      const field = input.dataset.field;
      const value = input.value.trim();
      if (value) {
        contactData[field] = value;
      }
    });

    // Validate required fields (Requirement 5.5)
    if (!contactData.name) {
      this.showError('Name is required');
      const nameInput = this.newContactRow.querySelector('input[data-field="name"]');
      if (nameInput) {
        nameInput.focus();
        nameInput.classList.add('error');
      }
      return;
    }

    try {
      // Show loading state
      const saveBtn = this.newContactRow.querySelector('.btn-save-new');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳';
      }

      // Make API call to create contact (Requirement 5.2)
      const userId = window.userId || localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          ...contactData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to create contact: ${response.statusText}`);
      }

      const newContact = await response.json();

      // Remove the new contact row
      this.cancelNewContact();

      // Trigger callback
      if (this.options.onAdd) {
        this.options.onAdd(newContact);
      }

      // Show success message
      if (typeof showToast === 'function') {
        showToast('Contact created successfully', 'success');
      }

      // Refresh contacts from server to ensure data consistency
      // This avoids duplicates from manual array manipulation
      if (typeof loadContacts === 'function') {
        loadContacts();
      }

    } catch (error) {
      console.error('Error creating contact:', error);
      this.showError(`Failed to create contact: ${error.message}`);

      // Re-enable save button
      const saveBtn = this.newContactRow.querySelector('.btn-save-new');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾';
      }
    }
  }

  /**
   * Cancel adding a new contact
   * Requirements: 5.4
   */
  cancelNewContact() {
    if (this.newContactRow) {
      this.newContactRow.remove();
      this.newContactRow = null;
    }
    this.addingContact = false;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Add Contact button handler
    const addBtn = this.container.querySelector('.btn-add-contact');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addRow();
      });
    }

    // Sort order dropdown handler (Requirement 6.1)
    const sortSelect = this.container.querySelector('.sort-order-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        let column, order;
        
        switch (value) {
          case 'alphabetical':
            column = 'name';
            order = 'asc';
            break;
          case 'recently-added':
            column = 'createdAt';
            order = 'desc';
            break;
          case 'recently-met':
            column = 'lastInteractionAt';
            order = 'desc';
            break;
          default:
            column = 'name';
            order = 'asc';
        }
        
        this.sort(column, order);
      });
    }

    // Sortable column headers (Requirement 6.4)
    this.container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', (e) => {
        const column = e.target.closest('th').dataset.column;
        
        // Toggle sort order if clicking the same column
        let newOrder = 'asc';
        if (this.options.sortBy === column) {
          newOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
        }
        
        this.sort(column, newOrder);
      });
    });

    // Attach row-specific event listeners
    this.attachRowEventListeners();
  }

  /**
   * Start editing a cell
   * Requirements: 2.1
   */
  async startEdit(cell) {
    if (this.editingCell) {
      return; // Already editing another cell
    }

    const row = cell.closest('tr');
    const contactId = row.dataset.contactId;
    const field = cell.dataset.field;
    const type = cell.dataset.type;
    const contact = this.data.find(c => c.id === contactId);

    if (!contact) {
      return;
    }

    this.editingCell = new InlineEditCell(cell, contact, field, type, {
      onSave: async (value) => {
        await this.saveEdit(contactId, field, value);
        this.editingCell = null;
      },
      onCancel: () => {
        this.editingCell = null;
      },
      onFetchTags: async () => {
        return await this.fetchTags();
      },
      onFetchGroups: async () => {
        return await this.fetchGroups();
      }
    });

    await this.editingCell.startEdit();
  }

  /**
   * Save an edited cell value
   * Requirements: 2.2, 2.3
   */
  async saveEdit(contactId, field, value) {
    const contact = this.data.find(c => c.id === contactId);
    if (!contact) {
      return;
    }

    const originalValue = contact[field];
    const userId = window.userId || localStorage.getItem('userId');

    try {
      // Handle tags separately (they require special API calls)
      if (field === 'tags') {
        await this.saveTags(contactId, userId, originalValue, value);
        
        // Fetch updated contact from server to get proper tag IDs
        const response = await fetch(`/api/contacts/${contactId}?userId=${userId}`);
        if (response.ok) {
          const updatedContact = await response.json();
          const index = this.data.findIndex(c => c.id === contactId);
          if (index !== -1) {
            this.data[index] = updatedContact;
            const filteredIndex = this.filteredData.findIndex(c => c.id === contactId);
            if (filteredIndex !== -1) {
              this.filteredData[filteredIndex] = updatedContact;
            }
          }
        }
        
        this.updateTableBody();
        
        if (this.options.onEdit) {
          this.options.onEdit(contactId, field, value);
        }
        return;
      }

      // Handle groups separately (they require special API calls)
      if (field === 'groups') {
        console.log('💾 Saving groups:', { contactId, originalValue, newValue: value });
        await this.saveGroups(contactId, userId, originalValue, value);
        
        // Fetch updated contact from server to get proper group associations
        const response = await fetch(`/api/contacts/${contactId}?userId=${userId}`);
        if (response.ok) {
          const updatedContact = await response.json();
          console.log('✅ Fetched updated contact from server:', updatedContact);
          console.log('📋 Updated contact groups:', updatedContact.groups);
          
          const index = this.data.findIndex(c => c.id === contactId);
          if (index !== -1) {
            this.data[index] = updatedContact;
            const filteredIndex = this.filteredData.findIndex(c => c.id === contactId);
            if (filteredIndex !== -1) {
              this.filteredData[filteredIndex] = updatedContact;
            }
            console.log('✅ Updated contact in data arrays');
          }
        }
        
        this.updateTableBody();
        
        // Show success message
        if (typeof showToast === 'function') {
          showToast('Groups updated successfully', 'success');
        }
        
        if (this.options.onEdit) {
          this.options.onEdit(contactId, field, value);
        }
        return;
      }

      // Optimistic update for regular fields
      contact[field] = value;
      this.updateTableBody();

      // Make API call for regular fields
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: window.userId || localStorage.getItem('userId'),
          [field]: value
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to update contact: ${response.statusText}`);
      }

      const updatedContact = await response.json();
      
      // Update with server response
      const index = this.data.findIndex(c => c.id === contactId);
      if (index !== -1) {
        this.data[index] = updatedContact;
        
        // Update filtered data to maintain the same filtered set
        const filteredIndex = this.filteredData.findIndex(c => c.id === contactId);
        if (filteredIndex !== -1) {
          this.filteredData[filteredIndex] = updatedContact;
        }
        
        // Update only the table body, not the entire table
        this.updateTableBody();
      }

      if (this.options.onEdit) {
        this.options.onEdit(contactId, field, value);
      }

    } catch (error) {
      // Revert on error
      contact[field] = originalValue;
      
      // Update only the table body to avoid double-rendering issues
      this.updateTableBody();
      
      // Show error once
      this.showError(`Failed to update ${field}: ${error.message}`);
    }
  }

  /**
   * Fetch available tags for autocomplete
   * Requirements: 2.4
   */
  async fetchTags() {
    try {
      // Get userId from multiple possible sources
      const userId = window.userId || localStorage.getItem('userId');
      
      if (!userId) {
        console.error('❌ No userId found for fetching tags');
        // Fallback to extracting from current data
        return this.getAvailableTags();
      }
      
      const response = await fetch(`/api/contacts?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      const contacts = await response.json();
      
      // Extract unique tags
      const tagsSet = new Set();
      contacts.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach(tag => tagsSet.add(tag.text));
        }
      });
      
      return Array.from(tagsSet);
    } catch (error) {
      console.error('Error fetching tags:', error);
      // Fallback to extracting from current data
      return this.getAvailableTags();
    }
  }

  /**
   * Fetch available groups for autocomplete
   * Requirements: 2.4
   */
  async fetchGroups() {
    try {
      // Get userId from multiple possible sources
      const userId = window.userId || localStorage.getItem('userId');
      
      if (!userId) {
        console.error('❌ No userId found for fetching groups');
        // Fallback to global groups array if available
        if (typeof groups !== 'undefined' && groups) {
          console.log('✅ Using global groups array:', groups);
          return groups.map(g => ({ id: g.id, name: g.name }));
        }
        return [];
      }
      
      const response = await fetch(`/api/contacts/groups?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      const fetchedGroups = await response.json();
      return fetchedGroups.map(g => ({ id: g.id, name: g.name }));
    } catch (error) {
      console.error('Error fetching groups:', error);
      // Fallback to global groups array if available
      if (typeof groups !== 'undefined' && groups) {
        console.log('✅ Fallback to global groups array:', groups);
        return groups.map(g => ({ id: g.id, name: g.name }));
      }
      return [];
    }
  }

  /**
   * Save tags for a contact
   * Requirements: 2.2, 2.3
   */
  async saveTags(contactId, userId, originalTags, newTags) {
    // Convert original tags to array of text strings
    const originalTagTexts = originalTags ? originalTags.map(t => t.text || t) : [];
    const newTagTexts = Array.isArray(newTags) ? newTags : [];

    // Find tags to add and remove
    const tagsToAdd = newTagTexts.filter(tag => !originalTagTexts.includes(tag));
    const tagsToRemove = originalTagTexts.filter(tag => !newTagTexts.includes(tag));

    // Add new tags
    for (const tagText of tagsToAdd) {
      const response = await fetch('/api/contacts/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          contactId,
          text: tagText,
          source: 'manual'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to add tag: ${tagText}`);
      }
    }

    // Remove old tags
    const contact = this.data.find(c => c.id === contactId);
    if (contact && contact.tags) {
      for (const tagText of tagsToRemove) {
        const tag = contact.tags.find(t => t.text === tagText);
        if (tag && tag.id) {
          const response = await fetch(`/api/contacts/tags/${tag.id}?userId=${userId}&contactId=${contactId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `Failed to remove tag: ${tagText}`);
          }
        }
      }
    }

    // Show success message
    if (typeof showToast === 'function') {
      showToast('Tags updated successfully', 'success');
    }
  }

  /**
   * Save groups for a contact
   * Requirements: 2.2, 2.3
   */
  async saveGroups(contactId, userId, originalGroups, newGroups) {
    const originalGroupIds = Array.isArray(originalGroups) ? originalGroups : [];
    const newGroupIds = Array.isArray(newGroups) ? newGroups : [];

    // Find groups to add and remove
    const groupsToAdd = newGroupIds.filter(id => !originalGroupIds.includes(id));
    const groupsToRemove = originalGroupIds.filter(id => !newGroupIds.includes(id));

    // Only proceed if there are changes
    if (groupsToAdd.length === 0 && groupsToRemove.length === 0) {
      return;
    }

    // Add to new groups
    for (const groupId of groupsToAdd) {
      const response = await fetch('/api/contacts/bulk/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          contactIds: [contactId],
          groupId,
          action: 'add'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to add to group: ${groupId}`);
      }
    }

    // Remove from old groups
    for (const groupId of groupsToRemove) {
      const response = await fetch('/api/contacts/bulk/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          contactIds: [contactId],
          groupId,
          action: 'remove'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to remove from group: ${groupId}`);
      }
    }

    // Show success message only once after all operations complete
    // Note: Don't show toast here - let the caller handle success feedback
    // This prevents duplicate toasts when multiple fields are updated
  }

  /**
   * Show error notification
   */
  showError(message) {
    // Try to use global toast function if available
    if (typeof showToast === 'function') {
      showToast(message, 'error');
    } else {
      alert(message);
    }
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
   * Get current filter state for preservation
   * Used when navigating away and returning to the table
   */
  getFilterState() {
    return {
      sortBy: this.options.sortBy,
      sortOrder: this.options.sortOrder,
      filteredData: this.filteredData,
      searchQuery: this.searchQuery || ''
    };
  }

  /**
   * Handle search from SearchFilterBar
   * Requirements: 4.1
   */
  handleSearch(query) {
    this.searchQuery = query;
    this.applyFilters();
  }

  /**
   * Handle filter from SearchFilterBar
   * Requirements: 4.2, 4.3, 4.4, 4.5
   */
  handleFilter(filters) {
    this.activeFilters = filters;
    this.applyFilters();
  }

  /**
   * Apply search and filters to data
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   */
  applyFilters() {
    let filtered = [...this.data];

    // Apply text search
    if (this.searchQuery && this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(contact => {
        return (
          (contact.name && contact.name.toLowerCase().includes(query)) ||
          (contact.email && contact.email.toLowerCase().includes(query)) ||
          (contact.phone && contact.phone.toLowerCase().includes(query))
        );
      });
    }

    // Apply filters
    if (this.activeFilters) {
      if (this.activeFilters.tag) {
        const tagFilters = Array.isArray(this.activeFilters.tag) ? this.activeFilters.tag : [this.activeFilters.tag];
        filtered = filtered.filter(contact => 
          contact.tags && tagFilters.some(filterTag =>
            contact.tags.some(tag => 
              tag.text.toLowerCase().includes(filterTag.toLowerCase())
            )
          )
        );
      }

      if (this.activeFilters.group) {
        const groupFilters = Array.isArray(this.activeFilters.group) ? this.activeFilters.group : [this.activeFilters.group];
        filtered = filtered.filter(contact => 
          contact.groups && groupFilters.some(filterGroup =>
            contact.groups.some(groupId => {
              const group = this.getGroupById(groupId);
              return group && group.name.toLowerCase().includes(filterGroup.toLowerCase());
            })
          )
        );
      }

      if (this.activeFilters.source) {
        const sourceFilters = Array.isArray(this.activeFilters.source) ? this.activeFilters.source : [this.activeFilters.source];
        filtered = filtered.filter(contact => 
          sourceFilters.includes(contact.source)
        );
      }

      if (this.activeFilters.circle) {
        const circleFilters = Array.isArray(this.activeFilters.circle) ? this.activeFilters.circle : [this.activeFilters.circle];
        filtered = filtered.filter(contact => 
          circleFilters.includes(contact.dunbarCircle)
        );
      }

      if (this.activeFilters.location) {
        const locationFilters = Array.isArray(this.activeFilters.location) ? this.activeFilters.location : [this.activeFilters.location];
        filtered = filtered.filter(contact => 
          contact.location && locationFilters.some(filterLoc =>
            contact.location.toLowerCase().includes(filterLoc.toLowerCase())
          )
        );
      }
    }

    this.filteredData = filtered;
    
    // Only update the table body, not the entire table (to preserve search input)
    this.updateTableBody();
  }

  /**
   * Update only the table body without re-rendering the entire table
   * This preserves the search input and other controls
   */
  updateTableBody() {
    const tbody = this.container.querySelector('.contacts-table tbody');
    if (!tbody) {
      // If tbody doesn't exist, do a full render
      this.render();
      return;
    }

    // Update the table body content
    tbody.innerHTML = this.renderRows();

    // Re-attach event listeners for the new rows
    this.attachRowEventListeners();

    // Update A-Z scrollbar if it exists
    if (this.azScrollbar) {
      this.azScrollbar.update(this.filteredData);
    }
  }

  /**
   * Attach event listeners to table rows
   * (Extracted from attachEventListeners for reuse)
   */
  attachRowEventListeners() {
    // Archive button handlers
    this.container.querySelectorAll('.btn-archive').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const contactId = e.target.dataset.contactId;
        const contact = this.data.find(c => c.id === contactId);
        const contactName = contact ? contact.name : 'this contact';
        
        const confirmed = await showConfirm(
          `Archive ${contactName}? You can restore it later from the Archived tab.`,
          {
            title: 'Archive Contact',
            confirmText: 'Archive',
            type: 'warning'
          }
        );
        
        if (confirmed) {
          await this.archiveContact(contactId);
        }
      });
    });

    // Delete button handlers
    this.container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const contactId = e.target.dataset.contactId;
        if (this.options.onDelete) {
          this.options.onDelete(contactId);
        }
      });
    });

    // Editable cell handlers
    this.container.querySelectorAll('td.editable').forEach(cell => {
      cell.addEventListener('click', (e) => {
        // Don't start edit if clicking on a badge or already editing
        if (e.target.classList.contains('badge') || this.editingCell) {
          return;
        }
        this.startEdit(cell);
      });
    });
  }

  /**
   * Archive a contact (soft delete)
   * Requirements: 15.1, 15.2
   */
  async archiveContact(contactId) {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/contacts/archive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds: [contactId] })
      });

      if (!response.ok) {
        throw new Error('Failed to archive contact');
      }

      const result = await response.json();
      
      // Show success message
      if (typeof showToast === 'function') {
        showToast('Contact archived successfully', 'success');
      }

      // Remove from local data
      this.data = this.data.filter(c => c.id !== contactId);
      this.filteredData = this.filteredData.filter(c => c.id !== contactId);

      // Re-render
      this.render();

      // Update archived count badge
      if (typeof updateArchivedCountBadge === 'function') {
        updateArchivedCountBadge();
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('contactArchived', { 
        detail: { contactId } 
      }));

    } catch (error) {
      console.error('Error archiving contact:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to archive contact', 'error');
      }
    }
  }

  /**
   * Scroll to first contact starting with letter
   * Requirements: 3.2, 3.3
   */
  scrollToLetter(letter) {
    const tbody = this.container.querySelector('tbody');
    if (!tbody) return;

    // Find first row starting with this letter
    const rows = Array.from(tbody.querySelectorAll('tr'));
    let targetRow = rows.find(row => {
      const nameCell = row.querySelector('.contact-name');
      if (!nameCell) return false;
      const name = nameCell.textContent.trim();
      return name.toUpperCase().startsWith(letter.toUpperCase());
    });

    // If no exact match, find next letter alphabetically
    if (!targetRow) {
      targetRow = rows.find(row => {
        const nameCell = row.querySelector('.contact-name');
        if (!nameCell) return false;
        const name = nameCell.textContent.trim();
        return name.toUpperCase() > letter.toUpperCase();
      });
    }

    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Helper to get group by ID (uses global groups array from app.js)
   */
  getGroupById(groupId) {
    if (typeof groups !== 'undefined' && groups) {
      return groups.find(g => g.id === groupId);
    }
    return null;
  }

  /**
   * Get available tags for autocomplete
   */
  getAvailableTags() {
    const tags = new Set();
    this.data.forEach(contact => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => {
          if (tag.text) tags.add(tag.text);
        });
      }
    });
    return Array.from(tags);
  }

  /**
   * Get available groups for autocomplete
   */
  getAvailableGroups() {
    if (typeof groups !== 'undefined' && groups) {
      return groups.map(g => ({ id: g.id, name: g.name }));
    }
    return [];
  }

  /**
   * Get unique locations from contacts
   */
  getUniqueLocations() {
    const locations = new Set();
    this.data.forEach(contact => {
      if (contact.location && contact.location.trim()) {
        locations.add(contact.location.trim());
      }
    });
    return Array.from(locations).sort();
  }
}

/**
 * InlineEditCell Component
 * 
 * Handles inline editing of table cells with support for different input types.
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
class InlineEditCell {
  constructor(cell, contact, field, type, options = {}) {
    this.cell = cell;
    this.contact = contact;
    this.field = field;
    this.type = type;
    this.options = {
      onSave: null,
      onCancel: null,
      onFetchTags: null,
      onFetchGroups: null,
      ...options
    };
    
    this.originalValue = this.getCurrentValue();
    this.originalHTML = cell.innerHTML;
    this.input = null;
    this.autocompleteList = null;
  }

  /**
   * Get the current value of the field
   */
  getCurrentValue() {
    const value = this.contact[this.field];
    
    if (this.type === 'multiselect') {
      if (this.field === 'tags') {
        return value ? value.map(t => t.text) : [];
      } else if (this.field === 'groups') {
        return value || [];
      }
    }
    
    return value || '';
  }

  /**
   * Start edit mode
   * Requirements: 2.1
   */
  async startEdit() {
    this.cell.classList.add('editing');
    
    switch (this.type) {
      case 'text':
      case 'email':
      case 'phone':
        this.createTextInput();
        break;
      case 'dropdown':
        this.createDropdown();
        break;
      case 'multiselect':
        await this.createMultiSelect();
        break;
    }

    if (this.input) {
      this.input.focus();
      if (this.type === 'text' || this.type === 'email' || this.type === 'phone') {
        this.input.select();
      }
    }
  }

  /**
   * Create text input field
   */
  createTextInput() {
    this.input = document.createElement('input');
    this.input.type = this.type === 'email' ? 'email' : 'text';
    this.input.value = this.originalValue;
    this.input.className = 'inline-edit-input';
    
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.input.addEventListener('blur', () => this.saveEdit());
    
    this.cell.innerHTML = '';
    this.cell.appendChild(this.input);
  }

  /**
   * Create dropdown select
   */
  createDropdown() {
    this.input = document.createElement('select');
    this.input.className = 'inline-edit-select';
    
    let options = [];
    if (this.field === 'timezone') {
      options = [
        { value: '', label: 'Select timezone...' },
        { value: 'America/New_York', label: 'Eastern Time' },
        { value: 'America/Chicago', label: 'Central Time' },
        { value: 'America/Denver', label: 'Mountain Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time' },
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Asia/Tokyo', label: 'Tokyo' },
        { value: 'Australia/Sydney', label: 'Sydney' }
      ];
    } else if (this.field === 'frequencyPreference') {
      options = [
        { value: '', label: 'Select frequency...' },
        { value: 'na', label: 'N/A' },
        { value: 'flexible', label: 'Flexible' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Bi-weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' }
      ];
    }
    
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === this.originalValue) {
        option.selected = true;
      }
      this.input.appendChild(option);
    });
    
    this.input.addEventListener('change', () => this.saveEdit());
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.input.addEventListener('blur', () => this.saveEdit());
    
    this.cell.innerHTML = '';
    this.cell.appendChild(this.input);
  }

  /**
   * Create multi-select input with autocomplete
   * Requirements: 2.4
   */
  async createMultiSelect() {
    console.log('🎨 Creating multiselect for field:', this.field);
    console.log('📦 Original value:', this.originalValue);
    console.log('⚙️ Options:', this.options);
    
    const container = document.createElement('div');
    container.className = 'inline-edit-multiselect';
    
    // Display selected items as chips
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'multiselect-chips';
    
    const selectedValues = Array.isArray(this.originalValue) ? this.originalValue : [];
    
    // For groups, we need to resolve IDs to names for display
    if (this.field === 'groups' && this.options.onFetchGroups) {
      const allGroups = await this.options.onFetchGroups();
      console.log('👥 Fetched groups for display:', allGroups);
      this.selectedValues = [];
      
      selectedValues.forEach(value => {
        // value could be an ID or a name
        const group = allGroups.find(g => g.id === value || g.name === value);
        if (group) {
          const chip = this.createChip(group.name, group.id);
          chipsContainer.appendChild(chip);
          this.selectedValues.push(group.id);
        } else {
          // Fallback if group not found
          const chip = this.createChip(value);
          chipsContainer.appendChild(chip);
          this.selectedValues.push(value);
        }
      });
    } else {
      // For tags, just use the values directly
      selectedValues.forEach(value => {
        const chip = this.createChip(value);
        chipsContainer.appendChild(chip);
      });
      this.selectedValues = [...selectedValues];
    }
    
    console.log('✅ Selected values initialized:', this.selectedValues);
    
    // Input for adding new items
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'multiselect-input';
    this.input.placeholder = `Add ${this.field}...`;
    
    this.input.addEventListener('keydown', (e) => this.handleMultiSelectKeyDown(e));
    this.input.addEventListener('input', (e) => this.handleAutocomplete(e));
    this.input.addEventListener('focus', (e) => {
      console.log('🎯 Input focused, triggering autocomplete');
      // Show all available options when focusing
      this.handleAutocomplete(e);
    });
    this.input.addEventListener('blur', (e) => {
      // Delay to allow clicking on autocomplete items
      setTimeout(() => {
        // Check if the click was on an autocomplete item
        const clickedElement = document.activeElement;
        const clickedAutocomplete = this.autocompleteList && this.autocompleteList.contains(clickedElement);
        
        if (!this.cell.contains(clickedElement) && !clickedAutocomplete) {
          this.saveEdit();
        }
      }, 250);
    });
    
    container.appendChild(chipsContainer);
    container.appendChild(this.input);
    
    this.cell.innerHTML = '';
    this.cell.appendChild(container);
    
    console.log('✅ Multiselect created successfully');
  }

  /**
   * Create a chip element for multi-select
   */
  createChip(displayValue, actualValue = null) {
    const chip = document.createElement('span');
    chip.className = 'multiselect-chip';
    chip.textContent = displayValue;
    
    const valueToRemove = actualValue || displayValue;
    
    const removeBtn = document.createElement('span');
    removeBtn.className = 'chip-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      this.selectedValues = this.selectedValues.filter(v => v !== valueToRemove);
      chip.remove();
    });
    
    chip.appendChild(removeBtn);
    return chip;
  }

  /**
   * Handle autocomplete for multi-select
   * Requirements: 2.4
   */
  async handleAutocomplete(e) {
    const query = e.target.value.toLowerCase();
    
    console.log('🔍 Autocomplete triggered:', { field: this.field, query, selectedValues: this.selectedValues });
    
    // Initialize selectedValues if undefined
    if (!this.selectedValues) {
      this.selectedValues = [];
    }
    
    // Show all suggestions when input is empty or has minimal text
    if (query.length === 0) {
      // Show all available options when clicking into empty field
      let suggestions = [];
      if (this.field === 'tags' && this.options.onFetchTags) {
        const allTags = await this.options.onFetchTags();
        console.log('📋 Available tags:', allTags);
        suggestions = allTags.filter(tag => !this.selectedValues.includes(tag));
      } else if (this.field === 'groups' && this.options.onFetchGroups) {
        const allGroups = await this.options.onFetchGroups();
        console.log('👥 Available groups:', allGroups);
        console.log('👥 All groups structure:', JSON.stringify(allGroups, null, 2));
        suggestions = allGroups
          .filter(group => !this.selectedValues.some(v => v === group.id || v === group.name))
          .map(g => ({ id: g.id, name: g.name }));
      }
      console.log('💡 Showing suggestions:', suggestions);
      this.showAutocomplete(suggestions);
      return;
    }
    
    let suggestions = [];
    if (this.field === 'tags' && this.options.onFetchTags) {
      const allTags = await this.options.onFetchTags();
      suggestions = allTags.filter(tag => 
        tag.toLowerCase().includes(query) && 
        !this.selectedValues.includes(tag)
      );
    } else if (this.field === 'groups' && this.options.onFetchGroups) {
      const allGroups = await this.options.onFetchGroups();
      suggestions = allGroups
        .filter(group => 
          group.name.toLowerCase().includes(query) && 
          !this.selectedValues.some(v => v === group.id || v === group.name)
        )
        .map(g => ({ id: g.id, name: g.name }));
    }
    
    console.log('💡 Filtered suggestions:', suggestions);
    this.showAutocomplete(suggestions);
  }

  /**
   * Show autocomplete dropdown
   */
  showAutocomplete(suggestions) {
    this.hideAutocomplete();
    
    console.log('📝 showAutocomplete called with:', suggestions);
    
    if (!suggestions || suggestions.length === 0) {
      console.log('⚠️ No suggestions to show');
      return;
    }
    
    this.autocompleteList = document.createElement('div');
    this.autocompleteList.className = 'autocomplete-list';
    
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      
      if (typeof suggestion === 'string') {
        item.textContent = suggestion;
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('✅ Tag selected:', suggestion);
          this.addValue(suggestion);
          this.input.value = '';
          this.hideAutocomplete();
          this.input.focus();
        });
      } else {
        // For groups, show the name but store the ID
        item.textContent = suggestion.name;
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('✅ Group selected:', suggestion);
          this.addValue(suggestion.id, suggestion.name);
          this.input.value = '';
          this.hideAutocomplete();
          this.input.focus();
        });
      }
      
      this.autocompleteList.appendChild(item);
    });
    
    // Position the dropdown relative to the cell but append to body to avoid overflow clipping
    const cellRect = this.cell.getBoundingClientRect();
    this.autocompleteList.style.position = 'fixed';
    this.autocompleteList.style.top = `${cellRect.bottom}px`;
    this.autocompleteList.style.left = `${cellRect.left}px`;
    this.autocompleteList.style.width = `${Math.max(cellRect.width, 200)}px`;
    
    document.body.appendChild(this.autocompleteList);
    console.log('✅ Autocomplete list appended to body, items:', this.autocompleteList.children.length);
  }

  /**
   * Hide autocomplete dropdown
   */
  hideAutocomplete() {
    if (this.autocompleteList) {
      // Remove from wherever it was appended (body or cell)
      if (this.autocompleteList.parentNode) {
        this.autocompleteList.parentNode.removeChild(this.autocompleteList);
      }
      this.autocompleteList = null;
    }
  }

  /**
   * Add a value to multi-select
   */
  addValue(value, displayValue = null) {
    console.log('➕ addValue called:', { value, displayValue, currentValues: this.selectedValues });
    
    // Initialize selectedValues if undefined
    if (!this.selectedValues) {
      this.selectedValues = [];
    }
    
    if (!this.selectedValues.includes(value)) {
      this.selectedValues.push(value);
      const chipsContainer = this.cell.querySelector('.multiselect-chips');
      if (chipsContainer) {
        const chip = this.createChip(displayValue || value, value);
        chipsContainer.appendChild(chip);
        console.log('✅ Chip added successfully');
      } else {
        console.error('❌ Chips container not found!');
      }
    } else {
      console.log('⚠️ Value already exists in selectedValues');
    }
  }

  /**
   * Handle keyboard events for multi-select
   */
  handleMultiSelectKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelEdit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const value = this.input.value.trim();
      if (value) {
        // For new values typed in (not from autocomplete)
        this.addValue(value);
        this.input.value = '';
        this.hideAutocomplete();
      } else {
        // If input is empty, save and exit edit mode
        this.saveEdit();
      }
    } else if (e.key === 'Tab') {
      // Tab key should save and move to next field
      e.preventDefault();
      this.saveEdit();
    }
  }

  /**
   * Handle keyboard events
   * Requirements: 2.5
   */
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelEdit();
    } else if (e.key === 'Enter' && this.type !== 'dropdown') {
      e.preventDefault();
      this.saveEdit();
    }
  }

  /**
   * Validate the input value
   */
  validate(value) {
    if (this.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Invalid email format' };
      }
    }
    
    if (this.type === 'phone' && value) {
      // Basic phone validation - at least 10 digits
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return { valid: false, error: 'Phone number must have at least 10 digits' };
      }
    }
    
    if (this.field === 'name' && !value) {
      return { valid: false, error: 'Name is required' };
    }
    
    return { valid: true };
  }

  /**
   * Save the edit
   * Requirements: 2.2
   */
  async saveEdit() {
    let value;
    
    if (this.type === 'multiselect') {
      value = this.selectedValues;
    } else {
      value = this.input.value.trim();
    }
    
    // Validate
    const validation = this.validate(value);
    if (!validation.valid) {
      this.showValidationError(validation.error);
      return;
    }
    
    // Check if value changed
    const originalStr = JSON.stringify(this.originalValue);
    const newStr = JSON.stringify(value);
    
    if (originalStr === newStr) {
      this.cancelEdit();
      return;
    }
    
    this.cell.classList.remove('editing');
    this.hideAutocomplete();
    
    if (this.options.onSave) {
      await this.options.onSave(value);
    }
  }

  /**
   * Cancel the edit
   * Requirements: 2.5
   */
  cancelEdit() {
    this.cell.classList.remove('editing');
    this.cell.innerHTML = this.originalHTML;
    this.hideAutocomplete();
    
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }

  /**
   * Show validation error
   */
  showValidationError(message) {
    const error = document.createElement('div');
    error.className = 'inline-edit-error';
    error.textContent = message;
    this.cell.appendChild(error);
    
    setTimeout(() => {
      error.remove();
    }, 3000);
  }
}

/**
 * AZScrollbar Component
 * 
 * Provides quick alphabetical navigation for the contacts table.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
class AZScrollbar {
  constructor(container, tableContainer, data = []) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    this.tableContainer = typeof tableContainer === 'string'
      ? document.getElementById(tableContainer)
      : tableContainer;
    this.data = data;
    this.activeLetters = new Set();
    this.currentLetter = null;
    this.scrollListener = null;
  }

  /**
   * Render the A-Z scrollbar
   * Requirements: 3.1, 3.5
   */
  render() {
    if (!this.container) {
      console.error('AZScrollbar: Container not found');
      return;
    }

    // Hide if fewer than 20 contacts (Requirement 3.5)
    if (this.data.length < 20) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'flex';

    // Calculate which letters have contacts
    this.updateActiveLetters(this.data);

    // Generate A-Z letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    const scrollbarHTML = `
      <div class="az-scrollbar">
        ${letters.map(letter => {
          const isActive = this.activeLetters.has(letter);
          const className = isActive ? 'az-letter active' : 'az-letter inactive';
          return `<div class="${className}" data-letter="${letter}">${letter}</div>`;
        }).join('')}
      </div>
    `;

    this.container.innerHTML = scrollbarHTML;
    this.attachEventListeners();
  }

  /**
   * Update which letters have contacts
   * Requirements: 3.1
   */
  updateActiveLetters(data) {
    this.activeLetters.clear();
    data.forEach(contact => {
      if (contact.name) {
        const firstLetter = contact.name.charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstLetter)) {
          this.activeLetters.add(firstLetter);
        }
      }
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Letter click handlers
    this.container.querySelectorAll('.az-letter').forEach(letterEl => {
      letterEl.addEventListener('click', (e) => {
        const letter = e.target.dataset.letter;
        this.scrollToLetter(letter);
      });
    });

    // Scroll event listener for highlighting current letter
    if (this.tableContainer) {
      // Remove existing listener if any
      if (this.scrollListener) {
        this.tableContainer.removeEventListener('scroll', this.scrollListener);
      }

      this.scrollListener = () => {
        this.highlightCurrentLetter();
      };

      this.tableContainer.addEventListener('scroll', this.scrollListener);
    }
  }

  /**
   * Scroll to the first contact with the given letter
   * Requirements: 3.2, 3.3
   */
  scrollToLetter(letter) {
    if (!this.tableContainer) {
      return;
    }

    // Find the first contact with this letter
    let targetLetter = letter;
    let contactRow = this.findContactRowByLetter(targetLetter);

    // Fallback to next available letter if no contacts found (Requirement 3.3)
    if (!contactRow) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const startIndex = letters.indexOf(letter);
      
      for (let i = startIndex + 1; i < letters.length; i++) {
        targetLetter = letters[i];
        if (this.activeLetters.has(targetLetter)) {
          contactRow = this.findContactRowByLetter(targetLetter);
          if (contactRow) {
            break;
          }
        }
      }
    }

    if (contactRow) {
      // Smooth scroll to the contact row (Requirement 3.2)
      contactRow.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });

      // Update highlighting
      this.setActiveLetter(targetLetter);
    }
  }

  /**
   * Find a contact row by first letter of name
   */
  findContactRowByLetter(letter) {
    const table = this.tableContainer.querySelector('.contacts-table');
    if (!table) {
      return null;
    }

    const rows = table.querySelectorAll('tbody tr');
    for (const row of rows) {
      const nameCell = row.querySelector('.contact-name');
      if (nameCell) {
        const name = nameCell.textContent.trim();
        if (name.charAt(0).toUpperCase() === letter) {
          return row;
        }
      }
    }

    return null;
  }

  /**
   * Highlight the current letter based on scroll position
   * Requirements: 3.4
   */
  highlightCurrentLetter() {
    if (!this.tableContainer) {
      return;
    }

    const table = this.tableContainer.querySelector('.contacts-table');
    if (!table) {
      return;
    }

    // Get the viewport bounds
    const containerRect = this.tableContainer.getBoundingClientRect();
    const viewportTop = containerRect.top;
    const viewportBottom = containerRect.bottom;

    // Find the first visible contact row
    const rows = table.querySelectorAll('tbody tr');
    let visibleLetter = null;

    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      
      // Check if row is in viewport
      if (rect.top >= viewportTop && rect.top <= viewportBottom) {
        const nameCell = row.querySelector('.contact-name');
        if (nameCell) {
          const name = nameCell.textContent.trim();
          visibleLetter = name.charAt(0).toUpperCase();
          break;
        }
      }
    }

    if (visibleLetter && /[A-Z]/.test(visibleLetter)) {
      this.setActiveLetter(visibleLetter);
    }
  }

  /**
   * Set the active letter in the scrollbar
   */
  setActiveLetter(letter) {
    if (this.currentLetter === letter) {
      return;
    }

    this.currentLetter = letter;

    // Remove previous highlighting
    this.container.querySelectorAll('.az-letter.current').forEach(el => {
      el.classList.remove('current');
    });

    // Add highlighting to current letter
    const letterEl = this.container.querySelector(`.az-letter[data-letter="${letter}"]`);
    if (letterEl) {
      letterEl.classList.add('current');
    }
  }

  /**
   * Update the scrollbar with new data
   */
  update(data) {
    this.data = data;
    this.render();
  }

  /**
   * Destroy the scrollbar and clean up listeners
   */
  destroy() {
    if (this.scrollListener && this.tableContainer) {
      this.tableContainer.removeEventListener('scroll', this.scrollListener);
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Note: SearchFilterBar is now defined in search-filter-bar.js (loaded before this file)
// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContactsTable, InlineEditCell, AZScrollbar };
}

/**
 * TabNavigation Component
 * 
 * Provides seamless switching between Contacts, Circles, Groups, and Tags views.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
class TabNavigation {
  constructor(options = {}) {
    this.options = {
      tabs: ['contacts', 'circles', 'groups', 'tags'],
      defaultTab: 'contacts',
      onTabChange: null,
      ...options
    };
    
    this.currentTab = this.options.defaultTab;
    this.tabStates = {}; // Store per-tab state (filters, scroll position, etc.)
    
    // Initialize tab states
    this.options.tabs.forEach(tab => {
      this.tabStates[tab] = {
        searchQuery: '',
        filters: {},
        scrollPosition: 0
      };
    });
  }

  /**
   * Initialize tab navigation
   * Requirements: 7.1, 7.5
   */
  init() {
    // Parse URL hash on load to restore tab (Requirement 7.5)
    const hash = window.location.hash;
    if (hash.startsWith('#directory/')) {
      const tab = hash.split('/')[1];
      if (this.options.tabs.includes(tab)) {
        this.currentTab = tab;
      }
    }

    // Set up hash change listener (Requirement 7.6)
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Show the current tab
    this.switchTab(this.currentTab, false);
  }

  /**
   * Switch to a different tab
   * Requirements: 7.2, 7.3, 7.4, 7.5
   */
  switchTab(tabId, updateHash = true) {
    if (!this.options.tabs.includes(tabId)) {
      console.error(`Invalid tab: ${tabId}`);
      return;
    }

    // Save current tab state before switching (Requirement 7.4)
    this.saveCurrentTabState();

    // Update current tab
    const previousTab = this.currentTab;
    this.currentTab = tabId;

    // Update URL hash without page reload (Requirement 7.5, 7.6)
    if (updateHash) {
      window.history.replaceState(null, '', `#directory/${tabId}`);
    }

    // Update active tab button styling (Requirement 7.2)
    document.querySelectorAll('.directory-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Hide all tab contents (Requirement 7.3)
    document.querySelectorAll('.directory-tab-content').forEach(content => {
      content.classList.add('hidden');
    });

    // Show selected tab content (Requirement 7.2)
    const selectedContent = document.getElementById(`${tabId}-tab`);
    if (selectedContent) {
      selectedContent.classList.remove('hidden');
    }

    // Restore tab state (Requirement 7.4)
    this.restoreTabState(tabId);

    // Trigger callback
    if (this.options.onTabChange) {
      this.options.onTabChange(tabId, previousTab);
    }
  }

  /**
   * Save current tab state
   * Requirements: 7.4
   */
  saveCurrentTabState() {
    const state = this.tabStates[this.currentTab];
    if (!state) return;

    // Save scroll position
    const tabContent = document.getElementById(`${this.currentTab}-tab`);
    if (tabContent) {
      const scrollContainer = tabContent.querySelector('.contacts-table-wrapper') || 
                             tabContent.querySelector('.scrollable-container');
      if (scrollContainer) {
        state.scrollPosition = scrollContainer.scrollTop;
      }
    }

    // Save search/filter state if SearchFilterBar exists
    if (window.searchFilterBar && this.currentTab === 'contacts') {
      state.searchQuery = window.searchFilterBar.getQuery();
      state.filters = window.searchFilterBar.getFilters();
    }
  }

  /**
   * Restore tab state
   * Requirements: 7.4
   */
  restoreTabState(tabId) {
    const state = this.tabStates[tabId];
    if (!state) return;

    // Restore scroll position
    setTimeout(() => {
      const tabContent = document.getElementById(`${tabId}-tab`);
      if (tabContent) {
        const scrollContainer = tabContent.querySelector('.contacts-table-wrapper') || 
                               tabContent.querySelector('.scrollable-container');
        if (scrollContainer && state.scrollPosition) {
          scrollContainer.scrollTop = state.scrollPosition;
        }
      }
    }, 100);

    // Restore search/filter state if SearchFilterBar exists
    if (window.searchFilterBar && tabId === 'contacts') {
      if (state.searchQuery) {
        window.searchFilterBar.setQuery(state.searchQuery);
      }
    }
  }

  /**
   * Handle hash change events
   * Requirements: 7.5, 7.6
   */
  handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#directory/')) {
      const tab = hash.split('/')[1];
      if (this.options.tabs.includes(tab) && tab !== this.currentTab) {
        this.switchTab(tab, false); // Don't update hash again
      }
    }
  }

  /**
   * Show notification badge on a tab
   * Requirements: 15.1
   */
  showNotification(tabId, count = null) {
    const tabBtn = document.querySelector(`.directory-tab[data-tab="${tabId}"]`);
    if (!tabBtn) return;

    let dot = tabBtn.querySelector('.notification-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'notification-dot';
      tabBtn.appendChild(dot);
    }

    if (count !== null && count > 0) {
      dot.textContent = count;
      dot.classList.add('with-count');
    }
  }

  /**
   * Hide notification badge on a tab
   * Requirements: 15.3
   */
  hideNotification(tabId) {
    const tabBtn = document.querySelector(`.directory-tab[data-tab="${tabId}"]`);
    if (!tabBtn) return;

    const dot = tabBtn.querySelector('.notification-dot');
    if (dot) {
      dot.remove();
    }
  }

  /**
   * Get current tab
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * Get tab state
   */
  getTabState(tabId) {
    return this.tabStates[tabId];
  }

  /**
   * Set tab state
   */
  setTabState(tabId, state) {
    if (this.tabStates[tabId]) {
      this.tabStates[tabId] = { ...this.tabStates[tabId], ...state };
    }
  }

  /**
   * Attach click handlers to tab buttons
   */
  attachTabHandlers() {
    document.querySelectorAll('.directory-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
  }
}

// Global instance for app.js integration
let globalContactsTable = null;

/**
 * Global function to render contacts table
 * Called by app.js after loading contacts
 */
function renderContactsTable(contacts) {
  const container = document.getElementById('contacts-list');
  if (!container) {
    console.error('contacts-list container not found');
    return;
  }
  
  // Create or update the table instance
  if (!globalContactsTable) {
    globalContactsTable = new ContactsTable(container, contacts, {
      onEdit: async (contactId, field, value) => {
        // This will be handled by app.js's existing update logic
        return true;
      },
      onDelete: async (contactId) => {
        // This will be handled by app.js's existing delete logic
        if (typeof deleteContact === 'function') {
          await deleteContact(contactId);
        }
      },
      onAdd: async (contactData) => {
        // This will be handled by app.js's existing add logic
        return true;
      }
    });
    // Expose globally for access from other parts of the app
    window.contactsTable = globalContactsTable;
  } else {
    // Update data with fresh server data (replaces any local additions)
    globalContactsTable.data = contacts;
    // Re-apply filters if active, otherwise use fresh data
    if (globalContactsTable.searchQuery || globalContactsTable.activeFilters) {
      globalContactsTable.applyFilters();
      return; // applyFilters calls updateTableBody, no need for full render
    } else {
      globalContactsTable.filteredData = contacts;
    }
  }
  
  // Render the table (this will show/hide A-Z scrollbar based on sort order)
  globalContactsTable.render();
}

// Expose classes and functions globally
window.ContactsTable = ContactsTable;
window.InlineEditCell = InlineEditCell;
window.AZScrollbar = AZScrollbar;
// Note: SearchFilterBar is exposed by search-filter-bar.js
window.TabNavigation = TabNavigation;
window.renderContactsTable = renderContactsTable;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    ContactsTable, 
    InlineEditCell, 
    AZScrollbar, 
    TabNavigation,
    renderContactsTable
  };
}
