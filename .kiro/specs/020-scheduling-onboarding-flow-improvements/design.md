# Design Document: Onboarding Flow Improvements

## Overview

This design document describes the technical implementation for improving the CatchUp contact onboarding flow. The improvements focus on simplifying the user experience by removing the confusing Smart Batching step, adding more user control through contact search and manual selection, implementing archive functionality in Quick Refine, and providing a mode toggle between AI-assisted and manual circle management.

The key changes are:
1. **Remove Smart Batching** - Simplify the flow from 3 steps to 2 steps (AI Quick Start → Quick Refine)
2. **Contact Search in AI Quick Start** - Allow users to search and manually add contacts to Inner Circle suggestions
3. **Inner Circle Capacity Check** - Skip AI Quick Start when Inner Circle is already at capacity
4. **Archive from Quick Refine** - Add archive button to Quick Refine cards with undo support
5. **Mode Toggle** - Add toggle in modal to switch between AI-assisted and manual modes
6. **Restore Manual Mode** - Bring back the traditional ManageCirclesFlow as an option

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Circle Management Modal                       │
│  (Triggered from Directory → Circles → "Manage Circles")        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Mode Toggle: [AI-Assisted] [Manual]                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │   AI-Assisted Mode (default):                           │    │
│  │   ┌──────────────┐    ┌──────────────┐                 │    │
│  │   │ AI Quick     │ → │ Quick        │                  │    │
│  │   │ Start        │    │ Refine       │                  │    │
│  │   │ (Step 1)     │    │ (Step 2)     │                  │    │
│  │   └──────────────┘    └──────────────┘                 │    │
│  │                                                         │    │
│  │   Manual Mode:                                          │    │
│  │   ┌──────────────────────────────────────────────────┐ │    │
│  │   │ CircleListView                                   │ │    │
│  │   │ - Search bar to find/add contacts                │ │    │
│  │   │ - Circle sections with contact chips             │ │    │
│  │   │ - Remove (×) buttons on each contact             │ │    │
│  │   │ - Uncategorized section                          │ │    │
│  │   └──────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
Frontend Components:
├── step2-circles-handler.js (Modified)
│   ├── Remove startBatchSuggestionsFlow()
│   ├── Add checkInnerCircleCapacity()
│   ├── Add mode toggle handling
│   └── Update step indicators
│
├── quick-start-flow.js (Modified)
│   ├── Add "Search & Add More" button
│   ├── Add ContactSearchModal integration
│   └── Handle capacity limits
│
├── quick-refine-card.js (Modified)
│   ├── Add Archive button
│   ├── Add keyboard shortcut "A"
│   └── Add undo functionality
│
├── contact-search-modal.js (New)
│   ├── Search input with debounce
│   ├── Contact list with checkboxes
│   ├── Capacity indicator
│   └── Selection management
│
├── mode-toggle.js (New)
│   ├── Segmented control UI
│   ├── Mode switching logic
│   └── Preference persistence
│
└── manage-circles-flow.js (Existing - restored)
    └── Traditional grid view with search

Backend Services:
├── onboarding-service.ts (Modified)
│   ├── getInnerCircleCount()
│   └── shouldSkipQuickStart()
│
└── contacts/repository.ts (Existing)
    └── archiveContact() - already exists
```

## Components and Interfaces

### 1. Mode Toggle Component

**File**: `public/js/mode-toggle.js`

```javascript
class ModeToggle {
  constructor(options) {
    this.containerId = options.containerId;
    this.onModeChange = options.onModeChange;
    this.currentMode = this.loadSavedMode() || 'ai-assisted';
  }
  
  // Render segmented control
  render() { ... }
  
  // Handle mode switch
  handleModeChange(mode) { ... }
  
  // Persist preference
  saveMode(mode) {
    localStorage.setItem('circle-management-mode', mode);
  }
  
