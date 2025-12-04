/**
 * GroupsTable Component
 * 
 * Displays groups in a sortable, editable table format with expandable rows.
 * Implements Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

class GroupsTable {
  constructor(container, data = [], contacts = [], options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    this.data = data;
    this.contacts = contacts; // All contacts for member display
    this.filteredData = data;
    this.options = {
      sortBy: 'name',
      sortOrder: 'asc',
      onEdit: null,
      onDelete: null,
      onAdd: null,
      onMappingsUpdate: null, // Callback when mappings are updated
      ...options
    };
    
    this.editingCell = null;
    this.addingGroup = false;
    this.newGroupRow = null;
    this.expandedGroups = new Set(); // Track which groups are expanded
    this.mappingsReview = null; // GoogleMappingsReview instance
  }

  /**
   * Render the complete table structure
   * Requirements: 13.1, 15.2, 15.4
   */
  render() {
    if (!this.container) {
      console.error('GroupsTable: Container not found');
      return;
    }

    const tableHTML = `
      <!-- Google Mappings Review (Requirements 15.2, 15.4) -->
      <div id="google-mappings-review-container"></div>
      
      <div class="groups-table-controls">
        <button class="btn-add-group" title="Add new group">
          ➕ Add Group
        </button>
      </div>
      <div class="groups-table-wrapper">
        <table class="groups-table">
          <thead>
            <tr>
              <th class="sortable" data-column="name">Name <span class="sort-indicator"></span></th>
              <th data-column="description">Description</th>
              <th class="sortable" data-column="contactCount">Contact Count <span class="sort-indicator"></span></th>
              <th data-column="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.renderRows()}
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = tableHTML;
    this.attachEventListeners();
    this.updateSortIndicators();
    
    // Initialize Google Mappings Review (Requirements 15.2, 15.4)
    this.initializeMappingsReview();
  }

  /**
   * Render table rows for all groups
   * Requirements: 13.1
   */
  renderRows() {
    if (this.filteredData.length === 0) {
      return `
        <tr class="empty-state">
          <td colspan="4" style="text-align: center; padding: 40px; color: #6b7280;">
            No groups found
          </td>
        </tr>
      `;
    }

    return this.filteredData.map(group => this.renderRow(group)).join('');
  }

  /**
   * Render a single group row
   * Requirements: 13.1, 13.2, 17.1, 17.2
   */
  renderRow(group) {
    const contactCount = group.contactIds ? group.contactIds.length : 0;
    const isExpanded = this.expandedGroups.has(group.id);
    const expandIcon = isExpanded ? '▼' : '▶';

    let html = `
      <tr data-group-id="${group.id}" class="group-row">
        <td class="group-name editable" data-field="name" data-type="text" data-label="Name">${this.escapeHtml(group.name)}</td>
        <td class="group-description editable" data-field="description" data-type="text" data-label="Description">${this.escapeHtml(group.description || '')}</td>
        <td class="group-contact-count" data-label="Contacts">
          <span class="expand-toggle" data-group-id="${group.id}" style="cursor: pointer; user-select: none;">
            <span class="expand-icon">${expandIcon}</span>
            <span class="count-badge">${contactCount}</span>
          </span>
        </td>
        <td class="group-actions">
          <button class="btn-delete" data-group-id="${group.id}" title="Delete group">
            🗑️
          </button>
        </td>
      </tr>
    `;

    // Add expanded member rows if group is expanded (Requirement 13.2)
    if (isExpanded && contactCount > 0) {
      html += this.renderMemberRows(group);
    }

    return html;
  }

  /**
   * Render member contact rows for an expanded group
   * Requirements: 13.2
   */
  renderMemberRows(group) {
    if (!group.contactIds || group.contactIds.length === 0) {
      return '';
    }

    const members = group.contactIds
      .map(contactId => this.contacts.find(c => c.id === contactId))
      .filter(contact => contact); // Filter out any null/undefined

    if (members.length === 0) {
      return `
        <tr class="member-row" data-group-id="${group.id}">
          <td colspan="4" style="padding-left: 40px; color: #6b7280; font-style: italic;">
            No contacts in this group
          </td>
        </tr>
      `;
    }

    return members.map(contact => `
      <tr class="member-row" data-group-id="${group.id}">
        <td style="padding-left: 40px;">
          <span class="member-icon">👤</span>
          ${this.escapeHtml(contact.name)}
        </td>
        <td>${this.escapeHtml(contact.email || '')}</td>
        <td>${this.escapeHtml(contact.phone || '')}</td>
        <td></td>
      </tr>
    `).join('');
  }

  /**
   * Toggle group expansion
   * Requirements: 13.2
   */
  toggleExpand(groupId) {
    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId);
    } else {
      this.expandedGroups.add(groupId);
    }
    this.render();
  }

  /**
   * Sort the table by a column
   */
  sort(column, order = 'asc') {
    this.options.sortBy = column;
    this.options.sortOrder = order;

    this.filteredData.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle contact count sorting
      if (column === 'contactCount') {
        aVal = a.contactIds ? a.contactIds.length : 0;
        bVal = b.contactIds ? b.contactIds.length : 0;
        
        if (order === 'asc') {
          return aVal - bVal;
        } else {
          return bVal - aVal;
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

    this.render();
  }

  /**
   * Update sort indicators in column headers
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
  filter(query) {
    // Simple text search across name and description
    this.filteredData = this.data.filter(group => {
      if (query) {
        const searchText = query.toLowerCase();
        const matchesText = 
          (group.name && group.name.toLowerCase().includes(searchText)) ||
          (group.description && group.description.toLowerCase().includes(searchText));
        
        if (!matchesText) return false;
      }

      return true;
    });

    this.render();
  }

  /**
   * Refresh the table with new data
   */
  refresh(data, contacts) {
    this.data = data;
    if (contacts) {
      this.contacts = contacts;
    }
    this.filteredData = data;
    this.sort(this.options.sortBy, this.options.sortOrder);
  }

  /**
   * Add a new group row
   * Requirements: 13.4
   */
  addRow() {
    if (this.addingGroup) {
      return; // Already adding a group
    }

    this.addingGroup = true;

    // Create a new row at the top of the table
    const tbody = this.container.querySelector('.groups-table tbody');
    if (!tbody) {
      return;
    }

    const newRow = document.createElement('tr');
    newRow.className = 'new-group-row';
    newRow.innerHTML = `
      <td class="group-name" data-label="Name">
        <input type="text" class="new-group-input" data-field="name" placeholder="Group Name *" required />
      </td>
      <td class="group-description" data-label="Description">
        <input type="text" class="new-group-input" data-field="description" placeholder="Description" />
      </td>
      <td class="group-contact-count" data-label="Contacts"></td>
      <td class="group-actions">
        <button class="btn-save-new" title="Save group">💾</button>
        <button class="btn-cancel-new" title="Cancel">✕</button>
      </td>
    `;

    // Insert at the top of tbody
    tbody.insertBefore(newRow, tbody.firstChild);
    this.newGroupRow = newRow;

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
        this.saveNewGroup();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelNewGroup();
      });
    }

    // Handle Enter key to save
    newRow.querySelectorAll('.new-group-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveNewGroup();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelNewGroup();
        }
      });
    });
  }

  /**
   * Save the new group
   * Requirements: 13.4
   */
  async saveNewGroup() {
    if (!this.newGroupRow) {
      return;
    }

    // Collect data from inputs
    const inputs = this.newGroupRow.querySelectorAll('.new-group-input');
    const groupData = {};

    inputs.forEach(input => {
      const field = input.dataset.field;
      const value = input.value.trim();
      if (value) {
        groupData[field] = value;
      }
    });

    // Validate required fields
    if (!groupData.name) {
      this.showError('Group name is required');
      const nameInput = this.newGroupRow.querySelector('input[data-field="name"]');
      if (nameInput) {
        nameInput.focus();
        nameInput.classList.add('error');
      }
      return;
    }

    try {
      // Show loading state
      const saveBtn = this.newGroupRow.querySelector('.btn-save-new');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳';
      }

      // Make API call to create group
      const response = await fetch('/api/contacts/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: window.userId, // Assumes userId is available globally
          ...groupData,
          contactIds: [] // New group starts with no contacts
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create group: ${response.statusText}`);
      }

      const newGroup = await response.json();

      // Add to data arrays
      this.data.push(newGroup);
      this.filteredData.push(newGroup);

      // Remove the new group row
      this.cancelNewGroup();

      // Re-sort and render
      this.sort(this.options.sortBy, this.options.sortOrder);

      // Trigger callback
      if (this.options.onAdd) {
        this.options.onAdd(newGroup);
      }

      // Show success message
      if (typeof showToast === 'function') {
        showToast('Group created successfully', 'success');
      }

    } catch (error) {
      console.error('Error creating group:', error);
      this.showError(`Failed to create group: ${error.message}`);

      // Re-enable save button
      const saveBtn = this.newGroupRow.querySelector('.btn-save-new');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾';
      }
    }
  }

  /**
   * Cancel adding a new group
   */
  cancelNewGroup() {
    if (this.newGroupRow) {
      this.newGroupRow.remove();
      this.newGroupRow = null;
    }
    this.addingGroup = false;
  }

  /**
   * Delete a group
   * Requirements: 13.5
   */
  async deleteGroup(groupId) {
    const group = this.data.find(g => g.id === groupId);
    if (!group) {
      return;
    }

    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete the group "${group.name}"? This will remove the group from all contacts.`);
    if (!confirmed) {
      return;
    }

    try {
      // Make API call to delete group
      const response = await fetch(`/api/contacts/groups/${groupId}?userId=${window.userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete group: ${response.statusText}`);
      }

      // Remove from data arrays
      this.data = this.data.filter(g => g.id !== groupId);
      this.filteredData = this.filteredData.filter(g => g.id !== groupId);

      // Remove from expanded groups set
      this.expandedGroups.delete(groupId);

      // Re-render
      this.render();

      // Trigger callback
      if (this.options.onDelete) {
        this.options.onDelete(groupId);
      }

      // Show success message
      if (typeof showToast === 'function') {
        showToast('Group deleted successfully', 'success');
      }

    } catch (error) {
      console.error('Error deleting group:', error);
      this.showError(`Failed to delete group: ${error.message}`);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Add Group button handler
    const addBtn = this.container.querySelector('.btn-add-group');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addRow();
      });
    }

    // Delete button handlers
    this.container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const groupId = e.target.dataset.groupId;
        if (groupId) {
          this.deleteGroup(groupId);
        }
      });
    });

    // Sortable column headers
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

    // Expand/collapse toggle handlers (Requirement 13.2)
    this.container.querySelectorAll('.expand-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const groupId = e.currentTarget.dataset.groupId;
        if (groupId) {
          this.toggleExpand(groupId);
        }
      });
    });

    // Editable cell handlers (Requirement 13.3)
    this.container.querySelectorAll('td.editable').forEach(cell => {
      cell.addEventListener('click', (e) => {
        // Don't start edit if already editing
        if (this.editingCell) {
          return;
        }
        this.startEdit(cell);
      });
    });
  }

  /**
   * Start editing a cell
   * Requirements: 13.3
   */
  startEdit(cell) {
    if (this.editingCell) {
      return; // Already editing another cell
    }

    const row = cell.closest('tr');
    const groupId = row.dataset.groupId;
    const field = cell.dataset.field;
    const type = cell.dataset.type;
    const group = this.data.find(g => g.id === groupId);

    if (!group) {
      return;
    }

    this.editingCell = new InlineEditCell(cell, group, field, type, {
      onSave: async (value) => {
        await this.saveEdit(groupId, field, value);
        this.editingCell = null;
      },
      onCancel: () => {
        this.editingCell = null;
      }
    });

    this.editingCell.startEdit();
  }

  /**
   * Save an edited cell value
   * Requirements: 13.3
   */
  async saveEdit(groupId, field, value) {
    const group = this.data.find(g => g.id === groupId);
    if (!group) {
      return;
    }

    const originalValue = group[field];

    try {
      // Optimistic update
      group[field] = value;
      this.render();

      // Make API call
      const response = await fetch(`/api/contacts/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: window.userId,
          [field]: value
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update group: ${response.statusText}`);
      }

      const updatedGroup = await response.json();
      
      // Update with server response
      const index = this.data.findIndex(g => g.id === groupId);
      if (index !== -1) {
        this.data[index] = updatedGroup;
        this.filteredData = this.data.filter(g => 
          this.filteredData.some(fg => fg.id === g.id)
        );
        this.render();
      }

      if (this.options.onEdit) {
        this.options.onEdit(groupId, field, value);
      }

    } catch (error) {
      // Revert on error
      group[field] = originalValue;
      this.render();
      this.showError(`Failed to update ${field}: ${error.message}`);
    }
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
   * Initialize Google Mappings Review component
   * Requirements: 15.2, 15.4, 15.5
   */
  async initializeMappingsReview() {
    const reviewContainer = this.container.querySelector('#google-mappings-review-container');
    
    if (!reviewContainer) {
      return;
    }

    // Check if GoogleMappingsReview is available
    if (typeof GoogleMappingsReview === 'undefined') {
      console.warn('GoogleMappingsReview component not loaded');
      return;
    }

    // Create mappings review instance
    this.mappingsReview = new GoogleMappingsReview(reviewContainer, {
      onApprove: async (mappingId, result) => {
        // Refresh groups table after approval (Requirement 15.5)
        await this.refreshAfterMappingAction();
      },
      onReject: async (mappingId) => {
        // Refresh groups table after rejection (Requirement 15.5)
        await this.refreshAfterMappingAction();
      },
      onUpdate: () => {
        // Update red dot indicator (Requirement 15.3)
        if (this.options.onMappingsUpdate) {
          this.options.onMappingsUpdate();
        }
      }
    });

    // Render the mappings review
    await this.mappingsReview.render();
  }

  /**
   * Refresh groups table after mapping action
   * Requirements: 15.5
   */
  async refreshAfterMappingAction() {
    try {
      // Fetch updated groups data
      const authToken = window.authToken || localStorage.getItem('authToken');
      const API_BASE = window.API_BASE || '/api';
      const userId = window.userId || localStorage.getItem('userId');
      
      if (!authToken || !userId) {
        return;
      }

      const response = await fetch(`${API_BASE}/contacts/groups?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      
      const groups = await response.json();
      
      // Update data and re-render
      this.refresh(groups, this.contacts);
      
    } catch (error) {
      console.error('Error refreshing groups after mapping action:', error);
    }
  }

  /**
   * Check if there are pending mappings
   * Requirements: 15.1
   */
  async hasPendingMappings() {
    if (this.mappingsReview) {
      return await this.mappingsReview.hasPendingMappings();
    }
    return false;
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

// Global instance for app.js integration
let globalGroupsTable = null;

/**
 * Global function to render groups table
 * Called by app.js after loading groups
 */
function renderGroupsTable(groups) {
  const container = document.getElementById('groups-list');
  if (!container) {
    console.error('groups-list container not found');
    return;
  }
  
  // Create or update the table instance
  if (!globalGroupsTable) {
    globalGroupsTable = new GroupsTable(container, groups);
  } else {
    globalGroupsTable.data = groups;
    globalGroupsTable.filteredData = groups;
  }
  
  globalGroupsTable.render();
}

// Expose globally
window.GroupsTable = GroupsTable;
window.renderGroupsTable = renderGroupsTable;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GroupsTable, renderGroupsTable };
}
