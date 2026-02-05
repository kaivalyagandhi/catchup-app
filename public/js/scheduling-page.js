/**
 * Scheduling Page Component
 * 
 * Main controller for the Group Scheduling feature page.
 * Handles plan listing, filtering, view toggling, and navigation.
 * 
 * Requirements: 1.1-1.8, 10.1-10.10, 17.1-17.6
 */

class SchedulingPage {
  constructor(options = {}) {
    this.containerId = options.containerId || 'scheduling-page';
    this.userId = options.userId || window.userId || localStorage.getItem('userId');
    this.currentView = this.loadViewPreference() || 'list';
    this.currentFilter = 'all';
    this.plans = [];
    this.archivedPlans = []; // Requirements: 10.10 - Store archived plans separately
    this.preferences = null;
    this.privacySettings = null;
    this.unreadNotificationCount = 0;
    
    // Loading and error states - Task 14.2
    this.isLoading = false;
    this.loadError = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Bind methods
    this.handleViewToggle = this.handleViewToggle.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleQuickAction = this.handleQuickAction.bind(this);
    this.handlePlanAction = this.handlePlanAction.bind(this);
  }
  
  /**
   * Initialize and render the scheduling page
   */
  async init() {
    this.isLoading = true;
    this.loadError = null;
    this.renderLoadingState();
    
    try {
      await Promise.all([
        this.loadPlans(),
        this.loadPreferences(),
        this.loadPrivacySettings(),
        this.loadNotificationCount()
      ]);
      
      this.isLoading = false;
      this.retryCount = 0; // Reset retry count on success
      this.render();
      this.attachEventListeners();
      
      // Update sidebar badge with initial count
      this.updateSidebarNotificationBadge(this.unreadNotificationCount);
    } catch (error) {
      console.error('Failed to initialize scheduling page:', error);
      this.isLoading = false;
      this.loadError = this.getUserFriendlyError(error);
      this.renderErrorState();
    }
  }
  
  /**
   * Render loading state - Task 14.2
   */
  renderLoadingState() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="scheduling-page">
        <div class="page-header">
          <div style="flex: 1;">
            <h1 class="page-header-title">Scheduling</h1>
          </div>
        </div>
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading your catchup plans...</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Render error state with retry button - Task 14.2
   */
  renderErrorState() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const canRetry = this.retryCount < this.maxRetries;
    
    container.innerHTML = `
      <div class="scheduling-page">
        <div class="page-header">
          <div style="flex: 1;">
            <h1 class="page-header-title">Scheduling</h1>
          </div>
        </div>
        <div class="error-state">
          <span class="material-icons error-icon">cloud_off</span>
          <h3>Unable to Load Plans</h3>
          <p>${this.escapeHtml(this.loadError || 'Something went wrong while loading your scheduling data.')}</p>
          <div class="error-actions">
            ${canRetry ? `
              <button class="btn-primary" id="retry-load-btn">
                <span class="material-icons">refresh</span>
                Try Again ${this.retryCount > 0 ? `(${this.maxRetries - this.retryCount} attempts left)` : ''}
              </button>
            ` : `
              <button class="btn-secondary" id="refresh-page-btn">
                <span class="material-icons">refresh</span>
                Refresh Page
              </button>
            `}
          </div>
        </div>
      </div>
    `;
    
    // Attach retry handler
    const retryBtn = container.querySelector('#retry-load-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retryLoad());
    }
    
