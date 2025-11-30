/**
 * Privacy Settings Component
 *
 * Provides UI for data export and account deletion
 */

class PrivacySettings {
  constructor() {
    this.container = null;
    this.authToken = localStorage.getItem('auth_token');
  }

  /**
   * Render the privacy settings UI
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    this.container = container;

    container.innerHTML = `
      <div class="privacy-settings">
        <h2>Privacy & Data Management</h2>
        <p class="privacy-settings-intro">
          Manage your data and privacy settings. You have full control over your information.
        </p>

        <!-- Data Summary Section -->
        <div class="privacy-section">
          <h3>Your Data</h3>
          <div id="data-summary-container">
            <div class="loading">Loading your data summary...</div>
          </div>
        </div>

        <!-- Data Export Section -->
        <div class="privacy-section">
          <h3>Export Your Data</h3>
          <p>Download all your data in JSON format. This includes contacts, interactions, voice notes, and more.</p>
          
          <div class="export-options">
            <label>
              <input type="checkbox" id="export-contacts" checked>
              Contacts
            </label>
            <label>
              <input type="checkbox" id="export-interactions" checked>
              Interactions
            </label>
            <label>
              <input type="checkbox" id="export-voice-notes" checked>
              Voice Notes
            </label>
            <label>
              <input type="checkbox" id="export-onboarding" checked>
              Onboarding Data
            </label>
            <label>
              <input type="checkbox" id="export-achievements" checked>
              Achievements
            </label>
          </div>

          <button class="btn btn-primary" id="export-data-btn">
            <span class="btn-icon">📥</span>
            Export My Data
          </button>
          <div id="export-status" class="status-message"></div>
        </div>

        <!-- Account Deletion Section -->
        <div class="privacy-section danger-zone">
          <h3>Delete Account</h3>
          <p class="warning-text">
            ⚠️ This action cannot be undone. All your data will be permanently deleted.
          </p>
          
          <div class="deletion-info">
            <p><strong>What will be deleted:</strong></p>
            <ul>
              <li>All contacts and relationship data</li>
              <li>All interactions and voice notes</li>
              <li>All groups, tags, and preferences</li>
              <li>Your account and authentication data</li>
              <li>All onboarding and achievement data</li>
            </ul>
          </div>

          <button class="btn btn-danger" id="delete-account-btn">
            <span class="btn-icon">🗑️</span>
            Delete My Account
          </button>
          <div id="delete-status" class="status-message"></div>
        </div>
      </div>

      <!-- Confirmation Modal -->
      <div id="delete-confirmation-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <h3>Confirm Account Deletion</h3>
          <p>This action is permanent and cannot be undone.</p>
          <p>Type <strong>DELETE MY ACCOUNT</strong> to confirm:</p>
          <input type="text" id="delete-confirmation-input" class="confirmation-input" placeholder="DELETE MY ACCOUNT">
          <div class="modal-actions">
            <button class="btn btn-secondary" id="cancel-delete-btn">Cancel</button>
            <button class="btn btn-danger" id="confirm-delete-btn" disabled>Delete Forever</button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.loadDataSummary();
    this.applyStyles();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const exportBtn = document.getElementById('export-data-btn');
    const deleteBtn = document.getElementById('delete-account-btn');
    const confirmInput = document.getElementById('delete-confirmation-input');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.showDeleteConfirmation());
    }

    if (confirmInput) {
      confirmInput.addEventListener('input', (e) => {
        const isValid = e.target.value === 'DELETE MY ACCOUNT';
        if (confirmBtn) {
          confirmBtn.disabled = !isValid;
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.deleteAccount());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideDeleteConfirmation());
    }
  }

  /**
   * Load data summary
   */
  async loadDataSummary() {
    const container = document.getElementById('data-summary-container');
    if (!container) return;

    try {
      const response = await fetch('/api/privacy/data-summary', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load data summary');
      }

      const summary = await response.json();

      container.innerHTML = `
        <div class="data-summary-grid">
          <div class="data-summary-item">
            <div class="data-count">${summary.contacts}</div>
            <div class="data-label">Contacts</div>
          </div>
          <div class="data-summary-item">
            <div class="data-count">${summary.interactions}</div>
            <div class="data-label">Interactions</div>
          </div>
          <div class="data-summary-item">
            <div class="data-count">${summary.voiceNotes}</div>
            <div class="data-label">Voice Notes</div>
          </div>
          <div class="data-summary-item">
            <div class="data-count">${summary.groups}</div>
            <div class="data-label">Groups</div>
          </div>
          <div class="data-summary-item">
            <div class="data-count">${summary.tags}</div>
            <div class="data-label">Tags</div>
          </div>
          <div class="data-summary-item">
            <div class="data-count">${summary.achievements}</div>
            <div class="data-label">Achievements</div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading data summary:', error);
      container.innerHTML = `
        <div class="error-message">
          Failed to load data summary. Please try again later.
        </div>
      `;
    }
  }

  /**
   * Export user data
   */
  async exportData() {
    const statusEl = document.getElementById('export-status');
    const exportBtn = document.getElementById('export-data-btn');

    if (!statusEl || !exportBtn) return;

    try {
      exportBtn.disabled = true;
      statusEl.textContent = 'Preparing your data export...';
      statusEl.className = 'status-message info';

      const options = {
        includeContacts: document.getElementById('export-contacts')?.checked,
        includeInteractions: document.getElementById('export-interactions')?.checked,
        includeVoiceNotes: document.getElementById('export-voice-notes')?.checked,
        includeOnboardingData: document.getElementById('export-onboarding')?.checked,
        includeAchievements: document.getElementById('export-achievements')?.checked
      };

      const response = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catchup-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusEl.textContent = '✓ Data exported successfully!';
      statusEl.className = 'status-message success';
    } catch (error) {
      console.error('Error exporting data:', error);
      statusEl.textContent = '✗ Export failed. Please try again.';
      statusEl.className = 'status-message error';
    } finally {
      exportBtn.disabled = false;
      setTimeout(() => {
        statusEl.textContent = '';
      }, 5000);
    }
  }

  /**
   * Show delete confirmation modal
   */
  showDeleteConfirmation() {
    const modal = document.getElementById('delete-confirmation-modal');
    if (modal) {
      modal.style.display = 'flex';
      const input = document.getElementById('delete-confirmation-input');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }

  /**
   * Hide delete confirmation modal
   */
  hideDeleteConfirmation() {
    const modal = document.getElementById('delete-confirmation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Delete account
   */
  async deleteAccount() {
    const statusEl = document.getElementById('delete-status');
    const confirmBtn = document.getElementById('confirm-delete-btn');

    if (!statusEl || !confirmBtn) return;

    try {
      confirmBtn.disabled = true;
      statusEl.textContent = 'Deleting your account...';
      statusEl.className = 'status-message info';

      const response = await fetch('/api/privacy/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation: 'DELETE MY ACCOUNT'
        })
      });

      if (!response.ok) {
        throw new Error('Deletion failed');
      }

      const result = await response.json();

      statusEl.textContent = '✓ Account deleted successfully. Redirecting...';
      statusEl.className = 'status-message success';

      // Clear local storage and redirect
      localStorage.clear();
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Error deleting account:', error);
      statusEl.textContent = '✗ Deletion failed. Please try again.';
      statusEl.className = 'status-message error';
      confirmBtn.disabled = false;
    }
  }

  /**
   * Apply styles
   */
  applyStyles() {
    if (document.getElementById('privacy-settings-styles')) return;

    const style = document.createElement('style');
    style.id = 'privacy-settings-styles';
    style.textContent = `
      .privacy-settings {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
      }

      .privacy-settings h2 {
        font-size: 2rem;
        color: #2c3e50;
        margin-bottom: 0.5rem;
      }

      .privacy-settings-intro {
        color: #7f8c8d;
        margin-bottom: 2rem;
      }

      .privacy-section {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .privacy-section h3 {
        font-size: 1.5rem;
        color: #2c3e50;
        margin-bottom: 1rem;
      }

      .data-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .data-summary-item {
        text-align: center;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 6px;
      }

      .data-count {
        font-size: 2rem;
        font-weight: bold;
        color: #3498db;
      }

      .data-label {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-top: 0.25rem;
      }

      .export-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
        margin: 1rem 0;
      }

      .export-options label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }

      .export-options input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .danger-zone {
        border: 2px solid #e74c3c;
      }

      .warning-text {
        color: #e74c3c;
        font-weight: 500;
        margin: 1rem 0;
      }

      .deletion-info {
        background: #fff5f5;
        border-left: 4px solid #e74c3c;
        padding: 1rem;
        margin: 1rem 0;
      }

      .deletion-info ul {
        margin: 0.5rem 0 0 1.5rem;
      }

      .deletion-info li {
        margin: 0.25rem 0;
      }

      .btn {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: #3498db;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #2980b9;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
      }

      .btn-danger {
        background: #e74c3c;
        color: white;
      }

      .btn-danger:hover:not(:disabled) {
        background: #c0392b;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
      }

      .btn-secondary {
        background: #ecf0f1;
        color: #7f8c8d;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #d5dbdb;
      }

      .btn-icon {
        font-size: 1.2rem;
      }

      .status-message {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 4px;
        font-weight: 500;
      }

      .status-message.info {
        background: #e3f2fd;
        color: #1976d2;
      }

      .status-message.success {
        background: #e8f5e9;
        color: #388e3c;
      }

      .status-message.error {
        background: #ffebee;
        color: #d32f2f;
      }

      .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      .modal-content h3 {
        color: #e74c3c;
        margin-bottom: 1rem;
      }

      .confirmation-input {
        width: 100%;
        padding: 0.75rem;
        font-size: 1rem;
        border: 2px solid #e0e0e0;
        border-radius: 4px;
        margin: 1rem 0;
        font-family: monospace;
      }

      .confirmation-input:focus {
        outline: none;
        border-color: #e74c3c;
      }

      .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }

      .loading {
        text-align: center;
        padding: 2rem;
        color: #7f8c8d;
      }

      .error-message {
        padding: 1rem;
        background: #ffebee;
        color: #d32f2f;
        border-radius: 4px;
      }

      @media (max-width: 768px) {
        .privacy-settings {
          padding: 1rem;
        }

        .privacy-section {
          padding: 1.5rem;
        }

        .data-summary-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .export-options {
          grid-template-columns: 1fr;
        }

        .modal-content {
          padding: 1.5rem;
        }

        .modal-actions {
          flex-direction: column-reverse;
        }

        .modal-actions .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrivacySettings;
}
