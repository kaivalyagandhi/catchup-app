# Enrichment Popup Grouping Plan

## Overview
Currently, enrichment suggestions are displayed as individual toasts that auto-dismiss after 10 seconds. This creates a cluttered UI when multiple suggestions arrive for the same contact. The goal is to group suggestions by contact and display them in a single modal per contact, consolidating multiple suggestions before auto-dismissal.

## Current Behavior
- Each enrichment suggestion appears as a separate toast
- Toasts auto-dismiss after 10 seconds
- Multiple suggestions for the same contact create multiple toasts
- No visual grouping or consolidation

## Desired Behavior
- Suggestions are grouped by contact
- One modal per contact displays all suggestions for that contact
- If a second suggestion arrives for a contact before the modal auto-dismisses, it's added to the existing modal
- Modal auto-dismisses after 10 seconds of inactivity (no new suggestions)
- User can confirm/reject all suggestions in a modal at once

## Implementation Plan

### Phase 1: Backend Changes (Voice Note Service)
**File**: `src/voice/voice-note-service.ts`

1. **Modify enrichment suggestion emission**
   - Group suggestions by contact before emitting
   - Emit grouped suggestions as a single event per contact
   - Include contact ID and contact name in the event payload

2. **Update enrichment_update event structure**
   - Current: `{ sessionId, suggestions: [...] }` (flat array)
   - New: `{ sessionId, contactId, contactName, suggestions: [...] }`
   - Or: `{ sessionId, groupedSuggestions: { [contactId]: { contactName, suggestions } } }`

### Phase 2: Frontend WebSocket Handler
**File**: `src/voice/websocket-handler.ts`

1. **Group suggestions before sending to client**
   - Receive grouped suggestions from voice service
   - Maintain grouping in WebSocket message
   - Send contact-grouped payload to frontend

### Phase 3: Frontend UI - Enrichment Review
**File**: `public/js/enrichment-review.js`

1. **Add contact-based modal management**
   - Create a `Map<contactId, ModalState>` to track active modals per contact
   - Each modal state includes:
     - `contactId`: Contact identifier
     - `contactName`: Contact name
     - `suggestions`: Array of suggestions
     - `autoRemoveTimer`: Timeout ID for auto-dismiss
     - `modalElement`: Reference to DOM element

2. **Modify `addLiveSuggestion()` method**
   - Check if a modal already exists for this contact
   - If yes: Add suggestion to existing modal and reset auto-dismiss timer
   - If no: Create new modal for this contact

3. **Create new `showContactModal()` method**
   - Display modal with contact name and avatar
   - Show all suggestions for that contact
   - Include confirm/reject buttons for all suggestions
   - Auto-dismiss after 10 seconds of inactivity

4. **Update modal auto-dismiss logic**
   - Reset timer when new suggestions arrive for same contact
   - Only dismiss when timer completes without new suggestions
   - Clear timer when user interacts (confirm/reject)

5. **Update modal styling**
   - Position modals in a stack (top-right corner)
   - Show contact avatar and name prominently
   - Display all suggestions in a scrollable list
   - Include bulk confirm/reject buttons

### Phase 4: Frontend Voice Notes Handler
**File**: `public/js/voice-notes.js`

1. **Update enrichment update handler**
   - Receive grouped suggestions from WebSocket
   - Pass contact information to enrichment review
   - Maintain contact grouping through the pipeline

### Phase 5: Data Structure Changes

#### Backend Enrichment Event
```typescript
// Current
{
  sessionId: string,
  suggestions: EnrichmentSuggestion[]
}

// New
{
  sessionId: string,
  contactId: string,
  contactName: string,
  suggestions: EnrichmentSuggestion[]
}
```

#### Frontend Modal State
```javascript
{
  contactId: string,
  contactName: string,
  suggestions: Array<{
    id: string,
    type: string,
    field?: string,
    value: any,
    accepted: boolean
  }>,
  autoRemoveTimer: number,
  modalElement: HTMLElement,
  createdAt: Date,
  lastUpdatedAt: Date
}
```

## Implementation Steps

### Step 1: Backend Grouping
1. In `voice-note-service.ts`, modify `analyzeForEnrichment()` to group suggestions by contact
2. Update the `enrichment_update` event emission to include contact info
3. Emit one event per contact instead of one event with all suggestions

### Step 2: WebSocket Forwarding
1. In `websocket-handler.ts`, ensure contact info is preserved in the message sent to client
2. Update message structure to include `contactId` and `contactName`

### Step 3: Frontend Modal Management
1. Add `contactModals` Map to `EnrichmentReview` class
2. Implement `getOrCreateContactModal(contactId, contactName)` method
3. Implement `addSuggestionToModal(contactId, suggestion)` method
4. Implement `showContactModal(contactId)` method
5. Update `addLiveSuggestion()` to use new modal system

### Step 4: Modal UI
1. Create modal HTML template with:
   - Contact avatar and name
   - Scrollable suggestions list
   - Confirm/Reject buttons
   - Close button
2. Add CSS for modal positioning and stacking
3. Add animations for modal appearance/disappearance

### Step 5: Auto-Dismiss Logic
1. Implement `resetAutoRemoveTimer(contactId)` method
2. Call on each new suggestion for that contact
3. Clear timer on user interaction
4. Remove modal from DOM and Map on dismiss

## Key Considerations

### Timing
- Auto-dismiss timer should reset when new suggestions arrive
- This prevents premature dismissal while user is still receiving suggestions
- 10-second timer starts from last suggestion received

### User Experience
- Modals should stack vertically (or horizontally on mobile)
- Contact name should be prominent for quick identification
- Bulk actions (confirm/reject all) should be available
- Individual suggestion editing should still be possible

### Edge Cases
- What if contact ID is null/unknown? → Show "Unknown Contact" with generic avatar
- What if suggestions arrive for same contact after modal dismissed? → Create new modal
- What if user confirms/rejects while new suggestions arriving? → Handle gracefully
- Multiple contacts with suggestions simultaneously? → Stack modals

### Performance
- Limit number of visible modals (e.g., max 5)
- Use event delegation for button clicks
- Debounce rapid suggestion arrivals
- Clean up timers and DOM references on dismiss

## Testing Checklist

- [ ] Single suggestion for a contact displays in modal
- [ ] Second suggestion for same contact adds to existing modal
- [ ] Modal auto-dismisses after 10 seconds of inactivity
- [ ] New suggestion resets auto-dismiss timer
- [ ] User can confirm/reject all suggestions in modal
- [ ] Multiple contacts show stacked modals
- [ ] Modal closes on user action
- [ ] Contact name and avatar display correctly
- [ ] Suggestions display with correct icons and formatting
- [ ] Mobile layout works (modals stack vertically)

## Files to Modify

1. **Backend**
   - `src/voice/voice-note-service.ts` - Group suggestions by contact
   - `src/voice/websocket-handler.ts` - Preserve grouping in WebSocket message

2. **Frontend**
   - `public/js/enrichment-review.js` - Modal management and display
   - `public/js/voice-notes.js` - Handle grouped suggestions from WebSocket

## Rollout Strategy

1. Implement backend grouping first (non-breaking change)
2. Update WebSocket handler to send grouped data
3. Implement frontend modal system
4. Test with manual voice note recording
5. Verify auto-dismiss and user interactions work correctly
6. Deploy and monitor for issues

## Notes for Other Agents

- This plan maintains backward compatibility during implementation
- The enrichment service already generates suggestions per contact
- The main work is in grouping them before emission and displaying them grouped
- No database schema changes required
- No API endpoint changes required
- Primarily UI/UX improvement with some backend refactoring
