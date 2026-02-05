/**
 * Step1IntegrationsHandler
 * 
 * Handles Step 1 of the onboarding flow: Integration Connection
 * - Navigates to Preferences page
 * - Highlights Google Calendar and Contacts sections
 * - Listens for successful connections
 * - Updates onboarding state
 * - Shows completion messages
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

class Step1IntegrationsHandler {
  constructor(onboardingStateManager, userId) {
    this.stateManager = onboardingStateManager;
    this.userId = userId;
    this.state = null;
    this.highlightedElements = [];
    this.syncStatusComponents = {
      contacts: null,
      calendar: null
    };
  }
  
  /**
   * Initialize the handler and load current state
   */
  async initialize() {
    this.state = await this.stateManager.loadState(this.userId);
    if (!this.state) {
      this.state = await this.stateManager.initializeState(this.userId);
    }
  }
  
  /**
   * Navigate to Step 1 and set up the integration connection flow
   * Requirements: 2.1, 2.2
   */
  async navigateToStep() {
    // Navigate to Preferences page
    window.location.hash = '#preferences';
    
    // Use the global navigateTo function if available
    if (typeof navigateTo === 'function') {
      navigateTo('preferences');
    }
    
    // Wait for page to render
    setTimeout(() => {
      this.highlightIntegrationSections();
      this.setupConnectionListeners();
    }, 300);
  }
  
  /**
   * Highlight Google Calendar and Contacts sections with pulsing animation
   * Requirements: 2.2
   */
  highlightIntegrationSections() {
    // Find integration sections by data attributes or IDs
    const calendarSection = document.querySelector('[data-integration="google-calendar"]') ||
                           document.getElementById('google-calendar-section') ||
                           this.findSectionByText('Google Calendar');
    
    const contactsSection = document.querySelector('[data-integration="google-contacts"]') ||
                           document.getElementById('google-contacts-section') ||
                           this.findSectionByText('Google Contacts');
    
    // Apply highlight class to sections
    if (calendarSection) {
      calendarSection.classList.add('onboarding-highlight');
      calendarSection.setAttribute('data-onboarding-highlight', 'true');
      this.highlightedElements.push(calendarSection);
      
      // Add tooltip
      this.addHighlightTooltip(calendarSection, 'Connect your Google Calendar to enable smart scheduling');
    }
    
    if (contactsSection) {
      contactsSection.classList.add('onboarding-highlight');
      contactsSection.setAttribute('data-onboarding-highlight', 'true');
      this.highlightedElements.push(contactsSection);
      
      // Add tooltip
      this.addHighlightTooltip(contactsSection, 'Connect your Google Contacts to import your network');
    }
    
    // Scroll to first highlighted section
    if (calendarSection) {
      calendarSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  /**
   * Find a section by searching for text content
   */
  findSectionByText(text) {
    const allSections = document.querySelectorAll('.card, .management-section, [class*="section"]');
    for (const section of allSections) {
      if (section.textContent.includes(text)) {
        return section;
      }
    }
    return null;
  }
  
  /**
   * Add a tooltip to a highlighted element
   */
  addHighlightTooltip(element, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'onboarding-highlight-tooltip';
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent-primary);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    // Make parent position relative if not already
    const position = window.getComputedStyle(element).position;
    if (position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(tooltip);
  }
  
  /**
   * Set up event listeners for integration connections
   * Requirements: 2.3, 2.4, 13.1, 13.2
   */
  setupConnectionListeners() {
    // Listen for Google Calendar connection
    window.addEventListener('google-calendar-connected', this.handleCalendarConnected.bind(this));
    
    // Listen for Google Contacts connection
    window.addEventListener('google-contacts-connected', this.handleContactsConnected.bind(this));
    
    // Listen for connection errors
    window.addEventListener('google-calendar-error', this.handleConnectionError.bind(this));
    window.addEventListener('google-contacts-error', this.handleConnectionError.bind(this));
    
    // Check for OAuth callback success in URL
    this.checkOAuthCallback();
    
    // Also check current connection status on page load
    this.checkCurrentConnectionStatus();
  }
  
  /**
   * Check for OAuth callback success and show sync status
   * Requirements: SYNC_FREQUENCY_UPDATE_PLAN.md Priority 2
   */
  checkOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for contacts OAuth success
    if (urlParams.get('contacts_success') === 'true') {
      this.showContactsSyncStatus();
      
      // Clean up URL
      urlParams.delete('contacts_success');
      const newUrl = window.location.pathname + 
        (urlParams.toString() ? '?' + urlParams.toString() : '') + 
        window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Check for calendar OAuth success
    if (urlParams.get('calendar_success') === 'true') {
      this.showCalendarSyncStatus();
      
      // Clean up URL
      urlParams.delete('calendar_success');
      const newUrl = window.location.pathname + 
        (urlParams.toString() ? '?' + urlParams.toString() : '') + 
        window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }
  
  /**
   * Show sync status for Google Contacts
   */
  showContactsSyncStatus() {
    // Find or create container for sync status
    const contactsSection = document.querySelector('[data-integration="google-contacts"]') ||
                           document.getElementById('google-contacts-section');
    
    if (!contactsSection) {
      console.warn('Contacts section not found for sync status display');
      return;
    }
    
    // Create sync status container if it doesn't exist
    let syncContainer = contactsSection.querySelector('.sync-status-container');
    if (!syncContainer) {
      syncContainer = document.createElement('div');
      syncContainer.className = 'sync-status-container';
      syncContainer.id = 'contacts-sync-status-container';
      syncContainer.style.cssText = 'margin-top: 16px;';
      
      // Insert after the connect button or at the end of the section
      const buttonContainer = contactsSection.querySelector('.card-actions') || contactsSection;
      buttonContainer.appendChild(syncContainer);
    }
    
    // Initialize sync status component
    if (typeof OnboardingSyncStatus !== 'undefined') {
      this.syncStatusComponents.contacts = new OnboardingSyncStatus('contacts-sync-status-container', {
        integrationType: 'google_contacts',
        integrationLabel: 'contacts',
        pollInterval: 2000,
        onComplete: (status) => {
          console.log('Contacts sync complete:', status);
          // Trigger the connected event
          window.dispatchEvent(new CustomEvent('google-contacts-connected', {
            detail: { itemsProcessed: status.itemsProcessed }
          }));
        },
        onError: (status) => {
          console.error('Contacts sync failed:', status);
          // Show error with retry option
          if (typeof showToast === 'function') {
            showToast('Contacts sync failed. Please try again.', 'error');
          }
        },
        onRetry: () => {
          console.log('Retrying contacts sync...');
          this.triggerManualSync('google_contacts');
        }
      });
      
      // Start tracking sync status
      this.syncStatusComponents.contacts.start(this.userId);
    } else {
      console.error('OnboardingSyncStatus class not found. Make sure onboarding-sync-status.js is loaded.');
    }
  }
  
  /**
   * Show sync status for Google Calendar
   */
  showCalendarSyncStatus() {
    // Find or create container for sync status
    const calendarSection = document.querySelector('[data-integration="google-calendar"]') ||
                           document.getElementById('google-calendar-section');
    
    if (!calendarSection) {
      console.warn('Calendar section not found for sync status display');
      return;
    }
    
    // Create sync status container if it doesn't exist
    let syncContainer = calendarSection.querySelector('.sync-status-container');
    if (!syncContainer) {
      syncContainer = document.createElement('div');
      syncContainer.className = 'sync-status-container';
      syncContainer.id = 'calendar-sync-status-container';
      syncContainer.style.cssText = 'margin-top: 16px;';
      
      // Insert after the connect button or at the end of the section
      const buttonContainer = calendarSection.querySelector('.card-actions') || calendarSection;
      buttonContainer.appendChild(syncContainer);
    }
    
    // Initialize sync status component
    if (typeof OnboardingSyncStatus !== 'undefined') {
      this.syncStatusComponents.calendar = new OnboardingSyncStatus('calendar-sync-status-container', {
        integrationType: 'google_calendar',
        integrationLabel: 'calendar events',
        pollInterval: 2000,
        onComplete: (status) => {
          console.log('Calendar sync complete:', status);
          // Trigger the connected event
          window.dispatchEvent(new CustomEvent('google-calendar-connected', {
            detail: { itemsProcessed: status.itemsProcessed }
          }));
        },
        onError: (status) => {
          console.error('Calendar sync failed:', status);
          // Show error with retry option
          if (typeof showToast === 'function') {
            showToast('Calendar sync failed. Please try again.', 'error');
          }
        },
        onRetry: () => {
          console.log('Retrying calendar sync...');
          this.triggerManualSync('google_calendar');
        }
      });
      
      // Start tracking sync status
      this.syncStatusComponents.calendar.start(this.userId);
    } else {
      console.error('OnboardingSyncStatus class not found. Make sure onboarding-sync-status.js is loaded.');
    }
  }
  
  /**
   * Trigger manual sync for an integration
   * @param {string} integrationType - 'google_contacts' or 'google_calendar'
   */
  async triggerManualSync(integrationType) {
    try {
      const response = await fetch(`${API_BASE}/sync/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ integrationType })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Manual sync failed');
      }
      
      const result = await response.json();
      console.log('Manual sync triggered:', result);
      
      // Restart sync status tracking
      if (integrationType === 'google_contacts' && this.syncStatusComponents.contacts) {
        this.syncStatusComponents.contacts.start(this.userId);
      } else if (integrationType === 'google_calendar' && this.syncStatusComponents.calendar) {
        this.syncStatusComponents.calendar.start(this.userId);
      }
      
    } catch (error) {
      console.error('Failed to trigger manual sync:', error);
      if (typeof showToast === 'function') {
        showToast('Failed to retry sync. Please try again later.', 'error');
      }
    }
  }
  
  /**
   * Check current connection status and update state if already connected
   */
  async checkCurrentConnectionStatus() {
    try {
      // Check Google Calendar status
      const calendarResponse = await fetch(`${API_BASE}/calendar/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (calendarResponse.ok) {
        const calendarStatus = await calendarResponse.json();
        if (calendarStatus.connected) {
          await this.stateManager.updateGoogleCalendarConnection(this.userId, true);
          this.state = await this.stateManager.loadState(this.userId);
        }
      }
      
      // Check Google Contacts status
      const contactsResponse = await fetch(`${API_BASE}/contacts/oauth/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (contactsResponse.ok) {
        const contactsStatus = await contactsResponse.json();
        if (contactsStatus.connected) {
          await this.stateManager.updateGoogleContactsConnection(this.userId, true);
          this.state = await this.stateManager.loadState(this.userId);
        }
      }
      
      // Check if step is complete
      await this.checkStepCompletion();
      
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  }
  
  /**
   * Handle Google Calendar connection success
   * Requirements: 2.3, 13.1
   */
  async handleCalendarConnected(event) {
    console.log('Google Calendar connected', event.detail);
    
    // Update onboarding state
    await this.stateManager.updateGoogleCalendarConnection(this.userId, true);
    this.state = await this.stateManager.loadState(this.userId);
    
    // Show success message
    if (typeof showToast === 'function') {
      showToast('✓ Google Calendar connected successfully!', 'success');
    }
    
    // Remove highlight from calendar section
    this.removeHighlight('google-calendar');
    
    // Check if step is complete
    await this.checkStepCompletion();
  }
  
  /**
   * Handle Google Contacts connection success
   * Requirements: 2.4, 13.2
   */
  async handleContactsConnected(event) {
    console.log('Google Contacts connected', event.detail);
    
    // Update onboarding state
    await this.stateManager.updateGoogleContactsConnection(this.userId, true);
    this.state = await this.stateManager.loadState(this.userId);
    
    // Show success message
    if (typeof showToast === 'function') {
      showToast('✓ Google Contacts connected successfully!', 'success');
    }
    
    // Remove highlight from contacts section
    this.removeHighlight('google-contacts');
    
    // Check if step is complete
    await this.checkStepCompletion();
  }
  
  /**
   * Handle connection errors with retry logic
   * Requirements: 13.4
   */
  handleConnectionError(event) {
    const { integration, error } = event.detail || {};
    
    console.error(`${integration} connection error:`, error);
    
    // Classify the error
    const errorInfo = this.classifyIntegrationError(integration, error);
    
    // Show error message
    if (typeof showToast === 'function') {
      showToast(errorInfo.userMessage, 'error');
    }
    
    // Show retry button if error is retryable
    if (errorInfo.shouldShowRetry) {
      this.showRetryButton(integration, errorInfo);
    }
  }
  
  /**
   * Classify integration error and determine retry strategy
   * Requirements: 13.4
   */
  classifyIntegrationError(integration, error) {
    const integrationName = integration === 'google-calendar' ? 'Google Calendar' : 'Google Contacts';
    let isRetryable = true;
    let userMessage = '';
    
    // Check for specific error types
    if (error && typeof error === 'string') {
      // Popup blocked
      if (error.includes('popup') || error.includes('blocked')) {
        userMessage = `${integrationName} connection failed. Please allow popups and try again.`;
        isRetryable = true;
      }
      // Permission denied
      else if (error.includes('permission') || error.includes('denied')) {
        userMessage = `${integrationName} connection failed. Please grant the required permissions.`;
        isRetryable = true;
      }
      // Network error
      else if (error.includes('network') || error.includes('fetch') || error.includes('timeout')) {
        userMessage = `${integrationName} connection failed. Please check your internet connection and try again.`;
        isRetryable = true;
      }
      // OAuth state mismatch
      else if (error.includes('state') || error.includes('CSRF')) {
        userMessage = `${integrationName} connection failed due to security check. Please try again.`;
        isRetryable = true;
      }
      // Server error
      else if (error.includes('500') || error.includes('503')) {
        userMessage = `${integrationName} server is temporarily unavailable. Please try again in a moment.`;
        isRetryable = true;
      }
      // Generic error
      else {
        userMessage = `${integrationName} connection failed. Try: 1) Refresh the page 2) Clear browser cache 3) Try a different browser`;
        isRetryable = true;
      }
    } else {
      userMessage = `${integrationName} connection failed. Please try again.`;
      isRetryable = true;
    }
    
    return {
      isRetryable,
      shouldShowRetry: isRetryable,
      userMessage,
      technicalMessage: error || 'Unknown error'
    };
  }
  
  /**
   * Show retry button for failed connection with error context
   * Requirements: 13.4
   */
  showRetryButton(integration, errorInfo) {
    const section = integration === 'google-calendar' 
      ? document.querySelector('[data-integration="google-calendar"]')
      : document.querySelector('[data-integration="google-contacts"]');
    
    if (!section) return;
    
    // Check if retry section already exists
    if (section.querySelector('.onboarding-retry-section')) {
      // Update existing error message
      const existingMsg = section.querySelector('.onboarding-error-message');
      if (existingMsg) {
        existingMsg.textContent = errorInfo.userMessage;
      }
      return;
    }
    
    // Create retry section with error message
    const retrySection = document.createElement('div');
    retrySection.className = 'onboarding-retry-section';
    retrySection.style.cssText = `
      margin-top: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
      border-left: 3px solid var(--status-error);
    `;
    
    retrySection.innerHTML = `
      <div class="onboarding-error-message" style="
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      ">${errorInfo.userMessage}</div>
      <button class="onboarding-retry-btn accent" style="width: 100%;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Retry Connection
      </button>
    `;
    
    const retryBtn = retrySection.querySelector('.onboarding-retry-btn');
    retryBtn.addEventListener('click', () => {
      // Remove error section
      retrySection.remove();
      
      // Trigger the connection flow again
      const connectBtn = section.querySelector('button[onclick*="connect"]');
      if (connectBtn) {
        connectBtn.click();
      }
    });
    
    // Find the button container or add to section
    const buttonContainer = section.querySelector('.card-actions') || section;
    buttonContainer.appendChild(retrySection);
  }
  
  /**
   * Remove highlight from a specific integration section
   */
  removeHighlight(integration) {
    const selector = `[data-integration="${integration}"]`;
    const section = document.querySelector(selector);
    
    if (section) {
      section.classList.remove('onboarding-highlight');
      section.removeAttribute('data-onboarding-highlight');
      
      // Remove tooltip
      const tooltip = section.querySelector('.onboarding-highlight-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    }
  }
  
  /**
   * Check if Step 1 is complete (both integrations connected)
   * Requirements: 2.5, 13.3, 13.5
   */
  async checkStepCompletion() {
    if (!this.state) return;
    
    const { googleCalendar, googleContacts } = this.state.steps.integrations;
    
    if (googleCalendar && googleContacts) {
      // Mark Step 1 as complete
      await this.stateManager.markStep1Complete(this.userId, true, true);
      this.state = await this.stateManager.loadState(this.userId);
      
      // Remove all highlights
      this.clearAllHighlights();
      
      // Show completion message
      this.showCompletionMessage();
      
      // Emit completion event
      window.dispatchEvent(new CustomEvent('onboarding-step1-complete', {
        detail: { userId: this.userId }
      }));
    }
  }
  
  /**
   * Clear all highlights
   */
  clearAllHighlights() {
    this.highlightedElements.forEach(element => {
      element.classList.remove('onboarding-highlight');
      element.removeAttribute('data-onboarding-highlight');
      
      // Remove tooltip
      const tooltip = element.querySelector('.onboarding-highlight-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    });
    
    this.highlightedElements = [];
  }
  
  /**
   * Show Step 1 completion message and prompt for Step 2
   * Requirements: 13.3, 13.5
   */
  showCompletionMessage() {
    if (typeof showToast === 'function') {
      showToast('🎉 Integrations connected! Ready to organize your circles.', 'success');
    }
    
    // Show prompt to continue to Step 2 after a short delay
    setTimeout(() => {
      this.promptForStep2();
    }, 2000);
  }
  
  /**
   * Prompt user to continue to Step 2
   * Requirements: 13.5
   */
  promptForStep2() {
    // Create a modal prompt
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>Step 1 Complete! 🎉</h2>
        </div>
        <p style="margin-bottom: 20px; color: var(--text-secondary);">
          Your integrations are connected. Ready to organize your contacts into circles?
        </p>
        <div style="display: flex; gap: 12px;">
          <button class="secondary" onclick="this.closest('.modal').remove()" style="flex: 1;">
            Later
          </button>
          <button class="accent" onclick="continueToStep2()" style="flex: 1;">
            Continue to Step 2
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  /**
   * Clean up event listeners and highlights
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('google-calendar-connected', this.handleCalendarConnected);
    window.removeEventListener('google-contacts-connected', this.handleContactsConnected);
    window.removeEventListener('google-calendar-error', this.handleConnectionError);
    window.removeEventListener('google-contacts-error', this.handleConnectionError);
    
    // Clean up sync status components
    if (this.syncStatusComponents.contacts) {
      this.syncStatusComponents.contacts.destroy();
      this.syncStatusComponents.contacts = null;
    }
    
    if (this.syncStatusComponents.calendar) {
      this.syncStatusComponents.calendar.destroy();
      this.syncStatusComponents.calendar = null;
    }
    
    // Clear highlights
    this.clearAllHighlights();
  }
}

/**
 * Global function to continue to Step 2
 * Called from the completion prompt
 */
function continueToStep2() {
  // Close modal
  const modal = document.querySelector('.modal');
  if (modal) {
    modal.remove();
  }
  
  // Navigate to Step 2 (Circles)
  window.location.hash = '#directory/circles';
  
  if (typeof navigateTo === 'function') {
    navigateTo('directory');
    setTimeout(() => {
      if (typeof switchDirectoryTab === 'function') {
        switchDirectoryTab('circles');
      }
    }, 100);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Step1IntegrationsHandler;
}
