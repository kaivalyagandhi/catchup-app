/**
 * RecordingIndicator Component
 * Persistent UI component showing recording state with fixed positioning
 * Requirements: 3.1, 3.2, 3.3, 5.4
 */

class RecordingIndicator {
  constructor() {
    this.container = null;
    this.state = {
      isRecording: false,
      isPaused: false,
      elapsedTime: 0,
      connectionStatus: 'connected', // 'connected' | 'reconnecting' | 'disconnected'
      reconnectAttempt: 0
    };
    this.timerInterval = null;
    this.beforeUnloadHandler = null;
    this.visibilityChangeHandler = null;
    this.wasRecordingBeforeBlur = false;
    this.init();
  }

  init() {
    this.createIndicator();
    this.attachStyles();
  }

  createIndicator() {
    // Create fixed-position indicator container
    this.container = document.createElement('div');
    this.container.id = 'recording-indicator';
    this.container.className = 'recording-indicator hidden';
    
    this.container.innerHTML = `
      <div class="recording-indicator-content">
        <div class="recording-indicator-left">
          <div class="recording-status-dot"></div>
          <span class="recording-status-text">Recording</span>
          <span class="recording-elapsed-time">00:00</span>
        </div>
        
        <div class="recording-indicator-right">
          <div class="recording-connection-status">
            <span class="connection-icon">●</span>
            <span class="connection-text">Connected</span>
          </div>
          <button class="recording-control-btn stop-btn" aria-label="Stop recording">
            <span class="stop-icon">⏹️</span>
            <span class="stop-text">Stop</span>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.attachEventListeners();
  }

  attachEventListeners() {
    const stopBtn = this.container.querySelector('.stop-btn');
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (this.onStopClick) {
          this.onStopClick();
        }
      });
    }
  }

  attachStyles() {
    if (document.getElementById('recording-indicator-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'recording-indicator-styles';
    style.textContent = `
      .recording-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: var(--status-error-bg);
        border-bottom: 3px solid var(--color-danger);
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.3s ease-in-out;
      }
      
      .recording-indicator.hidden {
        transform: translateY(-100%);
      }
      
      .recording-indicator-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .recording-indicator-left,
      .recording-indicator-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .recording-indicator-right {
        gap: 16px;
      }
      
