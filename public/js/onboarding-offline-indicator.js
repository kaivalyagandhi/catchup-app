/**
 * Onboarding Offline Indicator
 * 
 * Shows a visual indicator when the user is offline during onboarding.
 * Displays sync status and queued updates.
 * 
 * Requirements: All requirements (reliability)
 */

class OnboardingOfflineIndicator {
  constructor() {
    this.isOnline = navigator.onLine;
    this.element = null;
    this.queueCount = 0;
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners for network status
   */
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.update();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.update();
    });
    
    window.addEventListener('network-status-changed', (e) => {
      this.isOnline = e.detail.online;
      this.update();
    });
    
    window.addEventListener('sync-queue-updated', (e) => {
      this.queueCount = e.detail.count || 0;
      this.update();
    });
  }
  
  /**
   * Render the offline indicator
   */
  render() {
    if (this.isOnline && this.queueCount === 0) {
      return ''; // Don't show anything when online and synced
    }
    
    const statusClass = this.isOnline ? 'syncing' : 'offline';
    const statusText = this.isOnline 
      ? `Syncing ${this.queueCount} change${this.queueCount !== 1 ? 's' : ''}...`
      : 'You\'re offline';
    const statusIcon = this.isOnline ? '🔄' : '📡';
    
    return `
      <div class="offline-indicator offline-indicator--${statusClass}" id="offline-indicator">
        <span class="offline-indicator__icon">${statusIcon}</span>
        <span class="offline-indicator__text">${statusText}</span>
        ${!this.isOnline && this.queueCount > 0 ? `
          <span class="offline-indicator__queue">${this.queueCount} pending</span>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Mount the indicator to the DOM
   */
  mount(container) {
    if (!container) {
      // Create a fixed position container at the top of the page
      container = document.createElement('div');
      container.id = 'offline-indicator-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    
    this.container = container;
    this.update();
  }
  
  /**
   * Update the indicator
   */
  update() {
    if (!this.container) return;
    
    const html = this.render();
    
    if (html) {
      this.container.innerHTML = html;
      this.container.style.display = 'block';
      this.element = this.container.querySelector('#offline-indicator');
    } else {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
      this.element = null;
    }
  }
  
  /**
   * Set queue count
   */
  setQueueCount(count) {
    this.queueCount = count;
    this.update();
  }
  
  /**
   * Destroy the indicator
   */
  destroy() {
    if (this.container && this.container.parentElement) {
      this.container.remove();
    }
    this.element = null;
    this.container = null;
  }
}

// Add CSS styles for the offline indicator
const offlineIndicatorStyles = `
  .offline-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    pointer-events: auto;
  }
  
  .offline-indicator--offline {
    background: #FEF3C7;
    border-bottom-color: #F59E0B;
  }
  
  .offline-indicator--syncing {
    background: #DBEAFE;
    border-bottom-color: #3B82F6;
  }
  
  .offline-indicator__icon {
    font-size: 18px;
  }
  
  .offline-indicator__text {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
  }
  
  .offline-indicator__queue {
    font-size: 12px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    color: var(--text-secondary);
  }
  
  @media (prefers-color-scheme: dark) {
    .offline-indicator--offline {
      background: #78350F;
      border-bottom-color: #F59E0B;
    }
    
    .offline-indicator--syncing {
      background: #1E3A8A;
      border-bottom-color: #3B82F6;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = offlineIndicatorStyles;
  document.head.appendChild(styleEl);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnboardingOfflineIndicator;
}