    const refreshBtn = container.querySelector('#refresh-page-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => window.location.reload());
    }
  }
  
  /**
   * Retry loading with exponential backoff - Task 14.2
   */
  async retryLoad() {
    this.retryCount++;
    
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, this.retryCount - 1) * 1000;
    
    // Show loading with retry info
    const container = document.getElementById(this.containerId);
    if (container) {
      const errorState = container.querySelector('.error-state');
      if (errorState) {
        errorState.innerHTML = `
          <div class="loading-spinner"></div>
          <p>Retrying... (attempt ${this.retryCount} of ${this.maxRetries})</p>
        `;
      }
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry initialization
    await this.init();
  }
  
  /**
   * Get user-friendly error message - Task 14.2
   */
  getUserFriendlyError(error) {
    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    // Timeout errors
    if (error.message?.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    
    // Authentication errors
    if (error.status === 401 || error.message?.includes('unauthorized')) {
      return 'Your session has expired. Please refresh the page and sign in again.';
    }
    
    // Server errors
    if (error.status >= 500) {
      return 'Our servers are having trouble. Please try again in a few moments.';
    }
    
    // Default message
    return 'Something went wrong. Please try again.';
  }
  
  /**
   * Load plans from API with retry logic - Task 14.2
   */
  async loadPlans() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await this.fetchWithRetry(`/api/scheduling/plans?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      
      this.plans = await response.json();
      
      // Trigger auto-archive on page load (fire and forget)
      this.triggerAutoArchive();
    } catch (error) {
      console.error('Failed to load plans:', error);
      this.plans = [];
      throw error; // Re-throw to be handled by init()
    }
  }
  
  /**
   * Fetch with automatic retry for transient failures - Task 14.2
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} maxRetries - Maximum retry attempts (default: 3)
   * @returns {Promise<Response>} - Fetch response
   */
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Don't retry client errors (4xx), only server errors (5xx) and network issues
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // Server error - will retry
        lastError = new Error(`Server error: ${response.status}`);
        lastError.status = response.status;
        
      } catch (error) {
        // Network error - will retry
        lastError = error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  /**
   * Load archived plans from API
   * Requirements: 10.10 - Show archived plans in Past filter
   */
  async loadArchivedPlans() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/scheduling/plans/archived?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.archivedPlans = await response.json();
    } catch (error) {
      console.error('Failed to load archived plans:', error);
      this.archivedPlans = [];
    }
  }
  
  /**
   * Trigger auto-archive of old plans
   * Requirements: 10.10 - Auto-archive completed plans after 7 days
   */
  async triggerAutoArchive() {
    try {
      await fetch('/api/scheduling/auto-archive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      // Silently fail - auto-archive is not critical
      console.debug('Auto-archive failed:', error);
    }
  }
  
  /**
   * Load user scheduling preferences
   */
  async loadPreferences() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/scheduling/preferences?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        this.preferences = await response.json();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }
  
  /**
   * Load user privacy settings
   * Requirements: 8.5, 8.6
   */
  async loadPrivacySettings() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/scheduling/privacy', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        this.privacySettings = await response.json();
      } else {
        // Default privacy settings
        this.privacySettings = { shareWithInnerCircle: false };
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      this.privacySettings = { shareWithInnerCircle: false };
    }
  }
  
  /**
   * Load unread notification count
   */
  async loadNotificationCount() {
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await fetch(`/api/scheduling/notifications/unread-count?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.unreadNotificationCount = data.count || 0;
      }
    } catch (error) {
      console.error('Failed to load notification count:', error);
    }
  }
  
  /**
   * Load view preference from localStorage
   */
  loadViewPreference() {
    return localStorage.getItem('scheduling-view-preference');
  }
  
  /**
   * Save view preference to localStorage
   */
  saveViewPreference(view) {
    localStorage.setItem('scheduling-view-preference', view);
  }
  
  /**
   * Render the scheduling page
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('Scheduling page container not found');
      return;
    }
    
    container.innerHTML = `
      <div class="scheduling-page">
        <div class="page-header">
          <div style="flex: 1;">
            <h1 class="page-header-title">Scheduling</h1>
            ${this.renderPrivacyIndicator()}
          </div>
          <div class="page-header-actions">
            <div id="notification-panel-container"></div>
            <button class="btn-secondary" id="preferences-btn" title="Scheduling Preferences">
              <span class="material-icons">settings</span> Preferences
            </button>
            <button class="btn-primary" id="new-plan-btn">
              <span class="material-icons">add</span> New Plan
            </button>
          </div>
        </div>
        
        <div class="scheduling-controls">
          <div class="view-toggle">
            <button class="view-btn ${this.currentView === 'calendar' ? 'active' : ''}" data-view="calendar" title="Calendar View">
              <span class="material-icons">calendar_month</span>
            </button>
            <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}" data-view="list" title="List View">
              <span class="material-icons">list</span>
            </button>
          </div>
          
          <div class="filter-buttons">
            ${this.renderFilterButtons()}
          </div>
          
          <div class="quick-actions">
            <button class="quick-action-btn" data-circle="inner" title="Create plan with Inner Circle">
              💜 Inner Circle
            </button>
            <button class="quick-action-btn" data-circle="close" title="Create plan with Close Friends">
              💗 Close Friends
            </button>
          </div>
        </div>
        
        <div class="scheduling-content" id="scheduling-content">
          ${this.currentView === 'calendar' ? this.renderCalendarView() : this.renderListView()}
        </div>
        
        ${this.preferences ? this.renderPreferencesSummary() : ''}
      </div>
    `;
  }
  
  /**
   * Render privacy status indicator
   * Requirements: 8.5
   */
  renderPrivacyIndicator() {
    const isSharing = this.privacySettings?.shareWithInnerCircle || false;
    
    return `
      <div class="privacy-indicator" id="privacy-indicator" title="Click to change privacy settings">
        <span class="material-icons">${isSharing ? 'visibility' : 'visibility_off'}</span>
        <span>${isSharing ? 'Sharing with Inner Circle' : 'Calendar private'}</span>
      </div>
    `;
  }
  
  /**
   * Render filter buttons
   */
  renderFilterButtons() {
    const filters = [
      { id: 'all', label: 'All' },
      { id: 'pending', label: 'Pending' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'past', label: 'Past' }
    ];
    
    return filters.map(f => `
      <button class="filter-btn ${this.currentFilter === f.id ? 'active' : ''}" data-filter="${f.id}">
        ${f.label}
      </button>
    `).join('');
  }
  
  /**
   * Render list view of plans
   */
  renderListView() {
    const filteredPlans = this.filterPlans();
    
    if (filteredPlans.length === 0) {
      return this.renderEmptyState();
    }
    
    return `
      <div class="plans-list">
        ${filteredPlans.map(plan => this.renderPlanCard(plan)).join('')}
      </div>
    `;
  }
  
  /**
   * Render empty state with context-aware messaging
   * Task 14.4: Add empty state guidance
   * Shows different messages based on:
   * - First-time user (no plans at all)
   * - No plans matching current filter
   */
  renderEmptyState() {
    const hasAnyPlans = this.plans.length > 0 || this.archivedPlans.length > 0;
    
    // If user has plans but none match the current filter
    if (hasAnyPlans) {
      return this.renderFilteredEmptyState();
    }
    
    // First-time user - show welcoming onboarding empty state
    return this.renderFirstTimeEmptyState();
  }
  
  /**
   * Render empty state for first-time users
   * Task 14.4: Welcoming message with clear CTA
   */
  renderFirstTimeEmptyState() {
    return `
      <div class="empty-state empty-state-welcome">
        <div class="empty-state-illustration">
          <div class="empty-state-icon-group">
            <span class="material-icons empty-state-icon-main">calendar_month</span>
            <span class="material-icons empty-state-icon-accent">group</span>
            <span class="material-icons empty-state-icon-sparkle">auto_awesome</span>
          </div>
        </div>
        <h3>Plan Your First Catchup!</h3>
        <p class="empty-state-description">
          Coordinate meetups with friends effortlessly. Create a plan, share availability links, 
          and let us help you find the perfect time to connect.
        </p>
        <div class="empty-state-features">
          <div class="empty-state-feature">
            <span class="material-icons">link</span>
            <span>Share links with friends</span>
          </div>
          <div class="empty-state-feature">
            <span class="material-icons">schedule</span>
            <span>Collect availability</span>
          </div>
          <div class="empty-state-feature">
            <span class="material-icons">auto_awesome</span>
            <span>AI finds the best time</span>
          </div>
        </div>
        <button class="btn-primary btn-lg empty-state-cta" id="empty-state-new-plan-btn">
          <span class="material-icons">add</span>
          Create Your First Plan
        </button>
        <p class="empty-state-hint">
          <span class="material-icons">lightbulb</span>
          Tip: Use the quick actions above to plan with your Inner Circle or Close Friends
        </p>
      </div>
    `;
  }
  
  /**
   * Render empty state when no plans match the current filter
   * Task 14.4: Context-aware messaging for filtered views
   */
  renderFilteredEmptyState() {
    const filterMessages = {
      all: {
        icon: 'event_busy',
        title: 'No catchup plans',
        description: 'Create a new plan to start coordinating with friends.'
      },
      pending: {
        icon: 'hourglass_empty',
        title: 'No pending plans',
        description: 'All your plans have been finalized or completed. Create a new one to keep the momentum going!'
      },
      scheduled: {
        icon: 'event_available',
        title: 'No upcoming scheduled plans',
        description: 'You don\'t have any upcoming catchups scheduled. Time to plan your next meetup!'
      },
      past: {
        icon: 'history',
        title: 'No past plans',
        description: 'Your completed and archived plans will appear here. Start planning to build your catchup history!'
      }
    };
    
    const message = filterMessages[this.currentFilter] || filterMessages.all;
    
    return `
      <div class="empty-state empty-state-filtered">
        <span class="material-icons">${message.icon}</span>
        <h3>${message.title}</h3>
        <p>${message.description}</p>
        <button class="btn-primary empty-state-cta" id="empty-state-new-plan-btn">
          <span class="material-icons">add</span>
          New Plan
        </button>
        ${this.currentFilter !== 'all' ? `
          <button class="btn-secondary empty-state-secondary" id="empty-state-show-all-btn">
            <span class="material-icons">visibility</span>
            Show All Plans
          </button>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Render a single plan card
   * Requirements: 10.10 - Show archived plans with visual distinction
   */
  renderPlanCard(plan) {
    const statusClass = (plan.status || 'draft').toLowerCase().replace(/_/g, '-');
    const invitees = plan.invitees || [];
    const participantCount = invitees.length;
    const respondedCount = invitees.filter(i => i.hasResponded).length;
    const isArchived = !!plan.archivedAt;
    const isIndividual = participantCount === 1; // Requirements: 11.5 - Visual distinction for individual plans
    const now = new Date();
    const isPast = plan.status === 'completed' || 
                   plan.status === 'cancelled' ||
                   (plan.status === 'scheduled' && plan.finalizedTime && new Date(plan.finalizedTime) < now);
    
    return `
      <div class="plan-card ${statusClass} ${isArchived ? 'archived' : ''} ${isIndividual ? 'individual-plan' : 'group-plan'}" data-plan-id="${plan.id}">
        ${isArchived ? '<div class="archived-badge"><span class="material-icons">archive</span> Archived</div>' : ''}
        <div class="plan-header">
          <h4>${this.escapeHtml(plan.activityType || 'Catchup')}</h4>
          <div class="plan-header-badges">
            ${isIndividual ? `
              <span class="plan-type-badge individual" title="One-on-one catchup">
                <span class="material-icons">person</span>
              </span>
            ` : `
              <span class="plan-type-badge group" title="Group catchup">
                <span class="material-icons">group</span>
              </span>
            `}
            <span class="plan-status">${this.formatStatus(plan.status)}</span>
          </div>
        </div>
        <div class="plan-participants">
          <span class="material-icons">${isIndividual ? 'person' : 'group'}</span>
          ${isIndividual 
            ? `with ${this.escapeHtml(invitees[0]?.contactName || 'Contact')}`
            : `${participantCount} participant${participantCount !== 1 ? 's' : ''}`
          }
          <span class="response-count">(${respondedCount}/${participantCount} responded)</span>
        </div>
        <div class="plan-date-range">
          <span class="material-icons">date_range</span>
          ${this.formatDateRange(plan.dateRangeStart, plan.dateRangeEnd)}
        </div>
        ${plan.finalizedTime ? `
          <div class="plan-finalized-time">
            <span class="material-icons">event</span>
            ${this.formatDateTime(plan.finalizedTime)}
          </div>
        ` : ''}
        <div class="plan-actions">
          <button class="btn-secondary" data-action="view" data-plan-id="${plan.id}">View Details</button>
          ${plan.status === 'collecting_availability' ? `
            <button class="btn-primary" data-action="finalize" data-plan-id="${plan.id}">${isIndividual ? 'Pick Time' : 'Find Time'}</button>
          ` : ''}
          ${isArchived ? `
            <button class="btn-secondary btn-sm" data-action="unarchive" data-plan-id="${plan.id}" title="Restore from archive">
              <span class="material-icons">unarchive</span>
            </button>
          ` : isPast && !isArchived ? `
            <button class="btn-secondary btn-sm" data-action="archive" data-plan-id="${plan.id}" title="Archive this plan">
              <span class="material-icons">archive</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render calendar view of plans
   */
  renderCalendarView() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return `
      <div class="plan-calendar-view">
        <div class="calendar-navigation">
          <button id="prev-month">&lt;</button>
          <span id="date-range-label">${this.formatMonthYear(currentMonth, currentYear)}</span>
          <button id="next-month">&gt;</button>
        </div>
        <div class="calendar-grid">
          ${this.renderCalendarDayHeaders()}
          ${this.renderCalendarDays(currentMonth, currentYear)}
        </div>
      </div>
    `;
  }
  
  /**
   * Render calendar day headers
   */
  renderCalendarDayHeaders() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => `<div class="calendar-day-header">${day}</div>`).join('');
  }
  
  /**
   * Render calendar days for a month
   */
  renderCalendarDays(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();
    
    let html = '';
    
    // Padding for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      const prevMonthDay = new Date(year, month, -startPadding + i + 1);
      html += `<div class="calendar-day other-month">
        <span class="calendar-day-number">${prevMonthDay.getDate()}</span>
      </div>`;
    }
    
    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const isToday = this.isSameDay(date, today);
      const plansOnDay = this.getPlansForDate(date);
      
      html += `
        <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${date.toISOString().split('T')[0]}">
          <span class="calendar-day-number">${day}</span>
          ${plansOnDay.slice(0, 2).map(plan => `
            <div class="calendar-plan-event" data-plan-id="${plan.id}">
              ${this.escapeHtml(plan.activityType || 'Catchup')}
            </div>
          `).join('')}
          ${plansOnDay.length > 2 ? `<div class="calendar-plan-event">+${plansOnDay.length - 2} more</div>` : ''}
        </div>
      `;
    }
    
    // Padding for days after the last of the month
    const endPadding = 42 - (startPadding + totalDays);
    for (let i = 1; i <= endPadding; i++) {
      html += `<div class="calendar-day other-month">
        <span class="calendar-day-number">${i}</span>
      </div>`;
    }
    
    return html;
  }
  
  /**
   * Render preferences summary
   */
  renderPreferencesSummary() {
    if (!this.preferences) return '';
    
    const chips = [];
    
    if (this.preferences.preferredDays?.length) {
      chips.push(`Days: ${this.preferences.preferredDays.join(', ')}`);
    }
    
    if (this.preferences.preferredTimeRanges?.length) {
      chips.push(`Times: ${this.preferences.preferredTimeRanges.join(', ')}`);
    }
    
    if (this.preferences.defaultDuration) {
      chips.push(`Duration: ${this.preferences.defaultDuration} min`);
    }
    
    if (chips.length === 0) return '';
    
    return `
      <div class="preferences-summary" id="preferences-summary">
        <h4>Your Preferences</h4>
        <div class="preferences-chips">
          ${chips.map(chip => `<span class="preference-chip">${chip}</span>`).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Render error state
   */
  renderError(message) {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="scheduling-page">
        <div class="empty-state">
          <span class="material-icons">error_outline</span>
          <h3>Something went wrong</h3>
          <p>${this.escapeHtml(message)}</p>
          <button class="btn-primary" onclick="window.schedulingPage.init()">Try Again</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Initialize notification panel
    // Requirements: 13.5, 13.6, 13.7
    this.initializeNotificationPanel();
    
    // Initialize mobile enhancements (Requirement 15.6, 15.7)
    this.initializeMobileEnhancements(container);
    
    // New plan button
    const newPlanBtn = container.querySelector('#new-plan-btn');
    if (newPlanBtn) {
      newPlanBtn.addEventListener('click', () => this.openPlanCreationModal());
    }
    
    // Empty state CTA button - Task 14.4
    const emptyStateCta = container.querySelector('#empty-state-new-plan-btn');
    if (emptyStateCta) {
      emptyStateCta.addEventListener('click', () => this.openPlanCreationModal());
    }
    
    // Empty state "Show All" button - Task 14.4
    const showAllBtn = container.querySelector('#empty-state-show-all-btn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        this.currentFilter = 'all';
        this.render();
        this.attachEventListeners();
      });
    }
    
    // Preferences button
    const preferencesBtn = container.querySelector('#preferences-btn');
    if (preferencesBtn) {
      preferencesBtn.addEventListener('click', () => this.openPreferencesModal());
    }
    
    // Privacy indicator click - opens preferences modal with privacy tab
    const privacyIndicator = container.querySelector('#privacy-indicator');
    if (privacyIndicator) {
      privacyIndicator.addEventListener('click', () => this.openPreferencesModal('privacy'));
    }
    
    // View toggle buttons
    container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', this.handleViewToggle);
    });
    
    // Filter buttons
    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', this.handleFilterChange);
    });
    
    // Quick action buttons
    container.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', this.handleQuickAction);
    });
    
    // Plan action buttons
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', this.handlePlanAction);
    });
    
    // Calendar plan events
    container.querySelectorAll('.calendar-plan-event').forEach(event => {
      event.addEventListener('click', (e) => {
        e.stopPropagation();
        const planId = event.dataset.planId;
        if (planId) {
          this.viewPlanDetails(planId);
        }
      });
    });
  }
  
  /**
   * Initialize mobile enhancements
   * Requirements: 15.6 (horizontal scrolling), 15.7 (collapsible sections)
   */
  initializeMobileEnhancements(container) {
    // Scroll hint for calendar/availability grid containers
    const scrollContainers = container.querySelectorAll(
      '.calendar-grid-container, .availability-grid-container, .initiator-calendar-grid-container'
    );
    
    scrollContainers.forEach(scrollContainer => {
      scrollContainer.addEventListener('scroll', () => {
        if (scrollContainer.scrollLeft > 20) {
          scrollContainer.classList.add('scrolled');
        } else {
          scrollContainer.classList.remove('scrolled');
        }
      });
    });
    
    // Collapsible sections on mobile (Requirement 15.7)
    if (window.innerWidth <= 768) {
      this.initializeCollapsibleSections(container);
    }
  }
  
  /**
   * Initialize collapsible sections for mobile
   * Requirement 15.7
   */
  initializeCollapsibleSections(container) {
    // Make preference sections collapsible
    const preferenceSections = container.querySelectorAll('.preference-section');
    preferenceSections.forEach(section => {
      const header = section.querySelector('h4');
      if (header) {
        header.addEventListener('click', () => {
          section.classList.toggle('collapsed');
        });
      }
    });
    
    // Make plan detail sections collapsible
    const detailSections = container.querySelectorAll('.plan-detail-section');
    detailSections.forEach(section => {
      const header = section.querySelector('h4');
      if (header) {
        header.addEventListener('click', () => {
          section.classList.toggle('collapsed');
        });
      }
    });
    
    // Make collapsible-section elements work
    const collapsibleSections = container.querySelectorAll('.collapsible-section');
    collapsibleSections.forEach(section => {
      const header = section.querySelector('.collapsible-header');
      if (header) {
        header.addEventListener('click', () => {
          section.classList.toggle('collapsed');
        });
      }
    });
  }
  
  /**
   * Handle view toggle
   */
  handleViewToggle(e) {
    const view = e.currentTarget.dataset.view;
    if (view && view !== this.currentView) {
      this.currentView = view;
      this.saveViewPreference(view);
      this.render();
      this.attachEventListeners();
    }
  }
  
  /**
   * Handle filter change
   * Requirements: 10.10 - Load archived plans when "Past" filter is selected
   */
  async handleFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter && filter !== this.currentFilter) {
      this.currentFilter = filter;
      
      // Load archived plans when switching to "past" filter
      if (filter === 'past' && this.archivedPlans.length === 0) {
        await this.loadArchivedPlans();
      }
      
      this.render();
      this.attachEventListeners();
    }
  }
  
  /**
   * Handle quick action (create plan with circle)
   */
  handleQuickAction(e) {
    const circle = e.currentTarget.dataset.circle;
    this.openPlanCreationModal({ preSelectedCircle: circle });
  }
  
  /**
   * Handle plan action (view, finalize, archive, unarchive, etc.)
   * Requirements: 10.10 - Support archive/unarchive actions
   */
  handlePlanAction(e) {
    const action = e.currentTarget.dataset.action;
    const planId = e.currentTarget.dataset.planId;
    
    switch (action) {
      case 'view':
        this.viewPlanDetails(planId);
        break;
      case 'finalize':
        this.openFinalizePlanModal(planId);
        break;
      case 'archive':
        this.archivePlan(planId);
        break;
      case 'unarchive':
        this.unarchivePlan(planId);
        break;
    }
  }
  
  /**
   * Archive a plan with loading state - Task 14.2
   * Requirements: 10.10 - Allow manual archiving
   */
  async archivePlan(planId) {
    // Show loading state on the plan card
    const planCard = document.querySelector(`.plan-card[data-plan-id="${planId}"]`);
    if (planCard) {
      planCard.classList.add('loading');
    }
    
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await this.fetchWithRetry(`/api/scheduling/plans/${planId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive plan');
      }
      
      this.showToast('Plan archived successfully', 'success');
      
      // Reload plans to reflect the change
      await this.loadPlans();
      if (this.currentFilter === 'past') {
        await this.loadArchivedPlans();
      }
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to archive plan:', error);
      this.showToast(this.getUserFriendlyError(error), 'error');
      
      // Remove loading state
      if (planCard) {
        planCard.classList.remove('loading');
      }
    }
  }
  
  /**
   * Unarchive (restore) a plan with loading state - Task 14.2
   * Requirements: 10.10 - Allow restoring archived plans
   */
  async unarchivePlan(planId) {
    // Show loading state on the plan card
    const planCard = document.querySelector(`.plan-card[data-plan-id="${planId}"]`);
    if (planCard) {
      planCard.classList.add('loading');
    }
    
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await this.fetchWithRetry(`/api/scheduling/plans/${planId}/unarchive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore plan');
      }
      
      this.showToast('Plan restored successfully', 'success');
      
      // Reload plans to reflect the change
      await this.loadPlans();
      await this.loadArchivedPlans();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to restore plan:', error);
      this.showToast(this.getUserFriendlyError(error), 'error');
      
      // Remove loading state
      if (planCard) {
        planCard.classList.remove('loading');
      }
    }
  }
  
  /**
   * Filter plans based on current filter
   * Requirements: 10.10 - Add "Past" filter to show archived plans
   */
  filterPlans() {
    const now = new Date();
    
    // For "past" filter, include archived plans
    if (this.currentFilter === 'past') {
      // Combine past active plans with archived plans
      const pastActivePlans = this.plans.filter(plan => {
        return plan.status === 'completed' || 
               plan.status === 'cancelled' ||
               (plan.status === 'scheduled' && new Date(plan.finalizedTime) < now);
      });
      
      // Combine with archived plans (avoid duplicates)
      const archivedPlanIds = new Set(this.archivedPlans.map(p => p.id));
      const uniquePastPlans = pastActivePlans.filter(p => !archivedPlanIds.has(p.id));
      
      return [...uniquePastPlans, ...this.archivedPlans];
    }
    
    return this.plans.filter(plan => {
      switch (this.currentFilter) {
        case 'pending':
          return plan.status === 'collecting_availability' || plan.status === 'draft' || plan.status === 'ready_to_schedule';
        case 'scheduled':
          return plan.status === 'scheduled' && new Date(plan.finalizedTime) >= now;
        default:
          return true;
      }
    });
  }
  
  /**
   * Get plans for a specific date
   */
  getPlansForDate(date) {
    return this.plans.filter(plan => {
      if (plan.finalizedTime) {
        return this.isSameDay(new Date(plan.finalizedTime), date);
      }
      // For pending plans, show on date range
      const start = new Date(plan.dateRangeStart);
      const end = new Date(plan.dateRangeEnd);
      return date >= start && date <= end;
    });
  }
  
  /**
   * Open plan creation modal
   */
  openPlanCreationModal(options = {}) {
    if (window.PlanCreationModal) {
      const modal = new window.PlanCreationModal({
        userId: this.userId,
        preSelectedCircle: options.preSelectedCircle,
        onPlanCreated: () => {
          this.loadPlans().then(() => {
            this.render();
            this.attachEventListeners();
          });
        }
      });
      modal.open();
    } else {
      console.error('PlanCreationModal not loaded');
      this.showToast('Plan creation is not available', 'error');
    }
  }
  
  /**
   * Open scheduling preferences modal with tabbed interface
   * Requirements: 16.1, 16.11, 16.12, 8.5, 8.6
   * @param {string} initialTab - 'preferences' or 'privacy' (default: 'preferences')
   */
  openPreferencesModal(initialTab = 'preferences') {
    // Remove any existing preferences modal
    const existingModal = document.querySelector('.preferences-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal element with tabs
    const modal = document.createElement('div');
    modal.className = 'modal preferences-modal';
    modal.innerHTML = `
      <div class="modal-content preferences-modal-content">
        <div class="modal-header">
          <h2>Settings</h2>
          <button class="close-btn" id="close-preferences-modal">&times;</button>
        </div>
        <div class="preferences-tabs">
          <button class="preferences-tab ${initialTab === 'preferences' ? 'active' : ''}" data-tab="preferences">
            <span class="material-icons">tune</span>
            Preferences
          </button>
          <button class="preferences-tab ${initialTab === 'privacy' ? 'active' : ''}" data-tab="privacy">
            <span class="material-icons">security</span>
            Privacy
          </button>
        </div>
        <div class="modal-body">
          <div id="preferences-tab-content" class="tab-content ${initialTab === 'preferences' ? 'active' : ''}">
            <div id="preferences-modal-container"></div>
          </div>
          <div id="privacy-tab-content" class="tab-content ${initialTab === 'privacy' ? 'active' : ''}">
            <div id="privacy-modal-container"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Initialize the appropriate component based on initial tab
    this.initializePreferencesTab();
    this.initializePrivacyTab();
    
    // Tab switching logic
    modal.querySelectorAll('.preferences-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchPreferencesTab(tabName, modal);
      });
    });
    
    // Attach close event listeners
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    
    modal.querySelector('#close-preferences-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  /**
   * Initialize the Preferences tab content
   */
  initializePreferencesTab() {
    if (window.SchedulingPreferences) {
      const preferencesComponent = new window.SchedulingPreferences({
        containerId: 'preferences-modal-container',
        userId: this.userId,
        onSave: (savedPreferences) => {
          // Update local preferences and re-render summary
          this.preferences = savedPreferences;
          this.updatePreferencesSummary();
        }
      });
      preferencesComponent.init();
    } else {
      document.getElementById('preferences-modal-container').innerHTML = `
        <div class="empty-state">
          <span class="material-icons">error_outline</span>
          <h3>Preferences not available</h3>
          <p>The preferences component could not be loaded.</p>
        </div>
      `;
    }
  }
  
  /**
   * Initialize the Privacy tab content
   * Requirements: 8.5, 8.6
   */
  initializePrivacyTab() {
    if (window.SchedulingPrivacy) {
      const privacyComponent = new window.SchedulingPrivacy({
        containerId: 'privacy-modal-container',
        onSettingsChange: (savedSettings) => {
          // Update local privacy settings and re-render indicator
          this.privacySettings = savedSettings;
          this.updatePrivacyIndicator();
        }
      });
      privacyComponent.init();
    } else {
      document.getElementById('privacy-modal-container').innerHTML = `
        <div class="empty-state">
          <span class="material-icons">error_outline</span>
          <h3>Privacy settings not available</h3>
          <p>The privacy component could not be loaded.</p>
        </div>
      `;
    }
  }
  
  /**
   * Initialize the notification panel component
   * Requirements: 13.5, 13.6, 13.7
   */
  initializeNotificationPanel() {
    const container = document.getElementById('notification-panel-container');
    if (!container) return;
    
    if (window.SchedulingNotifications) {
      // Clean up existing notification panel if any
      if (this.notificationPanel) {
        this.notificationPanel.destroy();
      }
      
      this.notificationPanel = new window.SchedulingNotifications({
        containerId: 'notification-panel-container',
        userId: this.userId,
        onNotificationClick: (planId) => {
          // Navigate to plan details when notification is clicked
          this.viewPlanDetails(planId);
        },
        onCountChange: (count) => {
          // Update the sidebar badge if needed
          this.updateSidebarNotificationBadge(count);
        }
      });
      this.notificationPanel.init();
    } else {
      // Fallback: render a simple bell icon without functionality
      container.innerHTML = `
        <button class="notification-bell-btn" title="Notifications not available" disabled>
          <span class="material-icons">notifications</span>
        </button>
      `;
    }
  }
  
  /**
   * Update the sidebar notification badge
   * Requirements: 13.5
   */
  updateSidebarNotificationBadge(count) {
    // Update the sidebar nav item badge
    const sidebarBadge = document.getElementById('scheduling-badge');
    if (sidebarBadge) {
      if (count > 0) {
        sidebarBadge.textContent = count > 99 ? '99+' : count;
        sidebarBadge.classList.remove('hidden');
      } else {
        sidebarBadge.classList.add('hidden');
      }
    }
  }
  
  /**
   * Switch between Preferences and Privacy tabs
   */
  switchPreferencesTab(tabName, modal) {
    // Update tab buttons
    modal.querySelectorAll('.preferences-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content visibility
    modal.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const targetContent = modal.querySelector(`#${tabName}-tab-content`);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  }
  
  /**
   * Update the privacy indicator in the DOM
   * Requirements: 8.5
   */
  updatePrivacyIndicator() {
    const indicator = document.getElementById('privacy-indicator');
    if (indicator) {
      const isSharing = this.privacySettings?.shareWithInnerCircle || false;
      indicator.innerHTML = `
        <span class="material-icons">${isSharing ? 'visibility' : 'visibility_off'}</span>
        <span>${isSharing ? 'Sharing with Inner Circle' : 'Calendar private'}</span>
      `;
    }
  }
  
  /**
   * Update the preferences summary section without full re-render
   */
  updatePreferencesSummary() {
    const existingSummary = document.querySelector('.preferences-summary');
    const newSummaryHtml = this.renderPreferencesSummary();
    
    if (existingSummary) {
      if (newSummaryHtml) {
        existingSummary.outerHTML = newSummaryHtml;
      } else {
        existingSummary.remove();
      }
    } else if (newSummaryHtml) {
      // Add summary if it doesn't exist but we have preferences
      const schedulingContent = document.querySelector('.scheduling-content');
      if (schedulingContent) {
        schedulingContent.insertAdjacentHTML('afterend', newSummaryHtml);
      }
    }
  }
  
  /**
   * View plan details
   * Requirements: 6.1, 6.2, 6.6, 6.7, 6.9, 6.10 - Enhanced plan details modal with full participant list,
   * response status, invite links with copy buttons, and availability summary
   */
  viewPlanDetails(planId) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      this.showToast('Plan not found', 'error');
      return;
    }
    
    // Create and show plan details modal
    const existingModal = document.querySelector('.plan-details-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const invitees = plan.invitees || [];
    const isCollectingAvailability = plan.status === 'collecting_availability';
    
    // Calculate response statistics - Requirements: 6.6, 6.9, 6.10
    const respondedCount = invitees.filter(i => i.hasResponded).length;
    const totalInvitees = invitees.length;
    const responseRate = totalInvitees > 0 ? Math.round((respondedCount / totalInvitees) * 100) : 0;
    const mustAttendCount = invitees.filter(i => i.attendanceType === 'must_attend').length;
    const niceToHaveCount = invitees.filter(i => i.attendanceType === 'nice_to_have').length;
    const mustAttendResponded = invitees.filter(i => i.attendanceType === 'must_attend' && i.hasResponded).length;
    
    const modal = document.createElement('div');
    modal.className = 'modal plan-details-modal';
    
    // Use larger modal for better layout
    const modalContentClass = 'modal-content modal-content-large';
    
    modal.innerHTML = `
      <div class="${modalContentClass}">
        <div class="modal-header">
          <h2>${this.escapeHtml(plan.activityType || 'Catchup')} Details</h2>
          <button class="close-btn" id="close-details-modal">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Plan Overview Section -->
          <div class="plan-details-overview">
            <div class="plan-detail-section plan-detail-inline">
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span class="plan-status-badge ${(plan.status || 'draft').toLowerCase()}">${this.formatStatus(plan.status)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Date Range</span>
                <span class="detail-value">${this.formatDateRange(plan.dateRangeStart, plan.dateRangeEnd)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Duration</span>
                <span class="detail-value">${plan.duration || 60} minutes</span>
              </div>
              ${plan.location ? `
                <div class="detail-item">
                  <span class="detail-label">Location</span>
                  <span class="detail-value">${this.escapeHtml(plan.location)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Availability Summary Section - Requirements: 6.9, 6.10 -->
          <div class="plan-detail-section availability-summary-section">
            <h4><span class="material-icons">analytics</span> Availability Summary</h4>
            <div class="availability-summary-grid">
              <div class="summary-stat">
                <div class="stat-value">${respondedCount}/${totalInvitees}</div>
                <div class="stat-label">Responses Received</div>
                <div class="stat-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${responseRate}%"></div>
                  </div>
                  <span class="progress-text">${responseRate}% response rate</span>
                </div>
              </div>
              <div class="summary-stat">
                <div class="stat-value">${mustAttendResponded}/${mustAttendCount}</div>
                <div class="stat-label">Must-Attend Responded</div>
                <div class="stat-badge ${mustAttendResponded === mustAttendCount && mustAttendCount > 0 ? 'complete' : 'pending'}">
                  ${mustAttendResponded === mustAttendCount && mustAttendCount > 0 ? '✓ All responded' : `${mustAttendCount - mustAttendResponded} pending`}
                </div>
              </div>
              <div class="summary-stat">
                <div class="stat-value">${niceToHaveCount}</div>
                <div class="stat-label">Nice-to-Have Invitees</div>
                <div class="stat-subtext">${invitees.filter(i => i.attendanceType === 'nice_to_have' && i.hasResponded).length} responded</div>
              </div>
            </div>
            <div id="overlap-summary-${plan.id}" class="overlap-summary">
              <div class="loading-inline">
                <span class="loading-spinner-sm"></span>
                <span>Loading overlap data...</span>
              </div>
            </div>
          </div>
          
          <!-- Initiator Availability Section - Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7 -->
          ${isCollectingAvailability ? `
            <div class="plan-detail-section initiator-availability-section">
              <div class="initiator-availability-prompt-inline" id="initiator-availability-prompt-${plan.id}">
                <div class="prompt-icon">
                  <span class="material-icons">event_available</span>
                </div>
                <div class="prompt-content">
                  <h4>Your Availability</h4>
                  <p id="initiator-availability-status-${plan.id}">Loading...</p>
                </div>
                <button class="btn-primary btn-sm" id="mark-availability-btn-${plan.id}">
                  <span class="material-icons">edit_calendar</span>
                  Mark Availability
                </button>
              </div>
            </div>
          ` : ''}
          
          ${isCollectingAvailability ? `
            <!-- Availability Dashboard Section - Requirements 6.1, 6.2, 6.7 -->
            <div class="plan-detail-section availability-dashboard-section">
              <div id="plan-availability-dashboard" class="availability-dashboard-container">
                <div class="loading-state">
                  <span class="loading-spinner"></span>
                  <p>Loading availability data...</p>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- Full Participant List Section - Requirements: 6.6 -->
          <div class="plan-detail-section participants-section">
            <h4><span class="material-icons">group</span> Participants (${invitees.length})</h4>
            <div class="participants-list-enhanced">
              ${invitees.length === 0 ? `
                <div class="empty-participants">
                  <span class="material-icons">person_off</span>
                  <p>No participants added yet</p>
                </div>
              ` : invitees.map(inv => `
                <div class="participant-card ${inv.hasResponded ? 'responded' : 'pending'}">
                  <div class="participant-avatar">
                    ${this.getInitials(inv.contactName || 'Unknown')}
                  </div>
                  <div class="participant-info">
                    <div class="participant-name-row">
                      <span class="participant-name">${this.escapeHtml(inv.contactName || 'Unknown')}</span>
                      <span class="attendance-badge ${inv.attendanceType}">
                        ${inv.attendanceType === 'must_attend' ? '⭐ Must Attend' : '○ Nice to Have'}
                      </span>
                    </div>
                    <div class="participant-status-row">
                      <span class="response-status-indicator ${inv.hasResponded ? 'responded' : 'pending'}">
                        <span class="material-icons">${inv.hasResponded ? 'check_circle' : 'schedule'}</span>
                        ${inv.hasResponded ? 'Responded' : 'Awaiting response'}
                      </span>
                    </div>
                  </div>
                  <div class="participant-actions">
                    <button class="btn-icon copy-invite-link" data-token="${inv.inviteToken || ''}" title="Copy invite link">
                      <span class="material-icons">content_copy</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Invite Links Section with Copy All -->
          <div class="plan-detail-section invite-links-section">
            <div class="section-header-with-action">
              <h4><span class="material-icons">link</span> Invite Links</h4>
              ${invitees.length > 0 ? `
                <button class="btn-secondary btn-sm" id="copy-all-links-btn">
                  <span class="material-icons">content_copy</span> Copy All Links
                </button>
              ` : ''}
            </div>
            <div class="invite-links-list-enhanced">
              ${invitees.length === 0 ? `
                <div class="empty-links">
                  <p>No invite links available</p>
                </div>
              ` : invitees.map(inv => `
                <div class="invite-link-card">
                  <div class="link-invitee-info">
                    <span class="invitee-name">${this.escapeHtml(inv.contactName || 'Unknown')}</span>
                    <span class="response-badge ${inv.hasResponded ? 'responded' : 'pending'}">
                      ${inv.hasResponded ? '✓ Responded' : '○ Pending'}
                    </span>
                  </div>
                  <div class="link-url-row">
                    <input type="text" 
                           class="link-url-input" 
                           value="${window.location.origin}/availability.html?token=${inv.inviteToken || ''}" 
                           readonly 
                           onclick="this.select()">
                    <button class="btn-icon copy-invite-link" data-token="${inv.inviteToken || ''}" title="Copy link">
                      <span class="material-icons">content_copy</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
            ${this.renderReminderSection(plan, invitees)}
          </div>
        </div>
        <div class="modal-footer">
          ${isCollectingAvailability ? `
            <button class="btn-primary" id="finalize-from-details" data-plan-id="${plan.id}">
              <span class="material-icons">event_available</span> Find Best Time
            </button>
          ` : ''}
          ${plan.status !== 'scheduled' && plan.status !== 'completed' && plan.status !== 'cancelled' ? `
            <button class="btn-secondary" id="edit-plan-btn" data-plan-id="${plan.id}">
              <span class="material-icons">edit</span> Edit Plan
            </button>
            <button class="btn-danger" id="cancel-plan-btn" data-plan-id="${plan.id}">
              <span class="material-icons">cancel</span> Cancel Plan
            </button>
          ` : ''}
          <button class="btn-secondary" id="close-details-btn">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Attach event listeners
    modal.querySelector('#close-details-modal').addEventListener('click', () => this.closeDetailsModal());
    modal.querySelector('#close-details-btn').addEventListener('click', () => this.closeDetailsModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeDetailsModal();
    });
    
    const finalizeBtn = modal.querySelector('#finalize-from-details');
    if (finalizeBtn) {
      finalizeBtn.addEventListener('click', () => {
        this.closeDetailsModal();
        this.openFinalizePlanModal(planId);
      });
    }
    
    // Edit plan button - Requirements: 12.1, 12.7
    const editPlanBtn = modal.querySelector('#edit-plan-btn');
    if (editPlanBtn) {
      editPlanBtn.addEventListener('click', () => {
        this.closeDetailsModal();
        this.openPlanEditModal(planId);
      });
    }
    
    // Cancel plan button - Requirements: 12.2, 12.3, 12.4
    const cancelPlanBtn = modal.querySelector('#cancel-plan-btn');
    if (cancelPlanBtn) {
      cancelPlanBtn.addEventListener('click', () => {
        this.showCancelPlanConfirmation(planId, plan);
      });
    }
    
    // Copy link buttons - attach to all copy buttons
    modal.querySelectorAll('.copy-invite-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const token = btn.dataset.token;
        if (token) {
          const url = `${window.location.origin}/availability.html?token=${token}`;
          navigator.clipboard.writeText(url).then(() => {
            // Visual feedback
            const icon = btn.querySelector('.material-icons');
            if (icon) {
              const originalText = icon.textContent;
              icon.textContent = 'check';
              btn.classList.add('copied');
              setTimeout(() => {
                icon.textContent = originalText;
                btn.classList.remove('copied');
              }, 2000);
            }
            this.showToast('Link copied!', 'success');
          }).catch(() => {
            this.showToast('Failed to copy link', 'error');
          });
        }
      });
    });
    
    // Copy All Links button
    const copyAllBtn = modal.querySelector('#copy-all-links-btn');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => {
        const allLinks = invitees.map(inv => {
          const url = `${window.location.origin}/availability.html?token=${inv.inviteToken || ''}`;
          return `${inv.contactName || 'Unknown'}: ${url}`;
        }).join('\n');
        
        navigator.clipboard.writeText(allLinks).then(() => {
          const icon = copyAllBtn.querySelector('.material-icons');
          if (icon) {
            const originalText = icon.textContent;
            icon.textContent = 'check';
            setTimeout(() => {
              icon.textContent = originalText;
            }, 2000);
          }
          this.showToast(`${invitees.length} links copied!`, 'success');
        }).catch(() => {
          this.showToast('Failed to copy links', 'error');
        });
      });
    }
    
    // Load overlap summary data - Requirements: 6.9, 6.10
    this.loadOverlapSummary(planId);
    
    // Load availability data for overlap calculation
    if (respondedCount > 0) {
      this.loadAvailabilityOverlapData(planId);
    }
    
    // Send reminders button
    // Requirements: 12.5 - Initiator can send reminders to invitees who haven't responded
    const sendRemindersBtn = modal.querySelector('.send-reminders-btn');
    if (sendRemindersBtn) {
      sendRemindersBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const originalContent = btn.innerHTML;
        
        // Disable button and show loading state
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner-sm"></span> Sending...';
        
        try {
          await this.sendReminders(planId);
          // Update button to show success
          btn.innerHTML = '<span class="material-icons">check</span> Sent!';
          btn.classList.add('btn-success');
          
          // Re-enable after a delay
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            btn.classList.remove('btn-success');
          }, 3000);
        } catch (error) {
          // Re-enable button on error
          btn.disabled = false;
          btn.innerHTML = originalContent;
        }
      });
    }
    
    // Initialize AvailabilityDashboard if in collecting_availability status
    // Requirements: 6.1, 6.2, 6.7
    if (isCollectingAvailability && window.AvailabilityDashboard) {
      this.initializeAvailabilityDashboard(planId, modal);
    }
    
    // Initialize initiator availability section
    // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
    if (isCollectingAvailability) {
      this.initializeInitiatorAvailabilitySection(planId, plan, modal);
    }
  }
  
  /**
   * Initialize the initiator availability section in plan details
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  async initializeInitiatorAvailabilitySection(planId, plan, modal) {
    const statusEl = document.getElementById(`initiator-availability-status-${planId}`);
    const markBtn = document.getElementById(`mark-availability-btn-${planId}`);
    const promptEl = document.getElementById(`initiator-availability-prompt-${planId}`);
    
    if (!statusEl || !markBtn) return;
    
    // Load initiator availability status
    try {
      const response = await fetch(`/api/scheduling/plans/${planId}/availability?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const initiatorSlots = data.initiatorAvailability || [];
        
        if (initiatorSlots.length > 0) {
          // User has already marked availability
          statusEl.textContent = `You've marked ${initiatorSlots.length} time slot${initiatorSlots.length !== 1 ? 's' : ''} as available`;
          markBtn.innerHTML = '<span class="material-icons">edit</span> Edit';
          promptEl.classList.add('completed');
        } else {
          statusEl.textContent = 'Help find the best time by marking when you\'re free';
        }
      } else {
        statusEl.textContent = 'Help find the best time by marking when you\'re free';
      }
    } catch (error) {
      console.error('Failed to load initiator availability:', error);
      statusEl.textContent = 'Help find the best time by marking when you\'re free';
    }
    
    // Attach click handler for mark availability button
    markBtn.addEventListener('click', () => {
      this.openInitiatorAvailabilityModal(planId, plan, modal);
    });
  }
  
  /**
   * Open the initiator availability modal
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  openInitiatorAvailabilityModal(planId, plan, parentModal) {
    if (!window.InitiatorAvailabilityModal) {
      this.showToast('Availability marking is not available', 'error');
      return;
    }
    
    const availabilityModal = new window.InitiatorAvailabilityModal({
      planId: planId,
      plan: plan,
      userId: this.userId,
      onSave: (slots) => {
        // Update the status in the parent modal
        const statusEl = document.getElementById(`initiator-availability-status-${planId}`);
        const markBtn = document.getElementById(`mark-availability-btn-${planId}`);
        const promptEl = document.getElementById(`initiator-availability-prompt-${planId}`);
        
        if (statusEl) {
          statusEl.textContent = `You've marked ${slots.length} time slot${slots.length !== 1 ? 's' : ''} as available`;
        }
        if (markBtn) {
          markBtn.innerHTML = '<span class="material-icons">edit</span> Edit';
        }
        if (promptEl) {
          promptEl.classList.add('completed');
        }
        
        // Refresh the availability dashboard if it exists
        if (window.availabilityDashboard) {
          window.availabilityDashboard.refresh();
        }
        
        this.showToast('Your availability has been saved!', 'success');
      },
      onSkip: () => {
        // User skipped, no action needed
      }
    });
    
    availabilityModal.open();
  }
  
  /**
   * Initialize the AvailabilityDashboard component within the plan details modal
   * Requirements: 6.1, 6.2, 6.7
   */
  initializeAvailabilityDashboard(planId, modal) {
    const dashboardContainer = modal.querySelector('#plan-availability-dashboard');
    if (!dashboardContainer) return;
    
    // Create and initialize the dashboard
    const dashboard = new window.AvailabilityDashboard({
      containerId: 'plan-availability-dashboard',
      planId: planId,
      userId: this.userId,
      onFinalize: () => {
        // Close modal and refresh plans after finalization
        this.closeDetailsModal();
        this.loadPlans().then(() => {
          this.render();
          this.attachEventListeners();
        });
        this.showToast('Plan finalized successfully!', 'success');
      }
    });
    
    dashboard.init().catch(error => {
      console.error('Failed to initialize availability dashboard:', error);
      dashboardContainer.innerHTML = `
        <div class="empty-state">
          <span class="material-icons">error_outline</span>
          <h3>Failed to load availability</h3>
          <p>Unable to load availability data. Please try again.</p>
          <button class="btn-secondary" onclick="window.schedulingPage.viewPlanDetails('${planId}')">Retry</button>
        </div>
      `;
    });
  }
  
  /**
   * Close plan details modal
   */
  closeDetailsModal() {
    const modal = document.querySelector('.plan-details-modal');
    if (modal) {
      modal.remove();
    }
    document.body.style.overflow = '';
  }
  
  /**
   * Open plan edit modal
   * Requirements: 12.1, 12.7 - Allow editing a plan before finalization, prevent editing finalized plans
   */
  openPlanEditModal(planId) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      this.showToast('Plan not found', 'error');
      return;
    }
    
    // Check if plan can be edited (Requirements: 12.7)
    if (plan.status === 'scheduled' || plan.status === 'completed') {
      this.showToast('Cannot edit a finalized plan. Cancel and create a new one instead.', 'error');
      return;
    }
    
    if (plan.status === 'cancelled') {
      this.showToast('Cannot edit a cancelled plan', 'error');
      return;
    }
    
    if (window.PlanEditModal) {
      const editModal = new window.PlanEditModal({
        plan: plan,
        userId: this.userId,
        onPlanUpdated: () => {
          // Refresh plans after edit
          this.loadPlans().then(() => {
            this.render();
            this.attachEventListeners();
          });
        },
        onClose: () => {
          // Optional: re-open plan details
        }
      });
      editModal.open();
    } else {
      console.error('PlanEditModal not loaded');
      this.showToast('Plan editing is not available', 'error');
    }
  }
  
  /**
   * Render the reminder section for pending invitees
   * Requirements: 12.5 - Add "Send Reminders" button for pending invitees
   */
  renderReminderSection(plan, invitees) {
    // Only show for plans that are collecting availability
    if (plan.status !== 'collecting_availability' && plan.status !== 'draft') {
      return '';
    }
    
    const pendingInvitees = invitees.filter(inv => !inv.hasResponded);
    const pendingCount = pendingInvitees.length;
    
    if (pendingCount === 0) {
      return `
        <div class="reminder-section all-responded">
          <span class="material-icons">check_circle</span>
          <span>All invitees have responded!</span>
        </div>
      `;
    }
    
    return `
      <div class="reminder-section">
        <div class="reminder-info">
          <span class="material-icons">schedule_send</span>
          <span>${pendingCount} invitee${pendingCount !== 1 ? 's' : ''} haven't responded yet</span>
        </div>
        <button class="btn-secondary btn-sm send-reminders-btn" data-plan-id="${plan.id}">
          <span class="material-icons">notifications_active</span>
          Send Reminders (${pendingCount})
        </button>
      </div>
    `;
  }
  
  /**
   * Send reminders to pending invitees
   * Requirements: 12.5 - Initiator can send reminders to invitees who haven't responded
   */
  async sendReminders(planId) {
    const userId = this.userId || window.userId || localStorage.getItem('userId');
    
    try {
      const response = await fetch(`/api/scheduling/plans/${planId}/reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminders');
      }
      
      this.showToast(data.message || `Reminders sent to ${data.remindersSent} invitee${data.remindersSent !== 1 ? 's' : ''}`, 'success');
      
      // Refresh notification count
      await this.loadNotificationCount();
      this.updateSidebarNotificationBadge(this.unreadNotificationCount);
      
      // Refresh notification panel if it exists
      if (this.notificationPanel && typeof this.notificationPanel.refresh === 'function') {
        this.notificationPanel.refresh();
      }
      
      return data;
    } catch (error) {
      console.error('Failed to send reminders:', error);
      this.showToast(error.message || 'Failed to send reminders', 'error');
      throw error;
    }
  }
  
  /**
   * Show cancel plan confirmation dialog
   * Requirements: 12.2, 12.3, 12.4 - Initiator can cancel plan, invalidate links, notify participants
   */
  showCancelPlanConfirmation(planId, plan) {
    // Remove any existing confirmation dialog
    const existingDialog = document.querySelector('.cancel-plan-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    const invitees = plan.invitees || [];
    const respondedCount = invitees.filter(i => i.hasResponded).length;
    
    const dialog = document.createElement('div');
    dialog.className = 'modal cancel-plan-dialog';
    dialog.innerHTML = `
      <div class="modal-content cancel-plan-content">
        <div class="modal-header cancel-header">
          <span class="material-icons cancel-icon">warning</span>
          <h2>Cancel Plan?</h2>
        </div>
        <div class="modal-body">
          <p class="cancel-warning-text">
            Are you sure you want to cancel this <strong>${this.escapeHtml(plan.activityType || 'catchup')}</strong> plan?
          </p>
          
          <div class="cancel-consequences">
            <h4>This action will:</h4>
            <ul>
              <li>
                <span class="material-icons">link_off</span>
                Invalidate all invite links (${invitees.length} link${invitees.length !== 1 ? 's' : ''})
              </li>
              ${respondedCount > 0 ? `
                <li>
                  <span class="material-icons">notifications</span>
                  Notify ${respondedCount} participant${respondedCount !== 1 ? 's' : ''} who already responded
                </li>
              ` : ''}
              <li>
                <span class="material-icons">block</span>
                Permanently cancel this plan (cannot be undone)
              </li>
            </ul>
          </div>
          
          ${respondedCount > 0 ? `
            <div class="cancel-note">
              <span class="material-icons">info</span>
              <span>Consider reaching out to participants who already submitted their availability.</span>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer cancel-footer">
          <button class="btn-secondary" id="cancel-dialog-close">Keep Plan</button>
          <button class="btn-danger" id="confirm-cancel-plan">
            <span class="material-icons">cancel</span> Cancel Plan
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    document.body.style.overflow = 'hidden';
    
    const closeDialog = () => {
      dialog.remove();
      document.body.style.overflow = '';
    };
    
    // Close dialog handlers
    dialog.querySelector('#cancel-dialog-close').addEventListener('click', closeDialog);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog();
    });
    
    // Escape key to close
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Confirm cancel handler
    dialog.querySelector('#confirm-cancel-plan').addEventListener('click', async () => {
      const confirmBtn = dialog.querySelector('#confirm-cancel-plan');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="loading-spinner-sm"></span> Cancelling...';
      
      try {
        await this.cancelPlan(planId);
        closeDialog();
        this.closeDetailsModal();
        this.showToast('Plan cancelled successfully', 'success');
      } catch (error) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span class="material-icons">cancel</span> Cancel Plan';
        this.showToast(error.message || 'Failed to cancel plan', 'error');
      }
    });
  }
  
  /**
   * Cancel a plan via API
   * Requirements: 12.2, 12.3, 12.4 - Cancel plan, invalidate links, notify participants
   */
  async cancelPlan(planId) {
    const userId = this.userId || window.userId || localStorage.getItem('userId');
    
    const response = await fetch(`/api/scheduling/plans/${planId}?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to cancel plan';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Ignore JSON parse error
      }
      throw new Error(errorMessage);
    }
    
    // Refresh plans list
    await this.loadPlans();
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Open finalize plan modal with AvailabilityDashboard
   * Requirements: 6.1, 6.2, 6.7 - Show full dashboard view for slot selection
   */
  openFinalizePlanModal(planId) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      this.showToast('Plan not found', 'error');
      return;
    }
    
    // Check if AvailabilityDashboard is available
    if (window.AvailabilityDashboard) {
      this.showDashboardFinalizationModal(plan);
    } else {
      // Fallback to simple time selector if dashboard not available
      this.showSimpleTimeSelector(plan);
    }
  }
  
  /**
   * Show the full AvailabilityDashboard in a modal for finalization
   * Requirements: 6.1, 6.2, 6.7
   */
  showDashboardFinalizationModal(plan) {
    const existingModal = document.querySelector('.finalize-dashboard-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal finalize-dashboard-modal';
    modal.innerHTML = `
      <div class="modal-content modal-content-large">
        <div class="modal-header">
          <h2>Find Best Time for ${this.escapeHtml(plan.activityType || 'Catchup')}</h2>
          <button class="close-btn" id="close-finalize-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div id="finalize-availability-dashboard" class="availability-dashboard-container">
            <div class="loading-state">
              <span class="loading-spinner"></span>
              <p>Loading availability data...</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="use-simple-selector">Use Simple Selector</button>
          <button class="btn-secondary" id="cancel-finalize">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    
    modal.querySelector('#close-finalize-modal').addEventListener('click', closeModal);
    modal.querySelector('#cancel-finalize').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    // Fallback to simple selector button
    modal.querySelector('#use-simple-selector').addEventListener('click', () => {
      closeModal();
      this.showSimpleTimeSelector(plan);
    });
    
    // Initialize the AvailabilityDashboard
    const dashboard = new window.AvailabilityDashboard({
      containerId: 'finalize-availability-dashboard',
      planId: plan.id,
      userId: this.userId,
      onFinalize: () => {
        closeModal();
        this.loadPlans().then(() => {
          this.render();
          this.attachEventListeners();
        });
        this.showToast('Plan finalized successfully!', 'success');
      }
    });
    
    dashboard.init().catch(error => {
      console.error('Failed to initialize availability dashboard:', error);
      const container = modal.querySelector('#finalize-availability-dashboard');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <span class="material-icons">error_outline</span>
            <h3>Failed to load availability</h3>
            <p>Unable to load availability data. You can use the simple selector instead.</p>
          </div>
        `;
      }
    });
  }
  
  /**
   * Show simple time selector as fallback
   */
  showSimpleTimeSelector(plan) {
    const existingModal = document.querySelector('.time-selector-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal time-selector-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Select Meeting Time</h2>
          <button class="close-btn" id="close-time-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Select a date and time for your ${this.escapeHtml(plan.activityType || 'catchup')}:</p>
          <div class="form-group">
            <label for="meeting-datetime">Date & Time</label>
            <input type="datetime-local" id="meeting-datetime" 
                   min="${plan.dateRangeStart}T00:00" 
                   max="${plan.dateRangeEnd}T23:59">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancel-time-select">Cancel</button>
          <button class="btn-primary" id="confirm-time-select">Confirm Time</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    
    modal.querySelector('#close-time-modal').addEventListener('click', closeModal);
    modal.querySelector('#cancel-time-select').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    modal.querySelector('#confirm-time-select').addEventListener('click', async () => {
      const datetime = modal.querySelector('#meeting-datetime').value;
      if (!datetime) {
        this.showToast('Please select a date and time', 'error');
        return;
      }
      
      closeModal();
      await this.finalizePlan(plan.id, datetime);
    });
  }
  
  /**
   * Finalize a plan with selected time - Task 14.2 enhanced with loading states
   */
  async finalizePlan(planId, selectedTime) {
    // Show loading toast
    this.showToast('Finalizing plan...', 'info');
    
    try {
      const userId = this.userId || window.userId || localStorage.getItem('userId');
      const response = await this.fetchWithRetry(`/api/scheduling/plans/${planId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId,
          finalizedTime: selectedTime
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to finalize plan');
      }
      
      this.showToast('Plan finalized successfully! Participants will be notified.', 'success');
      
      // Refresh plans
      await this.loadPlans();
      this.render();
      this.attachEventListeners();
      
    } catch (error) {
      console.error('Failed to finalize plan:', error);
      this.showToastWithRetry(
        'Failed to finalize plan',
        this.getUserFriendlyError(error),
        () => this.finalizePlan(planId, selectedTime)
      );
    }
  }
  
  /**
   * Show toast with retry action - Task 14.2
   */
  showToastWithRetry(title, message, retryCallback) {
    // Create enhanced toast with retry button
    const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `
      <div class="toast-icon">
        <span class="material-icons">error</span>
      </div>
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(title)}</div>
        <p class="toast-message">${this.escapeHtml(message)}</p>
        <div class="toast-actions">
          <button class="btn-retry-inline toast-retry-btn">
            <span class="material-icons">refresh</span>
            Retry
          </button>
        </div>
      </div>
      <button class="toast-close">
        <span class="material-icons">close</span>
      </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Attach retry handler
    const retryBtn = toast.querySelector('.toast-retry-btn');
    if (retryBtn && retryCallback) {
      retryBtn.addEventListener('click', () => {
        toast.remove();
        retryCallback();
      });
    }
    
    // Attach close handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      });
    }
    
    // Auto-remove after 10 seconds (longer for error toasts with retry)
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 10000);
  }
  
  /**
   * Create toast container if it doesn't exist - Task 14.2
   */
  createToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }
  
  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Format plan status for display
   */
  formatStatus(status) {
    const statusMap = {
      'draft': 'Draft',
      'collecting_availability': 'Collecting',
      'scheduled': 'Scheduled',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }
  
  /**
   * Format date range for display
   */
  formatDateRange(start, end) {
    if (!start || !end) return 'No dates set';
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options = { month: 'short', day: 'numeric' };
    
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.getDate()}`;
    }
    
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  }
  
  /**
   * Format date and time for display
   */
  formatDateTime(dateTime) {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  
  /**
   * Format month and year for calendar header
   */
  formatMonthYear(month, year) {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  
  /**
   * Check if two dates are the same day
   */
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
  
  /**
   * Get initials from a name
   * @param {string} name - Full name
   * @returns {string} - Initials (up to 2 characters)
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  
  /**
   * Load overlap summary data for the plan details modal
   * Requirements: 6.9, 6.10 - Show availability summary and overlap statistics
   * @param {string} planId - Plan ID
   */
  async loadOverlapSummary(planId) {
    const summaryContainer = document.getElementById(`overlap-summary-${planId}`);
    if (!summaryContainer) return;
    
    try {
      const response = await fetch(`/api/scheduling/plans/${planId}/availability?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load availability data');
      }
      
      const data = await response.json();
      const availability = data.availability || [];
      const initiatorAvailability = data.initiatorAvailability || [];
      
      // If no availability data yet
      if (availability.length === 0 && initiatorAvailability.length === 0) {
        summaryContainer.innerHTML = `
          <div class="overlap-empty">
            <span class="material-icons">hourglass_empty</span>
            <span>Waiting for availability responses to calculate best times</span>
          </div>
        `;
        return;
      }
      
      // Calculate overlap statistics
      const overlapStats = this.calculateOverlapStatistics(availability, initiatorAvailability);
      
      summaryContainer.innerHTML = `
        <div class="overlap-stats">
          ${overlapStats.perfectOverlapCount > 0 ? `
            <div class="overlap-stat perfect">
              <span class="material-icons">check_circle</span>
              <div class="stat-content">
                <strong>${overlapStats.perfectOverlapCount} perfect time slot${overlapStats.perfectOverlapCount !== 1 ? 's' : ''}</strong>
                <span>Everyone can attend</span>
              </div>
            </div>
          ` : ''}
          ${overlapStats.nearOverlapCount > 0 ? `
            <div class="overlap-stat near">
              <span class="material-icons">schedule</span>
              <div class="stat-content">
                <strong>${overlapStats.nearOverlapCount} near-perfect slot${overlapStats.nearOverlapCount !== 1 ? 's' : ''}</strong>
                <span>Missing only 1 person</span>
              </div>
            </div>
          ` : ''}
          ${overlapStats.perfectOverlapCount === 0 && overlapStats.nearOverlapCount === 0 ? `
            <div class="overlap-stat warning">
              <span class="material-icons">warning</span>
              <div class="stat-content">
                <strong>No perfect overlap found</strong>
                <span>Consider using AI suggestions to find alternatives</span>
              </div>
            </div>
          ` : ''}
          ${overlapStats.bestSlots.length > 0 ? `
            <div class="best-times-preview">
              <strong>Best times:</strong>
              <div class="best-times-list">
                ${overlapStats.bestSlots.slice(0, 3).map(slot => `
                  <span class="best-time-chip">${this.formatSlotTime(slot.slot)} (${slot.count} available)</span>
                `).join('')}
                ${overlapStats.bestSlots.length > 3 ? `<span class="more-times">+${overlapStats.bestSlots.length - 3} more</span>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } catch (error) {
      console.error('Failed to load overlap summary:', error);
      summaryContainer.innerHTML = `
        <div class="overlap-error">
          <span class="material-icons">error_outline</span>
          <span>Unable to load overlap data</span>
        </div>
      `;
    }
  }
  
  /**
   * Calculate overlap statistics from availability data
   * Requirements: 6.9, 6.10
   * @param {Array} availability - Array of invitee availability
   * @param {Array} initiatorAvailability - Array of initiator's available slots
   * @returns {Object} - Overlap statistics
   */
  calculateOverlapStatistics(availability, initiatorAvailability) {
    // Collect all unique slots
    const slotCounts = new Map();
    const totalParticipants = availability.length + (initiatorAvailability.length > 0 ? 1 : 0);
    
    // Count initiator slots
    initiatorAvailability.forEach(slot => {
      slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
    });
    
    // Count invitee slots
    availability.forEach(inviteeData => {
      const slots = inviteeData.availableSlots || [];
      slots.forEach(slot => {
        slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
      });
    });
    
    // Calculate statistics
    let perfectOverlapCount = 0;
    let nearOverlapCount = 0;
    const bestSlots = [];
    
    slotCounts.forEach((count, slot) => {
      if (count === totalParticipants && totalParticipants > 0) {
        perfectOverlapCount++;
        bestSlots.push({ slot, count, isPerfect: true });
      } else if (count === totalParticipants - 1 && totalParticipants > 1) {
        nearOverlapCount++;
        bestSlots.push({ slot, count, isPerfect: false });
      } else if (count >= Math.ceil(totalParticipants / 2)) {
        bestSlots.push({ slot, count, isPerfect: false });
      }
    });
    
    // Sort best slots by count (descending)
    bestSlots.sort((a, b) => b.count - a.count);
    
    return {
      perfectOverlapCount,
      nearOverlapCount,
      totalSlots: slotCounts.size,
      totalParticipants,
      bestSlots
    };
  }
  
  /**
   * Format a slot time string for display
   * @param {string} slot - Slot in format "YYYY-MM-DD_HH:MM"
   * @returns {string} - Formatted time string
   */
  formatSlotTime(slot) {
    if (!slot) return '';
    const parts = slot.split('_');
    if (parts.length !== 2) return slot;
    
    const [dateStr, timeStr] = parts;
    try {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${dayName} ${monthDay} at ${timeStr}`;
    } catch (e) {
      return slot;
    }
  }
  
  /**
   * Load availability overlap data (for future use with dashboard integration)
   * @param {string} planId - Plan ID
   */
  async loadAvailabilityOverlapData(planId) {
    // This method can be extended to load more detailed overlap data
    // Currently the overlap summary handles the basic display
    // The AvailabilityDashboard component handles the detailed view
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Refresh the page data
   */
  async refresh() {
    await this.loadPlans();
    this.render();
    this.attachEventListeners();
  }
}

// Export for use in other modules
window.SchedulingPage = SchedulingPage;

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('scheduling-page');
  if (container && (window.userId || localStorage.getItem('userId'))) {
    window.schedulingPage = new SchedulingPage();
    // Don't auto-init - let the app router handle it
  }
});