  // Load saved preference
  loadSavedMode() {
    return localStorage.getItem('circle-management-mode');
  }
}
```

**Interface**:
```typescript
interface ModeToggleOptions {
  containerId: string;
  onModeChange: (mode: 'ai-assisted' | 'manual') => void;
  defaultMode?: 'ai-assisted' | 'manual';
}
```

### 2. Manual Mode Circle View Component

**File**: `public/js/circle-list-view.js` (New)

This component provides a clear view of contacts organized by circle with add/remove functionality. It is displayed **within the circle management modal when the user selects "Manual" mode** via the mode toggle. It replaces the AI-assisted flow (Quick Start → Quick Refine) with a single, comprehensive view.

**Where it lives**:
- Rendered inside the existing `manage-circles-modal` container
- Shown when mode toggle is set to "Manual"
- Also accessible from Directory page → Circles tab → "Manage Circles" button

```javascript
class CircleListView {
  constructor(options) {
    this.containerId = options.containerId;
    this.contacts = [];
    this.onContactMove = options.onContactMove;
    this.onContactRemove = options.onContactRemove;
    this.searchQuery = '';
  }
  
  // Render the circle list view
  render() {
    return `
      <div class="circle-list-view">
        <div class="circle-list-search">
          <input type="search" placeholder="Search contacts to add..." id="circle-search-input">
          <div class="search-results" id="circle-search-results"></div>
        </div>
        
        <div class="circles-container">
          ${this.renderCircleSection('inner', 'Inner Circle', 10)}
          ${this.renderCircleSection('close', 'Close Friends', 25)}
          ${this.renderCircleSection('active', 'Active Friends', 50)}
          ${this.renderCircleSection('casual', 'Casual Network', 100)}
        </div>
        
        <div class="uncategorized-section">
          <h4>Uncategorized (${this.getUncategorizedCount()})</h4>
          <div class="uncategorized-contacts" id="uncategorized-list">
            ${this.renderUncategorizedContacts()}
          </div>
        </div>
      </div>
    `;
  }
  
  // Render a single circle section with its contacts
  renderCircleSection(circleId, circleName, capacity) {
    const circleContacts = this.getContactsByCircle(circleId);
    const count = circleContacts.length;
    const isOverCapacity = count > capacity;
    
    return `
      <div class="circle-section" data-circle="${circleId}">
        <div class="circle-header">
          <h4>${circleName}</h4>
          <span class="circle-count ${isOverCapacity ? 'over-capacity' : ''}">${count}/${capacity}</span>
        </div>
        <div class="circle-contacts" id="circle-${circleId}-contacts">
          ${circleContacts.map(c => this.renderContactChip(c, circleId)).join('')}
          <button class="add-contact-btn" data-circle="${circleId}">+ Add</button>
        </div>
      </div>
    `;
  }
  
  // Render a contact chip with remove button
  renderContactChip(contact, circleId) {
    return `
      <div class="contact-chip" data-contact-id="${contact.id}">
        <span class="contact-name">${this.escapeHtml(contact.name)}</span>
        <button class="remove-btn" data-contact-id="${contact.id}" data-circle="${circleId}" title="Remove from circle">×</button>
      </div>
    `;
  }
  
  // Handle search input
  handleSearch(query) {
    this.searchQuery = query;
    this.renderSearchResults();
  }
  
  // Render search results dropdown
  renderSearchResults() {
    const results = this.filterContactsForSearch();
    const container = document.getElementById('circle-search-results');
    
    if (!this.searchQuery || results.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    
    container.innerHTML = results.map(contact => `
      <div class="search-result-item" data-contact-id="${contact.id}">
        <span class="contact-name">${this.escapeHtml(contact.name)}</span>
        <span class="current-circle">${contact.circle || 'Uncategorized'}</span>
        <div class="quick-assign-buttons">
          <button data-circle="inner" title="Inner Circle">💜</button>
          <button data-circle="close" title="Close Friends">💗</button>
          <button data-circle="active" title="Active Friends">💚</button>
          <button data-circle="casual" title="Casual Network">💙</button>
        </div>
      </div>
    `).join('');
    
    container.style.display = 'block';
  }
  
  // Move contact to a different circle
  async moveContact(contactId, targetCircle) {
    await this.onContactMove(contactId, targetCircle);
    this.refresh();
  }
  
  // Remove contact from circle (set to uncategorized)
  async removeFromCircle(contactId) {
    await this.onContactRemove(contactId);
    this.refresh();
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Search contacts to add...                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Search results dropdown (when typing)                   │    │
│  │ [John Doe] [Uncategorized] [💜] [💗] [💚] [💙]          │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  💜 Inner Circle (5/10)                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Alice ×] [Bob ×] [Carol ×] [Dave ×] [Eve ×] [+ Add]   │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  💗 Close Friends (12/25)                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Frank ×] [Grace ×] [Henry ×] ... [+ Add]              │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  💚 Active Friends (23/50)                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Ivan ×] [Julia ×] [Kevin ×] ... [+ Add]               │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  💙 Casual Network (45/100)                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Leo ×] [Maria ×] [Nick ×] ... [+ Add]                 │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Uncategorized (15)                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Oscar] [Pam] [Quinn] ... (click to assign)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Contact Search Modal Component

