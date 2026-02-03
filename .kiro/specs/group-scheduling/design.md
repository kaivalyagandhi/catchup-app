# Design Document: Group Scheduling Feature

## Overview

This design document describes the technical implementation for the Group Scheduling feature in CatchUp. The feature enables users to coordinate catchups with friends through intelligent availability collection and AI-powered conflict resolution.

The key components are:
1. **Scheduling Page** - New navigation page for managing all catchup plans
2. **Plan Creation Flow** - Multi-contact selection with circle/group filtering and scheduling preferences
3. **Invite Link System** - Shareable URLs for availability collection from non-app users
4. **Availability Collection** - Lightweight public page with calendar grid for marking availability
5. **Availability Dashboard** - Visual grid showing all participants' availability with overlap highlighting
6. **AI Conflict Resolution** - Gemini-powered suggestions for optimal meeting times
7. **Privacy Controls** - User-controlled calendar sharing settings
8. **Notification System** - In-app notifications for scheduling updates

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Vanilla JS)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Scheduling Page │  │  Plan Creation   │  │  Availability Dashboard  │  │
│  │  (scheduling.js) │  │  Modal           │  │  (availability-grid.js)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Contact Picker  │  │  Calendar View   │  │  Preferences Panel       │  │
│  │  (with filters)  │  │  (plan-calendar) │  │  (scheduling-prefs.js)   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Public Availability Page                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Lightweight page (no auth) - availability-public.html               │  │
│  │  - Calendar grid for time slot selection                             │  │
│  │  - Auto-detected timezone                                            │  │
│  │  - Mobile-responsive touch interface                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend (Node.js/TypeScript)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Scheduling      │  │  Availability    │  │  Conflict Resolution     │  │
│  │  Service         │  │  Service         │  │  Service (AI)            │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Invite Link     │  │  Notification    │  │  Scheduling Preferences  │  │
│  │  Service         │  │  Service         │  │  Service                 │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Scheduling      │  │  Invite Link     │  │  Notification            │  │
│  │  Repository      │  │  Repository      │  │  Repository              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL Database                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  catchup_plans │ plan_invitees │ invitee_availability │ invite_links       │
│  scheduling_preferences │ scheduling_notifications                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           External Services                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Google Gemini API (Conflict Resolution) │ Google Calendar API (Free/Busy) │
└─────────────────────────────────────────────────────────────────────────────┘
```


### Component Architecture

```
Frontend Components (public/js/):
├── scheduling-page.js (New)
│   ├── Scheduling page controller
│   ├── View toggle (calendar/list)
│   ├── Filter management
│   └── Plan list rendering
│
├── plan-creation-modal.js (New)
│   ├── Multi-step plan creation form
│   ├── Contact picker with circle/group filters
│   ├── Scheduling preferences integration
│   └── Invite link generation display
│
├── contact-picker.js (New)
│   ├── Search with debounce
│   ├── Circle filter buttons
│   ├── Group filter dropdown
│   ├── "Add all" functionality
│   └── Multi-select with badges
│
├── availability-grid.js (New)
│   ├── Calendar grid component
│   ├── Time slot selection
│   ├── Participant overlay
│   └── Overlap highlighting
│
├── availability-dashboard.js (New)
│   ├── Participant availability view
│   ├── Must-attend vs nice-to-have distinction
│   ├── Response status tracking
│   └── AI suggestions display
│
├── scheduling-preferences.js (New)
│   ├── Preferences form
│   ├── Favorite locations management
│   └── Default settings
│
└── plan-calendar-view.js (New)
    ├── Monthly calendar display
    ├── Plan event rendering
    └── Date navigation

Backend Services (src/scheduling/):
├── scheduling-service.ts (New)
│   ├── createPlan()
│   ├── updatePlan()
│   ├── finalizePlan()
│   ├── cancelPlan()
│   └── getPlansByUser()
│
├── availability-collection-service.ts (New)
│   ├── submitAvailability()
│   ├── getAvailabilityForPlan()
│   ├── calculateOverlaps()
│   └── getInitiatorAvailability()
│
├── invite-link-service.ts (New)
│   ├── generateInviteLink()
│   ├── validateInviteLink()
│   ├── regenerateInviteLink()
│   └── trackLinkAccess()
│
├── conflict-resolution-service.ts (New)
│   ├── analyzeConflicts()
│   ├── generateAISuggestions()
│   └── rankSuggestions()
│
├── scheduling-preferences-service.ts (New)
│   ├── getPreferences()
│   ├── savePreferences()
│   └── applyPreferencesToPlan()
│
└── scheduling-notification-service.ts (New)
    ├── notifyAvailabilitySubmitted()
    ├── notifyPlanReady()
    ├── notifyPlanFinalized()
    └── notifyPlanCancelled()

Backend Repositories (src/scheduling/):
├── scheduling-repository.ts (New)
├── invite-link-repository.ts (New)
├── availability-repository.ts (New)
└── scheduling-notification-repository.ts (New)
```

## Components and Interfaces

### 1. Scheduling Page Component

**File**: `public/js/scheduling-page.js`

```javascript
class SchedulingPage {
  constructor(options) {
    this.containerId = options.containerId;
    this.userId = options.userId;
    this.currentView = this.loadViewPreference() || 'list';
    this.currentFilter = 'all';
    this.plans = [];
  }
  
  // Initialize and render the page
  async init() {
    await this.loadPlans();
    this.render();
    this.attachEventListeners();
    this.updateNotificationBadge();
  }
  
