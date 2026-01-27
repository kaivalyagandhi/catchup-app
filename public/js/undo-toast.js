/**
 * UndoToast Component
 * 
 * Displays a toast notification with undo capability and countdown timer.
 * Used for bulk actions that can be reverted within a 10-second window.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

class UndoToast {
  /**
   * Create an UndoToast instance
   * @param {Object} options - Configuration options
   * @param {string} options.message - Message to display in the toast
   * @param {Function} options.onUndo - Callback function when undo is clicked
   * @param {number} [options.duration=10000] - Duration in milliseconds (default: 10 seconds)
   */
  constructor(options) {
    this.message = options.message;
    this.onUndo = options.onUndo;
    this.duration = options.duration || 10000; // 10 seconds default
    this.timer = null;
    this.countdownInterval = null;
    this.toastElement = null;
    this.startTime = null;
    this.remainingTime = this.duration;
    this.isActive = false;
  }

  /**
   * Show the undo toast with countdown timer
   * Requirements: 8.1, 8.2, 8.3
   */
  show() {
    // If already active, don't show again
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.startTime = Date.now();
    this.remainingTime = this.duration;

    // Create toast element
    this.toastElement = document.createElement('div');
    this.toastElement.className = 'toast toast-undo toast-show';
    
    // Create toast content with undo button and countdown
    this.toastElement.innerHTML = `
      <div class="toast-icon">↶</div>
      <div class="toast-message">${this.escapeHtml(this.message)}</div>
      <button class="toast-undo-btn" aria-label="Undo action">Undo</button>
      <div class="toast-countdown" aria-live="polite" aria-atomic="true">
        <span class="countdown-text">${Math.ceil(this.remainingTime / 1000)}s</span>
      </div>
    `;

    // Add to DOM
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    toastContainer.appendChild(this.toastElement);

    // Bind undo button click handler
    const undoBtn = this.toastElement.querySelector('.toast-undo-btn');
    undoBtn.addEventListener('click', () => this.handleUndo());

    // Start countdown display
    this.startCountdown();

    // Set timer to auto-dismiss after duration
    this.timer = setTimeout(() => {
      this.finalize();
    }, this.duration);
  }

  /**
   * Start the countdown timer display
   * Requirements: 8.3
   */
  startCountdown() {
    const countdownElement = this.toastElement.querySelector('.countdown-text');
    
    // Update countdown every 100ms for smooth display
    this.countdownInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      this.remainingTime = Math.max(0, this.duration - elapsed);
      
      const secondsLeft = Math.ceil(this.remainingTime / 1000);
      
      if (countdownElement) {
        countdownElement.textContent = `${secondsLeft}s`;
      }

      // Stop when time runs out
      if (this.remainingTime <= 0) {
        this.stopCountdown();
      }
    }, 100);
  }

  /**
   * Stop the countdown timer
   */
  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Handle undo button click
   * Requirements: 8.4
   */
  handleUndo() {
    // Clear timers
    this.stopCountdown();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Call the undo callback
    if (typeof this.onUndo === 'function') {
      try {
        this.onUndo();
      } catch (error) {
        console.error('Error executing undo callback:', error);
      }
    }

    // Hide the toast
    this.hide();
  }

  /**
   * Finalize the action when timer expires
   * Requirements: 8.5
   */
  finalize() {
    this.stopCountdown();
    this.hide();
  }

  /**
   * Hide the toast with animation
   * Requirements: 8.5, 8.6
   */
  hide() {
    if (!this.toastElement) {
      return;
    }

    // Add hide animation class
    this.toastElement.classList.remove('toast-show');
    this.toastElement.classList.add('toast-hide');

    // Remove from DOM after animation
    setTimeout(() => {
      if (this.toastElement && this.toastElement.parentNode) {
        this.toastElement.parentNode.removeChild(this.toastElement);
      }
      this.toastElement = null;
      this.isActive = false;
    }, 300); // Match CSS transition duration
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if the toast is currently active
   * @returns {boolean} True if toast is active
   */
  isToastActive() {
    return this.isActive;
  }

  /**
   * Get remaining time in milliseconds
   * @returns {number} Remaining time
   */
  getRemainingTime() {
    if (!this.isActive) {
      return 0;
    }
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UndoToast;
}