**File**: `public/js/contact-search-modal.js`

```javascript
class ContactSearchModal {
  constructor(options) {
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
    this.excludeContactIds = options.excludeContactIds || [];
    this.maxSelections = options.maxSelections || 10;
    this.selectedContacts = new Map();
    this.searchQuery = '';
    this.contacts = [];
  }
  
  // Open modal and fetch contacts
  async open() { ... }
  
  // Handle search input with debounce
  handleSearch(query) { ... }
  
  // Filter contacts based on search
  filterContacts() { ... }
  
  // Handle contact selection
  handleContactSelect(contactId, isSelected) { ... }
  
  // Confirm selection
  handleConfirm() { ... }
  
  // Close modal
  close() { ... }
}
```

**Interface**:
```typescript
interface ContactSearchModalOptions {
  onSelect: (contacts: Contact[]) => void;
  onCancel: () => void;
  excludeContactIds: string[];
  maxSelections: number;
  currentSelectionCount: number;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  circle?: string;
}
```

### 3. Modified Quick Refine Card

**File**: `public/js/quick-refine-card.js` (Modified)

Add archive functionality:

```javascript
// New method for archive action
async handleArchive() {
  const contact = this.contacts[this.currentIndex];
  
  try {
    const response = await fetch(`/api/contacts/${contact.id}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to archive contact');
    
    // Store for undo
    this.lastArchivedContact = {
      contact,
      index: this.currentIndex,
      timestamp: Date.now()
    };
    
    // Show undo toast
    this.showArchiveUndoToast(contact);
    
    // Move to next contact
    this.contacts.splice(this.currentIndex, 1);
    this.render();
    
  } catch (error) {
    showToast(`Failed to archive: ${error.message}`, 'error');
  }
}

