/**
 * Archived Contacts Manager UI Component
 *
 * Frontend component for viewing and reactivating archived contacts.
 * 
 * Requirements: 12.2, 12.5
 */

class ArchivedContactsManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.archivedContacts = [];
    this.selectedContacts = new Set();
    
    this.init();
  }

  /**
   * Initialize the UI
   */
  async init() {
    await this.loadArchivedContacts();
    this.render();
  }

  /**
   * Load archived contacts
   * Requirements: 12.2
   */
  async loadArchivedContacts() {
    try {
      const response = await fetch('/api/contacts/archived', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        this.archivedContacts = data.contacts;
      } else {
        this.showError('Failed to load archived contacts');
      }
    } catch (error) {
      console.error('Error loading archived contacts:', error);
      this.showError('Failed to load archived contacts');
    }
  }

  /**
   * Reactivate a contact
   * Requirements: 12.5
   */
  async reactivateContact(contactId) {
    try {
      const response = await fetch(`/api/contacts/${contactId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Remove from archived list
        this.archivedContacts = this.archivedContacts.filter(c => c.id !== contactId);
        this.selectedContacts.delete(contactId);
        
        this.showSuccess('Contact reactivated successfully');
        this.render();
      } else {
        this.showError('Failed to reactivate contact');
      }
    } catch (error) {
      console.error('Error reactivating contact:', error);
      this.showError('Failed to reactivate contact');
    }
  }

  /**
   * Bulk reactivate selected contacts
   * Requirements: 12.5
   */
  async bulkReactivate() {
    if (this.selectedContacts.size === 0) {
      this.showError('No contacts selected');
      return;
    }

    const contactIds = Array.from(this.selectedContacts);
    let successCount = 0;
    let failCount = 0;

    for (const contactId of contactIds) {
      try {
        await this.reactivateContact(contactId);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      this.showSuccess(`Reactivated ${successCount} contact(s)`);
    }
    if (failCount > 0) {
      this.showError(`Failed to reactivate ${failCount} contact(s)`);
    }

    this.selectedContacts.clear();
    this.render();
  }

  /**
   * Toggle contact selection
   */
  toggleSelection(contactId) {
    if (this.selectedContacts.has(contactId)) {
      this.selectedContacts.delete(contactId);
    } else {
      this.selectedContacts.add(contactId);
    }
    this.render();
  }

  /**
   * Select all contacts
   */
  selectAll() {
    this.archivedContacts.forEach(contact => {
      this.selectedContacts.add(contact.id);
    });
    this.render();
  }

  /**
   * Deselect all contacts
   */
  deselectAll() {
    this.selectedContacts.clear();
    this.render();
  }

  /**
   * Render the UI
   */
  render() {
    if (this.archivedContacts.length === 0) {
      this.renderEmpty();
    } else {
      this.renderContactList();
    }
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="archived-contacts-empty">
        <div class="empty-icon">📦</div>
        <h2>No Archived Contacts</h2>
        <p>Contacts you archive will appear here. You can reactivate them at any time.</p>
      </div>
    `;
  }

  /**
   * Render contact list
   * Requirements: 12.2
   */
  renderContactList() {
    const selectedCount = this.selectedContacts.size;

    this.container.innerHTML = `
      <div class="archived-contacts-manager">
        <!-- Header -->
        <div class="archived-header">
          <h2>Archived Contacts</h2>
          <p>${this.archivedContacts.length} archived contact(s)</p>
        </div>

        <!-- Bulk Actions -->
        ${selectedCount > 0 ? `
          <div class="bulk-actions">
            <span>${selectedCount} selected</span>
            <button class="btn btn-primary" onclick="archivedContactsManager.bulkReactivate()">
              Reactivate Selected
            </button>
            <button class="btn btn-secondary" onclick="archivedContactsManager.deselectAll()">
              Deselect All
            </button>
          </div>
        ` : `
          <div class="bulk-actions">
            <button class="btn btn-secondary" onclick="archivedContactsManager.selectAll()">
              Select All
            </button>
          </div>
        `}

        <!-- Contact List -->
        <div class="archived-contacts-list">
          ${this.archivedContacts.map(contact => this.renderContactCard(contact)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual contact card
   * Requirements: 12.2
   */
  renderContactCard(contact) {
    const isSelected = this.selectedContacts.has(contact.id);
    const archivedDate = this.formatDate(contact.archivedAt);
    const lastContact = contact.lastContactDate ? 
      `Last contact: ${this.formatDate(contact.lastContactDate)}` : 
      'No recent contact';

    return `
      <div class="archived-contact-card ${isSelected ? 'selected' : ''}">
        <div class="contact-checkbox">
          <input 
            type="checkbox" 
            ${isSelected ? 'checked' : ''}
            onchange="archivedContactsManager.toggleSelection('${contact.id}')"
          />
        </div>
        
        <div class="contact-avatar">${this.getInitials(contact.name)}</div>
        
        <div class="contact-info">
          <h3>${contact.name}</h3>
          <div class="contact-meta">
            ${contact.email ? `<span>📧 ${contact.email}</span>` : ''}
            ${contact.phone ? `<span>📱 ${contact.phone}</span>` : ''}
          </div>
          <div class="contact-details">
            ${contact.dunbarCircle ? `<span class="circle-badge">${this.formatCircle(contact.dunbarCircle)}</span>` : ''}
            <span class="archived-date">Archived ${archivedDate}</span>
            <span class="last-contact">${lastContact}</span>
          </div>
        </div>
        
        <div class="contact-actions">
          <button 
            class="btn btn-primary btn-sm" 
            onclick="archivedContactsManager.reactivateContact('${contact.id}')"
          >
            Reactivate
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Helper: Get initials from name
   */
  getInitials(name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Helper: Format circle name
   */
  formatCircle(circle) {
    const circles = {
      inner: 'Inner Circle',
      close: 'Close Friends',
      active: 'Active Friends',
      casual: 'Casual Network',
      acquaintance: 'Acquaintances',
    };
    return circles[circle] || circle;
  }

  /**
   * Helper: Format date
   */
  formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Show error message
   */
  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Helper: Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('authToken') || '';
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.ArchivedContactsManager = ArchivedContactsManager;
}