  // Load plans from API
  async loadPlans() {
    const response = await fetch(`/api/scheduling/plans?userId=${this.userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    this.plans = await response.json();
  }
  
  // Render the scheduling page
  render() {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="scheduling-page">
        <div class="scheduling-header">
          <h2>Scheduling</h2>
          <button class="btn-primary" id="new-plan-btn">
            <span class="material-icons">add</span> New Plan
          </button>
        </div>
        
        <div class="scheduling-controls">
          <div class="view-toggle">
            <button class="view-btn ${this.currentView === 'calendar' ? 'active' : ''}" data-view="calendar">
              <span class="material-icons">calendar_month</span>
            </button>
            <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}" data-view="list">
              <span class="material-icons">list</span>
            </button>
          </div>
          
          <div class="filter-buttons">
            ${this.renderFilterButtons()}
          </div>
          
          <div class="quick-actions">
            <button class="quick-action-btn" data-circle="inner">Plan with Inner Circle</button>
            <button class="quick-action-btn" data-circle="close">Plan with Close Friends</button>
          </div>
        </div>
        
        <div class="scheduling-content">
          ${this.currentView === 'calendar' ? this.renderCalendarView() : this.renderListView()}
        </div>
        
        <div class="preferences-summary" id="preferences-summary">
          ${this.renderPreferencesSummary()}
        </div>
      </div>
    `;
  }
  
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
  
  renderListView() {
    const filteredPlans = this.filterPlans();
    if (filteredPlans.length === 0) {
      return `<div class="empty-state">
        <span class="material-icons">event_busy</span>
        <h3>No catchup plans yet</h3>
        <p>Create a new plan to start coordinating with friends</p>
      </div>`;
    }
    return `<div class="plans-list">
      ${filteredPlans.map(plan => this.renderPlanCard(plan)).join('')}
    </div>`;
  }
  
  renderPlanCard(plan) {
    const statusClass = plan.status.toLowerCase().replace('_', '-');
    const participantCount = plan.invitees.length;
    const respondedCount = plan.invitees.filter(i => i.hasResponded).length;
    
    return `
      <div class="plan-card ${statusClass}" data-plan-id="${plan.id}">
        <div class="plan-header">
          <h4>${plan.activityType || 'Catchup'}</h4>
          <span class="plan-status">${this.formatStatus(plan.status)}</span>
        </div>
        <div class="plan-participants">
          <span class="material-icons">group</span>
          ${participantCount} participant${participantCount !== 1 ? 's' : ''}
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
            <button class="btn-primary" data-action="finalize" data-plan-id="${plan.id}">Find Time</button>
          ` : ''}
        </div>
      </div>
    `;
  }
}
```


### 2. Plan Creation Modal Component

**File**: `public/js/plan-creation-modal.js`

```javascript
class PlanCreationModal {
  constructor(options) {
    this.onPlanCreated = options.onPlanCreated;
    this.userId = options.userId;
    this.preSelectedContacts = options.preSelectedContacts || [];
    this.selectedContacts = new Map();
    this.preferences = null;
    this.step = 1; // 1: contacts, 2: details, 3: invite links
  }
  
  async open() {
    await this.loadPreferences();
    await this.loadContacts();
    this.render();
    this.attachEventListeners();
  }
  
  render() {
    const modal = document.createElement('div');
    modal.className = 'modal plan-creation-modal';
    modal.innerHTML = `
      <div class="modal-content plan-creation-content">
        <div class="modal-header">
          <h2>Create Catchup Plan</h2>
          <button class="close-btn" id="close-plan-modal">&times;</button>
        </div>
        
        <div class="step-indicator">
          <div class="step ${this.step >= 1 ? 'active' : ''}" data-step="1">
            <span class="step-number">1</span>
            <span class="step-label">Select Contacts</span>
          </div>
          <div class="step ${this.step >= 2 ? 'active' : ''}" data-step="2">
            <span class="step-number">2</span>
            <span class="step-label">Plan Details</span>
          </div>
          <div class="step ${this.step >= 3 ? 'active' : ''}" data-step="3">
            <span class="step-number">3</span>
            <span class="step-label">Share Links</span>
          </div>
        </div>
        
        <div class="modal-body">
          ${this.renderCurrentStep()}
        </div>
        
        <div class="modal-footer">
          ${this.renderFooterButtons()}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  renderStep1() {
    return `
      <div class="contact-picker-container">
        <div class="picker-header">
          <input type="search" id="contact-search" placeholder="Search contacts..." class="contact-search-input">
        </div>
        
        <div class="filter-section">
          <div class="circle-filters">
            <button class="circle-filter-btn" data-circle="all">All</button>
            <button class="circle-filter-btn" data-circle="inner">💜 Inner Circle</button>
            <button class="circle-filter-btn" data-circle="close">💗 Close Friends</button>
            <button class="circle-filter-btn" data-circle="active">💚 Active Friends</button>
            <button class="circle-filter-btn" data-circle="casual">💙 Casual Network</button>
          </div>
          
          <div class="group-filter">
            <select id="group-filter">
              <option value="">All Groups</option>
              ${this.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
            </select>
          </div>
          
          <button class="add-all-btn" id="add-all-filtered">Add All Visible</button>
        </div>
        
        <div class="contacts-grid" id="contacts-grid">
          ${this.renderContactsGrid()}
        </div>
        
        <div class="selected-contacts-summary">
          <h4>Selected (${this.selectedContacts.size})</h4>
          <div class="selected-chips" id="selected-chips">
            ${this.renderSelectedChips()}
          </div>
        </div>
      </div>
    `;
  }
  
  renderStep2() {
    return `
      <div class="plan-details-form">
        ${this.preferences ? `
          <div class="apply-preferences-banner">
            <span class="material-icons">auto_awesome</span>
            <span>Apply your saved preferences?</span>
            <button class="btn-secondary" id="apply-preferences">Apply</button>
          </div>
        ` : ''}
        
        <div class="form-group">
          <label for="activity-type">Activity Type</label>
          <select id="activity-type">
            <option value="">Select activity...</option>
            <option value="coffee">☕ Coffee</option>
            <option value="dinner">🍽️ Dinner</option>
            <option value="video_call">📹 Video Call</option>
            <option value="activity">🎯 Activity</option>
            <option value="other">📝 Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="duration">Duration</label>
          <select id="duration">
            <option value="30">30 minutes</option>
            <option value="60" selected>1 hour</option>
            <option value="120">2 hours</option>
            <option value="240">Half day</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Date Range</label>
          <div class="date-range-inputs">
            <input type="date" id="date-start" value="${this.getDefaultStartDate()}">
            <span>to</span>
            <input type="date" id="date-end" value="${this.getDefaultEndDate()}">
          </div>
        </div>
        
        <div class="form-group">
          <label>Attendance Type</label>
          <div class="attendance-list">
            ${Array.from(this.selectedContacts.values()).map(contact => `
              <div class="attendance-item" data-contact-id="${contact.id}">
                <span class="contact-name">${this.escapeHtml(contact.name)}</span>
                <div class="attendance-toggle">
                  <button class="attendance-btn ${contact.attendanceType === 'must_attend' ? 'active' : ''}" 
                          data-type="must_attend">Must Attend</button>
                  <button class="attendance-btn ${contact.attendanceType === 'nice_to_have' ? 'active' : ''}" 
                          data-type="nice_to_have">Nice to Have</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="form-group">
          <label for="location">Location (optional)</label>
          <input type="text" id="location" placeholder="Enter location or meeting link">
          ${this.preferences?.favoriteLocations?.length ? `
            <div class="favorite-locations">
              <span>Favorites:</span>
              ${this.preferences.favoriteLocations.map(loc => `
                <button class="location-chip" data-location="${this.escapeHtml(loc)}">${this.escapeHtml(loc)}</button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  renderStep3() {
    return `
      <div class="invite-links-container">
        <div class="success-message">
          <span class="material-icons">check_circle</span>
          <h3>Plan Created!</h3>
          <p>Share these links with your friends so they can mark their availability.</p>
        </div>
        
        <div class="invite-links-list">
          ${this.inviteLinks.map(link => `
            <div class="invite-link-item">
              <div class="invitee-info">
                <span class="invitee-name">${this.escapeHtml(link.contactName)}</span>
                <span class="attendance-badge ${link.attendanceType}">${link.attendanceType === 'must_attend' ? 'Must Attend' : 'Nice to Have'}</span>
              </div>
              <div class="link-actions">
                <input type="text" readonly value="${link.url}" class="link-input">
                <button class="copy-btn" data-link="${link.url}">
                  <span class="material-icons">content_copy</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        
        <button class="btn-secondary" id="copy-all-links">
          <span class="material-icons">content_copy</span> Copy All Links
        </button>
        
        <div class="next-steps">
          <h4>Next Steps</h4>
          <ol>
            <li>Copy the links above and share them with your friends via your preferred messaging app</li>
            <li>Wait for everyone to mark their availability</li>
            <li>Once availability is collected, we'll help you find the best time</li>
          </ol>
        </div>
      </div>
    `;
  }
  
  async createPlan() {
    const planData = {
      userId: this.userId,
      invitees: Array.from(this.selectedContacts.values()).map(c => ({
        contactId: c.id,
        attendanceType: c.attendanceType || 'must_attend'
      })),
      activityType: document.getElementById('activity-type').value,
      duration: parseInt(document.getElementById('duration').value),
      dateRangeStart: document.getElementById('date-start').value,
      dateRangeEnd: document.getElementById('date-end').value,
      location: document.getElementById('location').value || null
    };
    
    const response = await fetch('/api/scheduling/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(planData)
    });
    
    if (!response.ok) throw new Error('Failed to create plan');
    
    const result = await response.json();
    this.inviteLinks = result.inviteLinks;
    this.step = 3;
    this.render();
  }
}
```


### 3. Public Availability Page

**File**: `public/availability.html` (New lightweight page)

This is a standalone HTML page that does NOT require authentication. It loads minimal JavaScript for the calendar grid interaction.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mark Your Availability - CatchUp</title>
    <link rel="stylesheet" href="/css/availability-public.css">
</head>
<body>
    <div class="availability-container">
        <header class="availability-header">
            <h1>CatchUp</h1>
            <p id="plan-description">Loading...</p>
        </header>
        
        <main class="availability-main">
            <div class="invitee-name-section">
                <label for="invitee-name">Your Name</label>
                <input type="text" id="invitee-name" placeholder="Enter your name">
            </div>
            
            <div class="timezone-notice">
                <span class="material-icons">schedule</span>
                <span>Times shown in <strong id="detected-timezone">UTC</strong></span>
            </div>
            
            <div class="calendar-grid-container">
                <div class="calendar-navigation">
                    <button id="prev-week">&lt;</button>
                    <span id="date-range-label">Loading...</span>
                    <button id="next-week">&gt;</button>
                </div>
                
                <div class="calendar-grid" id="calendar-grid">
                    <!-- Dynamically populated -->
                </div>
            </div>
            
            <div class="selection-summary">
                <span id="slots-selected">0 time slots selected</span>
            </div>
            
            <button class="submit-btn" id="submit-availability" disabled>
                Submit Availability
            </button>
        </main>
        
        <footer class="availability-footer">
            <p>Powered by CatchUp - Relationship Management</p>
        </footer>
    </div>
    
    <script src="/js/availability-public.js"></script>
</body>
</html>
```

**File**: `public/js/availability-public.js`

```javascript
class AvailabilityPublicPage {
  constructor() {
    this.token = this.getTokenFromUrl();
    this.planData = null;
    this.selectedSlots = new Set();
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.currentWeekStart = null;
  }
  
  async init() {
    if (!this.token) {
      this.showError('Invalid or missing invite link');
      return;
    }
    
    await this.loadPlanData();
    this.detectTimezone();
    this.renderCalendarGrid();
    this.attachEventListeners();
  }
  
  async loadPlanData() {
    try {
      const response = await fetch(`/api/scheduling/availability/${this.token}`);
      if (!response.ok) {
        if (response.status === 404) {
          this.showError('This invite link has expired or is invalid');
        } else if (response.status === 410) {
          this.showError('This plan has already been finalized');
        } else {
          this.showError('Failed to load plan details');
        }
        return;
      }
      
      this.planData = await response.json();
      this.currentWeekStart = new Date(this.planData.dateRangeStart);
      this.renderPlanDescription();
      
      // Pre-fill name if known
      if (this.planData.inviteeName) {
        document.getElementById('invitee-name').value = this.planData.inviteeName;
      }
      
      // Load existing availability if any
      if (this.planData.existingAvailability) {
        this.selectedSlots = new Set(this.planData.existingAvailability);
      }
    } catch (error) {
      this.showError('Failed to load plan details');
    }
  }
  
  renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid');
    const days = this.getDaysInRange();
    const timeSlots = this.generateTimeSlots();
    
    // Header row with days
    let html = '<div class="grid-header"><div class="time-label"></div>';
    days.forEach(day => {
      html += `<div class="day-header">${this.formatDayHeader(day)}</div>`;
    });
    html += '</div>';
    
    // Time slot rows
    timeSlots.forEach(time => {
      html += `<div class="grid-row">`;
      html += `<div class="time-label">${time}</div>`;
      days.forEach(day => {
        const slotId = `${day.toISOString().split('T')[0]}_${time}`;
        const isSelected = this.selectedSlots.has(slotId);
        const isPast = this.isSlotInPast(day, time);
        html += `
          <div class="time-slot ${isSelected ? 'selected' : ''} ${isPast ? 'disabled' : ''}" 
               data-slot-id="${slotId}" 
               ${isPast ? 'disabled' : ''}>
          </div>
        `;
      });
      html += '</div>';
    });
    
    grid.innerHTML = html;
    this.updateSelectionCount();
  }
  
  generateTimeSlots() {
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }
  
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
  
  async submitAvailability() {
    const name = document.getElementById('invitee-name').value.trim();
    if (!name) {
      this.showError('Please enter your name');
      return;
    }
    
    try {
      const response = await fetch(`/api/scheduling/availability/${this.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          timezone: this.timezone,
          availableSlots: Array.from(this.selectedSlots)
        })
      });
      
      if (!response.ok) throw new Error('Failed to submit');
      
      this.showSuccess('Your availability has been submitted! The organizer will be notified.');
    } catch (error) {
      this.showError('Failed to submit availability. Please try again.');
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const page = new AvailabilityPublicPage();
  page.init();
});
```


### 4. Availability Dashboard Component

**File**: `public/js/availability-dashboard.js`

```javascript
class AvailabilityDashboard {
  constructor(options) {
    this.containerId = options.containerId;
    this.planId = options.planId;
    this.userId = options.userId;
    this.plan = null;
    this.availability = [];
    this.aiSuggestions = null;
  }
  
  async init() {
    await this.loadPlanData();
    await this.loadAvailability();
    this.render();
    this.attachEventListeners();
  }
  
  render() {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="availability-dashboard">
        <div class="dashboard-header">
          <h3>Availability Overview</h3>
          <div class="response-status">
            ${this.renderResponseStatus()}
          </div>
        </div>
        
        <div class="participant-legend">
          ${this.renderParticipantLegend()}
        </div>
        
        <div class="availability-grid-container">
          ${this.renderAvailabilityGrid()}
        </div>
        
        ${this.aiSuggestions ? this.renderAISuggestions() : ''}
        
        <div class="dashboard-actions">
          ${this.canFinalize() ? `
            <button class="btn-primary" id="finalize-plan">Select Time & Finalize</button>
          ` : `
            <button class="btn-secondary" id="send-reminders">Send Reminders</button>
          `}
        </div>
      </div>
    `;
  }
  
  renderAvailabilityGrid() {
    const days = this.getDaysInRange();
    const timeSlots = this.generateTimeSlots();
    
    let html = '<div class="availability-grid">';
    
    // Header row
    html += '<div class="grid-header"><div class="time-label"></div>';
    days.forEach(day => {
      html += `<div class="day-header">${this.formatDayHeader(day)}</div>`;
    });
    html += '</div>';
    
    // Time slot rows with overlap visualization
    timeSlots.forEach(time => {
      html += '<div class="grid-row">';
      html += `<div class="time-label">${time}</div>`;
      
      days.forEach(day => {
        const slotId = `${day.toISOString().split('T')[0]}_${time}`;
        const overlap = this.calculateSlotOverlap(slotId);
        const overlapClass = this.getOverlapClass(overlap);
        
        html += `
          <div class="availability-slot ${overlapClass}" 
               data-slot-id="${slotId}"
               data-available-count="${overlap.availableCount}"
               data-must-attend-count="${overlap.mustAttendCount}">
            <span class="overlap-indicator">${overlap.availableCount}/${this.plan.invitees.length}</span>
          </div>
        `;
      });
      
      html += '</div>';
    });
    
    html += '</div>';
    return html;
  }
  
  calculateSlotOverlap(slotId) {
    let availableCount = 0;
    let mustAttendCount = 0;
    const availableParticipants = [];
    
    // Check initiator availability
    if (this.initiatorAvailability?.includes(slotId)) {
      availableCount++;
      mustAttendCount++; // Initiator is always must-attend
      availableParticipants.push({ name: 'You', isMustAttend: true });
    }
    
    // Check each invitee
    this.availability.forEach(inviteeAvail => {
      if (inviteeAvail.availableSlots.includes(slotId)) {
        availableCount++;
        const invitee = this.plan.invitees.find(i => i.contactId === inviteeAvail.contactId);
        if (invitee?.attendanceType === 'must_attend') {
          mustAttendCount++;
        }
        availableParticipants.push({
          name: inviteeAvail.name,
          isMustAttend: invitee?.attendanceType === 'must_attend'
        });
      }
    });
    
    const totalMustAttend = this.plan.invitees.filter(i => i.attendanceType === 'must_attend').length + 1;
    const isPerfectOverlap = mustAttendCount === totalMustAttend;
    
    return {
      availableCount,
      mustAttendCount,
      totalMustAttend,
      isPerfectOverlap,
      availableParticipants
    };
  }
  
  getOverlapClass(overlap) {
    if (overlap.isPerfectOverlap) return 'perfect-overlap';
    if (overlap.mustAttendCount >= overlap.totalMustAttend - 1) return 'near-overlap';
    if (overlap.availableCount > 0) return 'partial-overlap';
    return 'no-overlap';
  }
  
  renderAISuggestions() {
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
                <span class="suggestion-type">${suggestion.type}</span>
              </div>
              
              <div class="suggestion-content">
                ${suggestion.type === 'time_suggestion' ? `
                  <div class="suggested-time">
                    <span class="material-icons">event</span>
                    ${this.formatDateTime(suggestion.suggestedTime)}
                  </div>
                  <div class="attendee-count">
                    ${suggestion.attendeeCount}/${this.plan.invitees.length + 1} can attend
                  </div>
                ` : ''}
                
                ${suggestion.type === 'exclude_attendee' ? `
                  <div class="exclude-suggestion">
                    <p>Excluding <strong>${suggestion.excludeeName}</strong> (nice-to-have) opens up more options</p>
                  </div>
                ` : ''}
                
                ${suggestion.type === 'activity_change' ? `
                  <div class="activity-suggestion">
                    <p>Consider <strong>${suggestion.alternativeActivity}</strong> instead - shorter duration may work better</p>
                  </div>
                ` : ''}
                
                <div class="suggestion-reasoning">
                  <span class="material-icons">lightbulb</span>
                  ${suggestion.reasoning}
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
  
  async requestAISuggestions() {
    try {
      const response = await fetch(`/api/scheduling/plans/${this.planId}/ai-suggestions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (!response.ok) throw new Error('Failed to get AI suggestions');
      
      this.aiSuggestions = await response.json();
      this.render();
    } catch (error) {
      showToast('Failed to get AI suggestions', 'error');
    }
  }
}
```

### 5. Conflict Resolution Service (Backend)

**File**: `src/scheduling/conflict-resolution-service.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CatchupPlan, PlanInvitee, InviteeAvailability, ConflictSuggestion } from '../types/scheduling';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export interface ConflictAnalysis {
  hasPerfectOverlap: boolean;
  perfectOverlapSlots: string[];
  nearOverlapSlots: { slot: string; missingAttendees: string[] }[];
  suggestions: ConflictSuggestion[];
}

export async function analyzeConflicts(
  plan: CatchupPlan,
  invitees: PlanInvitee[],
  availability: InviteeAvailability[],
  initiatorAvailability: string[]
): Promise<ConflictAnalysis> {
  const mustAttendInvitees = invitees.filter(i => i.attendanceType === 'must_attend');
  const niceToHaveInvitees = invitees.filter(i => i.attendanceType === 'nice_to_have');
  
  // Find all unique time slots
  const allSlots = new Set<string>();
  availability.forEach(a => a.availableSlots.forEach(s => allSlots.add(s)));
  initiatorAvailability.forEach(s => allSlots.add(s));
  
  // Calculate overlap for each slot
  const slotOverlaps = new Map<string, {
    mustAttendCount: number;
    niceToHaveCount: number;
    missingMustAttend: string[];
  }>();
  
  allSlots.forEach(slot => {
    const availableForSlot = availability.filter(a => a.availableSlots.includes(slot));
    const initiatorAvailable = initiatorAvailability.includes(slot);
    
    const mustAttendAvailable = mustAttendInvitees.filter(mai => 
      availableForSlot.some(a => a.contactId === mai.contactId)
    );
    
    const niceToHaveAvailable = niceToHaveInvitees.filter(nthi =>
      availableForSlot.some(a => a.contactId === nthi.contactId)
    );
    
    const missingMustAttend = mustAttendInvitees
      .filter(mai => !availableForSlot.some(a => a.contactId === mai.contactId))
      .map(mai => mai.contactName);
    
    // Add initiator to must-attend count if available
    const mustAttendCount = mustAttendAvailable.length + (initiatorAvailable ? 1 : 0);
    if (!initiatorAvailable) {
      missingMustAttend.push('You');
    }
    
    slotOverlaps.set(slot, {
      mustAttendCount,
      niceToHaveCount: niceToHaveAvailable.length,
      missingMustAttend
    });
  });
  
  // Find perfect overlap slots (all must-attend available)
  const totalMustAttend = mustAttendInvitees.length + 1; // +1 for initiator
  const perfectOverlapSlots = Array.from(slotOverlaps.entries())
    .filter(([_, overlap]) => overlap.mustAttendCount === totalMustAttend)
    .map(([slot, _]) => slot);
  
  // Find near-overlap slots (missing 1 must-attend)
  const nearOverlapSlots = Array.from(slotOverlaps.entries())
    .filter(([_, overlap]) => overlap.mustAttendCount === totalMustAttend - 1)
    .map(([slot, overlap]) => ({ slot, missingAttendees: overlap.missingMustAttend }));
  
  // Generate AI suggestions if no perfect overlap
  let suggestions: ConflictSuggestion[] = [];
  if (perfectOverlapSlots.length === 0) {
    suggestions = await generateAISuggestions(plan, invitees, availability, slotOverlaps);
  }
  
  return {
    hasPerfectOverlap: perfectOverlapSlots.length > 0,
    perfectOverlapSlots,
    nearOverlapSlots,
    suggestions
  };
}

async function generateAISuggestions(
  plan: CatchupPlan,
  invitees: PlanInvitee[],
  availability: InviteeAvailability[],
  slotOverlaps: Map<string, any>
): Promise<ConflictSuggestion[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `You are helping schedule a group catchup. Analyze the availability data and suggest solutions.

Plan Details:
- Activity: ${plan.activityType || 'General catchup'}
- Duration: ${plan.duration} minutes
- Date Range: ${plan.dateRangeStart} to ${plan.dateRangeEnd}

Participants:
${invitees.map(i => `- ${i.contactName} (${i.attendanceType})`).join('\n')}

Availability Summary:
${Array.from(slotOverlaps.entries()).slice(0, 20).map(([slot, overlap]) => 
  `- ${slot}: ${overlap.mustAttendCount} must-attend, ${overlap.niceToHaveCount} nice-to-have available`
).join('\n')}

Generate up to 3 suggestions to resolve scheduling conflicts. Consider:
1. Alternative times within the date range that maximize attendance
2. Whether excluding a "nice-to-have" attendee opens up better options
3. Whether a shorter activity (like video call instead of dinner) might work better

Return JSON array with suggestions:
[
  {
    "type": "time_suggestion" | "exclude_attendee" | "activity_change",
    "suggestedTime": "ISO datetime if time_suggestion",
    "excludeeName": "name if exclude_attendee",
    "alternativeActivity": "activity if activity_change",
    "attendeeCount": number,
    "reasoning": "brief explanation"
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
  }
  
  return [];
}

export function rankSuggestions(suggestions: ConflictSuggestion[]): ConflictSuggestion[] {
  return suggestions.sort((a, b) => {
    // Prioritize time suggestions over other types
    if (a.type === 'time_suggestion' && b.type !== 'time_suggestion') return -1;
    if (b.type === 'time_suggestion' && a.type !== 'time_suggestion') return 1;
    
    // Then by attendee count (higher is better)
    return (b.attendeeCount || 0) - (a.attendeeCount || 0);
  });
}
```


### 6. Scheduling Service (Backend)

**File**: `src/scheduling/scheduling-service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import * as schedulingRepository from './scheduling-repository';
import * as inviteLinkService from './invite-link-service';
import * as notificationService from './scheduling-notification-service';
import { CatchupPlan, PlanInvitee, PlanStatus, CreatePlanData } from '../types/scheduling';

export async function createPlan(data: CreatePlanData): Promise<{
  plan: CatchupPlan;
  inviteLinks: { contactId: string; contactName: string; url: string; attendanceType: string }[];
}> {
  // Validate date range (max 14 days)
  const startDate = new Date(data.dateRangeStart);
  const endDate = new Date(data.dateRangeEnd);
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 14) {
    throw new Error('Date range cannot exceed 14 days');
  }
  
  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }
  
  // Create the plan
  const planId = uuidv4();
  const plan = await schedulingRepository.createPlan({
    id: planId,
    userId: data.userId,
    activityType: data.activityType,
    duration: data.duration,
    dateRangeStart: data.dateRangeStart,
    dateRangeEnd: data.dateRangeEnd,
    location: data.location,
    status: 'draft'
  });
  
  // Add invitees
  const inviteLinks = [];
  for (const invitee of data.invitees) {
    const inviteeRecord = await schedulingRepository.addInvitee({
      planId,
      contactId: invitee.contactId,
      attendanceType: invitee.attendanceType
    });
    
    // Generate invite link
    const link = await inviteLinkService.generateInviteLink(planId, invitee.contactId);
    inviteLinks.push({
      contactId: invitee.contactId,
      contactName: inviteeRecord.contactName,
      url: link.url,
      attendanceType: invitee.attendanceType
    });
  }
  
  // Update status to collecting_availability
  await schedulingRepository.updatePlanStatus(planId, 'collecting_availability');
  plan.status = 'collecting_availability';
  
  return { plan, inviteLinks };
}

export async function getPlansByUser(
  userId: string,
  filters?: { status?: PlanStatus; type?: 'individual' | 'group' }
): Promise<CatchupPlan[]> {
  return schedulingRepository.getPlansByUser(userId, filters);
}

export async function getPlanById(planId: string, userId: string): Promise<CatchupPlan | null> {
  const plan = await schedulingRepository.getPlanById(planId);
  
  // Verify ownership
  if (plan && plan.userId !== userId) {
    return null;
  }
  
  return plan;
}

export async function finalizePlan(
  planId: string,
  userId: string,
  finalizedTime: string,
  location?: string,
  notes?: string
): Promise<CatchupPlan> {
  const plan = await getPlanById(planId, userId);
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  if (plan.status === 'scheduled' || plan.status === 'completed') {
    throw new Error('Plan is already finalized');
  }
  
  // Update plan with finalized details
  const updatedPlan = await schedulingRepository.finalizePlan(planId, {
    finalizedTime,
    location: location || plan.location,
    notes,
    status: 'scheduled'
  });
  
  // Notify all participants
  await notificationService.notifyPlanFinalized(planId);
  
  return updatedPlan;
}

export async function cancelPlan(planId: string, userId: string): Promise<void> {
  const plan = await getPlanById(planId, userId);
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  // Update status
  await schedulingRepository.updatePlanStatus(planId, 'cancelled');
  
  // Invalidate all invite links
  await inviteLinkService.invalidateLinksForPlan(planId);
  
  // Notify participants
  await notificationService.notifyPlanCancelled(planId);
}

export async function updatePlan(
  planId: string,
  userId: string,
  updates: Partial<CreatePlanData>
): Promise<CatchupPlan> {
  const plan = await getPlanById(planId, userId);
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  if (plan.status === 'scheduled' || plan.status === 'completed') {
    throw new Error('Cannot edit a finalized plan');
  }
  
  return schedulingRepository.updatePlan(planId, updates);
}

export async function extendDateRange(
  planId: string,
  userId: string,
  newEndDate: string
): Promise<CatchupPlan> {
  const plan = await getPlanById(planId, userId);
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  const startDate = new Date(plan.dateRangeStart);
  const endDate = new Date(newEndDate);
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 14) {
    throw new Error('Date range cannot exceed 14 days');
  }
  
  return schedulingRepository.updatePlan(planId, { dateRangeEnd: newEndDate });
}
```

### 7. Invite Link Service (Backend)

**File**: `src/scheduling/invite-link-service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import * as inviteLinkRepository from './invite-link-repository';
import { InviteLink } from '../types/scheduling';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LINK_EXPIRY_DAYS = 30;

export async function generateInviteLink(
  planId: string,
  contactId: string
): Promise<InviteLink> {
  // Generate secure token
  const token = crypto.randomBytes(32).toString('base64url');
  
  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LINK_EXPIRY_DAYS);
  
  // Create link record
  const link = await inviteLinkRepository.createLink({
    id: uuidv4(),
    planId,
    contactId,
    token,
    expiresAt,
    accessedAt: null,
    submittedAt: null
  });
  
  return {
    ...link,
    url: `${BASE_URL}/availability/${token}`
  };
}

export async function validateInviteLink(token: string): Promise<{
  valid: boolean;
  planId?: string;
  contactId?: string;
  contactName?: string;
  error?: string;
}> {
  const link = await inviteLinkRepository.getLinkByToken(token);
  
  if (!link) {
    return { valid: false, error: 'Invalid invite link' };
  }
  
  if (new Date() > new Date(link.expiresAt)) {
    return { valid: false, error: 'Invite link has expired' };
  }
  
  // Check if plan is still active
  const plan = await inviteLinkRepository.getPlanStatus(link.planId);
  if (plan.status === 'cancelled') {
    return { valid: false, error: 'This plan has been cancelled' };
  }
  
  if (plan.status === 'scheduled' || plan.status === 'completed') {
    return { valid: false, error: 'This plan has already been finalized' };
  }
  
  // Track access
  await inviteLinkRepository.trackAccess(link.id);
  
  return {
    valid: true,
    planId: link.planId,
    contactId: link.contactId,
    contactName: link.contactName
  };
}

export async function regenerateInviteLink(
  planId: string,
  contactId: string
): Promise<InviteLink> {
  // Invalidate existing link
  await inviteLinkRepository.invalidateLink(planId, contactId);
  
  // Generate new link
  return generateInviteLink(planId, contactId);
}

export async function invalidateLinksForPlan(planId: string): Promise<void> {
  await inviteLinkRepository.invalidateAllLinksForPlan(planId);
}

export async function getLinksForPlan(planId: string): Promise<InviteLink[]> {
  const links = await inviteLinkRepository.getLinksForPlan(planId);
  return links.map(link => ({
    ...link,
    url: `${BASE_URL}/availability/${link.token}`
  }));
}

export async function markLinkSubmitted(token: string): Promise<void> {
  const link = await inviteLinkRepository.getLinkByToken(token);
  if (link) {
    await inviteLinkRepository.markSubmitted(link.id);
  }
}
```


## Data Models

### Database Schema

```sql
-- Catchup Plans table
CREATE TABLE catchup_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50),
  duration INTEGER NOT NULL DEFAULT 60, -- minutes
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  location TEXT,
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  finalized_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_date_range CHECK (date_range_end >= date_range_start),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'collecting_availability', 'ready_to_schedule', 'scheduled', 'completed', 'cancelled'))
);

CREATE INDEX idx_catchup_plans_user_id ON catchup_plans(user_id);
CREATE INDEX idx_catchup_plans_status ON catchup_plans(status);
CREATE INDEX idx_catchup_plans_finalized_time ON catchup_plans(finalized_time);

-- Plan Invitees table
CREATE TABLE plan_invitees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  attendance_type VARCHAR(20) NOT NULL DEFAULT 'must_attend',
  has_responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_attendance_type CHECK (attendance_type IN ('must_attend', 'nice_to_have')),
  UNIQUE(plan_id, contact_id)
);

CREATE INDEX idx_plan_invitees_plan_id ON plan_invitees(plan_id);
CREATE INDEX idx_plan_invitees_contact_id ON plan_invitees(contact_id);

-- Invitee Availability table
CREATE TABLE invitee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  invitee_name VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  available_slots JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plan_id, contact_id)
);