// Undo archive action
async handleUndoArchive() {
  if (!this.lastArchivedContact) return;
  
  const { contact, index } = this.lastArchivedContact;
  
  try {
    await fetch(`/api/contacts/${contact.id}/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    // Restore contact to list
    this.contacts.splice(index, 0, contact);
    this.currentIndex = index;
    this.lastArchivedContact = null;
    this.render();
    
  } catch (error) {
    showToast(`Failed to restore: ${error.message}`, 'error');
  }
}
```

### 4. Modified Step2CirclesHandler

**File**: `public/js/step2-circles-handler.js` (Modified)

Key changes:
- Remove `startBatchSuggestionsFlow()` method
- Add `checkInnerCircleCapacity()` method
- Add mode toggle integration
- Update step flow to skip directly to Quick Refine

```javascript
// Check if Inner Circle is at capacity
async checkInnerCircleCapacity() {
  try {
    const response = await fetch(`/api/contacts/circle-counts?userId=${this.userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    
    if (!response.ok) return { count: 0, capacity: 10, isFull: false };
    
    const data = await response.json();
    const innerCount = data.inner || 0;
    const capacity = 10; // Dunbar's Inner Circle capacity
    
    return {
      count: innerCount,
      capacity,
      isFull: innerCount >= capacity,
      remaining: Math.max(0, capacity - innerCount)
    };
  } catch (error) {
    console.error('Error checking Inner Circle capacity:', error);
    return { count: 0, capacity: 10, isFull: false, remaining: 10 };
  }
}

// Modified flow - skip Smart Batching
async openManageCirclesFlow() {
  // Check saved mode preference
  const savedMode = localStorage.getItem('circle-management-mode');
  
  if (savedMode === 'manual') {
    await this.openManualMode();
    return;
  }
  
  // Check Inner Circle capacity
  const capacityInfo = await this.checkInnerCircleCapacity();
  
  if (capacityInfo.isFull) {
    showToast('Your Inner Circle is full! Moving to Quick Refine.', 'info');
    await this.startQuickRefineFlow();
    return;
  }
  
  // Start AI Quick Start (with capacity limit)
  await this.startQuickStartFlow(capacityInfo.remaining);
}

// Handle Quick Start completion - go directly to Quick Refine
async handleQuickStartComplete(assignedContactIds) {
  this.updateProgress();
  // Skip Smart Batching - go directly to Quick Refine
  await this.startQuickRefineFlow();
}
```

### 5. Modified Quick Start Flow

**File**: `public/js/quick-start-flow.js` (Modified)

Add search functionality:

```javascript
// Add "Search & Add More" button to render
renderActions() {
  return `
    <div class="quick-start-actions">
      <button class="quick-start-btn btn-primary" id="accept-all">
        Accept All ${this.contacts.length}
      </button>
      <button class="quick-start-btn btn-secondary" id="search-add-more">
        Search & Add More
      </button>
      <button class="quick-start-btn btn-secondary" id="review-individually">
        Review Individually
      </button>
      <button class="quick-start-btn btn-text" id="skip-quick-start">
        Skip for Now
      </button>
    </div>
  `;
}

// Handle search and add more
handleSearchAddMore() {
  const excludeIds = this.contacts.map(c => c.contactId);
  const currentCount = this.contacts.length;
  const maxSelections = 10 - currentCount;
  
  const searchModal = new ContactSearchModal({
    excludeContactIds: excludeIds,
    maxSelections: maxSelections,
    currentSelectionCount: currentCount,
    onSelect: (selectedContacts) => {
      this.addContactsToSuggestions(selectedContacts);
    },
    onCancel: () => {}
  });
  
  searchModal.open();
}

// Add selected contacts to suggestions
addContactsToSuggestions(contacts) {
  contacts.forEach(contact => {
    this.contacts.push({
      contactId: contact.id,
      name: contact.name,
      reasons: ['Manually selected'],
      confidence: 100
    });
    this.selectedContacts.set(contact.id, true);
  });
  
  // Re-render
  const container = document.getElementById(this.containerId);
  container.innerHTML = this.renderSuggestions();
  this.attachEventListeners();
}
```

## Data Models

### User Preferences (localStorage)

```typescript
interface UserPreferences {
  'circle-management-mode': 'ai-assisted' | 'manual';
}
```

### Circle Capacity Response

```typescript
interface CircleCountsResponse {
  inner: number;
  close: number;
  active: number;
  casual: number;
}
```

### Archive Contact Request/Response

```typescript
// POST /api/contacts/:id/archive
interface ArchiveContactResponse {
  success: boolean;
  archivedAt: string;
}

// POST /api/contacts/:id/restore
interface RestoreContactResponse {
  success: boolean;
  restoredAt: string;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties have been identified. After reflection, redundant properties have been consolidated.

### Property 1: Smart Batching Step Never Rendered

*For any* user entering the Continue Organizing flow, the Smart Batching step should never be rendered or executed, and the flow should proceed directly from AI Quick Start to Quick Refine.

**Validates: Requirements 1.1, 1.2**

### Property 2: Progress Preservation Across Step Transitions

*For any* step transition in the onboarding flow, the progress data (categorized count, total count, completed steps) before the transition should equal the progress data after the transition.

**Validates: Requirements 1.6, 6.8**

### Property 3: Search Filter Accuracy

*For any* search query entered in the Contact Search Modal, all displayed contacts should have names that contain the search query (case-insensitive), and no contacts whose names don't match should be displayed.

**Validates: Requirements 2.4**

### Property 4: Circle Assignment Display in Search Results

*For any* contact displayed in the Search Modal results, if that contact has a circle assignment, the circle assignment should be visible in the result item.

**Validates: Requirements 2.5**

### Property 5: Capacity Count Accuracy

*For any* selection state in the Search Modal, the displayed count (e.g., "3/10 selected") should exactly match the actual number of selected contacts plus existing Inner Circle contacts.

**Validates: Requirements 2.7**

### Property 6: Selection Capacity Constraint

*For any* selection operation in the Search Modal, the total number of selected contacts plus existing Inner Circle contacts should never exceed 10 (the Inner Circle capacity).

**Validates: Requirements 2.9**

### Property 7: Excluded Contacts Not in Search Results

*For any* search query in the Contact Search Modal, contacts that are already in the AI suggestions list should never appear in the search results.

**Validates: Requirements 2.11**

### Property 8: Inner Circle Full Skips AI Quick Start

*For any* user with Inner Circle count >= 10, when entering the onboarding flow, the AI Quick Start step should be skipped and the user should proceed directly to Quick Refine.

**Validates: Requirements 3.2, 3.4**

### Property 9: Suggestion Limit Based on Remaining Capacity

*For any* user with Inner Circle count between 8-9, the AI Quick Start suggestions should be limited to at most (10 - current Inner Circle count) contacts.

**Validates: Requirements 3.5**

### Property 10: Archive Sets Timestamp

*For any* contact that is archived via the Quick Refine Archive button, the contact's archived_at field should be set to a non-null timestamp.

**Validates: Requirements 4.3**

### Property 11: Undo Restores Contact

*For any* archive action that is undone within the undo window, the contact should be restored (archived_at set to null) and the contact should reappear in the Quick Refine flow.

**Validates: Requirements 4.7**

### Property 12: Archive Decrements Count

*For any* archive action in Quick Refine, the remaining contacts count should decrease by exactly 1.

**Validates: Requirements 4.9**

### Property 13: Archived Contacts Excluded from Uncategorized

*For any* contact with a non-null archived_at timestamp, that contact should not be included in the uncategorized contacts count or list.

**Validates: Requirements 4.10**

### Property 14: Manual Mode Search Filter

*For any* search query in Manual Mode, all displayed contacts should have names that contain the search query (case-insensitive).

**Validates: Requirements 5.6**

### Property 15: Manual Mode Circle Assignment Display

*For any* contact displayed in Manual Mode, if that contact has a circle assignment, it should be visible in the contact's row.

**Validates: Requirements 5.7**

### Property 16: Mode Preference Persistence

*For any* mode selection (AI-Assisted or Manual), the selected mode should be stored in localStorage and retrieved correctly on subsequent sessions.

**Validates: Requirements 5.9, 6.6**

### Property 17: Step Indicator Reflects Skipped Steps

*For any* user whose AI Quick Start is skipped (due to full Inner Circle), the step indicator should show only the remaining steps and not include AI Quick Start.

**Validates: Requirements 7.2, 7.7**

### Property 18: Tap Target Size Compliance

*For all* new buttons and interactive elements, the minimum dimensions should be at least 44x44 pixels to meet touch accessibility requirements.

**Validates: Requirements 8.2, 8.6**

## Error Handling

### Frontend Error Handling

#### Contact Search Modal Errors

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Failed to fetch contacts | Display error message in modal, provide retry button |
| Network timeout | Show timeout message, allow retry |
| Empty search results | Display "No contacts found" message |
| Selection exceeds capacity | Disable additional selections, show capacity warning |

#### Archive Action Errors

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Archive API failure | Show error toast, keep contact in list |
| Undo API failure | Show error toast, contact remains archived |
| Network timeout | Show timeout message, allow retry |

#### Mode Toggle Errors

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| localStorage unavailable | Fall back to session-only preference |
| Mode switch during save | Queue mode switch until save completes |

### Backend Error Handling

#### API Endpoints

```typescript
// GET /api/contacts/circle-counts
// Errors: 401 Unauthorized, 500 Internal Server Error
// Fallback: Return default counts { inner: 0, close: 0, active: 0, casual: 0 }

// POST /api/contacts/:id/archive
// Errors: 401 Unauthorized, 404 Contact Not Found, 500 Internal Server Error
// Response: { success: false, error: string }

// POST /api/contacts/:id/restore
// Errors: 401 Unauthorized, 404 Contact Not Found, 500 Internal Server Error
// Response: { success: false, error: string }
```

### Graceful Degradation

1. **AI Quick Start unavailable**: Fall back to Quick Refine directly
2. **Circle counts unavailable**: Assume capacity not reached, show AI Quick Start
3. **localStorage unavailable**: Use session storage or in-memory preference
4. **Search API slow**: Show loading indicator, debounce requests

## Testing Strategy

### Unit Tests

- Test Smart Batching step is never called
- Test flow proceeds from AI Quick Start to Quick Refine
- Test Inner Circle capacity check
- Test mode toggle switches between AI and Manual modes
- Test search filtering in Contact Search Modal
- Test archive action and undo functionality
- Test mode preference persistence

### Manual Testing

Manual test files in `tests/html/`:
- `tests/html/onboarding-flow-improvements.test.html` - Full flow testing
- `tests/html/circle-list-view.test.html` - Circle list view with add/remove
