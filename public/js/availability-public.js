/**
 * Public Availability Page
 * 
 * Lightweight, standalone JavaScript for the public availability collection page.
 * No authentication required - uses invite token for access.
 * 
 * Requirements: 4.1-4.14
 */

class AvailabilityPublicPage {
  constructor() {
    this.token = this.getTokenFromUrl();
    this.planData = null;
    this.selectedSlots = new Set();
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.currentWeekStart = null;
    this.isSubmitting = false;
    this.hasExistingSubmission = false;
    
    // Loading and error states - Task 14.2
    this.isLoading = false;
    this.loadError = null;
    this.submitError = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Bind methods
    this.handleSlotClick = this.handleSlotClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handlePrevWeek = this.handlePrevWeek.bind(this);
    this.handleNextWeek = this.handleNextWeek.bind(this);
  }
  
  /**
   * Initialize the page with loading states - Task 14.2
   */
  async init() {
    if (!this.token) {
      this.showError('Invalid Link', 'This invite link appears to be invalid or incomplete.');
      return;
    }
    
    this.isLoading = true;
    this.loadError = null;
    
    try {
      await this.loadPlanData();
      
      if (this.planData) {
        this.isLoading = false;
        this.retryCount = 0; // Reset on success
        this.detectTimezone();
        this.renderMainContent();
        this.attachEventListeners();
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      this.isLoading = false;
      this.loadError = this.getUserFriendlyError(error);
      this.showError('Unable to Load', this.loadError, true);
    }
  }
  
  /**
   * Get user-friendly error message - Task 14.2
   */
  getUserFriendlyError(error) {
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    if (error.message?.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    if (error.status === 404) {
      return 'This invite link has expired or is invalid.';
    }
    if (error.status === 410) {
      return 'This plan has already been finalized.';
    }
    if (error.status >= 500) {
      return 'Our servers are having trouble. Please try again in a few moments.';
    }
    return error.message || 'Something went wrong. Please try again.';
  }
  
  /**
   * Fetch with retry logic - Task 14.2
   */
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        lastError = new Error(`Server error: ${response.status}`);
        lastError.status = response.status;
      } catch (error) {
        lastError = error;
      }
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }
    
