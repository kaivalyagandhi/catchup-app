/**
 * Sync Warning Banner Component
 * 
 * Displays a warning banner when sync is unavailable due to:
 * - Circuit breaker being open
 * - Invalid/expired tokens
 * - Other sync failures
 * 
 * Requirements: 9.1, 9.6 - Graceful degradation
 */

class SyncWarningBanner {
  constructor() {
    this.banner = null;
    this.dismissedBanners = new Set();
    this.checkInterval = null;
  }

  /**
   * Initialize the banner component
   */
  init() {
    // Create banner element if it doesn't exist
    if (!this.banner) {
      this.createBanner();
    }

    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Create the banner DOM element
   */
  createBanner() {
    this.banner = document.createElement('div');
    this.banner.className = 'sync-warning-banner hidden';
    this.banner.setAttribute('role', 'alert');
    this.banner.setAttribute('aria-live', 'polite');
    
    this.banner.innerHTML = `
      <div class="sync-warning-content">
        <span class="sync-warning-icon" aria-hidden="true">⚠️</span>
        <div class="sync-warning-text">
          <div class="sync-warning-title"></div>
          <div class="sync-warning-subtitle"></div>
        </div>
      </div>
      <div class="sync-warning-actions">
        <button class="sync-warning-reconnect-btn" style="display: none;">
          Reconnect
        </button>
        <button class="sync-warning-dismiss-btn">
          Dismiss
        </button>
        <button class="sync-warning-close-btn" aria-label="Close warning">
          ×
        </button>
      </div>
    `;

    // Add event listeners
    const reconnectBtn = this.banner.querySelector('.sync-warning-reconnect-btn');
    const dismissBtn = this.banner.querySelector('.sync-warning-dismiss-btn');
    const closeBtn = this.banner.querySelector('.sync-warning-close-btn');

    reconnectBtn.addEventListener('click', () => this.handleReconnect());
    dismissBtn.addEventListener('click', () => this.handleDismiss());
    closeBtn.addEventListener('click', () => this.handleClose());

    // Insert banner at the top of the page
    document.body.insertBefore(this.banner, document.body.firstChild);
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    // Check immediately
    this.checkSyncHealth();

    // Check once per day (24 hours = 86400000 milliseconds)
    // Daily checks are sufficient to catch sync issues while minimizing server load
    this.checkInterval = setInterval(() => {
      this.checkSyncHealth();
    }, 86400000);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check sync health for both contacts and calendar
   */
  async checkSyncHealth() {
    try {
      const response = await fetch('/api/contacts/sync/comprehensive-health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch sync health:', response.statusText);
        return;
      }

      const health = await response.json();

      // Determine if we should show a warning
      const contactsUnavailable = !health.contacts.available;
      const calendarUnavailable = !health.calendar.available;

      if (contactsUnavailable || calendarUnavailable) {
        this.showWarning(health);
      } else {
        this.hideWarning();
      }
    } catch (error) {
      console.error('Error checking sync health:', error);
    }
  }

  /**
   * Show warning banner with appropriate message
   */
  showWarning(health) {
    const contactsUnavailable = !health.contacts.available;
    const calendarUnavailable = !health.calendar.available;

    // Determine which integration(s) are affected
    let affectedIntegrations = [];
    if (contactsUnavailable) affectedIntegrations.push('Contacts');
    if (calendarUnavailable) affectedIntegrations.push('Calendar');

    const integrationText = affectedIntegrations.join(' and ');

    // Determine the reason and appropriate message
    let title = '';
    let subtitle = '';
    let showReconnect = false;
    let reconnectUrl = '';
    let bannerKey = '';

    if (health.contacts.requiresReauth || health.calendar.requiresReauth) {
      title = `${integrationText} sync unavailable - Reconnection required`;
      subtitle = 'Your Google connection has expired. Please reconnect to resume syncing.';
      showReconnect = true;
      reconnectUrl = health.contacts.requiresReauth 
        ? health.contacts.reauthUrl 
        : health.calendar.reauthUrl;
      bannerKey = 'reauth-required';
    } else if (health.contacts.reason === 'circuit_breaker_open' || 
               health.calendar.reason === 'circuit_breaker_open') {
      title = `${integrationText} sync temporarily paused`;
      subtitle = 'Sync has been paused due to repeated failures. It will resume automatically.';
      showReconnect = false;
      bannerKey = 'circuit-breaker';
    } else {
      title = `${integrationText} sync unavailable`;
      subtitle = 'Showing cached data. Sync will resume automatically when available.';
      showReconnect = false;
      bannerKey = 'sync-unavailable';
    }

    // Check if this banner was dismissed
    if (this.dismissedBanners.has(bannerKey)) {
      return;
    }

    // Add last sync time if available
    const lastSyncTimes = [];
    if (contactsUnavailable && health.contacts.lastSuccessfulSync) {
      const timeAgo = this.formatTimeAgo(new Date(health.contacts.lastSuccessfulSync));
      lastSyncTimes.push(`Contacts: ${timeAgo}`);
    }
    if (calendarUnavailable && health.calendar.lastSuccessfulSync) {
      const timeAgo = this.formatTimeAgo(new Date(health.calendar.lastSuccessfulSync));
      lastSyncTimes.push(`Calendar: ${timeAgo}`);
    }

    if (lastSyncTimes.length > 0) {
      subtitle += ` Last synced: ${lastSyncTimes.join(', ')}.`;
    }

    // Update banner content
    this.banner.querySelector('.sync-warning-title').textContent = title;
    this.banner.querySelector('.sync-warning-subtitle').textContent = subtitle;

    const reconnectBtn = this.banner.querySelector('.sync-warning-reconnect-btn');
    if (showReconnect) {
      reconnectBtn.style.display = 'block';
      reconnectBtn.dataset.url = reconnectUrl;
    } else {
      reconnectBtn.style.display = 'none';
    }

    // Store banner key for dismissal tracking
    this.banner.dataset.bannerKey = bannerKey;

    // Show banner
    this.banner.classList.remove('hidden');
    document.body.classList.add('sync-warning-visible');
  }

  /**
   * Hide warning banner
   */
  hideWarning() {
    if (this.banner) {
      this.banner.classList.add('hidden');
      document.body.classList.remove('sync-warning-visible');
    }
  }

  /**
   * Handle reconnect button click
   */
  handleReconnect() {
    const reconnectBtn = this.banner.querySelector('.sync-warning-reconnect-btn');
    const url = reconnectBtn.dataset.url;
    
    if (url) {
      window.location.href = url;
    }
  }

  /**
   * Handle dismiss button click
   */
  handleDismiss() {
    const bannerKey = this.banner.dataset.bannerKey;
    if (bannerKey) {
      this.dismissedBanners.add(bannerKey);
    }
    this.hideWarning();
  }

  /**
   * Handle close button click
   */
  handleClose() {
    this.hideWarning();
  }

  /**
   * Format time ago string
   */
  formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Destroy the banner component
   */
  destroy() {
    this.stopHealthChecks();
    if (this.banner) {
      this.banner.remove();
      this.banner = null;
    }
    document.body.classList.remove('sync-warning-visible');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncWarningBanner;
}
