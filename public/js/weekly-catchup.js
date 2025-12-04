/**
 * Weekly Catchup UI Component
 *
 * Frontend component for weekly contact review sessions.
 * Provides UI for reviewing contacts in manageable weekly chunks.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

class WeeklyCatchupUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.currentSession = null;
    this.currentContact = null;
    this.contacts = {}; // Cache of contact details
    
    this.init();
  }

  /**
   * Initialize the UI
   */
  async init() {
    this.render();
    await this.loadCurrentSession();
  }

  /**
   * Load current active session
   * Requirements: 7.1
   */
  async loadCurrentSession() {
    try {
      const response = await fetch('/api/weekly-catchup/current', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success && data.session) {
        this.currentSession = data.session;
        await this.loadNextContact();
        this.render();
      } else {
        // No active session
        this.currentSession = null;
        this.render();
      }
    } catch (error) {
      console.error('Error loading current session:', error);
      this.showError('Failed to load weekly catchup session');
    }
  }

  /**
   * Start a new session
   * Requirements: 7.1
   */
  async startNewSession() {
    try {
      const response = await fetch('/api/weekly-catchup/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        this.currentSession = data.session;
        await this.loadNextContact();
        this.render();
      } else {
        this.showError('Failed to start weekly catchup session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      this.showError('Failed to start weekly catchup session');
    }
  }

  /**
   * Load next contact to review
   * Requirements: 7.2
   */
  async loadNextContact() {
    if (!this.currentSession) return;

    try {
      const response = await fetch(`/api/weekly-catchup/${this.currentSession.id}/next`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success && data.contact) {
        this.currentContact = data.contact;
        
        // Load full contact details
        await this.loadContactDetails(data.contact.contactId);
      } else {
        // No more contacts to review
        this.currentContact = null;
      }
    } catch (error) {
      console.error('Error loading next contact:', error);
      this.showError('Failed to load next contact');
    }
  }

  /**
   * Load contact details
   */
  async loadContactDetails(contactId) {
    if (this.contacts[contactId]) return;

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        this.contacts[contactId] = data.contact;
      }
    } catch (error) {
      console.error('Error loading contact details:', error);
    }
  }

  /**
   * Review contact with action
   * Requirements: 7.2
   */
  async reviewContact(action, options = {}) {
    if (!this.currentSession || !this.currentContact) return;

    try {
      const response = await fetch(`/api/weekly-catchup/${this.currentSession.id}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: this.currentContact.contactId,
          action,
          ...options,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update progress
        await this.updateProgress();
        
        // Load next contact
        await this.loadNextContact();
        
        // Check if session is complete
        if (!this.currentContact && this.currentSession.progress.percentComplete === 100) {
          await this.completeSession();
        } else {
          this.render();
        }
      } else {
        this.showError('Failed to review contact');
      }
    } catch (error) {
      console.error('Error reviewing contact:', error);
      this.showError('Failed to review contact');
    }
  }

  /**
   * Update session progress
   * Requirements: 7.2
   */
  async updateProgress() {
    if (!this.currentSession) return;

    try {
      const response = await fetch(`/api/weekly-catchup/${this.currentSession.id}/progress`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        this.currentSession.progress = data.progress;
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  /**
   * Complete the session
   * Requirements: 7.3
   */
  async completeSession() {
    if (!this.currentSession) return;

    try {
      const response = await fetch(`/api/weekly-catchup/${this.currentSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        this.showCelebration();
        this.currentSession = null;
        this.currentContact = null;
        
        setTimeout(() => {
          this.render();
        }, 3000);
      }
    } catch (error) {
      console.error('Error completing session:', error);
      this.showError('Failed to complete session');
    }
  }

  /**
   * Skip the session
   * Requirements: 7.4
   */
  async skipSession() {
    if (!this.currentSession) return;

    if (!confirm('Are you sure you want to skip this week\'s catchup? Unreviewed contacts will be included in next week\'s session.')) {
      return;
    }

    try {
      const response = await fetch(`/api/weekly-catchup/${this.currentSession.id}/skip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        this.currentSession = null;
        this.currentContact = null;
        this.render();
      }
    } catch (error) {
      console.error('Error skipping session:', error);
      this.showError('Failed to skip session');
    }
  }

  /**
   * Render the UI
   */
  render() {
    if (!this.currentSession) {
      this.renderNoSession();
    } else if (!this.currentContact) {
      this.renderSessionComplete();
    } else {
      this.renderReviewUI();
    }
  }

  /**
   * Render no session state
   */
  renderNoSession() {
    this.container.innerHTML = `
      <div class="weekly-catchup-empty">
        <div class="weekly-catchup-icon">📅</div>
        <h2>Weekly Catchup</h2>
        <p>Review 10-15 contacts each week to keep your network organized and up-to-date.</p>
        <button class="btn btn-primary" onclick="weeklyCatchupUI.startNewSession()">
          Start This Week's Catchup
        </button>
      </div>
    `;
  }

  /**
   * Render session complete state
   */
  renderSessionComplete() {
    this.container.innerHTML = `
      <div class="weekly-catchup-complete">
        <div class="weekly-catchup-icon">✅</div>
        <h2>All Done!</h2>
        <p>You've reviewed all contacts for this week. Great job!</p>
        <button class="btn btn-secondary" onclick="weeklyCatchupUI.loadCurrentSession()">
          Back to Dashboard
        </button>
      </div>
    `;
  }

  /**
   * Render review UI
   * Requirements: 7.2
   */
  renderReviewUI() {
    const contact = this.contacts[this.currentContact.contactId];
    const progress = this.currentSession.progress;

    this.container.innerHTML = `
      <div class="weekly-catchup-review">
        <!-- Progress Bar -->
        <div class="weekly-catchup-progress">
          <div class="progress-header">
            <span>Week ${this.currentSession.weekNumber}, ${this.currentSession.year}</span>
            <span>${progress.reviewedContacts} / ${progress.totalContacts} contacts</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress.percentComplete}%"></div>
          </div>
          <div class="progress-footer">
            <span>~${progress.estimatedTimeRemaining} minutes remaining</span>
            <button class="btn-link" onclick="weeklyCatchupUI.skipSession()">Skip this week</button>
          </div>
        </div>

        <!-- Contact Card -->
        <div class="contact-review-card">
          <div class="contact-header">
            <div class="contact-avatar">${this.getInitials(contact?.name || 'Unknown')}</div>
            <div class="contact-info">
              <h3>${contact?.name || 'Unknown Contact'}</h3>
              <p class="contact-meta">
                ${this.formatReviewType(this.currentContact.reviewType)}
                ${this.currentContact.lastInteraction ? 
                  `• Last contact: ${this.formatDate(this.currentContact.lastInteraction)}` : 
                  '• No recent contact'}
              </p>
            </div>
          </div>

          ${contact ? this.renderContactDetails(contact) : ''}

          <!-- Suggested Action -->
          <div class="suggested-action">
            <strong>Suggested:</strong> ${this.currentContact.suggestedAction}
          </div>

          <!-- Action Buttons -->
          <div class="review-actions">
            ${this.renderActionButtons()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render contact details
   */
  renderContactDetails(contact) {
    const details = [];

    if (contact.email) details.push(`📧 ${contact.email}`);
    if (contact.phone) details.push(`📱 ${contact.phone}`);
    if (contact.location) details.push(`📍 ${contact.location}`);
    if (contact.dunbarCircle) details.push(`🎯 ${this.formatCircle(contact.dunbarCircle)}`);

    if (details.length === 0) return '';

    return `
      <div class="contact-details">
        ${details.map(d => `<div class="contact-detail">${d}</div>`).join('')}
      </div>
    `;
  }

  /**
   * Render action buttons based on review type
   * Requirements: 12.1, 12.3
   */
  renderActionButtons() {
    const reviewType = this.currentContact.reviewType;

    if (reviewType === 'categorize') {
      return `
        <div class="circle-buttons">
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'inner' })">
            Inner Circle
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'close' })">
            Close Friends
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'active' })">
            Active Friends
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'casual' })">
            Casual Network
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'acquaintance' })">
            Acquaintances
          </button>
        </div>
        <div class="pruning-actions">
          <button class="btn btn-secondary" onclick="weeklyCatchupUI.reviewContact('archive')">
            Archive Contact
          </button>
          <button class="btn btn-danger" onclick="weeklyCatchupUI.confirmRemoveContact()">
            Remove Contact
          </button>
        </div>
      `;
    } else if (reviewType === 'maintain') {
      return `
        <button class="btn btn-primary" onclick="weeklyCatchupUI.reviewContact('keep')">
          Keep as is
        </button>
        <button class="btn btn-secondary" onclick="weeklyCatchupUI.showCircleSelector()">
          Move to different circle
        </button>
        <div class="pruning-actions">
          <button class="btn btn-secondary" onclick="weeklyCatchupUI.reviewContact('archive')">
            Archive Contact
          </button>
          <button class="btn btn-danger" onclick="weeklyCatchupUI.confirmRemoveContact()">
            Remove Contact
          </button>
        </div>
      `;
    } else if (reviewType === 'prune') {
      return `
        <button class="btn btn-primary" onclick="weeklyCatchupUI.reviewContact('keep')">
          Keep Contact
        </button>
        <button class="btn btn-warning" onclick="weeklyCatchupUI.reviewContact('archive')">
          Archive Contact
        </button>
        <button class="btn btn-danger" onclick="weeklyCatchupUI.confirmRemoveContact()">
          Remove Contact
        </button>
      `;
    }

    return '';
  }

  /**
   * Show circle selector modal
   */
  showCircleSelector() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Select Circle</h3>
        <div class="circle-buttons">
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'inner' }); this.closest('.modal-overlay').remove()">
            Inner Circle
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'close' }); this.closest('.modal-overlay').remove()">
            Close Friends
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'active' }); this.closest('.modal-overlay').remove()">
            Active Friends
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'casual' }); this.closest('.modal-overlay').remove()">
            Casual Network
          </button>
          <button class="btn btn-circle" onclick="weeklyCatchupUI.reviewContact('update_circle', { circle: 'acquaintance' }); this.closest('.modal-overlay').remove()">
            Acquaintances
          </button>
        </div>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
          Cancel
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Confirm contact removal with dialog
   * Requirements: 12.3 - Confirmation dialog for removal
   */
  confirmRemoveContact() {
    if (!this.currentContact) return;

    const contact = this.contacts[this.currentContact.contactId];
    const contactName = contact?.name || 'this contact';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content confirmation-modal">
        <div class="confirmation-icon">⚠️</div>
        <h3>Remove Contact?</h3>
        <p>Are you sure you want to permanently remove <strong>${contactName}</strong>?</p>
        <p class="warning-text">This action cannot be undone. All data for this contact will be deleted.</p>
        <div class="confirmation-actions">
          <button class="btn btn-danger" onclick="weeklyCatchupUI.removeContact(); this.closest('.modal-overlay').remove()">
            Yes, Remove Contact
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Remove contact permanently
   * Requirements: 12.3 - Delete contact after confirmation
   */
  async removeContact() {
    if (!this.currentContact) return;

    try {
      const response = await fetch(`/api/contacts/${this.currentContact.contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Update progress
        await this.updateProgress();
        
        // Load next contact
        await this.loadNextContact();
        
        // Check if session is complete
        if (!this.currentContact && this.currentSession.progress.percentComplete === 100) {
          await this.completeSession();
        } else {
          this.render();
        }
      } else {
        this.showError('Failed to remove contact');
      }
    } catch (error) {
      console.error('Error removing contact:', error);
      this.showError('Failed to remove contact');
    }
  }

  /**
   * Show celebration animation
   * Requirements: 7.3
   */
  showCelebration() {
    const celebration = document.createElement('div');
    celebration.className = 'celebration-overlay';
    celebration.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <h2>Awesome!</h2>
        <p>You've completed this week's catchup!</p>
        <p class="celebration-subtext">Your network is looking great!</p>
      </div>
    `;
    document.body.appendChild(celebration);

    setTimeout(() => {
      celebration.remove();
    }, 3000);
  }

  /**
   * Show error message
   */
  showError(message) {
    const error = document.createElement('div');
    error.className = 'error-toast';
    error.textContent = message;
    document.body.appendChild(error);

    setTimeout(() => {
      error.remove();
    }, 3000);
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
   * Helper: Format review type
   */
  formatReviewType(type) {
    const types = {
      categorize: '🏷️ Needs categorization',
      maintain: '💬 Maintenance check',
      prune: '🔍 Review relevance',
    };
    return types[type] || type;
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

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
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
  window.WeeklyCatchupUI = WeeklyCatchupUI;
}