CREATE INDEX idx_invitee_availability_plan_id ON invitee_availability(plan_id);

-- Initiator Availability table (for plan creator)
CREATE TABLE initiator_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  available_slots JSONB NOT NULL DEFAULT '[]',
  source VARCHAR(20) DEFAULT 'manual', -- 'manual' or 'calendar'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plan_id, user_id)
);

-- Invite Links table
CREATE TABLE invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plan_id, contact_id)
);

CREATE INDEX idx_invite_links_token ON invite_links(token);
CREATE INDEX idx_invite_links_plan_id ON invite_links(plan_id);

-- Scheduling Preferences table
CREATE TABLE scheduling_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preferred_days JSONB DEFAULT '[]', -- [0,1,2,3,4,5,6] for days of week
  preferred_time_ranges JSONB DEFAULT '[]', -- [{"start": "09:00", "end": "12:00", "label": "mornings"}]
  preferred_durations JSONB DEFAULT '[60]', -- minutes
  favorite_locations JSONB DEFAULT '[]', -- ["Coffee Shop A", "Park B"]
  default_activity_type VARCHAR(50),
  apply_by_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduling Notifications table
CREATE TABLE scheduling_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (type IN (
    'availability_submitted',
    'plan_ready',
    'plan_finalized',
    'plan_cancelled',
    'reminder_sent'
  ))
);

