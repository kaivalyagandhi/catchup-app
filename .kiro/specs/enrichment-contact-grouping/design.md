# Design Document: Enrichment Contact Grouping

## Overview

This design consolidates enrichment suggestions by contact, replacing individual toasts with grouped modals that display all suggestions for a single contact. When multiple suggestions arrive for the same contact before the modal auto-dismisses, they are added to the existing modal rather than creating new ones. This reduces visual clutter and improves the user experience during voice recording.

The design maintains all existing functionality while reorganizing the presentation layer to group suggestions logically by contact.

## Architecture

```
Enrichment Contact Grouping System
├── Backend Grouping
│   ├── Voice Note Service
│   │   ├── Group suggestions by contact ID
│   │   └── Emit one event per contact
│   ├── WebSocket Handler
│   │   ├── Preserve grouping in message
│   │   └── Send contact-grouped payload
│   └── Message Structure
│       ├── contactId: string
│       ├── contactName: string
│       └── suggestions: EnrichmentSuggestion[]
├── Frontend Modal Management
│   ├── Contact Modal Map
│   │   ├── Key: contactId
│   │   └── Value: ModalState
│   ├── Modal Lifecycle
│   │   ├── Create: First suggestion for contact
│   │   ├── Update: New suggestions arrive
│   │   ├── Dismiss: Timer expires or user action
│   │   └── Cleanup: Remove from DOM and Map
│   └── Auto-Dismiss Timer
│       ├── Start: Modal created
│       ├── Reset: New suggestion arrives
│       └── Expire: Remove modal
└── Frontend UI Rendering
    ├── Modal Container
    ├── Contact Header (name + avatar)
    ├── Suggestions List
    ├── Bulk Actions (Confirm All / Reject All)
    └── Individual Suggestion Controls
```

## Components and Interfaces

### 1. Backend Grouping (Voice Note Service)

**Purpose**: Group suggestions by contact before emitting to frontend

**Current Flow**:
```
Suggestions Array → Emit Event → Frontend
```

**New Flow**:
```
Suggestions Array → Group by Contact → Emit Event per Contact → Frontend
```

**Implementation**:
- In `analyzeForEnrichment()`, group suggestions by `contactHint` or `contactId`
- Emit one `enrichment_update` event per contact
- Include contact metadata in each event

**Code Location**: `src/voice/voice-note-service.ts`

### 2. WebSocket Message Structure

**Purpose**: Send grouped suggestions to frontend with contact information

**Current Message**:
```typescript
{
  type: 'enrichment_update',
  data: {
    suggestions: EnrichmentSuggestion[]
  }
}
```

**New Message**:
```typescript
{
  type: 'enrichment_update',
  data: {
    contactId: string,
    contactName: string,
    suggestions: EnrichmentSuggestion[]
  }
}
```

**Message Validation**:
- Verify `contactId` is not null/empty
- Verify `contactName` is not null/empty
- Verify `suggestions` is an array
- Log errors for invalid messages

**Code Location**: `src/voice/websocket-handler.ts`

### 3. Frontend Modal State Management

**Purpose**: Track active modals per contact and manage their lifecycle

**Data Structure**:
```typescript
interface ModalState {
  contactId: string;
  contactName: string;
  suggestions: EnrichmentSuggestion[];
  autoRemoveTimer: NodeJS.Timeout | null;
  modalElement: HTMLElement | null;
  createdAt: Date;
  lastUpdatedAt: Date;
}

class EnrichmentReview {
  private contactModals: Map<string, ModalState> = new Map();
  
  // Methods
  getOrCreateContactModal(contactId: string, contactName: string): ModalState
  addSuggestionToModal(contactId: string, suggestion: EnrichmentSuggestion): void
  showContactModal(contactId: string): void
  resetAutoRemoveTimer(contactId: string): void
  removeContactModal(contactId: string): void
  confirmAllSuggestions(contactId: string): void
  rejectAllSuggestions(contactId: string): void
}
```

**Code Location**: `public/js/enrichment-review.js`

### 4. Modal UI Component

**Purpose**: Display grouped suggestions for a single contact

**Structure**:
```
┌─────────────────────────────────────┐
│ 👤 Contact Name                  ✕  │  ← Header with avatar, name, close
├─────────────────────────────────────┤
│ ☑ 📍 Location: Seattle              │  ← Suggestion 1 with checkbox
│ ☑ 📞 Phone: +1-555-123-4567         │  ← Suggestion 2 with checkbox
│ ☑ 🏷️ Tag: hiking                    │  ← Suggestion 3 with checkbox
├─────────────────────────────────────┤
│ [✓ Confirm All] [✗ Reject All]      │  ← Bulk action buttons
└─────────────────────────────────────┘
```

