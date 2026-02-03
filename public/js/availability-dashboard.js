/**
 * Availability Dashboard Component
 * 
 * Displays collected availability from all participants with overlap visualization.
 * Shows AI suggestions for optimal meeting times.
 * 
 * Requirements: 6.1-6.10, 7.10, 7.11
 */

class AvailabilityDashboard {
  constructor(options = {}) {
    this.containerId = options.containerId;
    this.planId = options.planId;
    this.userId = options.userId || window.userId || localStorage.getItem('userId');
    this.onFinalize = options.onFinalize || (() => {});
    
    // State
    this.plan = null;
    this.availability = [];
    this.initiatorAvailability = [];
    this.aiSuggestions = null;
    this.selectedSlot = null;
    this.participantColors = new Map();
    
    // Loading and error states - Task 14.2
    this.isLoading = false;
    this.loadError = null;
    this.isLoadingAI = false;
    this.aiError = null;
    this.isFinalizing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Color palette for participants
    this.colorPalette = [
      '#8b5cf6', // purple
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    
    // Bind methods
    this.handleSlotClick = this.handleSlotClick.bind(this);
    this.handleFinalize = this.handleFinalize.bind(this);
    this.handleApplySuggestion = this.handleApplySuggestion.bind(this);
  }
  
  /**
   * Check if this is an individual plan (single invitee)
   * Requirements: 11.4 - Simplified dashboard for individual plans
   */
  isIndividualPlan() {
    return (this.plan?.invitees?.length || 0) === 1;
  }
  
  /**
   * Initialize the dashboard with loading states - Task 14.2
   */
  async init() {
    this.isLoading = true;
    this.loadError = null;
    this.renderLoadingState();
    
    try {
      await this.loadPlanData();
      await this.loadAvailability();
      this.assignParticipantColors();
      this.isLoading = false;
      this.retryCount = 0; // Reset on success
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to initialize availability dashboard:', error);
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
      <div class="availability-dashboard">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading availability data...</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Render error state with retry - Task 14.2
   */
  renderErrorState() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const canRetry = this.retryCount < this.maxRetries;
    
    container.innerHTML = `
      <div class="availability-dashboard">
        <div class="error-state">
          <span class="material-icons error-icon">cloud_off</span>
          <h3>Unable to Load Availability</h3>
          <p>${this.escapeHtml(this.loadError || 'Something went wrong while loading availability data.')}</p>
          <div class="error-actions">
            ${canRetry ? `
              <button class="btn-primary" id="retry-dashboard-btn">
                <span class="material-icons">refresh</span>
                Try Again
              </button>
            ` : `
              <button class="btn-secondary" id="close-dashboard-btn">
                Close
              </button>
            `}
          </div>
        </div>
      </div>
    `;
    
    // Attach retry handler
    const retryBtn = container.querySelector('#retry-dashboard-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retryInit());
    }
  }
  
  /**
   * Retry initialization - Task 14.2
   */
  async retryInit() {
    this.retryCount++;
    await this.init();
  }
  
  /**
   * Get user-friendly error message - Task 14.2
   */
  getUserFriendlyError(error) {
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message?.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    if (error.status === 404) {
      return 'Plan not found. It may have been deleted.';
    }
    if (error.status >= 500) {
      return 'Our servers are having trouble. Please try again in a few moments.';
    }
    return 'Something went wrong. Please try again.';
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
   * Load plan data
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
   * Load availability data
   */
  async loadAvailability() {
    const response = await fetch(`/api/scheduling/plans/${this.planId}/availability`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load availability');
    }
    
    const data = await response.json();
    this.availability = data.inviteeAvailability || [];
    this.initiatorAvailability = data.initiatorAvailability || [];
  }
  
  /**
   * Assign colors to participants
   */
  assignParticipantColors() {
    let colorIndex = 0;
    
    // Assign color to initiator (you)
    this.participantColors.set('initiator', this.colorPalette[colorIndex++]);
    
    // Assign colors to invitees
    this.plan.invitees?.forEach(invitee => {
      this.participantColors.set(invitee.contactId, this.colorPalette[colorIndex % this.colorPalette.length]);
      colorIndex++;
    });
  }
  
  /**
   * Render the dashboard
   * Requirements: 11.4 - Simplified dashboard for individual plans
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const isIndividual = this.isIndividualPlan();
    const contactName = isIndividual ? this.escapeHtml(this.plan.invitees[0]?.contactName || 'Contact') : '';
    
    container.innerHTML = `
      <div class="availability-dashboard ${isIndividual ? 'individual-dashboard' : ''}">
        <div class="dashboard-header">
          <h3>${isIndividual ? `Availability with ${contactName}` : 'Availability Overview'}</h3>
          <div class="response-status">
            ${this.renderResponseStatus()}
          </div>
        </div>
        
        ${isIndividual ? `
          <div class="individual-plan-info">
            <span class="material-icons">person</span>
            <span>One-on-one catchup - find a time that works for both of you</span>
          </div>
        ` : ''}
        
        <div class="participant-legend ${isIndividual ? 'individual-legend' : ''}">
          ${this.renderParticipantLegend()}
        </div>
        
        <div class="availability-grid-container">
          ${this.renderAvailabilityGrid()}
        </div>
        
        ${!isIndividual ? `
          <div class="ai-suggestions-section" id="ai-suggestions-section">
            ${this.aiSuggestions ? this.renderAISuggestions() : this.renderLoadSuggestionsButton()}
          </div>
        ` : `
          <div class="individual-quick-pick" id="individual-quick-pick">
            ${this.renderIndividualQuickPick()}
          </div>
        `}
        
        <div class="dashboard-actions">
          ${this.canFinalize() ? `
            <button class="btn-primary" id="finalize-plan" ${!this.selectedSlot ? 'disabled' : ''}>
              <span class="material-icons">check</span>
              ${this.selectedSlot 
                ? (isIndividual ? 'Confirm This Time' : 'Finalize Selected Time')
                : (isIndividual ? 'Select a Time' : 'Select a Time to Finalize')
              }
            </button>
          ` : `
            <button class="btn-secondary" id="send-reminders">
              <span class="material-icons">notifications</span>
              ${isIndividual ? `Remind ${contactName}` : 'Send Reminders'}
            </button>
          `}
        </div>
      </div>
    `;
  }
  
  /**
   * Render quick pick section for individual plans
   * Requirements: 11.5 - Quick finalization for individual plans
   */
  renderIndividualQuickPick() {
    // Find perfect overlap slots (both available)
    const perfectSlots = this.findPerfectOverlapSlots();
    
    if (perfectSlots.length === 0) {
      return `
        <div class="no-overlap-message">
          <span class="material-icons">schedule</span>
          <p>No overlapping availability yet. Wait for your contact to mark their times, or select a time that works for you.</p>
        </div>
      `;
    }
    
    // Show top 3 perfect overlap times
    const topSlots = perfectSlots.slice(0, 3);
    
    return `
      <div class="quick-pick-section">
        <h4><span class="material-icons">thumb_up</span> Times That Work for Both</h4>
        <div class="quick-pick-slots">
          ${topSlots.map(slot => `
            <button class="quick-pick-slot ${this.selectedSlot === slot.id ? 'selected' : ''}" 
                    data-slot-id="${slot.id}">
              <span class="slot-date">${this.formatSlotDate(slot.id)}</span>
              <span class="slot-time">${this.formatSlotTime(slot.id)}</span>
            </button>
          `).join('')}
        </div>
        ${perfectSlots.length > 3 ? `
          <p class="more-slots-hint">+ ${perfectSlots.length - 3} more times available</p>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Find slots where both participants are available
   * Requirements: 11.4, 11.5 - Simplified overlap for individual plans
   */
  findPerfectOverlapSlots() {
    const perfectSlots = [];
    const days = this.getDaysInRange();
    const timeSlots = this.generateTimeSlots();
    
    days.forEach(day => {
      timeSlots.forEach(time => {
        const slotId = this.createSlotId(day, time);
        const overlap = this.calculateSlotOverlap(slotId);
        
        if (overlap.isPerfectOverlap) {
          perfectSlots.push({
            id: slotId,
            date: day,
            time: time
          });
        }
      });
    });
    
    return perfectSlots;
  }
  
  /**
   * Format slot date for display
   */
  formatSlotDate(slotId) {
    const [dateStr] = slotId.split('_');
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  /**
   * Format slot time for display
   */
  formatSlotTime(slotId) {
    const [, time] = slotId.split('_');
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  
  /**
   * Render response status
   */
  renderResponseStatus() {
    const invitees = this.plan.invitees || [];
    const responded = this.availability.length;
    const total = invitees.length;
    
    return `
      <span class="responded">${responded}</span> / ${total} responded
    `;
  }
  
  /**
   * Render participant legend
   */
  renderParticipantLegend() {
    const items = [];
    
    // Add initiator (you)
    const initiatorResponded = this.initiatorAvailability.length > 0;
    items.push(`
      <div class="participant-item must-attend ${initiatorResponded ? '' : 'pending'}">
        <span class="participant-color" style="background-color: ${this.participantColors.get('initiator')}"></span>
        <span class="participant-name">You</span>
      </div>
    `);
    
    // Add invitees
    this.plan.invitees?.forEach(invitee => {
      const hasResponded = this.availability.some(a => a.contactId === invitee.contactId);
      const isMustAttend = invitee.attendanceType === 'must_attend';
      
      items.push(`
        <div class="participant-item ${isMustAttend ? 'must-attend' : ''} ${hasResponded ? '' : 'pending'}">
          <span class="participant-color" style="background-color: ${this.participantColors.get(invitee.contactId)}"></span>
          <span class="participant-name">${this.escapeHtml(invitee.contactName || 'Unknown')}</span>
        </div>
      `);
    });
    
    return items.join('');
  }
  
  /**
   * Render availability grid
   */
  renderAvailabilityGrid() {
    const days = this.getDaysInRange();
    const timeSlots = this.generateTimeSlots();
    
    // Calculate grid columns
    const numDays = days.length;
    
    let html = `<div class="availability-grid" style="grid-template-columns: 60px repeat(${numDays}, 1fr);">`;
    
    // Header row
    html += '<div class="grid-header">';
    html += '<div class="time-label"></div>';
    days.forEach(day => {
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
      
      days.forEach(day => {
        const slotId = this.createSlotId(day, time);
        const overlap = this.calculateSlotOverlap(slotId);
        const overlapClass = this.getOverlapClass(overlap);
        const isSelected = this.selectedSlot === slotId;
        
        html += `
          <div class="availability-slot ${overlapClass} ${isSelected ? 'selected' : ''}" 
               data-slot-id="${slotId}"
               data-available-count="${overlap.availableCount}"
               data-must-attend-count="${overlap.mustAttendCount}"
               title="${this.getSlotTooltip(overlap)}">
            <span class="overlap-indicator">${overlap.availableCount}/${this.getTotalParticipants()}</span>
          </div>
        `;
      });
      
      html += '</div>';
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Calculate overlap for a time slot
   */
  calculateSlotOverlap(slotId) {
    let availableCount = 0;
    let mustAttendCount = 0;
    const availableParticipants = [];
    
    // Check initiator availability
    if (this.initiatorAvailability.includes(slotId)) {
      availableCount++;
      mustAttendCount++; // Initiator is always must-attend
      availableParticipants.push({ name: 'You', isMustAttend: true });
    }
    
    // Check each invitee
    this.availability.forEach(inviteeAvail => {
      if (inviteeAvail.availableSlots?.includes(slotId)) {
        availableCount++;
        const invitee = this.plan.invitees?.find(i => i.contactId === inviteeAvail.contactId);
        const isMustAttend = invitee?.attendanceType === 'must_attend';
        
        if (isMustAttend) {
          mustAttendCount++;
        }
        
        availableParticipants.push({
          name: inviteeAvail.name || invitee?.contactName || 'Unknown',
          isMustAttend
        });
      }
    });
    
    const totalMustAttend = this.getTotalMustAttend();
    const isPerfectOverlap = mustAttendCount === totalMustAttend && availableCount > 0;
    
    return {
      availableCount,
      mustAttendCount,
      totalMustAttend,
      isPerfectOverlap,
      availableParticipants
    };
  }
  
  /**
   * Get overlap class for styling
   */
  getOverlapClass(overlap) {
    if (overlap.isPerfectOverlap) return 'perfect-overlap';
    if (overlap.mustAttendCount >= overlap.totalMustAttend - 1 && overlap.availableCount > 0) return 'near-overlap';
    if (overlap.availableCount > 0) return 'partial-overlap';
    return 'no-overlap';
  }
  
  /**
   * Get tooltip text for a slot
   */
  getSlotTooltip(overlap) {
    if (overlap.availableCount === 0) {
      return 'No one available';
    }
    
    const names = overlap.availableParticipants.map(p => 
      p.isMustAttend ? `${p.name} (required)` : p.name
    ).join(', ');
    
    return `Available: ${names}`;
  }
  
  /**
   * Get total number of participants
   */
  getTotalParticipants() {
    return (this.plan.invitees?.length || 0) + 1; // +1 for initiator
  }
  
  /**
   * Get total must-attend count
   */
  getTotalMustAttend() {
    const mustAttendInvitees = this.plan.invitees?.filter(i => i.attendanceType === 'must_attend').length || 0;
    return mustAttendInvitees + 1; // +1 for initiator
  }
  
  /**
   * Render load suggestions button
   */
  renderLoadSuggestionsButton() {
    return `
      <button class="btn-secondary" id="load-ai-suggestions">
        <span class="material-icons">auto_awesome</span>
        Get AI Suggestions
      </button>
    `;
  }
  
  /**
   * Render AI suggestions panel
   */
  renderAISuggestions() {
    if (!this.aiSuggestions || this.aiSuggestions.length === 0) {
      return `
        <div class="ai-suggestions-panel">
          <div class="ai-header">
            <span class="material-icons">auto_awesome</span>
            <h4>AI Suggestions</h4>
          </div>
          <p class="no-suggestions">No suggestions available. Try extending the date range or adjusting attendance requirements.</p>
        </div>
      `;
    }
    
    return `
      <div class="ai-suggestions-panel">
        <div class="ai-header">
          <span class="material-icons">auto_awesome</span>
          <h4>AI Suggestions</h4>
        </div>
        
        <div class="suggestions-list">
          ${this.aiSuggestions.map((suggestion, index) => `
            <div class="suggestion-card" data-suggestion-index="${index}">
              <div class="suggestion-header">
                <span class="suggestion-rank">#${index + 1}</span>
                <span class="suggestion-type">${this.formatSuggestionType(suggestion.type)}</span>
              </div>
              
              <div class="suggestion-content">
                ${suggestion.type === 'time_suggestion' ? `
                  <div class="suggested-time">
                    <span class="material-icons">event</span>
                    ${this.formatDateTime(suggestion.suggestedTime)}
                  </div>
                  <div class="attendee-count">
                    ${suggestion.attendeeCount}/${this.getTotalParticipants()} can attend
                  </div>
                ` : ''}
                
                ${suggestion.type === 'exclude_attendee' ? `
                  <div class="exclude-suggestion">
                    <p>Excluding <strong>${this.escapeHtml(suggestion.excludeeName)}</strong> (nice-to-have) opens up more options</p>
                  </div>
                ` : ''}
                
                ${suggestion.type === 'activity_change' ? `
                  <div class="activity-suggestion">
                    <p>Consider <strong>${this.escapeHtml(suggestion.alternativeActivity)}</strong> instead - shorter duration may work better</p>
                  </div>
                ` : ''}
                
                <div class="suggestion-reasoning">
                  <span class="material-icons">lightbulb</span>
                  ${this.escapeHtml(suggestion.reasoning)}
                </div>
              </div>
              
              <button class="btn-secondary apply-suggestion" data-index="${index}">
                Apply Suggestion
              </button>
            </div>
          `).join('')}
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
      <div class="availability-dashboard">
        <div class="empty-state">
          <span class="material-icons">error_outline</span>
          <h3>Error</h3>
          <p>${this.escapeHtml(message)}</p>
          <button class="btn-primary" onclick="window.availabilityDashboard.init()">Try Again</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Attach event listeners
   * Requirements: 11.5 - Quick finalization for individual plans
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Initialize mobile scroll handling (Requirement 15.6)
    this.initializeMobileScrollHandling(container);
    
    // Slot clicks
    container.querySelectorAll('.availability-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        this.handleSlotClick(slot.dataset.slotId);
      });
    });
    
    // Quick pick slot clicks (for individual plans) - Requirement 11.5
    container.querySelectorAll('.quick-pick-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        this.handleSlotClick(slot.dataset.slotId);
        // Update quick pick selection visuals
        container.querySelectorAll('.quick-pick-slot').forEach(s => {
          s.classList.toggle('selected', s.dataset.slotId === this.selectedSlot);
        });
      });
    });
    
    // Finalize button
    const finalizeBtn = container.querySelector('#finalize-plan');
    if (finalizeBtn) {
      finalizeBtn.addEventListener('click', this.handleFinalize);
    }
    
    // Send reminders button
    const remindersBtn = container.querySelector('#send-reminders');
    if (remindersBtn) {
      remindersBtn.addEventListener('click', () => this.sendReminders());
    }
    
    // Load AI suggestions button
    const loadSuggestionsBtn = container.querySelector('#load-ai-suggestions');
    if (loadSuggestionsBtn) {
      loadSuggestionsBtn.addEventListener('click', () => this.loadAISuggestions());
    }
    
    // Apply suggestion buttons
    container.querySelectorAll('.apply-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.handleApplySuggestion(index);
      });
    });
  }
  
  /**
   * Initialize mobile scroll handling for availability grid
   * Requirement 15.6 - Horizontal scrolling for calendar grids
   */
  initializeMobileScrollHandling(container) {
    const scrollContainer = container.querySelector('.availability-grid-container');
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
   * Handle slot click
   */
  handleSlotClick(slotId) {
    const overlap = this.calculateSlotOverlap(slotId);
    
    // Only allow selecting slots with at least some availability
    if (overlap.availableCount === 0) {
      this.showToast('No one is available at this time', 'warning');
      return;
    }
    
    // Toggle selection
    if (this.selectedSlot === slotId) {
      this.selectedSlot = null;
    } else {
      this.selectedSlot = slotId;
    }
    
    // Update UI
    this.updateSlotSelection();
    this.updateFinalizeButton();
  }
  
  /**
   * Update slot selection visuals
   */
  updateSlotSelection() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    container.querySelectorAll('.availability-slot').forEach(slot => {
      slot.classList.toggle('selected', slot.dataset.slotId === this.selectedSlot);
    });
  }
  
  /**
   * Update finalize button state
   */
  updateFinalizeButton() {
    const btn = document.querySelector('#finalize-plan');
    if (btn) {
      btn.disabled = !this.selectedSlot;
      btn.innerHTML = this.selectedSlot 
        ? '<span class="material-icons">check</span> Finalize Selected Time'
        : 'Select a Time to Finalize';
    }
  }
  
  /**
   * Handle finalize plan with loading state - Task 14.2
   */
  async handleFinalize() {
    if (!this.selectedSlot) {
      this.showToast('Please select a time slot first', 'warning');
      return;
    }
    
    if (this.isFinalizing) return; // Prevent double-click
    
    const [dateStr, time] = this.selectedSlot.split('_');
    const finalizedTime = `${dateStr}T${time}:00`;
    
    // Show loading state - Task 14.2
    this.isFinalizing = true;
    const finalizeBtn = document.querySelector('#finalize-plan');
    if (finalizeBtn) {
      finalizeBtn.disabled = true;
      finalizeBtn.innerHTML = '<span class="loading-spinner-sm"></span> Finalizing...';
    }
    
    try {
      const response = await this.fetchWithRetry(`/api/scheduling/plans/${this.planId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          finalizedTime,
          location: this.plan.location
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to finalize plan');
      }
      
      this.isFinalizing = false;
      this.showToast('Plan finalized! Participants will be notified.', 'success');
      this.onFinalize();
      
    } catch (error) {
      console.error('Failed to finalize:', error);
      this.isFinalizing = false;
      
      // Reset button
      if (finalizeBtn) {
        finalizeBtn.disabled = false;
        finalizeBtn.innerHTML = '<span class="material-icons">check</span> Finalize Selected Time';
      }
      
      // Show error with retry option
      this.showFinalizeError(error, finalizedTime);
    }
  }
  
  /**
   * Show finalize error with retry - Task 14.2
   */
  showFinalizeError(error, finalizedTime) {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Remove existing error banner
    const existingError = container.querySelector('.finalize-error-banner');
    if (existingError) {
      existingError.remove();
    }
    
    const errorBanner = document.createElement('div');
    errorBanner.className = 'error-banner finalize-error-banner';
    errorBanner.innerHTML = `
      <div class="error-icon">
        <span class="material-icons">error</span>
      </div>
      <div class="error-content">
        <p class="error-title">Failed to Finalize Plan</p>
        <p class="error-message">${this.escapeHtml(this.getUserFriendlyError(error))}</p>
        <div class="error-actions">
          <button class="btn-retry" id="retry-finalize-btn">
            <span class="material-icons">refresh</span>
            Try Again
          </button>
          <button class="btn-dismiss" id="dismiss-finalize-error">Dismiss</button>
        </div>
      </div>
    `;
    
    const dashboardActions = container.querySelector('.dashboard-actions');
    if (dashboardActions) {
      dashboardActions.insertAdjacentElement('beforebegin', errorBanner);
    }
    
    // Attach handlers
    const retryBtn = errorBanner.querySelector('#retry-finalize-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        errorBanner.remove();
        this.handleFinalize();
      });
    }
    
    const dismissBtn = errorBanner.querySelector('#dismiss-finalize-error');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => errorBanner.remove());
    }
  }
  
  /**
   * Load AI suggestions with loading state - Task 14.2
   */
  async loadAISuggestions() {
    if (this.isLoadingAI) return;
    
    this.isLoadingAI = true;
    this.aiError = null;
    
    const btn = document.querySelector('#load-ai-suggestions');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner-sm"></span> Getting AI Suggestions...';
    }
    
    try {
      const response = await this.fetchWithRetry(`/api/scheduling/plans/${this.planId}/ai-suggestions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }
      
      this.aiSuggestions = await response.json();
      this.isLoadingAI = false;
      
      // Re-render suggestions section
      const section = document.getElementById('ai-suggestions-section');
      if (section) {
        section.innerHTML = this.renderAISuggestions();
        
        // Re-attach suggestion button listeners
        section.querySelectorAll('.apply-suggestion').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            this.handleApplySuggestion(index);
          });
        });
      }
      
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
      this.isLoadingAI = false;
      this.aiError = this.getUserFriendlyError(error);
      
      // Show error state in AI section
      const section = document.getElementById('ai-suggestions-section');
      if (section) {
        section.innerHTML = `
          <div class="error-inline">
            <span class="material-icons">error</span>
            <span>${this.escapeHtml(this.aiError)}</span>
            <button class="btn-retry-inline" id="retry-ai-btn">
              <span class="material-icons">refresh</span>
              Retry
            </button>
          </div>
        `;
        
        const retryBtn = section.querySelector('#retry-ai-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.loadAISuggestions());
        }
      }
    }
  }
  
  /**
   * Handle apply suggestion
   */
  handleApplySuggestion(index) {
    const suggestion = this.aiSuggestions[index];
    if (!suggestion) return;
    
    if (suggestion.type === 'time_suggestion' && suggestion.suggestedTime) {
      // Convert suggested time to slot ID and select it
      const date = new Date(suggestion.suggestedTime);
      const dateStr = date.toISOString().split('T')[0];
      const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const slotId = `${dateStr}_${time}`;
      
      this.selectedSlot = slotId;
      this.updateSlotSelection();
      this.updateFinalizeButton();
      
      // Scroll to the slot
      const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
      if (slot) {
        slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      this.showToast('Time slot selected', 'success');
    } else {
      this.showToast('This suggestion type requires manual action', 'info');
    }
  }
  
  /**
   * Send reminders to pending participants
   */
  async sendReminders() {
    try {
      const response = await fetch(`/api/scheduling/plans/${this.planId}/reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to send reminders');
      }
      
      this.showToast('Reminders sent to pending participants', 'success');
      
    } catch (error) {
      console.error('Failed to send reminders:', error);
      this.showToast('Failed to send reminders', 'error');
    }
  }
  
  /**
   * Check if plan can be finalized
   */
  canFinalize() {
    // Can finalize if at least one must-attend has responded
    const mustAttendResponded = this.availability.some(a => {
      const invitee = this.plan.invitees?.find(i => i.contactId === a.contactId);
      return invitee?.attendanceType === 'must_attend';
    });
    
    return mustAttendResponded || this.initiatorAvailability.length > 0;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Get days in the plan date range
   */
  getDaysInRange() {
    const days = [];
    const start = new Date(this.plan.dateRangeStart);
    const end = new Date(this.plan.dateRangeEnd);
    
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }
  
  /**
   * Generate time slots
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
   * Create slot ID
   */
  createSlotId(date, time) {
    return `${date.toISOString().split('T')[0]}_${time}`;
  }
  
  /**
   * Format day name
   */
  formatDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  
  /**
   * Format date and time
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
   * Format suggestion type
   */
  formatSuggestionType(type) {
    const types = {
      'time_suggestion': 'Best Time',
      'exclude_attendee': 'Flexibility',
      'activity_change': 'Alternative'
    };
    return types[type] || type;
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
  
  /**
   * Refresh the dashboard
   */
  async refresh() {
    await this.loadAvailability();
    this.render();
    this.attachEventListeners();
  }
}

// Export for use in other modules
window.AvailabilityDashboard = AvailabilityDashboard;