CREATE INDEX idx_scheduling_notifications_user_id ON scheduling_notifications(user_id);
CREATE INDEX idx_scheduling_notifications_read_at ON scheduling_notifications(read_at);

-- Privacy Settings for Calendar Sharing
CREATE TABLE calendar_sharing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  share_with_inner_circle BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### TypeScript Types

**File**: `src/types/scheduling.ts`

```typescript
export type PlanStatus = 
  | 'draft'
  | 'collecting_availability'
  | 'ready_to_schedule'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export type AttendanceType = 'must_attend' | 'nice_to_have';

export type ActivityType = 'coffee' | 'dinner' | 'video_call' | 'activity' | 'other';

export interface CatchupPlan {
  id: string;
  userId: string;
  activityType?: ActivityType;
  duration: number; // minutes
  dateRangeStart: string;
  dateRangeEnd: string;
  location?: string;
  notes?: string;
  status: PlanStatus;
  finalizedTime?: string;
  invitees: PlanInvitee[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export interface PlanInvitee {
  id: string;
  planId: string;
  contactId: string;
  contactName: string;
  attendanceType: AttendanceType;
  hasResponded: boolean;
  createdAt: Date;
}

export interface InviteeAvailability {
  id: string;
  planId: string;
  contactId?: string;
  inviteeName: string;
  timezone: string;
  availableSlots: string[]; // Format: "YYYY-MM-DD_HH:mm"
  submittedAt: Date;
  updatedAt: Date;
}

export interface InitiatorAvailability {
  id: string;
  planId: string;
  userId: string;
  availableSlots: string[];
  source: 'manual' | 'calendar';
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteLink {
  id: string;
  planId: string;
  contactId: string;
  contactName?: string;
  token: string;
  url?: string;
  expiresAt: Date;
  accessedAt?: Date;
  submittedAt?: Date;
  invalidatedAt?: Date;
  createdAt: Date;
}

export interface SchedulingPreferences {
  id: string;
  userId: string;
  preferredDays: number[]; // 0-6 for Sunday-Saturday
  preferredTimeRanges: TimeRange[];
  preferredDurations: number[]; // minutes
  favoriteLocations: string[];
  defaultActivityType?: ActivityType;
  applyByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeRange {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  label?: string; // "mornings", "evenings", etc.
}

export interface SchedulingNotification {
  id: string;
  userId: string;
  planId: string;
  type: NotificationType;
  message: string;
  readAt?: Date;
  createdAt: Date;
}

export type NotificationType = 
  | 'availability_submitted'
  | 'plan_ready'
  | 'plan_finalized'
  | 'plan_cancelled'
  | 'reminder_sent';

export interface ConflictSuggestion {
  type: 'time_suggestion' | 'exclude_attendee' | 'activity_change';
  suggestedTime?: string;
  excludeeName?: string;
  alternativeActivity?: string;
  attendeeCount?: number;
  reasoning: string;
}

export interface CreatePlanData {
  userId: string;
  invitees: { contactId: string; attendanceType: AttendanceType }[];
  activityType?: ActivityType;
  duration: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  location?: string;
}

export interface CalendarSharingSettings {
  id: string;
  userId: string;
  shareWithInnerCircle: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties have been identified. After reflection, redundant properties have been consolidated.

### Property 1: Contact Search and Filter Accuracy

*For any* search query or filter (circle, group) applied in the contact picker, all displayed contacts should match the filter criteria, and no contacts that don't match should be displayed.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

### Property 2: Invite Link Uniqueness and Validity

*For any* catchup plan with N invitees, exactly N unique invite links should be generated, each with a valid token, correct expiry date (30 days), and properly formatted URL.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: Invite Link Access Tracking

*For any* invite link that is accessed, the accessed_at timestamp should be set to a non-null value, and for any link that has availability submitted, the submitted_at timestamp should also be set.

**Validates: Requirements 3.8**

### Property 4: Invite Link Regeneration Invalidates Old Link

*For any* invite link that is regenerated, the old token should be invalidated (invalidated_at set) and a new unique token should be created.

**Validates: Requirements 3.10**

### Property 5: Calendar Grid Time Slot Generation

*For any* date range, the calendar grid should generate time slots in 30-minute increments from 8:00 to 21:30, and the number of slots should equal (days in range) × 28 slots per day.

**Validates: Requirements 4.5, 4.6, 4.7**

### Property 6: Availability Submission Persistence

*For any* availability submission with valid data, the selected time slots should be stored in the database and retrievable, and a notification should be created for the plan initiator.

**Validates: Requirements 4.10, 13.1**

### Property 7: Initiator Calendar Auto-Population

*For any* plan initiator with a connected Google Calendar, the free time slots from their calendar within the plan's date range should be pre-selected as available.

**Validates: Requirements 5.2, 5.3**

### Property 8: Availability Overlap Calculation

*For any* set of participant availability data, the overlap calculation should correctly identify: (a) slots where all must-attend participants are available, (b) slots where N-1 must-attend are available, and (c) the count of available participants per slot.

**Validates: Requirements 6.3, 6.4, 6.5**

### Property 9: AI Suggestions Within Date Range

*For any* AI conflict resolution suggestion of type "time_suggestion", the suggested time should fall within the plan's date range and should have at least one participant available.

**Validates: Requirements 7.4, 7.7**

### Property 10: Privacy Setting Enforcement

*For any* user with calendar sharing disabled (default), their calendar event details should never be exposed to other users—only free/busy status should be visible during conflict resolution.

**Validates: Requirements 8.1, 8.3, 8.4**

### Property 11: Plan Finalization State Transition

*For any* plan that is finalized, the status should change to "scheduled", the finalized_time should be set, and notifications should be created for all participants who responded.

**Validates: Requirements 9.6, 9.7, 13.3**

### Property 12: Plan Filtering Accuracy

*For any* filter applied on the scheduling page (status, type), only plans matching the filter criteria should be displayed, and the count should match the actual number of matching plans.

**Validates: Requirements 10.4, 10.5, 10.6**

### Property 13: Plan State Management

*For any* plan edit operation on a non-finalized plan, the changes should be persisted. For any plan cancellation, the status should change to "cancelled" and all invite links should be invalidated.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

### Property 14: Notification Creation on Events

*For any* triggering event (availability submitted, plan ready, plan finalized, plan cancelled), a notification should be created with the correct type and message for the appropriate user(s).

**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

### Property 15: Scheduling Preferences Round-Trip

*For any* scheduling preferences saved by a user, retrieving the preferences should return the same values that were saved.

**Validates: Requirements 16.7, 16.11**

### Property 16: Quick Plan Circle/Group Pre-Population

*For any* quick plan action with a circle or group, all contacts in that circle/group should be pre-populated in the plan creation form.

**Validates: Requirements 17.3, 17.4**

### Property 17: View Preference Persistence

*For any* view preference (calendar/list) saved to localStorage, reloading the page should restore the same view preference.

**Validates: Requirements 1.7**

### Property 18: Date Range Validation

*For any* plan creation or date range extension, the date range should not exceed 14 days, and the end date should be after the start date.

**Validates: Requirements 2.11 (implicit), 12.8**

## Error Handling

### Frontend Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Failed to load plans | Display error message with retry button |
| Failed to create plan | Show error toast, keep form data for retry |
| Failed to copy link | Show error toast, provide manual copy instructions |
| Invalid invite link | Display friendly error page with contact info |
| Expired invite link | Display expiry message with option to request new link |
| Network timeout | Show timeout message, allow retry |
| Failed to submit availability | Show error toast, preserve selections for retry |

### Backend Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid plan data | Return 400 with validation errors |
| Plan not found | Return 404 |
| Unauthorized access | Return 403 |
| Database error | Return 500, log error, rollback transaction |
| AI service unavailable | Return partial response without AI suggestions |
| Calendar API error | Fall back to manual availability entry |

### API Error Responses

```typescript
// Standard error response format
interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  INVITE_LINK_EXPIRED: 'INVITE_LINK_EXPIRED',
  INVITE_LINK_INVALID: 'INVITE_LINK_INVALID',
  PLAN_ALREADY_FINALIZED: 'PLAN_ALREADY_FINALIZED',
  PLAN_CANCELLED: 'PLAN_CANCELLED',
  DATE_RANGE_EXCEEDED: 'DATE_RANGE_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