**CSS Classes**:
```css
.contact-modal { /* Container */ }
.contact-modal-header { /* Header with name and close */ }
.contact-modal-avatar { /* Avatar or initials */ }
.contact-modal-name { /* Contact name */ }
.contact-modal-close { /* Close button */ }
.contact-modal-suggestions { /* Scrollable suggestions list */ }
.contact-modal-suggestion { /* Individual suggestion */ }
.contact-modal-actions { /* Bulk action buttons */ }
```

**Code Location**: `public/js/enrichment-review.js` (styling in `setupStyles()`)

### 5. Auto-Dismiss Timer Management

**Purpose**: Manage 10-second auto-dismiss timers per contact modal

**Logic**:
```
Modal Created
  ↓
Start 10-second timer
  ↓
New Suggestion Arrives?
  ├─ YES: Clear timer, add suggestion, restart timer
  └─ NO: Continue countdown
  ↓
Timer Expires
  ↓
Remove Modal
```

**Implementation**:
- Store timer ID in `ModalState.autoRemoveTimer`
- Clear timer before restarting
- Clear timer on user interaction
- Clear timer on manual close

**Code Location**: `public/js/enrichment-review.js`

### 6. Frontend Event Handler

**Purpose**: Receive grouped suggestions from WebSocket and manage modals

**Flow**:
```
WebSocket Message (enrichment_update)
  ↓
Extract contactId, contactName, suggestions
  ↓
Get or Create Modal for Contact
  ↓
Add Suggestions to Modal
  ↓
Reset Auto-Dismiss Timer
  ↓
Show Modal
```

**Code Location**: `public/js/voice-notes.js` (in `handleEnrichmentUpdate()`)

## Data Models

### EnrichmentSuggestion

```typescript
interface EnrichmentSuggestion {
  id: string;
  type: 'tag' | 'group' | 'field' | 'location' | 'phone' | 'email' | 'note' | 'interest';
  field?: string; // For field type
  value: any;
  accepted: boolean;
  contactHint?: string; // For grouping
  confidence?: number;
  sourceText?: string;
}
```

### ContactModalState

```typescript
interface ContactModalState {
  contactId: string;
  contactName: string;
  suggestions: EnrichmentSuggestion[];
  autoRemoveTimer: NodeJS.Timeout | null;
  modalElement: HTMLElement | null;
  createdAt: Date;
  lastUpdatedAt: Date;
  isVisible: boolean;
}
```

### WebSocket Message

