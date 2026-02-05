/**
 * Onboarding Sync Status Component
 *
 * Displays real-time sync progress during onboarding with:
 * - Spinner during sync (in_progress)
 * - Success message with count (completed)
 * - Error message with retry button (failed)
 *
 * Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 2: Onboarding Progress UI with Retry"
 */

class OnboardingSyncStatus {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.options = {
      integrationType: options.integrationType || 'google_contacts',
      integrationLabel: options.integrationLabel || 'contacts',
      pollInterval: options.pollInterval || 2000, // Poll every 2 seconds
      onComplete: options.onComplete || null,
      onError: options.onError || null,
      onRetry: options.onRetry || null,
      ...options,
    };

    this.userId = null;
    this.pollTimer = null;
    this.isPolling = false;

    this.render();
  }

  /**
   * Initialize and start tracking sync status
   * @param {string} userId - User ID to track sync for
   */
  start(userId) {
    this.userId = userId;
    this.isPolling = true;
    this.showInProgress();
    this.startPolling();
  }

  /**
   * Stop tracking sync status
   */
  stop() {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Start polling sync status endpoint
   */
  startPolling() {
    if (!this.isPolling || !this.userId) {
      return;
    }

    this.pollSyncStatus();
  }

  /**
   * Poll sync status from API
   */
  async pollSyncStatus() {
    if (!this.isPolling || !this.userId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/sync/status/${this.userId}/${this.options.integrationType}`
      );

      if (response.ok) {
        const status = await response.json();
        this.handleStatusUpdate(status);
      } else if (response.status === 404) {
        // No sync status found yet - keep polling
        this.scheduleNextPoll();
      } else {
        console.error('Failed to fetch sync status:', response.statusText);
        this.scheduleNextPoll();
      }
    } catch (error) {
      console.error('Error polling sync status:', error);
      this.scheduleNextPoll();
    }
  }

  /**
   * Schedule next poll
   */
  scheduleNextPoll() {
    if (this.isPolling) {
      this.pollTimer = setTimeout(() => {
        this.pollSyncStatus();
      }, this.options.pollInterval);
    }
  }

  /**
   * Handle sync status update
   * @param {Object} status - Sync status from API
   */
  handleStatusUpdate(status) {
    if (status.status === 'in_progress') {
      this.updateProgress(status.itemsProcessed || 0);
      this.scheduleNextPoll();
    } else if (status.status === 'completed') {
      this.showComplete(status.itemsProcessed || 0);
      this.stop();
      if (this.options.onComplete) {
        this.options.onComplete(status);
      }
    } else if (status.status === 'failed') {
      this.showError(status.errorMessage || 'Sync failed. Please try again.');
      this.stop();
      if (this.options.onError) {
        this.options.onError(status);
      }
    }
  }

  /**
   * Render the component HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="onboarding-sync-status" data-integration="${this.options.integrationType}">
        <!-- In Progress State -->
        <div class="sync-state sync-in-progress" style="display: none;">
          <div class="spinner spinner-md" role="status" aria-label="Syncing ${this.options.integrationLabel}"></div>
          <p class="sync-message">Syncing your ${this.options.integrationLabel}...</p>
          <small class="sync-hint">This usually takes 30-60 seconds</small>
          <p class="sync-progress" style="display: none;">
            <span class="items-count">0</span> items processed
          </p>
        </div>
        
        <!-- Complete State -->
        <div class="sync-state sync-complete" style="display: none;">
          <div class="sync-icon sync-checkmark">✓</div>
          <p class="sync-message">
            Sync complete! Found <span class="contact-count">0</span> ${this.options.integrationLabel}.
          </p>
        </div>
        
        <!-- Failed State -->
        <div class="sync-state sync-failed" style="display: none;">
          <div class="sync-icon sync-error-icon">⚠</div>
          <p class="sync-message error-message">Sync failed. Please try again.</p>
          <button class="retry-sync-btn">Retry Sync</button>
        </div>
      </div>
    `;

    // Attach retry button handler
    const retryBtn = this.container.querySelector('.retry-sync-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.handleRetry());
    }
  }

  /**
   * Show in-progress state
   */
  showInProgress() {
    this.hideAllStates();
    const inProgressState = this.container.querySelector('.sync-in-progress');
    if (inProgressState) {
      inProgressState.style.display = 'block';
    }
  }

  /**
   * Update progress with item count
   * @param {number} itemsProcessed - Number of items processed
   */
  updateProgress(itemsProcessed) {
    const progressEl = this.container.querySelector('.sync-progress');
    const itemsCountEl = this.container.querySelector('.items-count');
    
    if (progressEl && itemsProcessed > 0) {
      progressEl.style.display = 'block';
    }
    
    if (itemsCountEl) {
      itemsCountEl.textContent = itemsProcessed;
    }
  }

  /**
   * Show complete state
   * @param {number} itemCount - Number of items synced
   */
  showComplete(itemCount) {
    this.hideAllStates();
    const completeState = this.container.querySelector('.sync-complete');
    const countEl = this.container.querySelector('.contact-count');
    
    if (completeState) {
      completeState.style.display = 'block';
    }
    
    if (countEl) {
      countEl.textContent = itemCount;
    }
  }

  /**
   * Show error state
   * @param {string} errorMessage - Error message to display
   */
  showError(errorMessage) {
    this.hideAllStates();
    const failedState = this.container.querySelector('.sync-failed');
    const messageEl = this.container.querySelector('.error-message');
    
    if (failedState) {
      failedState.style.display = 'block';
    }
    
    if (messageEl) {
      messageEl.textContent = errorMessage;
    }
  }

  /**
   * Hide all state elements
   */
  hideAllStates() {
    const states = this.container.querySelectorAll('.sync-state');
    states.forEach(state => {
      state.style.display = 'none';
    });
  }

  /**
   * Handle retry button click
   */
  handleRetry() {
    if (this.options.onRetry) {
      this.options.onRetry();
    }
    
    // Restart sync status tracking
    if (this.userId) {
      this.start(this.userId);
    }
  }

  /**
   * Reset component to initial state
   */
  reset() {
    this.stop();
    this.userId = null;
    this.hideAllStates();
  }

  /**
   * Destroy component and cleanup
   */
  destroy() {
    this.stop();
    this.container.innerHTML = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OnboardingSyncStatus };
}