      .recording-control-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 14px;
        background: #ffffff;
        border: 2px solid #ddd;
        border-radius: 20px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      
      .recording-control-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
      }
      
      .recording-control-btn:active {
        transform: translateY(0);
      }
      
      .pause-btn {
        color: #b45309;
        border-color: #f59e0b;
        background: #ffffff;
      }
      
      .pause-btn:hover {
        background: #fef3c7;
      }
      
      .stop-btn {
        color: #b91c1c;
        border-color: #dc2626;
        background: #ffffff;
      }
      
      .stop-btn:hover {
        background: #fee2e2;
      }
      
      .pause-icon, .stop-icon {
        font-size: 14px;
        line-height: 1;
      }
      
      .recording-status-dot {
        width: 14px;
        height: 14px;
        background: var(--color-danger);
        border-radius: 50%;
        animation: recording-pulse 1.5s ease-in-out infinite;
      }
      
      .recording-indicator.paused .recording-status-dot {
        background: var(--color-warning);
        animation: none;
      }
      
      @keyframes recording-pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.2);
        }
      }
      
      .recording-status-text {
        font-weight: 600;
        color: var(--status-error-text);
        font-size: 14px;
      }
      
      .recording-indicator.paused .recording-status-text {
        color: var(--text-primary);
      }
      
      .recording-elapsed-time {
        font-family: 'Courier New', monospace;
        font-size: 18px;
        font-weight: 700;
        color: var(--status-error-text);
        letter-spacing: 1px;
      }
      
      .recording-indicator.paused .recording-elapsed-time {
        color: var(--text-primary);
      }
      
      .recording-connection-status {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
      }
      
      .connection-icon {
        font-size: 10px;
        line-height: 1;
      }
      
      .connection-icon.connected {
        color: var(--color-success);
      }
      
      .connection-icon.reconnecting {
        color: var(--color-warning);
        animation: blink 1s ease-in-out infinite;
      }
      
      .connection-icon.disconnected {
        color: var(--color-danger);
      }
      
      @keyframes blink {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.3;
        }
      }
      
      .connection-text {
        font-size: 12px;
        font-weight: 500;
        color: var(--status-error-text);
      }
      
      .recording-indicator.paused .connection-text {
        color: var(--text-primary);
      }
      
      /* Paused state styling */
      .recording-indicator.paused {
        background: var(--status-warning);
        border-bottom-color: var(--color-warning);
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .recording-indicator-content {
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px 15px;
          justify-content: center;
        }
        
        .recording-indicator-left {
          order: 1;
        }
        
        .recording-indicator-center {
          order: 2;
          flex-direction: column;
          gap: 8px;
        }
        
        .recording-indicator-right {
          order: 3;
        }
        
        .recording-elapsed-time {
          font-size: 16px;
        }
        
        .recording-control-btn {
          padding: 6px 12px;
          font-size: 13px;
        }
      }
      
      @media (max-width: 480px) {
        .recording-indicator-content {
          flex-direction: column;
        }
        
        .recording-indicator-left,
        .recording-indicator-center,
        .recording-indicator-right {
          width: 100%;
          justify-content: center;
        }
        
        .recording-controls {
          width: 100%;
          justify-content: center;
        }
      }
      
      /* Ensure indicator is above other fixed elements */
      .recording-indicator {
        z-index: 10000;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show the recording indicator with the given state
   * @param {Object} state - Recording state
   * @param {boolean} state.isRecording - Whether recording is active
   * @param {boolean} state.isPaused - Whether recording is paused
   * @param {number} state.elapsedTime - Elapsed time in seconds
   * @param {string} state.connectionStatus - Connection status
   * @param {number} [state.reconnectAttempt] - Current reconnection attempt number
   */
  show(state) {
    this.state = { ...this.state, ...state };
    this.container.classList.remove('hidden');
    
    // Update UI based on state
    this.updateUI();
    
    // Start timer if recording
    if (state.isRecording && !state.isPaused) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
    
    // Enable navigation warning when recording
    if (state.isRecording) {
      this.enableNavigationWarning();
      this.enableTabFocusHandling();
    }
  }

  /**
   * Hide the recording indicator
   */
  hide() {
    this.container.classList.add('hidden');
    this.stopTimer();
    this.disableNavigationWarning();
    this.disableTabFocusHandling();
  }

  /**
   * Update the elapsed time display
   * @param {number} seconds - Elapsed time in seconds
   */
  updateTime(seconds) {
    this.state.elapsedTime = seconds;
    const timeElement = this.container.querySelector('.recording-elapsed-time');
    if (timeElement) {
      timeElement.textContent = this.formatTime(seconds);
    }
  }

  /**
   * Update the connection status
   * @param {string} status - Connection status ('connected' | 'reconnecting' | 'disconnected')
   * @param {number} [attempt] - Reconnection attempt number
   */
  updateConnectionStatus(status, attempt = 0) {
    this.state.connectionStatus = status;
    this.state.reconnectAttempt = attempt;
    
    const iconElement = this.container.querySelector('.connection-icon');
    const textElement = this.container.querySelector('.connection-text');
    
    if (iconElement && textElement) {
      // Remove all status classes
      iconElement.classList.remove('connected', 'reconnecting', 'disconnected');
      iconElement.classList.add(status);
      
      // Update text
      switch (status) {
        case 'connected':
          textElement.textContent = 'Connected';
          break;
        case 'reconnecting':
          textElement.textContent = attempt > 0 ? `Reconnecting (${attempt})` : 'Reconnecting';
          break;
        case 'disconnected':
          textElement.textContent = 'Disconnected';
          break;
      }
    }
  }

  /**
   * Enable navigation warning when recording is active
   * Requirement 3.4: Show warning when navigating away during recording
   */
  enableNavigationWarning() {
    if (this.beforeUnloadHandler) {
      return; // Already enabled
    }
    
    this.beforeUnloadHandler = (event) => {
      // Standard way to show browser confirmation dialog
      event.preventDefault();
      event.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers use the return value
    };
    
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Disable navigation warning
   */
  disableNavigationWarning() {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  /**
   * Enable tab focus/blur handling
   * Requirement 3.5: Continue recording when tab loses focus, show notification on return
   */
  enableTabFocusHandling() {
    if (this.visibilityChangeHandler) {
      return; // Already enabled
    }
    
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        // Tab lost focus - recording continues in background
        this.wasRecordingBeforeBlur = this.state.isRecording && !this.state.isPaused;
      } else {
        // Tab regained focus
        if (this.wasRecordingBeforeBlur && this.state.isRecording) {
          // Show notification that recording continued
          this.showFocusReturnNotification();
        }
        this.wasRecordingBeforeBlur = false;
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * Disable tab focus/blur handling
   */
  disableTabFocusHandling() {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    this.wasRecordingBeforeBlur = false;
  }

  /**
   * Show notification when focus returns to tab during recording
   */
  showFocusReturnNotification() {
    // Use toast notification if available
    if (typeof showToast === 'function') {
      showToast('Recording continued while tab was in background', 'info');
    } else {
      // Fallback to console log
      console.log('Recording continued while tab was in background');
    }
  }

  /**
   * Show navigation warning dialog (for programmatic navigation)
   * @returns {Promise<boolean>} - True if user wants to continue, false otherwise
   */
  async showNavigationWarning() {
    return await showConfirm(
      'Recording is in progress. If you leave this page, your recording will be lost. Do you want to stop recording and leave?',
      {
        title: 'Recording in Progress',
        confirmText: 'Stop & Leave',
        cancelText: 'Continue Recording',
        type: 'warning'
      }
    );
  }

  /**
   * Update the UI based on current state
   */
  updateUI() {
    const { elapsedTime, connectionStatus, reconnectAttempt } = this.state;
    
    // Update time
    this.updateTime(elapsedTime);
    
    // Update connection status
    this.updateConnectionStatus(connectionStatus, reconnectAttempt);
  }

  /**
   * Start the internal timer
   */
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    const startTime = Date.now() - (this.state.elapsedTime * 1000);
    
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      this.updateTime(elapsed);
    }, 1000);
  }

  /**
   * Stop the internal timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Format seconds into MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time string
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Get current state
   * @returns {Object} - Current state
   */
  getState() {
    return { ...this.state };
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.RecordingIndicator = RecordingIndicator;
}