    throw lastError;
  }
  
  /**
   * Get token from URL path
   */
  getTokenFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/availability\/([^\/]+)/);
    return match ? match[1] : null;
  }
  
  /**
   * Load plan data from API
   */
  async loadPlanData() {
    try {
      const response = await fetch(`/api/scheduling/availability/${this.token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          this.showError('Link Not Found', 'This invite link has expired or is invalid.');
        } else if (response.status === 410) {
          this.showError('Plan Finalized', 'This plan has already been finalized. No more availability submissions are needed.');
        } else {
          this.showError('Error', 'Failed to load plan details.');
        }
        return;
      }
      
      this.planData = await response.json();
      this.currentWeekStart = new Date(this.planData.dateRangeStart);
      
      // Check for existing submission
      if (this.planData.existingAvailability && this.planData.existingAvailability.length > 0) {
        this.hasExistingSubmission = true;
        this.selectedSlots = new Set(this.planData.existingAvailability);
      }
      
    } catch (error) {
      console.error('Failed to load plan data:', error);
      throw error;
    }
  }
  
  /**
   * Detect user's timezone
   */
  detectTimezone() {
    try {
      this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      this.timezone = 'UTC';
    }
  }
  
  /**
   * Render main content
   */
  renderMainContent() {
    // Hide loading state
    document.getElementById('loading-state').style.display = 'none';
    
    // Show main content
    document.getElementById('main-content').style.display = 'block';
    
    // Update plan info
    this.updatePlanInfo();
    
    // Update timezone display
    document.getElementById('detected-timezone').textContent = this.formatTimezone(this.timezone);
    
    // Pre-fill name if known
    if (this.planData.inviteeName) {
      document.getElementById('invitee-name').value = this.planData.inviteeName;
    }
    
    // Render calendar grid
    this.renderCalendarGrid();
    
    // Update selection count
    this.updateSelectionCount();
    
    // Update submit button state
    this.updateSubmitButton();
    
    // Show already submitted state if applicable
    if (this.hasExistingSubmission) {
      this.showAlreadySubmittedNotice();
    }
  }
  
  /**
   * Update plan info display
   */
  updatePlanInfo() {
    // Activity type
    const activityEl = document.getElementById('plan-activity');
    if (activityEl && this.planData.activityType) {
      activityEl.textContent = this.formatActivityType(this.planData.activityType);
    }
    
    // Duration
    const durationEl = document.getElementById('plan-duration');
    if (durationEl && this.planData.duration) {
      durationEl.textContent = this.formatDuration(this.planData.duration);
    }
    
    // Location
    if (this.planData.location) {
      const locationContainer = document.getElementById('plan-location-container');
      const locationEl = document.getElementById('plan-location');
      if (locationContainer && locationEl) {
        locationContainer.style.display = 'flex';
        locationEl.textContent = this.planData.location;
      }
    }
    
    // Plan description
    const descEl = document.getElementById('plan-description');
    if (descEl) {
      const organizer = this.planData.organizerName || 'Someone';
      descEl.textContent = `${organizer} wants to catch up with you!`;
    }
  }
  
  /**
   * Render calendar grid
   */
  renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    
    const days = this.getDaysInRange();
    const timeSlots = this.generateTimeSlots();
    
    // Calculate grid columns (time label + days)
    const numDays = Math.min(days.length, 7);
    grid.style.gridTemplateColumns = `60px repeat(${numDays}, 1fr)`;
    
    let html = '';
    
    // Header row with days
    html += '<div class="grid-header">';
    html += '<div class="time-label"></div>';
    days.slice(0, 7).forEach(day => {
      html += `
        <div class="day-header">
          <span class="day-name">${this.formatDayName(day)}</span>
          <span class="day-date">${day.getDate()}</span>
        </div>
      `;
    });
    html += '</div>';
    
    // Time slot rows
    timeSlots.forEach(time => {
      html += '<div class="grid-row">';
      html += `<div class="time-label">${time}</div>`;
      
      days.slice(0, 7).forEach(day => {
        const slotId = this.createSlotId(day, time);
        const isSelected = this.selectedSlots.has(slotId);
        const isPast = this.isSlotInPast(day, time);
        
        html += `
          <div class="time-slot ${isSelected ? 'selected' : ''} ${isPast ? 'disabled' : ''}" 
               data-slot-id="${slotId}" 
               role="gridcell"
               aria-selected="${isSelected}"
               ${isPast ? 'aria-disabled="true"' : ''}>
          </div>
        `;
      });
      
      html += '</div>';
    });
    
    grid.innerHTML = html;
    
    // Update date range label
    this.updateDateRangeLabel(days);
    
    // Update navigation buttons
    this.updateNavigationButtons();
  }
  
  /**
   * Get days in the current view range
   */
  getDaysInRange() {
    const days = [];
    const startDate = new Date(this.currentWeekStart);
    const endDate = new Date(this.planData.dateRangeEnd);
    
    // Show up to 7 days from current week start
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      
      // Don't go past the plan end date
      if (day <= endDate) {
        days.push(day);
      }
    }
    
    return days;
  }
  
  /**
   * Generate time slots (30-minute increments)
   */
  generateTimeSlots() {
    const slots = [];
    const startHour = 8;  // 8 AM
    const endHour = 21;   // 9 PM
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    
    return slots;
  }
  
  /**
   * Create slot ID from date and time
   */
  createSlotId(date, time) {
    const dateStr = date.toISOString().split('T')[0];
    return `${dateStr}_${time}`;
  }
  
  /**
   * Check if a slot is in the past
   */
  isSlotInPast(date, time) {
    const [hours, minutes] = time.split(':').map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(hours, minutes, 0, 0);
    
    return slotDate < new Date();
  }
  
  /**
   * Update date range label
   */
  updateDateRangeLabel(days) {
    const label = document.getElementById('date-range-label');
    if (!label || days.length === 0) return;
    
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    
    const options = { month: 'short', day: 'numeric' };
    const firstStr = firstDay.toLocaleDateString('en-US', options);
    const lastStr = lastDay.toLocaleDateString('en-US', options);
    
    label.textContent = `${firstStr} - ${lastStr}`;
  }
  
  /**
   * Update navigation buttons state
   */
  updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    
    const planStart = new Date(this.planData.dateRangeStart);
    const planEnd = new Date(this.planData.dateRangeEnd);
    
    // Disable prev if at plan start
    if (prevBtn) {
      prevBtn.disabled = this.currentWeekStart <= planStart;
    }
    
    // Disable next if showing last days
    if (nextBtn) {
      const nextWeekStart = new Date(this.currentWeekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      nextBtn.disabled = nextWeekStart > planEnd;
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Time slot clicks
    document.getElementById('calendar-grid').addEventListener('click', (e) => {
      const slot = e.target.closest('.time-slot');
      if (slot && !slot.classList.contains('disabled')) {
        this.handleSlotClick(slot.dataset.slotId);
      }
    });
    
    // Touch support for mobile
    document.getElementById('calendar-grid').addEventListener('touchend', (e) => {
      const slot = e.target.closest('.time-slot');
      if (slot && !slot.classList.contains('disabled')) {
        e.preventDefault();
        this.handleSlotClick(slot.dataset.slotId);
      }
    });
    
    // Scroll hint for calendar grid container (Requirement 15.6)
    const calendarContainer = document.querySelector('.calendar-grid-container');
    if (calendarContainer) {
      calendarContainer.addEventListener('scroll', () => {
        if (calendarContainer.scrollLeft > 20) {
          calendarContainer.classList.add('scrolled');
        } else {
          calendarContainer.classList.remove('scrolled');
        }
      });
    }
    
    // Submit button
    document.getElementById('submit-availability').addEventListener('click', this.handleSubmit);
    
    // Navigation buttons
    document.getElementById('prev-week').addEventListener('click', this.handlePrevWeek);
    document.getElementById('next-week').addEventListener('click', this.handleNextWeek);
    
    // Name input - update submit button state
    document.getElementById('invitee-name').addEventListener('input', () => {
      this.updateSubmitButton();
    });
    
    // Timezone change
    document.getElementById('change-timezone').addEventListener('click', () => {
      this.showTimezoneModal();
    });
    
    // Timezone modal
    document.getElementById('close-timezone-modal').addEventListener('click', () => {
      this.hideTimezoneModal();
    });
    document.getElementById('cancel-timezone').addEventListener('click', () => {
      this.hideTimezoneModal();
    });
    document.getElementById('confirm-timezone').addEventListener('click', () => {
      this.confirmTimezoneChange();
    });
    
    // Update availability button (for already submitted state)
    const updateBtn = document.getElementById('update-availability-btn');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        document.getElementById('already-submitted-state').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
      });
    }
    
    // Retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }
  
  /**
   * Handle time slot click
   */
  handleSlotClick(slotId) {
    if (this.selectedSlots.has(slotId)) {
      this.selectedSlots.delete(slotId);
    } else {
      this.selectedSlots.add(slotId);
    }
    
    this.updateSlotVisual(slotId);
    this.updateSelectionCount();
    this.updateSubmitButton();
  }
  
  /**
   * Update slot visual state
   */
  updateSlotVisual(slotId) {
    const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (slot) {
      const isSelected = this.selectedSlots.has(slotId);
      slot.classList.toggle('selected', isSelected);
      slot.setAttribute('aria-selected', isSelected.toString());
    }
  }
  
  /**
   * Update selection count display
   */
  updateSelectionCount() {
    const countEl = document.getElementById('slots-selected');
    if (countEl) {
      const count = this.selectedSlots.size;
      countEl.textContent = `${count} time slot${count !== 1 ? 's' : ''} selected`;
    }
  }
  
  /**
   * Update submit button state
   */
  updateSubmitButton() {
    const submitBtn = document.getElementById('submit-availability');
    const nameInput = document.getElementById('invitee-name');
    const helpText = document.getElementById('submit-help');
    
    if (!submitBtn || !nameInput) return;
    
    const hasName = nameInput.value.trim().length > 0;
    const hasSlots = this.selectedSlots.size > 0;
    const canSubmit = hasName && hasSlots && !this.isSubmitting;
    
    submitBtn.disabled = !canSubmit;
    
    if (helpText) {
      helpText.style.display = canSubmit ? 'none' : 'block';
    }
  }
  
  /**
   * Handle previous week navigation
   */
  handlePrevWeek() {
    const newStart = new Date(this.currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    
    const planStart = new Date(this.planData.dateRangeStart);
    if (newStart >= planStart) {
      this.currentWeekStart = newStart;
      this.renderCalendarGrid();
      this.attachSlotListeners();
    }
  }
  
  /**
   * Handle next week navigation
   */
  handleNextWeek() {
    const newStart = new Date(this.currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    
    const planEnd = new Date(this.planData.dateRangeEnd);
    if (newStart <= planEnd) {
      this.currentWeekStart = newStart;
      this.renderCalendarGrid();
      this.attachSlotListeners();
    }
  }
  
  /**
   * Re-attach slot listeners after re-render
   */
  attachSlotListeners() {
    // Listeners are attached via event delegation on the grid container
    // No need to re-attach individual slot listeners
  }
  
  /**
   * Handle form submission with loading states and retry - Task 14.2
   */
  async handleSubmit() {
    if (this.isSubmitting) return;
    
    const nameInput = document.getElementById('invitee-name');
    const name = nameInput.value.trim();
    
    if (!name) {
      this.showToast('Please enter your name', 'error');
      nameInput.focus();
      return;
    }
    
    if (this.selectedSlots.size === 0) {
      this.showToast('Please select at least one time slot', 'error');
      return;
    }
    
    this.isSubmitting = true;
    this.submitError = null;
    
    const submitBtn = document.getElementById('submit-availability');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner-inline"></span> Submitting...';
    
    // Hide any existing error
    this.hideSubmitError();
    
    try {
      const response = await this.fetchWithRetry(`/api/scheduling/availability/${this.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          timezone: this.timezone,
          availableSlots: Array.from(this.selectedSlots)
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        const err = new Error(error.message || 'Failed to submit availability');
        err.status = response.status;
        throw err;
      }
      
      this.isSubmitting = false;
      this.retryCount = 0;
      this.showSuccess();
      
    } catch (error) {
      console.error('Failed to submit:', error);
      this.isSubmitting = false;
      this.submitError = this.getUserFriendlyError(error);
      
      // Reset button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Availability';
      
      // Show error with retry option
      this.showSubmitError();
    }
  }
  
  /**
   * Show submit error with retry button - Task 14.2
   */
  showSubmitError() {
    // Remove existing error
    this.hideSubmitError();
    
    const canRetry = this.retryCount < this.maxRetries;
    
    const errorContainer = document.createElement('div');
    errorContainer.id = 'submit-error-container';
    errorContainer.className = 'submit-error-container';
    errorContainer.innerHTML = `
      <div class="error-banner">
        <div class="error-icon">
          <span class="material-icons">error</span>
        </div>
        <div class="error-content">
          <p class="error-title">Failed to Submit</p>
          <p class="error-message">${this.escapeHtml(this.submitError)}</p>
          <div class="error-actions">
            ${canRetry ? `
              <button class="btn-retry" id="retry-submit-btn">
                <span class="material-icons">refresh</span>
                Try Again
              </button>
            ` : ''}
            <button class="btn-dismiss" id="dismiss-submit-error">Dismiss</button>
          </div>
        </div>
      </div>
    `;
    
    const submitBtn = document.getElementById('submit-availability');
    if (submitBtn && submitBtn.parentNode) {
      submitBtn.parentNode.insertBefore(errorContainer, submitBtn);
    }
    
    // Attach handlers
    const retryBtn = errorContainer.querySelector('#retry-submit-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.retryCount++;
        this.hideSubmitError();
        this.handleSubmit();
      });
    }
    
    const dismissBtn = errorContainer.querySelector('#dismiss-submit-error');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.hideSubmitError());
    }
  }
  
  /**
   * Hide submit error - Task 14.2
   */
  hideSubmitError() {
    const errorContainer = document.getElementById('submit-error-container');
    if (errorContainer) {
      errorContainer.remove();
    }
  }
  
  /**
   * Escape HTML helper - Task 14.2
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Show success state
   */
  showSuccess() {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('success-state').style.display = 'flex';
  }
  
  /**
   * Show error state
   */
  showError(title, message, showRetry = false) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
    
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    document.getElementById('retry-btn').style.display = showRetry ? 'block' : 'none';
    document.getElementById('error-state').style.display = 'flex';
  }
  
  /**
   * Show already submitted notice
   */
  showAlreadySubmittedNotice() {
    this.showToast('You\'ve already submitted availability. You can update it below.', 'info');
  }
  
  /**
   * Show timezone modal
   */
  showTimezoneModal() {
    const modal = document.getElementById('timezone-modal');
    const select = document.getElementById('timezone-select');
    
    // Populate timezone options
    const timezones = this.getCommonTimezones();
    select.innerHTML = timezones.map(tz => `
      <option value="${tz}" ${tz === this.timezone ? 'selected' : ''}>${tz}</option>
    `).join('');
    
    modal.style.display = 'flex';
  }
  
  /**
   * Hide timezone modal
   */
  hideTimezoneModal() {
    document.getElementById('timezone-modal').style.display = 'none';
  }
  
  /**
   * Confirm timezone change
   */
  confirmTimezoneChange() {
    const select = document.getElementById('timezone-select');
    this.timezone = select.value;
    document.getElementById('detected-timezone').textContent = this.formatTimezone(this.timezone);
    this.hideTimezoneModal();
    this.showToast('Timezone updated', 'success');
  }
  
  /**
   * Get common timezones
   */
  getCommonTimezones() {
    return [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland',
      'UTC'
    ];
  }
  
  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Format activity type for display
   */
  formatActivityType(type) {
    const types = {
      'coffee': '☕ Coffee',
      'dinner': '🍽️ Dinner',
      'video_call': '📹 Video Call',
      'activity': '🎯 Activity',
      'other': '📝 Other'
    };
    return types[type] || type || 'Catchup';
  }
  
  /**
   * Format duration for display
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes === 60) {
      return '1 hour';
    } else if (minutes < 240) {
      const hours = minutes / 60;
      return `${hours} hours`;
    } else {
      return 'Half day';
    }
  }
  
  /**
   * Format day name
   */
  formatDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  
  /**
   * Format timezone for display
   */
  formatTimezone(tz) {
    // Convert IANA timezone to readable format
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(new Date());
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart ? `${tz} (${tzPart.value})` : tz;
    } catch {
      return tz;
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const page = new AvailabilityPublicPage();
  page.init();
});
