/**
 * TagsTable Component
 * 
 * Displays tags in a sortable, editable table format.
 * Implements Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

class TagsTable {
  constructor(container, data = [], contacts = [], options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    this.data = data;
    this.contacts = contacts; // All contacts for count calculation
    this.filteredData = data;
    this.options = {
      sortBy: 'text',
      sortOrder: 'asc',
      onEdit: null,
      onDelete: null,
      onAdd: null,
      ...options
    };
    
    this.editingCell = null;
    this.addingTag = false;
    this.newTagRow = null;
  }

  /**
   * Render the complete table structure
   * Requirements: 14.1
   */
  render() {
    if (!this.container) {
      console.error('TagsTable: Container not found');
      return;
    }

    const tableHTML = `
      <div class="tags-table-controls">
        <button class="btn-add-tag" title="Add new tag">
          ➕ Add Tag
        </button>
      </div>
      <div class="tags-table-wrapper">
        <table class="tags-table">
          <thead>
            <tr>
              <th class="sortable" data-column="text">Name <span class="sort-indicator"></span></th>
              <th class="sortable" data-column="contactCount">Contact Count <span class="sort-indicator"></span></th>
              <th data-column="source">Source</th>
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
  }

  /**
   * Render table rows for all tags
   * Requirements: 14.1
   */
  renderRows() {
    if (this.filteredData.length === 0) {
      return `
        <tr class="empty-state">
          <td colspan="4" style="text-align: center; padding: 40px; color: #6b7280;">
            No tags found
          </td>
        </tr>
      `;
    }

    return this.filteredData.map(tag => this.renderRow(tag)).join('');
  }

  /**
   * Render a single tag row
   * Requirements: 14.1, 14.5, 17.1, 17.2
   */
  renderRow(tag) {
    const contactCount = this.getContactCount(tag);

    return `
      <tr data-tag-id="${tag.id}">
        <td class="tag-name editable" data-field="text" data-type="text" data-label="Name">${this.escapeHtml(tag.text)}</td>
        <td class="tag-contact-count" data-label="Contacts">${contactCount}</td>
        <td class="tag-source" data-label="Source">${this.renderSourceBadge(tag)}</td>
        <td class="tag-actions">
          <button class="btn-delete" data-tag-id="${tag.id}" title="Delete tag">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Get contact count for a tag
   */
  getContactCount(tag) {
    // Count contacts that have this tag
    return this.contacts.filter(contact => 
      contact.tags && contact.tags.some(t => t.id === tag.id || t.text === tag.text)
    ).length;
  }

  /**
   * Render source badge for AI/voice tags
   * Requirements: 14.5
   */
  renderSourceBadge(tag) {
    if (tag.source === 'ai' || tag.source === 'voice') {
      const icon = tag.source === 'ai' ? '🤖' : '🎤';
      const label = tag.source === 'ai' ? 'AI' : 'Voice';
      return `
        <span class="badge badge-automated" title="Automated ${label} tag">
          ${icon} ${label}
        </span>
      `;
    }
    return '';
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
        aVal = this.getContactCount(a);
        bVal = this.getContactCount(b);
        
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
    // Simple text search across tag name
    this.filteredData = this.data.filter(tag => {
      if (query) {
        const searchText = query.toLowerCase();
        const matchesText = tag.text && tag.text.toLowerCase().includes(searchText);
        
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
   * Add a new tag row
   * Requirements: 14.3
   */
  addRow() {
    if (this.addingTag) {
      return; // Already adding a tag
    }

    this.addingTag = true;

    // Create a new row at the top of the table
    const tbody = this.container.querySelector('.tags-table tbody');
    if (!tbody) {
      return;
    }

    const newRow = document.createElement('tr');
    newRow.className = 'new-tag-row';
    newRow.innerHTML = `
      <td class="tag-name" data-label="Name">
        <input type="text" class="new-tag-input" data-field="text" placeholder="Tag Name *" required />
      </td>
      <td class="tag-contact-count" data-label="Contacts"></td>
      <td class="tag-source" data-label="Source"></td>
      <td class="tag-actions">
        <button class="btn-save-new" title="Save tag">💾</button>
        <button class="btn-cancel-new" title="Cancel">✕</button>
      </td>
    `;

    // Insert at the top of tbody
    tbody.insertBefore(newRow, tbody.firstChild);
    this.newTagRow = newRow;

    // Focus on name field
    const nameInput = newRow.querySelector('input[data-field="text"]');
    if (nameInput) {
      nameInput.focus();
    }

    // Attach event listeners for save and cancel
    const saveBtn = newRow.querySelector('.btn-save-new');
    const cancelBtn = newRow.querySelector('.btn-cancel-new');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveNewTag();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelNewTag();
      });
    }

    // Handle Enter key to save
    newRow.querySelectorAll('.new-tag-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveNewTag();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelNewTag();
        }
      });
    });
  }

  /**
   * Save the new tag
   * Requirements: 14.3
   */
  async saveNewTag() {
    if (!this.newTagRow) {
      return;
    }

    // Collect data from inputs
    const inputs = this.newTagRow.querySelectorAll('.new-tag-input');
    const tagData = {};

    inputs.forEach(input => {
      const field = input.dataset.field;
      const value = input.value.trim();
      if (value) {
        tagData[field] = value;
      }
    });

    // Validate required fields
    if (!tagData.text) {
      this.showError('Tag name is required');
      const nameInput = this.newTagRow.querySelector('input[data-field="text"]');
      if (nameInput) {
        nameInput.focus();
        nameInput.classList.add('error');
      }
      return;
    }

    try {
      // Show loading state
      const saveBtn = this.newTagRow.querySelector('.btn-save-new');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳';
      }

      // Make API call to create tag
      const response = await fetch('/api/groups-tags/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tagData.text,
          source: 'manual'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create tag: ${response.statusText}`);
      }

      const newTag = await response.json();

      // Add to data arrays
      this.data.push(newTag);
      this.filteredData.push(newTag);

      // Remove the new tag row
      this.cancelNewTag();

      // Re-sort and render
      this.sort(this.options.sortBy, this.options.sortOrder);

      // Trigger callback
      if (this.options.onAdd) {
        this.options.onAdd(newTag);
      }

      // Show success message
      if (typeof showToast === 'function') {
        showToast('Tag created successfully', 'success');
      }

    } catch (error) {
      console.error('Error creating tag:', error);
      this.showError(`Failed to create tag: ${error.message}`);

      // Re-enable save button
      const saveBtn = this.newTagRow.querySelector('.btn-save-new');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾';
      }
    }
  }

  /**
   * Cancel adding a new tag
   */
  cancelNewTag() {
    if (this.newTagRow) {
      this.newTagRow.remove();
      this.newTagRow = null;
    }
    this.addingTag = false;
  }

  /**
   * Delete a tag
   * Requirements: 14.4
   */
  async deleteTag(tagId) {
    const tag = this.data.find(t => t.id === tagId);
    if (!tag) {
      return;
    }

    const contactCount = this.getContactCount(tag);

    // Confirm deletion
    const confirmed = confirm(
      `Are you sure you want to delete the tag "${tag.text}"? ` +
      `This will remove the tag from ${contactCount} contact(s).`
    );
    if (!confirmed) {
      return;
    }

    try {
      // Make API call to delete tag
      const response = await fetch(`/api/groups-tags/tags/${tagId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete tag: ${response.statusText}`);
      }

      // Remove from data arrays
      this.data = this.data.filter(t => t.id !== tagId);
      this.filteredData = this.filteredData.filter(t => t.id !== tagId);

      // Re-render
      this.render();

      // Trigger callback
      if (this.options.onDelete) {
        this.options.onDelete(tagId);
      }

      // Show success message
      if (typeof showToast === 'function') {
        showToast('Tag deleted successfully', 'success');
      }

    } catch (error) {
      console.error('Error deleting tag:', error);
      this.showError(`Failed to delete tag: ${error.message}`);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Add Tag button handler
    const addBtn = this.container.querySelector('.btn-add-tag');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addRow();
      });
    }

    // Delete button handlers
    this.container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tagId = e.target.dataset.tagId;
        if (tagId) {
          this.deleteTag(tagId);
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

    // Editable cell handlers (Requirement 14.2)
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
   * Requirements: 14.2
   */
  startEdit(cell) {
    if (this.editingCell) {
      return; // Already editing another cell
    }

    const row = cell.closest('tr');
    const tagId = row.dataset.tagId;
    const field = cell.dataset.field;
    const type = cell.dataset.type;
    const tag = this.data.find(t => t.id === tagId);

    if (!tag) {
      return;
    }

    this.editingCell = new InlineEditCell(cell, tag, field, type, {
      onSave: async (value) => {
        await this.saveEdit(tagId, field, value);
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
   * Requirements: 14.2
   */
  async saveEdit(tagId, field, value) {
    const tag = this.data.find(t => t.id === tagId);
    if (!tag) {
      return;
    }

    const originalValue = tag[field];

    try {
      // Optimistic update
      tag[field] = value;
      this.render();

      // Make API call to update tag name for all associated contacts
      const response = await fetch(`/api/groups-tags/tags/${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: value
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update tag: ${response.statusText}`);
      }

      const updatedTag = await response.json();
      
      // Update with server response
      const index = this.data.findIndex(t => t.id === tagId);
      if (index !== -1) {
        this.data[index] = updatedTag;
        this.filteredData = this.data.filter(t => 
          this.filteredData.some(ft => ft.id === t.id)
        );
        this.render();
      }

      if (this.options.onEdit) {
        this.options.onEdit(tagId, field, value);
      }

      // Show success message
      if (typeof showToast === 'function') {
        showToast('Tag updated for all contacts', 'success');
      }

    } catch (error) {
      // Revert on error
      tag[field] = originalValue;
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
let globalTagsTable = null;

/**
 * Global function to render tags table
 * Called by app.js after loading tags
 */
function renderTagsTable(tags) {
  const container = document.getElementById('tags-list');
  if (!container) {
    console.error('tags-list container not found');
    return;
  }
  
  // Create or update the table instance
  if (!globalTagsTable) {
    globalTagsTable = new TagsTable(container, tags);
  } else {
    globalTagsTable.data = tags;
    globalTagsTable.filteredData = tags;
  }
  
  globalTagsTable.render();
}

// Expose globally
window.TagsTable = TagsTable;
window.renderTagsTable = renderTagsTable;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TagsTable, renderTagsTable };
}