```typescript
interface EnrichmentUpdateMessage {
  type: 'enrichment_update';
  data: {
    contactId: string;
    contactName: string;
    suggestions: EnrichmentSuggestion[];
  };
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Contact Modal Uniqueness

*For any* contact ID, there should be at most one active modal displayed at a time. If a second suggestion arrives for a contact with an active modal, it should be added to the existing modal rather than creating a new one.

**Validates: Requirements 1.1, 1.2, 1.6**

### Property 2: Auto-Dismiss Timer Reset

*For any* contact modal, when a new suggestion arrives, the auto-dismiss timer should be reset to 10 seconds. The modal should not dismiss while suggestions are still arriving.

**Validates: Requirements 2.1, 2.2, 2.3, 2.6**

### Property 3: Modal Stack Consistency

*For any* set of active contact modals, they should be displayed in a consistent vertical stack without overlapping, and the stack should reflow correctly when modals are added or removed.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6**

### Property 4: Bulk Action Atomicity

*For any* bulk action (Confirm All / Reject All), all suggestions in the contact modal should be updated atomically, and the modal should be removed after the action completes.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: Individual Suggestion Independence

*For any* individual suggestion in a modal, accepting or rejecting it should not affect other suggestions in the same modal, and the modal should remain open.

**Validates: Requirements 5.1, 5.2, 5.3, 5.6**

### Property 6: Backend Grouping Correctness

*For any* set of enrichment suggestions, when grouped by contact on the backend, each contact should have exactly one event emitted, and all suggestions for that contact should be included in that event.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**

### Property 7: Message Structure Validity

*For any* enrichment update message sent via WebSocket, it should contain valid `contactId`, `contactName`, and `suggestions` array, and the frontend should be able to parse and display it correctly.

**Validates: Requirements 7.1, 7.2, 7.5, 7.6**

### Property 8: Contact Information Accuracy

*For any* contact modal displayed, the contact name and avatar should match the contact ID, and if contact information is unknown, it should display "Unknown Contact" gracefully.

**Validates: Requirements 8.1, 8.2, 8.3, 8.6**

### Property 9: Suggestion Deduplication

*For any* set of suggestions for a contact, duplicate suggestions (same type, field, and value) should be deduplicated, and only one instance should be displayed in the modal.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 10: Keyboard Navigation Accessibility

*For any* contact modal displayed, it should be fully navigable using keyboard (Tab, Enter, Escape), and focus should be managed correctly when modals are opened or closed.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

## Error Handling

### Invalid Contact ID
- If `contactId` is null or empty, use a generated ID (e.g., `unknown-${timestamp}`)
- Display "Unknown Contact" in the modal header
- Log warning for debugging

### Invalid Contact Name
- If `contactName` is null or empty, display "Unknown Contact"
- Use generic avatar instead of initials
- Log warning for debugging

### Missing Suggestions
- If `suggestions` array is empty, don't create a modal
- Log warning if event is received with empty suggestions

### Duplicate Suggestions
- Compare suggestions by type, field, and value
- Skip adding duplicates to the modal
- Log debug message for duplicate detection

### Timer Cleanup
- Always clear timers before removing modals
- Prevent memory leaks from orphaned timers
- Handle cases where timer is already cleared

### DOM Element Cleanup
- Remove modal element from DOM when dismissed
- Clear references in `ModalState`
- Prevent memory leaks from orphaned elements

## Testing Strategy

### Unit Tests

- Test modal creation and retrieval
- Test suggestion addition to modals
- Test auto-dismiss timer reset logic
- Test bulk action confirmation/rejection
- Test deduplication logic
- Test contact information handling

### Property-Based Tests

- **Property 1**: Generate random suggestions for contacts and verify modal uniqueness
- **Property 2**: Generate rapid suggestions for same contact and verify timer resets
- **Property 3**: Generate multiple contacts and verify stack consistency
- **Property 4**: Generate bulk actions and verify atomicity
- **Property 5**: Generate individual actions and verify independence
- **Property 6**: Generate suggestions on backend and verify grouping
- **Property 7**: Generate WebSocket messages and verify structure validity
- **Property 8**: Generate contacts with various names and verify accuracy
- **Property 9**: Generate duplicate suggestions and verify deduplication
- **Property 10**: Test keyboard navigation with various key combinations

### Integration Tests

- Test full enrichment flow with grouped modals
- Test multiple contacts with simultaneous suggestions
- Test modal stacking and reflowing
- Test auto-dismiss with rapid suggestions
- Test user interactions (confirm/reject/edit)
- Test keyboard navigation
- Test accessibility with screen readers

## Visual Specifications

### Modal Positioning

- **Position**: Fixed, top-right corner
- **Stack Direction**: Vertical, top to bottom
- **Spacing**: 12px between modals
- **Max Width**: 400px (desktop), 100% - 20px (mobile)
- **Max Height**: 600px (scrollable if needed)

### Modal Styling

| Element | Style |
|---------|-------|
| Header | Background: #fafbfc, Padding: 12px, Border-bottom: 1px solid #e5e7eb |
| Avatar | Width: 32px, Height: 32px, Border-radius: 50%, Background: gradient |
| Name | Font-size: 14px, Font-weight: 600, Color: #1f2937 |
| Suggestions | Max-height: 400px, Overflow-y: auto, Padding: 12px |
| Suggestion Item | Padding: 8px, Border: 1px solid #e5e7eb, Border-radius: 6px, Margin-bottom: 6px |
| Actions | Padding: 12px, Background: #fafbfc, Border-top: 1px solid #e5e7eb |
| Button | Padding: 8px 12px, Font-size: 13px, Border-radius: 6px |

### Animation Timing

- **Modal Entrance**: 300ms, ease-out, slide from right + fade in
- **Modal Exit**: 300ms, ease-in, slide to right + fade out
- **Suggestion Addition**: 200ms, ease-out, fade in
- **Auto-Dismiss**: 10 seconds (configurable)

## Implementation Notes

1. **Backward Compatibility**: Ensure existing enrichment functionality continues to work
2. **Performance**: Test with many contacts and suggestions to ensure smooth performance
3. **Mobile Optimization**: Verify modal stacking works on small screens
4. **Accessibility**: Ensure keyboard navigation and screen reader support
5. **Dark Mode**: Verify modals display correctly in dark mode
6. **Error Handling**: Gracefully handle edge cases (unknown contacts, empty suggestions, etc.)
7. **Logging**: Add debug logging for troubleshooting grouping and modal lifecycle

