/**
 * ArchivedContactsView Component
 * 
 * Displays archived contacts with restore functionality.
 * Requirements: 16.1, 16.2, 16.3, 16.6, 16.7
 */

class ArchivedContactsView {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    this.data = [];
    this.selectedContacts = new Set();
    this.options = {
      onRestore: null,
      onBulkRestore: null,
      ...options
    };
  }

  /**
   * Load archived contacts from API
   * Requirements: 16.1
   */
  async loadArchivedContacts() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/contacts/archived', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load archived contacts');
      }

      const result = await response.json();
      this.data = result.contacts || [];
      this.render();
    } catch (error) {
      console.error('Error loading archived contacts:', error);
      this.showError('Failed to load archived contacts');
    }
  }

  /**
   * Render the complete archived contacts view
   * Requirements: 16.1, 16.2
   */
  render() {
    if (!this.container) {
      console.error('ArchivedContactsView: Container not found');
      return;
    }

    const tableHTML = `
      <div class="archived-contacts-header">
        <h2>Archived Contacts</h2>
        <div class="archived-contacts-actions">
          <button class="btn-bulk-restore" ${this.selectedContacts.size === 0 ? 'disabled' : ''}>
            Restore Selected (${this.selectedContacts.size})
          </button>
        </div>
      </div>
      <div class="archived-contacts-table-wrapper">
        <table class="archived-contacts-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" class="select-all-checkbox" 
                  ${this.data.length === 0 ? 'disabled' : ''}
                  ${this.selectedContacts.size === this.data.length && this.data.length > 0 ? 'checked' : ''}>
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Archived Date</th>
              <th>Actions</th>
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
  }

  /**
   * Render table rows for archived contacts
   * Requirements: 16.1, 16.2
   */
  renderRows() {
    if (this.data.length === 0) {
      return `
        <tr class="empty-state">
          <td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
            No archived contacts
          </td>
        </tr>
      `;
    }

    return this.data.map(contact => this.renderRow(contact)).join('');
  }

  /**
   * Render a single archived contact row
   * Requirements: 16.2, 16.3
   */
  renderRow(contact) {
    const isSelected = this.selectedContacts.has(contact.id);
    const archivedDate = contact.archivedAt 
      ? new Date(contact.archivedAt).toLocaleDateString() 
      : 'Unknown';

    return `
      <tr data-contact-id="${contact.id}">
        <td>
          <input type="checkbox" class="contact-checkbox" 
            data-contact-id="${contact.id}"
            ${isSelected ? 'checked' : ''}>
        </td>
        <td>${this.escapeHtml(contact.name)}</td>
        <td>${contact.email ? this.escapeHtml(contact.email) : '-'}</td>
        <td>${contact.phone ? this.escapeHtml(contact.phone) : '-'}</td>
        <td>${archivedDate}</td>
        <td>
          <button class="btn-restore" data-contact-id="${contact.id}" title="Restore contact">
            ↩️ Restore
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Select all checkbox
    const selectAllCheckbox = this.container.querySelector('.select-all-checkbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.handleSelectAll(e.target.checked);
      });
    }

    // Individual checkboxes
    const checkboxes = this.container.querySelectorAll('.contact-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.handleCheckboxChange(e.target.dataset.contactId, e.target.checked);
      });
    });

    // Restore buttons
    const restoreButtons = this.container.querySelectorAll('.btn-restore');
    restoreButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        this.handleRestore(e.target.dataset.contactId);
      });
    });

    // Bulk restore button
    const bulkRestoreButton = this.container.querySelector('.btn-bulk-restore');
    if (bulkRestoreButton) {
      bulkRestoreButton.addEventListener('click', () => {
        this.handleBulkRestore();
      });
    }
  }

  /**
   * Handle select all checkbox
   * Requirements: 16.6
   */
  handleSelectAll(checked) {
    if (checked) {
      this.data.forEach(contact => this.selectedContacts.add(contact.id));
    } else {
      this.selectedContacts.clear();
    }
    this.render();
  }

  /**
   * Handle individual checkbox change
   * Requirements: 16.6
   */
  handleCheckboxChange(contactId, checked) {
    if (checked) {
      this.selectedContacts.add(contactId);
    } else {
      this.selectedContacts.delete(contactId);
    }
    this.render();
  }

  /**
   * Handle restore single contact
   * Requirements: 16.3
   */
  async handleRestore(contactId) {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/contacts/${contactId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to restore contact');
      }

      // Show success message
      this.showSuccess('Contact restored successfully');

      // Remove from local data
      this.data = this.data.filter(c => c.id !== contactId);
      this.selectedContacts.delete(contactId);

      // Call callback if provided
      if (this.options.onRestore) {
        this.options.onRestore(contactId);
      }

      // Re-render
      this.render();

      // Dispatch event for other components to update
      window.dispatchEvent(new CustomEvent('contactRestored', { 
        detail: { contactId } 
      }));
    } catch (error) {
      console.error('Error restoring contact:', error);
      this.showError('Failed to restore contact');
    }
  }

  /**
   * Handle bulk restore
   * Requirements: 16.6
   */
  async handleBulkRestore() {
    if (this.selectedContacts.size === 0) {
      return;
    }

    const contactIds = Array.from(this.selectedContacts);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/contacts/restore/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds })
      });

      if (!response.ok) {
        throw new Error('Failed to restore contacts');
      }

      const result = await response.json();

      // Show success message
      this.showSuccess(`Successfully restored ${result.restoredCount} contact(s)`);

      // Remove from local data
      this.data = this.data.filter(c => !this.selectedContacts.has(c.id));
      this.selectedContacts.clear();

      // Call callback if provided
      if (this.options.onBulkRestore) {
        this.options.onBulkRestore(contactIds);
      }

      // Re-render
      this.render();

      // Dispatch event for other components to update
      window.dispatchEvent(new CustomEvent('contactsRestored', { 
        detail: { contactIds } 
      }));
    } catch (error) {
      console.error('Error restoring contacts:', error);
      this.showError('Failed to restore contacts');
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (typeof showToast === 'function') {
      showToast(message, 'success');
    } else {
      alert(message);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get archived contacts count
   * Requirements: 16.7
   */
  getCount() {
    return this.data.length;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ArchivedContactsView = ArchivedContactsView;
}