```

## Testing Strategy

### Unit Tests

Unit tests should cover:
- Contact filtering logic (search, circle, group filters)
- Invite link generation and validation
- Availability overlap calculation
- Date range validation
- Plan state transitions
- Notification creation logic

### Property-Based Tests

Property-based tests using fast-check should cover:
- **Property 1**: Contact filtering - generate random contacts and filters, verify results
- **Property 2**: Invite link generation - generate random invitee counts, verify uniqueness
- **Property 5**: Calendar grid generation - generate random date ranges, verify slot counts
- **Property 8**: Overlap calculation - generate random availability data, verify calculations
- **Property 15**: Preferences round-trip - generate random preferences, verify persistence
- **Property 18**: Date range validation - generate random date ranges, verify constraints

Each property test should run minimum 100 iterations.

### Manual Testing

Manual test files in `tests/html/`:
- `tests/html/scheduling-page.test.html` - Scheduling page UI testing
- `tests/html/plan-creation.test.html` - Plan creation flow testing
- `tests/html/availability-public.test.html` - Public availability page testing
- `tests/html/availability-dashboard.test.html` - Dashboard and overlap visualization

### Integration Tests

- End-to-end plan creation flow
- Invite link generation and access
- Availability submission and notification
- AI conflict resolution integration
- Plan finalization flow

### Test Data Generation

```typescript
// Generators for property-based tests
const contactArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  dunbarCircle: fc.constantFrom('inner', 'close', 'active', 'casual', undefined),
  groups: fc.array(fc.uuid(), { maxLength: 5 })
});

const dateRangeArbitrary = fc.tuple(
  fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
  fc.integer({ min: 1, max: 14 })
).map(([start, days]) => ({
  start,
  end: new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
}));

const availabilityArbitrary = fc.array(
  fc.string().filter(s => /^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/.test(s)),
  { minLength: 0, maxLength: 50 }
);
```
