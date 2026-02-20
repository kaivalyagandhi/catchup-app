# Design Document: Contact Onboarding & Simplified Circles

## Overview

This design document outlines the implementation of a streamlined 3-step onboarding flow and simplified 4-circle relationship management system for CatchUp. The design is grounded in Dunbar's research on cognitive limits of social relationships and Aristotle's theory of friendship, while maintaining the warm, cozy aesthetic of the Stone & Clay design system.

### Key Design Decisions

**1. Simplified from 5 to 4 Circles**
- Reduces cognitive load while maintaining research-backed structure
- Adjusted capacities: Inner Circle (10), Close Friends (25), Active Friends (50), Casual Network (100)
- Removes the 500+ Acquaintances tier to focus on actively maintained relationships

**2. 3-Step Guided Onboarding**
- Step 1: Connect integrations (Google Calendar & Contacts)
- Step 2: Organize contacts into circles
- Step 3: Review group mapping suggestions
- Persistent sidebar indicator tracks progress and allows non-linear navigation

**3. Reusable Manage Circles Flow**
- Same interface used during onboarding (Step 2) and post-onboarding
- Search + grid layout for efficient contact assignment
- Educational tips integrated throughout

**4. Design System Integration**
- Follows Stone & Clay theme with warm, earthy tones
- Supports Latte (light) and Espresso (dark) modes
- Uses CSS custom properties for consistent theming

## Architecture

### Component Hierarchy

```
OnboardingSystem
├── SidebarStepIndicator
│   ├── StepItem (Step 1: Integrations)
│   ├── StepItem (Step 2: Circles)
│   └── StepItem (Step 3: Groups)
├── Step1: IntegrationsConnection
│   └── PreferencesPage (existing)
├── Step2: ManageCirclesFlow
│   ├── CirclesEducationalPanel
│   ├── ContactSearchBar
│   ├── ContactGridView
│   └── CircleAssignmentPanel
└── Step3: GroupMappingReview
    └── GroupsTab (existing)
```

### State Management

```javascript
// Onboarding state stored in localStorage
const onboardingState = {
  isComplete: false,
  currentStep: 1,
  steps: {
    integrations: {
      complete: false,
      googleCalendar: false,
      googleContacts: false
    },
    circles: {
      complete: false,
      contactsCategorized: 0,
      totalContacts: 0
    },
    groups: {
      complete: false,
      mappingsReviewed: 0,
      totalMappings: 0
    }
  }
};
```


### Navigation Flow

```
User Entry Points:
1. New user (no contacts) → Auto-trigger Step 1
2. Existing user (incomplete onboarding) → Show sidebar indicator
3. Click step indicator → Navigate to appropriate page/section
4. Click "Manage Circles" button → Open Step 2 flow

Step 1: Integrations
├── Navigate to Preferences page
├── Highlight Google Calendar section
├── Highlight Google Contacts section
├── On successful connection → Mark step complete
└── Enable Step 2

Step 2: Circles
├── Navigate to Directory > Circles tab
├── Auto-open Manage Circles flow
├── Show educational tips
├── Display contact grid with search
├── Allow circle assignment
├── Track progress
└── Mark complete when sufficient contacts categorized

Step 3: Groups
├── Navigate to Directory > Groups tab
├── Display group mapping suggestions
├── Allow accept/reject of mappings
├── Track review progress
└── Mark complete when all mappings reviewed

Completion:
└── Hide sidebar indicator
```

## Components and Interfaces

### 1. Sidebar Step Indicator Component

**Purpose**: Persistent UI element showing onboarding progress and allowing navigation to any step.

**Visual Design**:
```
┌─────────────────────────┐
│ Get Started             │
├─────────────────────────┤
│ ✓ 1. Connect Accounts   │  <- Complete (green check)
│ → 2. Organize Circles   │  <- In Progress (arrow)
│   3. Review Groups      │  <- Incomplete (number only)
└─────────────────────────┘
```

**Implementation**:
```javascript
class OnboardingStepIndicator {
  constructor(state) {
    this.state = state;
  }
  
  render() {
    return `
      <div class="onboarding-indicator">
        <div class="onboarding-indicator__header">
          <span class="onboarding-indicator__title">Get Started</span>
          <button class="onboarding-indicator__dismiss" aria-label="Dismiss">
            <svg><!-- X icon --></svg>
          </button>
        </div>
        <div class="onboarding-indicator__steps">
          ${this.renderStep(1, 'Connect Accounts', this.state.steps.integrations.complete)}
          ${this.renderStep(2, 'Organize Circles', this.state.steps.circles.complete)}
          ${this.renderStep(3, 'Review Groups', this.state.steps.groups.complete)}
        </div>
      </div>
    `;
  }
  
  renderStep(number, label, isComplete) {
    const status = isComplete ? 'complete' : 
                   (this.state.currentStep === number ? 'active' : 'incomplete');
    const icon = isComplete ? '✓' : 
                 (this.state.currentStep === number ? '→' : number);
    
    return `
      <button 
        class="onboarding-step onboarding-step--${status}"
        data-step="${number}"
      >
        <span class="onboarding-step__icon">${icon}</span>
        <span class="onboarding-step__label">${number}. ${label}</span>
      </button>
    `;
  }
}
```

**Styling** (Stone & Clay theme):
```css
.onboarding-indicator {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 16px;
  margin: 16px;
}

.onboarding-indicator__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.onboarding-indicator__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.onboarding-step {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.onboarding-step:hover {
  background: var(--bg-hover);
}

.onboarding-step--complete .onboarding-step__icon {
  color: var(--status-success);
}

.onboarding-step--active {
  background: var(--accent-subtle);
}

.onboarding-step--active .onboarding-step__icon {
  color: var(--accent-primary);
}

.onboarding-step__label {
  font-size: 13px;
  color: var(--text-primary);
}
```


### 2. Manage Circles Flow Component

**Purpose**: Interface for assigning contacts to 4 simplified circles with search and educational tips.

**Visual Layout**:
```
┌────────────────────────────────────────────────────────────┐
│  Organize Your Circles                              [X]    │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 💡 Educational Tip: Dunbar's Research               │ │
│  │ Research shows most people maintain 10-25 close     │ │
│  │ friendships. Our 4-circle system helps you focus... │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🔍 Search contacts...                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Progress: 45/120 contacts categorized                    │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 38%                                │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Circle Capacities:                                  │  │
│  │ • Inner Circle: 3/10                                │  │
│  │ • Close Friends: 12/25                              │  │
│  │ • Active Friends: 20/50                             │  │
│  │ • Casual Network: 10/100                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  Contact Grid:                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│  │  JD    │ │  SK    │ │  AM    │ │  LW    │            │
│  │ John   │ │ Sarah  │ │ Alex   │ │ Lisa   │            │
│  │ [▼]    │ │ [▼]    │ │ [▼]    │ │ [▼]    │            │
│  └────────┘ └────────┘ └────────┘ └────────┘            │
│                                                            │
│  [Skip for Now]                    [Save & Continue]      │
└────────────────────────────────────────────────────────────┘
```

