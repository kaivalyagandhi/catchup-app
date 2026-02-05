/**
 * Initiator Availability Modal Component
 * 
 * Modal for plan initiators to mark their availability.
 * Supports Google Calendar integration for auto-populating free slots.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

class InitiatorAvailabilityModal {
  constructor(options = {}) {
    this.planId = options.planId;
    this.plan = options.plan || null;
    this.userId = options.userId || window.userId || localStorage.getItem('userId');
    this.onSave = options.onSave || (() => {});
    this.onSkip = options.onSkip || (() => {});
    
    // State
    this.selectedSlots = new Set();
    this.calendarSlots = new Set(); // Slots from Google Calendar
    this.manualSlots = new Set();   // Manually selected slots
    this.currentWeekStart = null;
    this.hasCalendarConnected = false;
    this.isLoadingCalendar = false;
    this.isSaving = false;
    this.existingAvailability = [];
    
    // Bind methods
    this.handleSlotClick = this.handleSlotClick.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleSkip = this.handleSkip.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handlePrevWeek = this.handlePrevWeek.bind(this);
    this.handleNextWeek = this.handleNextWeek.bind(this);
  }
  
  /**
   * Open the modal
   */
  async open() {
    try {
      // Load plan data if not provided
      if (!this.plan) {
        await this.loadPlanData();
      }
      
      // Set initial week start
      this.currentWeekStart = new Date(this.plan.dateRangeStart);
      
      // Load existing availability
      await this.loadExistingAvailability();
      
      // Check if Google Calendar is connected
      await this.checkCalendarConnection();
      
      // Render the modal
      this.render();
      this.attachEventListeners();
      
      // Auto-load calendar data if connected
      if (this.hasCalendarConnected) {
        this.loadCalendarAvailability();
      }
    } catch (error) {
      console.error('Failed to open initiator availability modal:', error);
      this.showToast('Failed to load availability data', 'error');
    }
  }
  
  /**
   * Load plan data from API
   */
  async loadPlanData() {
    const response = await fetch(`/api/scheduling/plans/${this.planId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load plan');
    }
    
    this.plan = await response.json();
  }
  
  /**
   * Load existing initiator availability
   */
  async loadExistingAvailability() {
    try {
      const response = await fetch(`/api/scheduling/plans/${this.planId}/availability?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.existingAvailability = data.initiatorAvailability || [];
        
        // Pre-select existing slots
        this.existingAvailability.forEach(slot => {
          this.selectedSlots.add(slot);
          this.manualSlots.add(slot); // Treat existing as manual
        });
      }
    } catch (error) {
      console.error('Failed to load existing availability:', error);
    }
  }
  
  /**
   * Check if Google Calendar is connected
   */
  async checkCalendarConnection() {
    try {
      const response = await fetch('/api/calendar/google/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.hasCalendarConnected = data.connected === true;
      }
    } catch (error) {
      console.error('Failed to check calendar connection:', error);
      this.hasCalendarConnected = false;
    }
  }
  
  /**
   * Load availability from Google Calendar
   * Requirements: 5.2, 5.3
   */
  async loadCalendarAvailability() {
    if (!this.hasCalendarConnected || this.isLoadingCalendar) return;
    
    this.isLoadingCalendar = true;
    this.updateCalendarLoadingState(true);
    
    try {
      const startDate = this.plan.dateRangeStart;
      const endDate = this.plan.dateRangeEnd;
      
      const response = await fetch(
        `/api/calendar/free-slots?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const freeSlots = data.slots || [];
        
        // Convert free slots to our slot ID format
        this.calendarSlots.clear();
        freeSlots.forEach(slot => {
          const slotIds = this.convertTimeRangeToSlotIds(slot.start, slot.end);
          slotIds.forEach(id => {
            this.calendarSlots.add(id);
            // Auto-select calendar slots (Requirement 5.3)
            this.selectedSlots.add(id);
          });
        });
        
        // Re-render the grid to show calendar slots
        this.renderCalendarGrid();
        this.updateSelectionCount();
        this.showToast('Calendar availability loaded', 'success');
      }
    } catch (error) {
      console.error('Failed to load calendar availability:', error);
      this.showToast('Failed to load calendar data', 'error');
    } finally {
      this.isLoadingCalendar = false;
      this.updateCalendarLoadingState(false);
    }
  }
  
  /**
   * Convert a time range to slot IDs
   */
  convertTimeRangeToSlotIds(startTime, endTime) {
    const slotIds = [];
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Generate 30-minute slot IDs within the range
    let current = new Date(start);
    while (current < end) {
      const dateStr = current.toISOString().split('T')[0];
      const hours = current.getHours().toString().padStart(2, '0');
      const minutes = current.getMinutes().toString().padStart(2, '0');
      const slotId = `${dateStr}_${hours}:${minutes}`;
      
      // Only include slots within working hours (8 AM - 9 PM)
      if (current.getHours() >= 8 && current.getHours() < 21) {
        slotIds.push(slotId);
      }
      
      // Move to next 30-minute slot
      current.setMinutes(current.getMinutes() + 30);
    }
    
    return slotIds;
  }
  
  /**
   * Render the modal
   */
  render() {
    // Remove existing overlay if any
    const existingOverlay = document.querySelector('.modal-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create overlay wrapper
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    
    const modal = document.createElement('div');
    modal.className = 'modal modal-lg initiator-availability-modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">Mark Your Availability</h2>
        <button class="modal-close" id="close-initiator-modal" aria-label="Close">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="initiator-availability-intro">
          <p>Select the times when you're available for this ${this.escapeHtml(this.plan.activityType || 'catchup')}.</p>
          ${this.hasCalendarConnected ? `
            <div class="calendar-integration-banner">
              <span class="material-icons">event_available</span>
              <span>Your Google Calendar is connected. Free times are pre-selected.</span>
              <button class="btn-secondary btn-sm" id="refresh-calendar">
                <span class="material-icons">refresh</span> Refresh
              </button>
            </div>
          ` : `
            <div class="calendar-integration-banner calendar-not-connected">
              <span class="material-icons">event_busy</span>
              <span>Connect Google Calendar to auto-populate your free times.</span>
              <button class="btn-secondary btn-sm" id="connect-calendar">
                <span class="material-icons">link</span> Connect
              </button>
            </div>
          `}
        </div>
        
        <div class="availability-legend">
          <div class="legend-item">
            <span class="legend-color calendar-slot"></span>
            <span>From Calendar (free)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color manual-slot"></span>
            <span>Manually Selected</span>
          </div>
          <div class="legend-item">
            <span class="legend-color both-slot"></span>
            <span>Calendar + Manual</span>
          </div>
        </div>
        
        <div class="calendar-navigation">
          <button class="nav-btn" id="prev-week-initiator">
            <span class="material-icons">chevron_left</span>
          </button>
          <span id="date-range-label-initiator">Loading...</span>
          <button class="nav-btn" id="next-week-initiator">
            <span class="material-icons">chevron_right</span>
          </button>
        </div>
        
        <div class="initiator-calendar-grid-container">
          <div id="initiator-calendar-grid" class="initiator-calendar-grid">
            <!-- Grid will be rendered here -->
          </div>
        </div>
        
        <div class="selection-summary">
          <span id="initiator-slots-selected">0 time slots selected</span>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" id="skip-availability">
          Skip for now
        </button>
        <button class="btn-primary" id="save-initiator-availability">
          <span class="material-icons">check</span>
          Save Availability
        </button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Render the calendar grid
    this.renderCalendarGrid();
    this.updateSelectionCount();
  }
  
  /**
   * Render the calendar grid
   */
  renderCalendarGrid() {
    const grid = document.getElementById('initiator-calendar-grid');
    if (!grid) return;
    
    const days = this.getDaysInRange();
    const timeSlots = this.generateTimeSlots();
    
    // Calculate grid columns
    const numDays = Math.min(days.length, 7);
    grid.style.gridTemplateColumns = `60px repeat(${numDays}, 1fr)`;
    
    let html = '';
    
    // Header row with days
    html += '<div class="grid-header">';
    html += '<div class="time-label"></div>';
    days.slice(0, 7).forEach(day => {
      const isToday = this.isToday(day);
      html += `
        <div class="day-header ${isToday ? 'today' : ''}">
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
        const isFromCalendar = this.calendarSlots.has(slotId);
        const isManual = this.manualSlots.has(slotId);
        const isPast = this.isSlotInPast(day, time);
        
        // Determine slot class based on source
        // Requirement 5.7: Distinguish between calendar-derived and manually-marked
        let sourceClass = '';
        if (isSelected) {
          if (isFromCalendar && isManual) {
            sourceClass = 'both-source';
          } else if (isFromCalendar) {
            sourceClass = 'calendar-source';
          } else {
            sourceClass = 'manual-source';
          }
        }
        
        html += `
          <div class="time-slot ${isSelected ? 'selected' : ''} ${sourceClass} ${isPast ? 'disabled' : ''}" 
               data-slot-id="${slotId}"
               data-from-calendar="${isFromCalendar}"
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
    const endDate = new Date(this.plan.dateRangeEnd);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      
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
    for (let hour = 8; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 21) {
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
   * Check if date is today
   */
  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }
  
  /**
   * Update date range label
   */
  updateDateRangeLabel(days) {
    const label = document.getElementById('date-range-label-initiator');
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
    const prevBtn = document.getElementById('prev-week-initiator');
    const nextBtn = document.getElementById('next-week-initiator');
    
    const planStart = new Date(this.plan.dateRangeStart);
    const planEnd = new Date(this.plan.dateRangeEnd);
    
    if (prevBtn) {
      prevBtn.disabled = this.currentWeekStart <= planStart;
    }
    
    if (nextBtn) {
      const nextWeekStart = new Date(this.currentWeekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      nextBtn.disabled = nextWeekStart > planEnd;
    }
  }
  
  /**
   * Update calendar loading state
   */
  updateCalendarLoadingState(isLoading) {
    const refreshBtn = document.getElementById('refresh-calendar');
    if (refreshBtn) {
      refreshBtn.disabled = isLoading;
      refreshBtn.innerHTML = isLoading 
        ? '<span class="loading-spinner-sm"></span> Loading...'
        : '<span class="material-icons">refresh</span> Refresh';
    }
  }
  
  /**
   * Update selection count display
   */
  updateSelectionCount() {
    const countEl = document.getElementById('initiator-slots-selected');
    if (countEl) {
      const count = this.selectedSlots.size;
      countEl.textContent = `${count} time slot${count !== 1 ? 's' : ''} selected`;
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const modal = document.querySelector('.initiator-availability-modal');
    if (!modal) return;
    
    // Initialize mobile scroll handling (Requirement 15.6)
    this.initializeMobileScrollHandling(modal);
    
    // Close button
    modal.querySelector('#close-initiator-modal').addEventListener('click', this.handleClose);
    
    // Click outside to close (listen on overlay)
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.handleClose();
      });
    }
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.handleClose();
    });
    
    // Time slot clicks
    const grid = document.getElementById('initiator-calendar-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const slot = e.target.closest('.time-slot');
        if (slot && !slot.classList.contains('disabled')) {
          this.handleSlotClick(slot.dataset.slotId);
        }
      });
    }
    
    // Navigation buttons
    const prevBtn = document.getElementById('prev-week-initiator');
    const nextBtn = document.getElementById('next-week-initiator');
    if (prevBtn) prevBtn.addEventListener('click', this.handlePrevWeek);
    if (nextBtn) nextBtn.addEventListener('click', this.handleNextWeek);
    
    // Calendar integration buttons
    const refreshBtn = document.getElementById('refresh-calendar');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadCalendarAvailability());
    }
    
    const connectBtn = document.getElementById('connect-calendar');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connectGoogleCalendar());
    }
    
    // Save and skip buttons
    modal.querySelector('#save-initiator-availability').addEventListener('click', this.handleSave);
    modal.querySelector('#skip-availability').addEventListener('click', this.handleSkip);
  }
  
  /**
   * Initialize mobile scroll handling for calendar grid
   * Requirement 15.6 - Horizontal scrolling for calendar grids
   */
  initializeMobileScrollHandling(modal) {
    const scrollContainer = modal.querySelector('.initiator-calendar-grid-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', () => {
        if (scrollContainer.scrollLeft > 20) {
          scrollContainer.classList.add('scrolled');
        } else {
          scrollContainer.classList.remove('scrolled');
        }
      });
    }
  }
  
  /**
   * Handle time slot click
   * Requirement 5.4: Allow manual adjustment
   */
  handleSlotClick(slotId) {
    if (this.selectedSlots.has(slotId)) {
      this.selectedSlots.delete(slotId);
      this.manualSlots.delete(slotId);
    } else {
      this.selectedSlots.add(slotId);
      this.manualSlots.add(slotId);
    }
    
    this.updateSlotVisual(slotId);
    this.updateSelectionCount();
    
    // Requirement 5.6: Real-time updates (visual feedback)
    this.debounceAutoSave();
  }
  
  /**
   * Update slot visual state
   */
  updateSlotVisual(slotId) {
    const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (slot) {
      const isSelected = this.selectedSlots.has(slotId);
      const isFromCalendar = this.calendarSlots.has(slotId);
      const isManual = this.manualSlots.has(slotId);
      
      slot.classList.toggle('selected', isSelected);
      slot.classList.remove('calendar-source', 'manual-source', 'both-source');
      
      if (isSelected) {
        if (isFromCalendar && isManual) {
          slot.classList.add('both-source');
        } else if (isFromCalendar) {
          slot.classList.add('calendar-source');
        } else {
          slot.classList.add('manual-source');
        }
      }
    }
  }
  
  /**
   * Debounced auto-save for real-time updates
   * Requirement 5.6
   */
  debounceAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      // Could implement auto-save here if desired
      // For now, we just update the UI in real-time
    }, 1000);
  }
  
  /**
   * Handle previous week navigation
   */
  handlePrevWeek() {
    const newStart = new Date(this.currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    
    const planStart = new Date(this.plan.dateRangeStart);
    if (newStart >= planStart) {
      this.currentWeekStart = newStart;
      this.renderCalendarGrid();
    }
  }
  
  /**
   * Handle next week navigation
   */
  handleNextWeek() {
    const newStart = new Date(this.currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    
    const planEnd = new Date(this.plan.dateRangeEnd);
    if (newStart <= planEnd) {
      this.currentWeekStart = newStart;
      this.renderCalendarGrid();
    }
  }
  
  /**
   * Handle save availability
   */
  async handleSave() {
    if (this.isSaving) return;
    
    this.isSaving = true;
    const saveBtn = document.getElementById('save-initiator-availability');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner-sm"></span> Saving...';
    
    try {
      // Determine source based on what slots are selected
      const hasCalendarSlots = Array.from(this.selectedSlots).some(s => this.calendarSlots.has(s));
      const hasManualSlots = Array.from(this.selectedSlots).some(s => this.manualSlots.has(s) && !this.calendarSlots.has(s));
      
      let source = 'manual';
      if (hasCalendarSlots && hasManualSlots) {
        source = 'mixed';
      } else if (hasCalendarSlots) {
        source = 'calendar';
      }
      
      const response = await fetch(`/api/scheduling/plans/${this.planId}/initiator-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: this.userId,
          availableSlots: Array.from(this.selectedSlots),
          source
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save availability');
      }
      
      this.showToast('Availability saved!', 'success');
      this.close();
      this.onSave(Array.from(this.selectedSlots));
      
    } catch (error) {
      console.error('Failed to save availability:', error);
      this.showToast('Failed to save availability', 'error');
      
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-icons">check</span> Save Availability';
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * Handle skip availability
   * Requirement 5.5: Allow skipping
   */
  handleSkip() {
    this.close();
    this.onSkip();
  }
  
  /**
   * Handle close modal
   */
  handleClose() {
    this.close();
  }
  
  /**
   * Close the modal
   */
  close() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.remove();
    }
    document.body.style.overflow = '';
  }
  
  /**
   * Connect Google Calendar
   */
  connectGoogleCalendar() {
    // Redirect to Google Calendar OAuth flow
    window.location.href = '/api/calendar/google/authorize';
  }
  
  /**
   * Format day name
   */
  formatDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
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
  
  /**
   * Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
window.InitiatorAvailabilityModal = InitiatorAvailabilityModal;
