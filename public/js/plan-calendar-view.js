/**
 * Plan Calendar View Component
 * 
 * Monthly calendar display showing plans on their scheduled dates.
 * Used in the scheduling page calendar view.
 * 
 * Requirements: 10.2, 10.3
 */

class PlanCalendarView {
  constructor(options = {}) {
    this.containerId = options.containerId;
    this.plans = options.plans || [];
    this.onPlanClick = options.onPlanClick || (() => {});
    this.onDateClick = options.onDateClick || (() => {});
    
    // State
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    
    // Bind methods
    this.handlePrevMonth = this.handlePrevMonth.bind(this);
    this.handleNextMonth = this.handleNextMonth.bind(this);
  }
  
  /**
   * Initialize the calendar view
   */
  init() {
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Update plans data
   */
  setPlans(plans) {
    this.plans = plans;
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Render the calendar
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="plan-calendar-view">
        <div class="calendar-navigation">
          <button type="button" id="prev-month" aria-label="Previous month">&lt;</button>
          <span id="month-year-label">${this.formatMonthYear()}</span>
          <button type="button" id="next-month" aria-label="Next month">&gt;</button>
        </div>
        
        <div class="calendar-grid">
          ${this.renderDayHeaders()}
          ${this.renderDays()}
        </div>
      </div>
    `;
  }
  
  /**
   * Render day headers (Sun-Sat)
   */
  renderDayHeaders() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => `
      <div class="calendar-day-header">${day}</div>
    `).join('');
  }
  
  /**
   * Render calendar days
   */
  renderDays() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();
    
    let html = '';
    
    // Previous month padding
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(this.currentYear, this.currentMonth - 1, day);
      html += this.renderDay(date, true);
    }
    
    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const isToday = this.isSameDay(date, today);
      html += this.renderDay(date, false, isToday);
    }
    
    // Next month padding
    const totalCells = startPadding + totalDays;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, i);
      html += this.renderDay(date, true);
    }
    
    return html;
  }
  
  /**
   * Render a single day cell
   */
  renderDay(date, isOtherMonth, isToday = false) {
    const dateStr = date.toISOString().split('T')[0];
    const plansOnDay = this.getPlansForDate(date);
    
    return `
      <div class="calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" 
           data-date="${dateStr}">
        <span class="calendar-day-number">${date.getDate()}</span>
        <div class="calendar-day-events">
          ${plansOnDay.slice(0, 3).map(plan => this.renderPlanEvent(plan)).join('')}
          ${plansOnDay.length > 3 ? `
            <div class="calendar-more-events">+${plansOnDay.length - 3} more</div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render a plan event on the calendar
   */
  renderPlanEvent(plan) {
    const statusClass = (plan.status || 'draft').toLowerCase().replace(/_/g, '-');
    const title = plan.activityType || 'Catchup';
    
    return `
      <div class="calendar-plan-event ${statusClass}" 
           data-plan-id="${plan.id}"
           title="${this.escapeHtml(title)}">
        ${this.escapeHtml(title)}
      </div>
    `;
  }
  
  /**
   * Get plans for a specific date
   */
  getPlansForDate(date) {
    return this.plans.filter(plan => {
      // Check finalized time
      if (plan.finalizedTime) {
        return this.isSameDay(new Date(plan.finalizedTime), date);
      }
      
      // For pending plans, show on all days in the date range
      if (plan.dateRangeStart && plan.dateRangeEnd) {
        const start = new Date(plan.dateRangeStart);
        const end = new Date(plan.dateRangeEnd);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const checkDate = new Date(date);
        checkDate.setHours(12, 0, 0, 0);
        return checkDate >= start && checkDate <= end;
      }
      
      return false;
    });
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    // Navigation buttons
    const prevBtn = container.querySelector('#prev-month');
    const nextBtn = container.querySelector('#next-month');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', this.handlePrevMonth);
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', this.handleNextMonth);
    }
    
    // Plan event clicks
    container.querySelectorAll('.calendar-plan-event').forEach(event => {
      event.addEventListener('click', (e) => {
        e.stopPropagation();
        const planId = event.dataset.planId;
        if (planId) {
          this.onPlanClick(planId);
        }
      });
    });
    
    // Day clicks
    container.querySelectorAll('.calendar-day').forEach(day => {
      day.addEventListener('click', () => {
        const dateStr = day.dataset.date;
        if (dateStr) {
          this.onDateClick(new Date(dateStr));
        }
      });
    });
  }
  
  /**
   * Handle previous month navigation
   */
  handlePrevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Handle next month navigation
   */
  handleNextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Navigate to a specific month
   */
  goToMonth(month, year) {
    this.currentMonth = month;
    this.currentYear = year;
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Navigate to today
   */
  goToToday() {
    const today = new Date();
    this.goToMonth(today.getMonth(), today.getFullYear());
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Format month and year for header
   */
  formatMonthYear() {
    const date = new Date(this.currentYear, this.currentMonth, 1);
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
window.PlanCalendarView = PlanCalendarView;