**Implementation**:
```javascript
class ManageCirclesFlow {
  constructor(contacts, currentAssignments) {
    this.contacts = contacts;
    this.assignments = currentAssignments;
    this.searchQuery = '';
    this.circles = [
      { id: 'inner', name: 'Inner Circle', capacity: 10, count: 0 },
      { id: 'close', name: 'Close Friends', capacity: 25, count: 0 },
      { id: 'active', name: 'Active Friends', capacity: 50, count: 0 },
      { id: 'casual', name: 'Casual Network', capacity: 100, count: 0 }
    ];
  }
  
  render() {
    return `
      <div class="manage-circles-modal">
        <div class="manage-circles__header">
          <h2>Organize Your Circles</h2>
          <button class="btn-close" aria-label="Close">×</button>
        </div>
        
        ${this.renderEducationalTip()}
        ${this.renderSearchBar()}
        ${this.renderProgress()}
        ${this.renderCircleCapacities()}
        ${this.renderContactGrid()}
        
        <div class="manage-circles__actions">
          <button class="btn-secondary">Skip for Now</button>
          <button class="btn-primary">Save & Continue</button>
        </div>
      </div>
    `;
  }
  
  renderEducationalTip() {
    return `
      <div class="educational-tip">
        <div class="educational-tip__icon">💡</div>
        <div class="educational-tip__content">
          <h4>Understanding Your Circles</h4>
          <p>Based on Dunbar's research, most people maintain 10-25 close 
          friendships. Our simplified 4-circle system helps you focus on 
          relationships that matter most.</p>
          <details>
            <summary>Learn more about the science</summary>
            <p><strong>Inner Circle (up to 10):</strong> Your closest confidants—
            people you'd call in a crisis. These are often virtue-based 
            friendships built on mutual respect and shared values.</p>
            <p><strong>Close Friends (up to 25):</strong> Good friends you 
            regularly share life updates with. Mix of virtue and pleasure-based 
            friendships.</p>
            <p><strong>Active Friends (up to 50):</strong> People you want to 
            stay connected with regularly. Often pleasure-based friendships 
            around shared activities.</p>
            <p><strong>Casual Network (up to 100):</strong> Acquaintances you 
            keep in touch with occasionally. Often utility-based professional 
            or contextual relationships.</p>
          </details>
        </div>
      </div>
    `;
  }
  
  renderSearchBar() {
    return `
      <div class="search-bar">
        <svg class="search-bar__icon"><!-- Search icon --></svg>
        <input 
          type="text" 
          class="search-bar__input"
          placeholder="Search contacts..."
          value="${this.searchQuery}"
        />
      </div>
    `;
  }
  
  renderProgress() {
    const categorized = this.contacts.filter(c => c.circle).length;
    const total = this.contacts.length;
    const percentage = Math.round((categorized / total) * 100);
    
    return `
      <div class="progress-section">
        <div class="progress-label">
          Progress: ${categorized}/${total} contacts categorized
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-percentage">${percentage}%</div>
      </div>
    `;
  }
  
  renderCircleCapacities() {
    return `
      <div class="circle-capacities">
        <h4>Circle Capacities:</h4>
        <ul class="circle-capacities__list">
          ${this.circles.map(circle => `
            <li class="circle-capacity">
              <span class="circle-capacity__name">${circle.name}:</span>
              <span class="circle-capacity__count">
                ${circle.count}/${circle.capacity}
              </span>
              ${circle.count > circle.capacity ? 
                '<span class="circle-capacity__warning">⚠️ Over capacity</span>' : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  
  renderContactGrid() {
    const filteredContacts = this.filterContacts();
    
    return `
      <div class="contact-grid">
        ${filteredContacts.map(contact => this.renderContactCard(contact)).join('')}
      </div>
    `;
  }
  
  renderContactCard(contact) {
    return `
      <div class="contact-card" data-contact-id="${contact.id}">
        <div class="contact-card__avatar ${this.getAvatarColor(contact)}">
          ${contact.initials}
        </div>
        <div class="contact-card__name">${contact.name}</div>
        <select class="contact-card__circle-select" data-contact-id="${contact.id}">
          <option value="">Select circle...</option>
          <option value="inner" ${contact.circle === 'inner' ? 'selected' : ''}>
            Inner Circle
          </option>
          <option value="close" ${contact.circle === 'close' ? 'selected' : ''}>
            Close Friends
          </option>
          <option value="active" ${contact.circle === 'active' ? 'selected' : ''}>
            Active Friends
          </option>
          <option value="casual" ${contact.circle === 'casual' ? 'selected' : ''}>
            Casual Network
          </option>
        </select>
        ${contact.aiSuggestion ? this.renderAISuggestion(contact.aiSuggestion) : ''}
      </div>
    `;
  }
  
  renderAISuggestion(suggestion) {
    return `
      <div class="ai-suggestion">
        <span class="ai-suggestion__label">Suggested:</span>
        <span class="ai-suggestion__circle">${suggestion.circleName}</span>
        <span class="ai-suggestion__confidence">${suggestion.confidence}%</span>
      </div>
    `;
  }
  
  getAvatarColor(contact) {
    const colors = ['avatar--sage', 'avatar--sand', 'avatar--rose', 'avatar--stone'];
    const index = contact.name.charCodeAt(0) % colors.length;
    return colors[index];
  }
  
  filterContacts() {
    if (!this.searchQuery) return this.contacts;
    const query = this.searchQuery.toLowerCase();
    return this.contacts.filter(c => 
      c.name.toLowerCase().includes(query)
    );
  }
}
```


**Styling** (Stone & Clay theme):
```css
.manage-circles-modal {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
}

.educational-tip {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--accent-subtle);
  border-left: 4px solid var(--accent-primary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.educational-tip__icon {
  font-size: 24px;
}

.educational-tip__content h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.educational-tip__content p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.educational-tip__content details {
  margin-top: 12px;
}

.educational-tip__content summary {
  cursor: pointer;
  color: var(--accent-primary);
  font-size: 13px;
  font-weight: 500;
}

.search-bar {
  position: relative;
  margin-bottom: 20px;
}

.search-bar__icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
}

.search-bar__input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.search-bar__input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.progress-section {
  margin-bottom: 20px;
}

.progress-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-bar__fill {
  height: 100%;
  background: var(--accent-primary);
  transition: width 0.3s ease;
}

.progress-percentage {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: right;
}

.circle-capacities {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.circle-capacities h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.circle-capacities__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.circle-capacity {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
}

.circle-capacity__name {
  color: var(--text-primary);
}

.circle-capacity__count {
  color: var(--text-secondary);
  font-weight: 500;
}

.circle-capacity__warning {
  color: var(--status-error);
  font-size: 12px;
  margin-left: 8px;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.contact-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: box-shadow 0.2s;
}

.contact-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.contact-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.avatar--sage { background: #d1fae5; color: #065f46; }
.avatar--sand { background: #fef3c7; color: #92400e; }
.avatar--rose { background: #fce7f3; color: #9d174d; }
.avatar--stone { background: #e7e5e4; color: #44403c; }

.contact-card__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
}

.contact-card__circle-select {
  width: 100%;
  padding: 8px;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
}

.contact-card__circle-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.ai-suggestion {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  background: var(--accent-subtle);
  border-radius: 4px;
  width: 100%;
  justify-content: center;
}

.ai-suggestion__label {
  color: var(--text-secondary);
}

.ai-suggestion__circle {
  color: var(--accent-primary);
  font-weight: 500;
}

.ai-suggestion__confidence {
  color: var(--text-tertiary);
}

.manage-circles__actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

/* Mobile responsive */
@media (max-width: 767px) {
  .contact-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }
  
  .manage-circles__actions {
    flex-direction: column;
  }
}
```


### 3. Step 1: Integrations Connection

**Purpose**: Guide users to connect Google Calendar and Google Contacts.

**Implementation Strategy**: Reuse existing Preferences page with highlighting and progress tracking.

```javascript
class Step1IntegrationsHandler {
  constructor(onboardingState) {
    this.state = onboardingState;
  }
  
  navigateToStep() {
    // Navigate to Preferences page
    window.location.hash = '#preferences';
    
    // Highlight integration sections
    this.highlightIntegrationSections();
    
    // Set up connection listeners
    this.setupConnectionListeners();
  }
  
  highlightIntegrationSections() {
    // Add visual highlight to Google Calendar and Contacts sections
    const calendarSection = document.querySelector('[data-integration="google-calendar"]');
    const contactsSection = document.querySelector('[data-integration="google-contacts"]');
    
    if (calendarSection) {
      calendarSection.classList.add('onboarding-highlight');
    }
    if (contactsSection) {
      contactsSection.classList.add('onboarding-highlight');
    }
  }
  
  setupConnectionListeners() {
    // Listen for successful connections
    window.addEventListener('google-calendar-connected', () => {
      this.state.steps.integrations.googleCalendar = true;
      this.checkStepCompletion();
    });
    
    window.addEventListener('google-contacts-connected', () => {
      this.state.steps.integrations.googleContacts = true;
      this.checkStepCompletion();
    });
  }
  
  checkStepCompletion() {
    const { googleCalendar, googleContacts } = this.state.steps.integrations;
    
    if (googleCalendar && googleContacts) {
      this.state.steps.integrations.complete = true;
      this.state.currentStep = 2;
      this.saveState();
      this.showCompletionMessage();
    }
  }
  
  showCompletionMessage() {
    showToast('Integrations connected! Ready to organize your circles.', 'success');
    
    // Prompt to continue to Step 2
    setTimeout(() => {
      if (confirm('Would you like to organize your contacts into circles now?')) {
        this.navigateToStep2();
      }
    }, 2000);
  }
  
  navigateToStep2() {
    window.location.hash = '#directory/circles';
    // Step 2 handler will auto-trigger Manage Circles flow
  }
  
  saveState() {
    localStorage.setItem('catchup-onboarding', JSON.stringify(this.state));
  }
}
```

**Styling for Highlighted Sections**:
```css
.onboarding-highlight {
  position: relative;
  animation: pulse-highlight 2s ease-in-out infinite;
}

.onboarding-highlight::before {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid var(--accent-primary);
  border-radius: 12px;
  pointer-events: none;
}

@keyframes pulse-highlight {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
```

### 4. Step 2: Circles Organization

**Purpose**: Open Manage Circles flow when user navigates to Circles tab during onboarding.

```javascript
class Step2CirclesHandler {
  constructor(onboardingState) {
    this.state = onboardingState;
    this.manageCirclesFlow = null;
  }
  
  navigateToStep() {
    // Navigate to Directory > Circles tab
    window.location.hash = '#directory/circles';
    
    // Auto-open Manage Circles flow
    setTimeout(() => {
      this.openManageCirclesFlow();
    }, 300);
  }
  
  openManageCirclesFlow() {
    // Fetch contacts
    const contacts = this.fetchContacts();
    const currentAssignments = this.fetchCurrentAssignments();
    
    // Create and show Manage Circles flow
    this.manageCirclesFlow = new ManageCirclesFlow(contacts, currentAssignments);
    this.showModal(this.manageCirclesFlow.render());
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for circle assignments
    document.addEventListener('circle-assigned', (e) => {
      this.handleCircleAssignment(e.detail);
    });
    
    // Listen for save action
    document.querySelector('.manage-circles__actions .btn-primary')
      .addEventListener('click', () => {
        this.saveAndContinue();
      });
    
    // Listen for skip action
    document.querySelector('.manage-circles__actions .btn-secondary')
      .addEventListener('click', () => {
        this.skipForNow();
      });
  }
  
  handleCircleAssignment(data) {
    const { contactId, circle } = data;
    
    // Update contact assignment
    this.updateContactCircle(contactId, circle);
    
    // Update progress
    this.updateProgress();
  }
  
  updateProgress() {
    const categorized = this.contacts.filter(c => c.circle).length;
    const total = this.contacts.length;
    
    this.state.steps.circles.contactsCategorized = categorized;
    this.state.steps.circles.totalContacts = total;
    
    // Check if sufficient contacts are categorized (at least 50%)
    if (categorized / total >= 0.5) {
      this.state.steps.circles.complete = true;
    }
    
    this.saveState();
  }
  
  saveAndContinue() {
    // Save all assignments
    this.saveAllAssignments();
    
    // Mark step complete
    this.state.steps.circles.complete = true;
    this.state.currentStep = 3;
    this.saveState();
    
    // Close modal
    this.closeModal();
    
    // Show success message
    showToast('Circles organized! Ready to review group mappings.', 'success');
    
    // Prompt to continue to Step 3
    setTimeout(() => {
      if (confirm('Would you like to review group mapping suggestions now?')) {
        this.navigateToStep3();
      }
    }, 2000);
  }
  
  skipForNow() {
    // Save current progress
    this.saveAllAssignments();
    this.saveState();
    
    // Close modal
    this.closeModal();
    
    showToast('Progress saved. You can continue organizing circles anytime.', 'info');
  }
  
  navigateToStep3() {
    window.location.hash = '#directory/groups';
  }
  
  saveState() {
    localStorage.setItem('catchup-onboarding', JSON.stringify(this.state));
  }
}
```


### 5. Step 3: Group Mapping Review

**Purpose**: Display and allow review of AI-generated group mapping suggestions.

**Implementation Strategy**: Enhance existing Groups tab with mapping suggestions UI.

```javascript
class Step3GroupMappingHandler {
  constructor(onboardingState) {
    this.state = onboardingState;
    this.mappings = [];
  }
  
  navigateToStep() {
    // Navigate to Directory > Groups tab
    window.location.hash = '#directory/groups';
    
    // Fetch and display mapping suggestions
    setTimeout(() => {
      this.loadMappingSuggestions();
    }, 300);
  }
  
  async loadMappingSuggestions() {
    try {
      const response = await fetch('/api/google-contacts/mapping-suggestions');
      this.mappings = await response.json();
      
      this.state.steps.groups.totalMappings = this.mappings.length;
      this.saveState();
      
      this.renderMappingSuggestions();
    } catch (error) {
      console.error('Failed to load mapping suggestions:', error);
      showToast('Failed to load group mappings', 'error');
    }
  }
  
  renderMappingSuggestions() {
    const container = document.getElementById('group-mappings-container');
    
    if (this.mappings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No group mapping suggestions available.</p>
          <button class="btn-primary" onclick="completeOnboarding()">
            Complete Onboarding
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="mapping-suggestions">
        <div class="mapping-suggestions__header">
          <h3>Review Group Mappings</h3>
          <p>We've suggested how your Google Contact groups map to CatchUp groups.</p>
        </div>
        <div class="mapping-suggestions__list">
          ${this.mappings.map(mapping => this.renderMappingCard(mapping)).join('')}
        </div>
        <div class="mapping-suggestions__actions">
          <button class="btn-secondary" onclick="skipGroupMappings()">
            Skip for Now
          </button>
          <button class="btn-primary" onclick="completeOnboarding()">
            Complete Onboarding
          </button>
        </div>
      </div>
    `;
    
    this.setupMappingListeners();
  }
  
  renderMappingCard(mapping) {
    return `
      <div class="mapping-card" data-mapping-id="${mapping.id}">
        <div class="mapping-card__content">
          <div class="mapping-card__source">
            <span class="mapping-card__label">Google Group:</span>
            <span class="mapping-card__name">${mapping.googleGroupName}</span>
            <span class="mapping-card__count">${mapping.memberCount} members</span>
          </div>
          <div class="mapping-card__arrow">→</div>
          <div class="mapping-card__target">
            <span class="mapping-card__label">CatchUp Group:</span>
            <select class="mapping-card__select" data-mapping-id="${mapping.id}">
              <option value="">Select group...</option>
              ${this.renderGroupOptions(mapping.suggestedGroupId)}
            </select>
          </div>
          <div class="mapping-card__confidence">
            <span class="confidence-badge confidence-badge--${this.getConfidenceLevel(mapping.confidence)}">
              ${mapping.confidence}% match
            </span>
          </div>
        </div>
        <div class="mapping-card__actions">
          <button 
            class="btn-accept" 
            data-mapping-id="${mapping.id}"
            ${mapping.suggestedGroupId ? '' : 'disabled'}
          >
            Accept
          </button>
          <button class="btn-reject" data-mapping-id="${mapping.id}">
            Skip
          </button>
        </div>
      </div>
    `;
  }
  
  renderGroupOptions(suggestedId) {
    // Fetch existing CatchUp groups
    const groups = this.fetchCatchUpGroups();
    
    return groups.map(group => `
      <option value="${group.id}" ${group.id === suggestedId ? 'selected' : ''}>
        ${group.name}
      </option>
    `).join('');
  }
  
  getConfidenceLevel(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }
  
  setupMappingListeners() {
    // Accept mapping
    document.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mappingId = e.target.dataset.mappingId;
        this.acceptMapping(mappingId);
      });
    });
    
    // Reject/skip mapping
    document.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mappingId = e.target.dataset.mappingId;
        this.rejectMapping(mappingId);
      });
    });
    
    // Group selection change
    document.querySelectorAll('.mapping-card__select').forEach(select => {
      select.addEventListener('change', (e) => {
        const mappingId = e.target.dataset.mappingId;
        const groupId = e.target.value;
        this.updateMappingSuggestion(mappingId, groupId);
      });
    });
  }
  
  async acceptMapping(mappingId) {
    const mapping = this.mappings.find(m => m.id === mappingId);
    const selectedGroupId = document.querySelector(
      `.mapping-card__select[data-mapping-id="${mappingId}"]`
    ).value;
    
    if (!selectedGroupId) {
      showToast('Please select a group first', 'error');
      return;
    }
    
    try {
      await fetch('/api/google-contacts/accept-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleGroupId: mapping.googleGroupId,
          catchupGroupId: selectedGroupId
        })
      });
      
      // Mark as reviewed
      mapping.reviewed = true;
      this.updateProgress();
      
      // Remove card with animation
      const card = document.querySelector(`[data-mapping-id="${mappingId}"]`);
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);
      
      showToast('Mapping accepted', 'success');
    } catch (error) {
      console.error('Failed to accept mapping:', error);
      showToast('Failed to accept mapping', 'error');
    }
  }
  
  rejectMapping(mappingId) {
    const mapping = this.mappings.find(m => m.id === mappingId);
    mapping.reviewed = true;
    mapping.rejected = true;
    
    this.updateProgress();
    
    // Remove card
    const card = document.querySelector(`[data-mapping-id="${mappingId}"]`);
    card.style.opacity = '0';
    setTimeout(() => card.remove(), 300);
    
    showToast('Mapping skipped', 'info');
  }
  
  updateProgress() {
    const reviewed = this.mappings.filter(m => m.reviewed).length;
    this.state.steps.groups.mappingsReviewed = reviewed;
    
    // Check if all mappings reviewed
    if (reviewed === this.mappings.length) {
      this.state.steps.groups.complete = true;
      this.completeOnboarding();
    }
    
    this.saveState();
  }
  
  completeOnboarding() {
    this.state.isComplete = true;
    this.saveState();
    
    // Hide onboarding indicator
    document.querySelector('.onboarding-indicator').style.display = 'none';
    
    // Show completion celebration
    this.showCompletionCelebration();
  }
  
  showCompletionCelebration() {
    const modal = document.createElement('div');
    modal.className = 'completion-modal';
    modal.innerHTML = `
      <div class="completion-modal__content">
        <div class="completion-modal__icon">🎉</div>
        <h2>You're All Set!</h2>
        <p>Your CatchUp account is ready. We'll start suggesting connections based on your circles and preferences.</p>
        <button class="btn-primary" onclick="this.closest('.completion-modal').remove()">
          Get Started
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  saveState() {
    localStorage.setItem('catchup-onboarding', JSON.stringify(this.state));
  }
}
```

**Styling for Group Mapping UI**:
```css
.mapping-suggestions {
  max-width: 800px;
  margin: 0 auto;
}

.mapping-suggestions__header {
  margin-bottom: 24px;
}

.mapping-suggestions__header h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 20px;
}

.mapping-suggestions__header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.mapping-suggestions__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.mapping-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px;
  transition: opacity 0.3s ease;
}

.mapping-card__content {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.mapping-card__source,
.mapping-card__target {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mapping-card__label {
  font-size: 12px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mapping-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.mapping-card__count {
  font-size: 12px;
  color: var(--text-secondary);
}

.mapping-card__arrow {
  font-size: 20px;
  color: var(--text-tertiary);
}

.mapping-card__select {
  padding: 8px 12px;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}

.confidence-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.confidence-badge--high {
  background: var(--status-success-bg);
  color: var(--status-success);
}

.confidence-badge--medium {
  background: #fef3c7;
  color: #92400e;
}

.confidence-badge--low {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.mapping-card__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-accept {
  padding: 8px 16px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-accept:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-reject {
  padding: 8px 16px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.mapping-suggestions__actions {
  display: flex;
  justify-content: space-between;
  padding-top: 24px;
  border-top: 1px solid var(--border-subtle);
}

.completion-modal {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.completion-modal__content {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 40px;
  max-width: 400px;
  text-align: center;
}

.completion-modal__icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.completion-modal__content h2 {
  margin: 0 0 12px 0;
  color: var(--text-primary);
  font-size: 24px;
}

.completion-modal__content p {
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

/* Mobile responsive */
@media (max-width: 767px) {
  .mapping-card__content {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .mapping-card__arrow {
    transform: rotate(90deg);
    text-align: center;
  }
  
  .mapping-card__actions {
    flex-direction: column;
  }
}
```


## Data Models

### Onboarding State Model

```typescript
interface OnboardingState {
  isComplete: boolean;
  currentStep: 1 | 2 | 3;
  dismissedAt?: Date;
  steps: {
    integrations: {
      complete: boolean;
      googleCalendar: boolean;
      googleContacts: boolean;
      connectedAt?: Date;
    };
    circles: {
      complete: boolean;
      contactsCategorized: number;
      totalContacts: number;
      lastUpdatedAt?: Date;
    };
    groups: {
      complete: boolean;
      mappingsReviewed: number;
      totalMappings: number;
      lastUpdatedAt?: Date;
    };
  };
}
```

### Contact Circle Assignment Model

```typescript
interface ContactCircleAssignment {
  contactId: string;
  circle: 'inner' | 'close' | 'active' | 'casual' | null;
  assignedAt: Date;
  assignedBy: 'user' | 'ai';
  aiSuggestion?: {
    suggestedCircle: 'inner' | 'close' | 'active' | 'casual';
    confidence: number; // 0-100
    reasons: string[];
  };
}
```

### Circle Definition Model

```typescript
interface CircleDefinition {
  id: 'inner' | 'close' | 'active' | 'casual';
  name: string;
  capacity: number;
  description: string;
  dunbarRange: string; // e.g., "5-10", "15-25"
  aristotleTypes: ('utility' | 'pleasure' | 'virtue')[];
  contactFrequency: string; // e.g., "Weekly", "Monthly"
}

const CIRCLE_DEFINITIONS: CircleDefinition[] = [
  {
    id: 'inner',
    name: 'Inner Circle',
    capacity: 10,
    description: 'Your closest confidants—people you'd call in a crisis',
    dunbarRange: '5-10',
    aristotleTypes: ['virtue', 'pleasure'],
    contactFrequency: 'Weekly or more'
  },
  {
    id: 'close',
    name: 'Close Friends',
    capacity: 25,
    description: 'Good friends you regularly share life updates with',
    dunbarRange: '15-25',
    aristotleTypes: ['virtue', 'pleasure'],
    contactFrequency: 'Bi-weekly to monthly'
  },
  {
    id: 'active',
    name: 'Active Friends',
    capacity: 50,
    description: 'People you want to stay connected with regularly',
    dunbarRange: '30-50',
    aristotleTypes: ['pleasure', 'utility', 'virtue'],
    contactFrequency: 'Monthly to quarterly'
  },
  {
    id: 'casual',
    name: 'Casual Network',
    capacity: 100,
    description: 'Acquaintances you keep in touch with occasionally',
    dunbarRange: '50-100',
    aristotleTypes: ['utility', 'pleasure'],
    contactFrequency: 'Quarterly to annually'
  }
];
```

### Group Mapping Suggestion Model

```typescript
interface GroupMappingSuggestion {
  id: string;
  googleGroupId: string;
  googleGroupName: string;
  memberCount: number;
  suggestedGroupId: string | null;
  suggestedGroupName: string | null;
  confidence: number; // 0-100
  reasons: string[];
  reviewed: boolean;
  accepted: boolean;
  rejected: boolean;
  reviewedAt?: Date;
}
```

### Database Schema Updates

```sql
-- Add circle column to contacts table
ALTER TABLE contacts 
ADD COLUMN circle VARCHAR(20) CHECK (circle IN ('inner', 'close', 'active', 'casual'));

-- Add AI suggestion tracking
ALTER TABLE contacts
ADD COLUMN circle_ai_suggestion VARCHAR(20),
ADD COLUMN circle_ai_confidence INTEGER,
ADD COLUMN circle_assigned_by VARCHAR(10) DEFAULT 'user',
ADD COLUMN circle_assigned_at TIMESTAMP;

-- Create onboarding state table
CREATE TABLE onboarding_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  is_complete BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 1,
  dismissed_at TIMESTAMP,
  integrations_complete BOOLEAN DEFAULT FALSE,
  google_calendar_connected BOOLEAN DEFAULT FALSE,
  google_contacts_connected BOOLEAN DEFAULT FALSE,
  circles_complete BOOLEAN DEFAULT FALSE,
  contacts_categorized INTEGER DEFAULT 0,
  total_contacts INTEGER DEFAULT 0,
  groups_complete BOOLEAN DEFAULT FALSE,
  mappings_reviewed INTEGER DEFAULT 0,
  total_mappings INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create group mapping suggestions table
CREATE TABLE group_mapping_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  google_group_id VARCHAR(255),
  google_group_name VARCHAR(255),
  member_count INTEGER,
  suggested_group_id INTEGER REFERENCES groups(id),
  confidence INTEGER,
  reasons JSONB,
  reviewed BOOLEAN DEFAULT FALSE,
  accepted BOOLEAN DEFAULT FALSE,
  rejected BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Onboarding Indicator Visibility
*For any* onboarding state where `isComplete` is false, the onboarding indicator element SHALL be present in the DOM and visible in the sidebar.
**Validates: Requirements 1.1**

### Property 2: Step Status Rendering
*For any* onboarding state, each step in the indicator SHALL display the correct visual status (complete, in-progress, or incomplete) based on the state's step completion flags.
**Validates: Requirements 1.2**

### Property 3: Step Navigation
*For any* step number (1, 2, or 3), clicking that step in the indicator SHALL navigate to the correct page/section: Step 1 → Preferences, Step 2 → Directory/Circles, Step 3 → Directory/Groups.
**Validates: Requirements 1.3, 2.1**

### Property 4: Dismiss and Resume Round-Trip
*For any* onboarding state, dismissing the onboarding and then resuming SHALL restore the exact same state including current step and all completion flags.
**Validates: Requirements 1.5, 12.2, 12.4**

### Property 5: Integration Completion Logic
*For any* combination of Google Calendar and Google Contacts connection states, Step 1 SHALL be marked complete if and only if both integrations are connected.
**Validates: Requirements 2.4, 2.5**

### Property 6: Circle Progress Calculation
*For any* number of contacts assigned to circles, the Step 2 progress SHALL equal (assigned contacts / total contacts) and Step 2 SHALL be complete when progress >= 50%.
**Validates: Requirements 3.5, 9.1**

### Property 7: Contact Search Filtering
*For any* search query and list of contacts, the filtered contact grid SHALL contain only contacts whose names include the search query (case-insensitive).
**Validates: Requirements 4.2**

### Property 8: Mapping Review Completion
*For any* set of group mapping suggestions, Step 3 SHALL be marked complete if and only if all mappings have been reviewed (accepted or rejected).
**Validates: Requirements 5.4, 5.5**

### Property 9: Manage Circles Component Reuse
*For any* invocation of the Manage Circles flow (from Step 2 or from the "Manage Circles" button), the rendered component SHALL be identical in structure and functionality.
**Validates: Requirements 6.2**

### Property 10: AI Suggestion Structure
*For any* contact with an AI circle suggestion, the suggestion SHALL include a suggested circle ID, a confidence score between 0-100, and at least one reason.
**Validates: Requirements 8.2**

### Property 11: Circle Capacity Warning
*For any* circle that has more assigned contacts than its recommended capacity, a visual warning SHALL be displayed without preventing further assignments.
**Validates: Requirements 9.3**

### Property 12: Circle Count Accuracy
*For any* set of contact-to-circle assignments, the displayed count for each circle SHALL equal the number of contacts assigned to that circle.
**Validates: Requirements 14.1, 14.2**

### Property 13: Theme Propagation
*For any* theme toggle between Latte and Espresso modes, all onboarding UI elements SHALL update to use the corresponding theme's CSS custom property values.
**Validates: Requirements 17.1**

### Property 14: Design System Compliance
*For any* onboarding UI element, the computed styles SHALL use CSS custom properties from the Stone & Clay theme (--bg-surface, --text-primary, --border-subtle, etc.).
**Validates: Requirements 16.1, 18.1**

### Property 15: Mobile Responsive Layout
*For any* viewport width less than 768px, the Manage Circles flow SHALL render with a single-column contact grid and stacked action buttons.
**Validates: Requirements 11.3**


## Error Handling

### Onboarding State Persistence Errors

**Scenario**: localStorage is unavailable or quota exceeded

**Handling**:
```javascript
function saveOnboardingState(state) {
  try {
    localStorage.setItem('catchup-onboarding', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save onboarding state:', error);
    
    // Fall back to session storage
    try {
      sessionStorage.setItem('catchup-onboarding', JSON.stringify(state));
      showToast('Progress saved for this session only', 'info');
    } catch (sessionError) {
      // Last resort: keep in memory only
      window.__onboardingState = state;
      showToast('Unable to save progress. Please complete onboarding in one session.', 'error');
    }
  }
}
```

### Integration Connection Failures

**Scenario**: Google Calendar or Contacts OAuth fails

**Handling**:
```javascript
async function connectGoogleCalendar() {
  try {
    const result = await initiateGoogleOAuth('calendar');
    if (result.success) {
      updateOnboardingState({ googleCalendar: true });
      showToast('Google Calendar connected successfully', 'success');
    }
  } catch (error) {
    console.error('Google Calendar connection failed:', error);
    
    let message = 'Failed to connect Google Calendar. ';
    if (error.code === 'popup_blocked') {
      message += 'Please allow popups for this site.';
    } else if (error.code === 'access_denied') {
      message += 'You denied access. Calendar integration is required for Step 1.';
    } else {
      message += 'Please try again or contact support.';
    }
    
    showToast(message, 'error');
    
    // Provide retry button
    showRetryButton('google-calendar');
  }
}
```

### Contact Data Loading Failures

**Scenario**: Unable to fetch contacts for circle assignment

**Handling**:
```javascript
async function loadContactsForCircleAssignment() {
  try {
    const response = await fetch('/api/contacts');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const contacts = await response.json();
    return contacts;
  } catch (error) {
    console.error('Failed to load contacts:', error);
    
    showToast('Unable to load contacts. Please refresh the page.', 'error');
    
    // Show empty state with retry
    return {
      contacts: [],
      error: true,
      retryable: true
    };
  }
}
```

### AI Suggestion Generation Failures

**Scenario**: AI service unavailable or times out

**Handling**:
```javascript
async function generateCircleSuggestions(contacts) {
  try {
    const response = await fetch('/api/ai/circle-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) throw new Error('AI service error');
    
    return await response.json();
  } catch (error) {
    console.error('AI suggestion generation failed:', error);
    
    // Gracefully degrade: return contacts without suggestions
    showToast('AI suggestions unavailable. You can still assign circles manually.', 'info');
    
    return contacts.map(contact => ({
      ...contact,
      aiSuggestion: null
    }));
  }
}
```

### Group Mapping API Failures

**Scenario**: Unable to fetch or save group mappings

**Handling**:
```javascript
async function loadGroupMappingSuggestions() {
  try {
    const response = await fetch('/api/google-contacts/mapping-suggestions');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    return await response.json();
  } catch (error) {
    console.error('Failed to load mapping suggestions:', error);
    
    // Allow user to skip Step 3 if mappings can't be loaded
    showToast('Unable to load group mappings. You can skip this step.', 'error');
    
    return {
      mappings: [],
      error: true,
      skippable: true
    };
  }
}

async function acceptGroupMapping(mapping) {
  try {
    const response = await fetch('/api/google-contacts/accept-mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping)
    });
    
    if (!response.ok) throw new Error('Failed to save mapping');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to accept mapping:', error);
    
    // Retry logic
    const retry = await showRetryDialog('Failed to save mapping. Retry?');
    if (retry) {
      return acceptGroupMapping(mapping); // Recursive retry
    }
    
    return { success: false, error };
  }
}
```

### Validation Errors

**Scenario**: Invalid circle assignments or incomplete data

**Handling**:
```javascript
function validateCircleAssignment(contactId, circle) {
  const errors = [];
  
  if (!contactId) {
    errors.push('Contact ID is required');
  }
  
  if (!['inner', 'close', 'active', 'casual'].includes(circle)) {
    errors.push('Invalid circle selection');
  }
  
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    showToast(errors.join('. '), 'error');
    return false;
  }
  
  return true;
}

function validateOnboardingCompletion(state) {
  const warnings = [];
  
  // Check if user has assigned enough contacts
  const assignmentRate = state.steps.circles.contactsCategorized / 
                         state.steps.circles.totalContacts;
  
  if (assignmentRate < 0.3) {
    warnings.push('You've only categorized ' + Math.round(assignmentRate * 100) + 
                  '% of your contacts. Consider organizing more for better suggestions.');
  }
  
  // Check circle balance
  const circleCounts = getCircleCounts();
  if (circleCounts.inner === 0) {
    warnings.push('Your Inner Circle is empty. Consider adding your closest friends.');
  }
  
  if (warnings.length > 0) {
    showWarningDialog(warnings.join('\n\n'), {
      continueText: 'Complete Anyway',
      cancelText: 'Keep Organizing'
    });
  }
  
  return warnings;
}
```

### Network Connectivity Issues

**Scenario**: User loses internet connection during onboarding

**Handling**:
```javascript
// Detect offline status
window.addEventListener('offline', () => {
  showToast('You're offline. Progress is saved locally and will sync when reconnected.', 'info');
  
  // Disable features that require network
  disableNetworkDependentFeatures();
});

window.addEventListener('online', () => {
  showToast('Back online. Syncing progress...', 'success');
  
  // Re-enable features and sync
  enableNetworkDependentFeatures();
  syncOnboardingProgress();
});

async function syncOnboardingProgress() {
  const localState = getLocalOnboardingState();
  
  try {
    await fetch('/api/onboarding/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localState)
    });
    
    showToast('Progress synced successfully', 'success');
  } catch (error) {
    console.error('Failed to sync onboarding progress:', error);
    // Will retry on next online event
  }
}
```


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure correctness. Unit tests verify specific examples and edge cases, while property tests verify universal properties across all inputs.

### Unit Tests

Unit tests will cover specific scenarios and edge cases:

**1. Onboarding State Management Tests**
- Verify initial state is created correctly for new users
- Verify state persists to localStorage
- Verify state loads from localStorage on page load
- Verify state updates when steps are completed
- Test edge case: all steps complete → indicator hidden
- Test edge case: dismissed onboarding → resume button shown

**2. Step Navigation Tests**
- Verify clicking Step 1 navigates to Preferences page
- Verify clicking Step 2 navigates to Directory/Circles
- Verify clicking Step 3 navigates to Directory/Groups
- Test example: Step 1 highlights integration sections

**3. Circle Assignment Tests**
- Verify contact can be assigned to each circle type
- Verify circle counts update after assignment
- Test edge case: empty search results show message
- Test example: 4 circles render with correct capacities

**4. Integration Connection Tests**
- Verify Google Calendar connection updates state
- Verify Google Contacts connection updates state
- Verify both connections mark Step 1 complete
- Test error handling for failed connections

**5. Group Mapping Tests**
- Verify mappings load and render correctly
- Verify accepting mapping updates state
- Verify rejecting mapping updates state
- Verify all reviewed → Step 3 complete

**6. Theme Integration Tests**
- Verify onboarding UI uses Stone & Clay CSS variables
- Verify theme toggle updates onboarding elements
- Test example: educational tips use --accent-subtle background

**7. Mobile Responsive Tests**
- Verify contact grid switches to single column on mobile
- Verify action buttons stack vertically on mobile
- Test viewport width < 768px triggers mobile layout

### Property-Based Tests

Property-based tests will use **fast-check** library for JavaScript. Each test MUST run a minimum of 100 iterations and be tagged with the format: `**Feature: contact-onboarding, Property {number}: {property_text}**`

**Property Test 1: Onboarding Indicator Visibility**
```javascript
// **Feature: contact-onboarding, Property 1: Onboarding Indicator Visibility**
fc.assert(
  fc.property(
    fc.record({
      isComplete: fc.boolean(),
      currentStep: fc.integer({ min: 1, max: 3 })
    }),
    (state) => {
      renderOnboardingIndicator(state);
      const indicator = document.querySelector('.onboarding-indicator');
      
      if (state.isComplete) {
        return indicator === null || indicator.style.display === 'none';
      } else {
        return indicator !== null && indicator.style.display !== 'none';
      }
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 2: Step Status Rendering**
```javascript
// **Feature: contact-onboarding, Property 2: Step Status Rendering**
fc.assert(
  fc.property(
    fc.record({
      steps: fc.record({
        integrations: fc.record({ complete: fc.boolean() }),
        circles: fc.record({ complete: fc.boolean() }),
        groups: fc.record({ complete: fc.boolean() })
      }),
      currentStep: fc.integer({ min: 1, max: 3 })
    }),
    (state) => {
      renderOnboardingIndicator(state);
      
      const step1 = document.querySelector('[data-step="1"]');
      const step2 = document.querySelector('[data-step="2"]');
      const step3 = document.querySelector('[data-step="3"]');
      
      const step1Status = state.steps.integrations.complete ? 'complete' :
                          (state.currentStep === 1 ? 'active' : 'incomplete');
      const step2Status = state.steps.circles.complete ? 'complete' :
                          (state.currentStep === 2 ? 'active' : 'incomplete');
      const step3Status = state.steps.groups.complete ? 'complete' :
                          (state.currentStep === 3 ? 'active' : 'incomplete');
      
      return step1.classList.contains(`onboarding-step--${step1Status}`) &&
             step2.classList.contains(`onboarding-step--${step2Status}`) &&
             step3.classList.contains(`onboarding-step--${step3Status}`);
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 3: Step Navigation**
```javascript
// **Feature: contact-onboarding, Property 3: Step Navigation**
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 3 }),
    (stepNumber) => {
      const expectedPaths = {
        1: '#preferences',
        2: '#directory/circles',
        3: '#directory/groups'
      };
      
      clickOnboardingStep(stepNumber);
      
      return window.location.hash === expectedPaths[stepNumber];
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 4: Dismiss and Resume Round-Trip**
```javascript
// **Feature: contact-onboarding, Property 4: Dismiss and Resume Round-Trip**
fc.assert(
  fc.property(
    fc.record({
      isComplete: fc.constant(false),
      currentStep: fc.integer({ min: 1, max: 3 }),
      steps: fc.record({
        integrations: fc.record({
          complete: fc.boolean(),
          googleCalendar: fc.boolean(),
          googleContacts: fc.boolean()
        }),
        circles: fc.record({
          complete: fc.boolean(),
          contactsCategorized: fc.integer({ min: 0, max: 200 }),
          totalContacts: fc.integer({ min: 0, max: 200 })
        }),
        groups: fc.record({
          complete: fc.boolean(),
          mappingsReviewed: fc.integer({ min: 0, max: 50 }),
          totalMappings: fc.integer({ min: 0, max: 50 })
        })
      })
    }),
    (initialState) => {
      // Save state
      saveOnboardingState(initialState);
      
      // Dismiss
      dismissOnboarding();
      
      // Resume
      const resumedState = loadOnboardingState();
      
      // Verify state is identical
      return JSON.stringify(initialState) === JSON.stringify(resumedState);
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 5: Integration Completion Logic**
```javascript
// **Feature: contact-onboarding, Property 5: Integration Completion Logic**
fc.assert(
  fc.property(
    fc.record({
      googleCalendar: fc.boolean(),
      googleContacts: fc.boolean()
    }),
    (integrations) => {
      const state = {
        steps: {
          integrations: {
            ...integrations,
            complete: false
          }
        }
      };
      
      updateIntegrationState(state);
      
      const expectedComplete = integrations.googleCalendar && integrations.googleContacts;
      return state.steps.integrations.complete === expectedComplete;
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 6: Circle Progress Calculation**
```javascript
// **Feature: contact-onboarding, Property 6: Circle Progress Calculation**
fc.assert(
  fc.property(
    fc.record({
      assigned: fc.integer({ min: 0, max: 200 }),
      total: fc.integer({ min: 1, max: 200 })
    }),
    ({ assigned, total }) => {
      const state = {
        steps: {
          circles: {
            contactsCategorized: assigned,
            totalContacts: total,
            complete: false
          }
        }
      };
      
      updateCircleProgress(state);
      
      const expectedProgress = assigned / total;
      const expectedComplete = expectedProgress >= 0.5;
      
      return state.steps.circles.complete === expectedComplete;
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 7: Contact Search Filtering**
```javascript
// **Feature: contact-onboarding, Property 7: Contact Search Filtering**
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.string(),
      name: fc.string({ minLength: 1, maxLength: 50 })
    })),
    fc.string(),
    (contacts, query) => {
      const filtered = filterContacts(contacts, query);
      
      // All filtered contacts should match the query
      return filtered.every(contact => 
        contact.name.toLowerCase().includes(query.toLowerCase())
      );
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 8: Mapping Review Completion**
```javascript
// **Feature: contact-onboarding, Property 8: Mapping Review Completion**
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.string(),
      reviewed: fc.boolean(),
      accepted: fc.boolean(),
      rejected: fc.boolean()
    })),
    (mappings) => {
      const state = {
        steps: {
          groups: {
            mappingsReviewed: mappings.filter(m => m.reviewed).length,
            totalMappings: mappings.length,
            complete: false
          }
        }
      };
      
      updateGroupMappingProgress(state, mappings);
      
      const allReviewed = mappings.every(m => m.reviewed);
      return state.steps.groups.complete === allReviewed;
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 9: Circle Count Accuracy**
```javascript
// **Feature: contact-onboarding, Property 12: Circle Count Accuracy**
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.string(),
      circle: fc.constantFrom('inner', 'close', 'active', 'casual', null)
    })),
    (contacts) => {
      const counts = calculateCircleCounts(contacts);
      
      const expectedCounts = {
        inner: contacts.filter(c => c.circle === 'inner').length,
        close: contacts.filter(c => c.circle === 'close').length,
        active: contacts.filter(c => c.circle === 'active').length,
        casual: contacts.filter(c => c.circle === 'casual').length
      };
      
      return JSON.stringify(counts) === JSON.stringify(expectedCounts);
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 10: Theme Propagation**
```javascript
// **Feature: contact-onboarding, Property 13: Theme Propagation**
fc.assert(
  fc.property(
    fc.constantFrom('light', 'dark'),
    (theme) => {
      setTheme(theme);
      renderOnboardingUI();
      
      const elements = document.querySelectorAll('.onboarding-indicator, .manage-circles-modal, .educational-tip');
      
      return Array.from(elements).every(el => {
        const bgColor = getComputedStyle(el).backgroundColor;
        // Verify it's using CSS variables (not hardcoded colors)
        return bgColor !== 'rgb(255, 255, 255)' && bgColor !== 'rgb(0, 0, 0)';
      });
    }
  ),
  { numRuns: 100 }
);
```

### Test File Organization

```
tests/
├── unit/
│   ├── onboarding-state.test.js
│   ├── step-navigation.test.js
│   ├── circle-assignment.test.js
│   ├── integration-connection.test.js
│   ├── group-mapping.test.js
│   ├── theme-integration.test.js
│   └── mobile-responsive.test.js
└── property/
    ├── indicator-visibility.property.test.js
    ├── step-status.property.test.js
    ├── step-navigation.property.test.js
    ├── dismiss-resume.property.test.js
    ├── integration-completion.property.test.js
    ├── circle-progress.property.test.js
    ├── contact-search.property.test.js
    ├── mapping-completion.property.test.js
    ├── circle-counts.property.test.js
    └── theme-propagation.property.test.js
```

### Integration Testing

**End-to-End Onboarding Flow Test**:
```javascript
describe('Complete Onboarding Flow', () => {
  it('should guide user through all 3 steps', async () => {
    // Start as new user
    clearOnboardingState();
    
    // Step 1: Connect integrations
    await navigateToStep(1);
    expect(window.location.hash).toBe('#preferences');
    
    await connectGoogleCalendar();
    await connectGoogleContacts();
    
    const state1 = loadOnboardingState();
    expect(state1.steps.integrations.complete).toBe(true);
    expect(state1.currentStep).toBe(2);
    
    // Step 2: Organize circles
    await navigateToStep(2);
    expect(window.location.hash).toBe('#directory/circles');
    
    const contacts = await loadContacts();
    for (let i = 0; i < Math.ceil(contacts.length / 2); i++) {
      await assignContactToCircle(contacts[i].id, 'close');
    }
    
    const state2 = loadOnboardingState();
    expect(state2.steps.circles.complete).toBe(true);
    expect(state2.currentStep).toBe(3);
    
    // Step 3: Review group mappings
    await navigateToStep(3);
    expect(window.location.hash).toBe('#directory/groups');
    
    const mappings = await loadGroupMappings();
    for (const mapping of mappings) {
      await acceptMapping(mapping.id);
    }
    
    const state3 = loadOnboardingState();
    expect(state3.steps.groups.complete).toBe(true);
    expect(state3.isComplete).toBe(true);
    
    // Verify indicator is hidden
    const indicator = document.querySelector('.onboarding-indicator');
    expect(indicator).toBeNull();
  });
});
```

