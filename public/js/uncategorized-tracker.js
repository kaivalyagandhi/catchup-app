/**
 * Uncategorized Contact Tracker
 * 
 * Displays uncategorized contact count, visual indicators for incomplete onboarding,
 * and manages prioritization of uncategorized contacts in management mode.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

const API_BASE = '/api';

/**
 * Uncategorized Tracker Class
 * Manages display and tracking of uncategorized contacts
 */
class UncategorizedTracker {
  constructor() {
    this.authToken = null;
    this.userId = null;
    this.status = null;
    this.progress = null;
    this.listeners = {
      statusUpdate: [],
      progressUpdate: [],
      error: []
    };
  }

  /**
   * Initialize the tracker with auth credentials
   * @param {string} authToken - JWT authentication token
   * @param {string} userId - User ID
   */
  initialize(authToken, userId) {
    this.authToken = authToken;
    this.userId = userId;
  }

  /**
   * Fetch current completion status
   * Requirements: 11.2, 11.4
   * @returns {Promise<Object>} Completion status
   */
  async fetchCompletionStatus() {
    try {
      const response = await fetch(`${API_BASE}/onboarding/completion-status`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch completion status');
      }

      this.status = await response.json();
      this.emit('statusUpdate', this.status);
      return this.status;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Fetch current progress including uncategorized count
   * Requirements: 11.1
   * @returns {Promise<Object>} Progress information
   */
  async fetchProgress() {
    try {
      const response = await fetch(`${API_BASE}/onboarding/progress`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      this.progress = await response.json();
      this.emit('progressUpdate', this.progress);
      return this.progress;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Fetch uncategorized contacts (prioritized for management mode)
   * Requirements: 11.3
   * @returns {Promise<Array>} List of uncategorized contacts
   */
  async fetchUncategorizedContacts() {
    try {
      const response = await fetch(`${API_BASE}/onboarding/uncategorized`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch uncategorized contacts');
      }

      return await response.json();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Flag a new contact for categorization
   * Requirements: 11.5
   * @param {string} contactId - Contact ID to flag
   * @returns {Promise<void>}
   */
  async flagNewContact(contactId) {
    try {
      const response = await fetch(`${API_BASE}/onboarding/flag-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ contactId })
      });

      if (!response.ok) {
        throw new Error('Failed to flag contact');
      }

      // Refresh status after flagging
      await this.fetchCompletionStatus();
      await this.fetchProgress();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Render uncategorized count badge
   * Requirements: 11.1
   * @param {HTMLElement} container - Container element
   */
  renderCountBadge(container) {
    if (!this.progress) {
      return;
    }

    const { uncategorizedContacts } = this.progress;

    if (uncategorizedContacts === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="uncategorized-badge" role="status" aria-live="polite">
        <span class="badge-icon">📋</span>
        <span class="badge-count">${uncategorizedContacts}</span>
        <span class="badge-label">uncategorized</span>
      </div>
    `;
  }

  /**
   * Render visual indicator for incomplete onboarding
   * Requirements: 11.2
   * @param {HTMLElement} container - Container element
   */
  renderIncompleteIndicator(container) {
    if (!this.status) {
      return;
    }

    const { isComplete, hasUncategorizedContacts, uncategorizedCount } = this.status;

    if (isComplete && !hasUncategorizedContacts) {
      container.innerHTML = '';
      return;
    }

    const message = !isComplete
      ? 'Complete your contact organization'
      : `${uncategorizedCount} contact${uncategorizedCount !== 1 ? 's' : ''} need categorization`;

    container.innerHTML = `
      <div class="incomplete-indicator" role="alert">
        <span class="indicator-icon">⚠️</span>
        <span class="indicator-message">${message}</span>
        <button class="indicator-action" onclick="window.uncategorizedTracker.openManagementMode()">
          Organize Now
        </button>
      </div>
    `;
  }

  /**
   * Render completion status display
   * Requirements: 11.4
   * @param {HTMLElement} container - Container element
   */
  renderCompletionStatus(container) {
    if (!this.status || !this.progress) {
      return;
    }

    const { isComplete, hasUncategorizedContacts, completedAt } = this.status;
    const { totalContacts, categorizedContacts, percentComplete } = this.progress;

    if (isComplete && !hasUncategorizedContacts) {
      container.innerHTML = `
        <div class="completion-status complete" role="status">
          <span class="status-icon">✅</span>
          <div class="status-content">
            <h3>All Contacts Organized!</h3>
            <p>You've categorized all ${totalContacts} contacts into your social circles.</p>
            ${completedAt ? `<p class="completion-date">Completed on ${new Date(completedAt).toLocaleDateString()}</p>` : ''}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="completion-status incomplete" role="status">
          <div class="status-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentComplete}%"></div>
            </div>
            <span class="progress-text">${percentComplete}% Complete</span>
          </div>
          <div class="status-content">
            <p>${categorizedContacts} of ${totalContacts} contacts organized</p>
            ${hasUncategorizedContacts ? `
              <button class="status-action" onclick="window.uncategorizedTracker.openManagementMode()">
                Continue Organizing
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }
  }

  /**
   * Open management mode with uncategorized contacts prioritized
   * Requirements: 11.3
   */
  async openManagementMode() {
    try {
      // Fetch uncategorized contacts
      const uncategorized = await this.fetchUncategorizedContacts();

      // Emit event for other components to handle
      this.emit('openManagement', {
        prioritizeContacts: uncategorized.map(c => c.id)
      });

      // If onboarding controller is available, use it
      if (window.onboardingController) {
        await window.onboardingController.initializeOnboarding('manage');
      }
    } catch (error) {
      console.error('Error opening management mode:', error);
      this.emit('error', error);
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Refresh all data
   * @returns {Promise<void>}
   */
  async refresh() {
    await Promise.all([
      this.fetchCompletionStatus(),
      this.fetchProgress()
    ]);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UncategorizedTracker;
}

// Create global instance
window.UncategorizedTracker = UncategorizedTracker;
