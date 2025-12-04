# Enrichment Contact Grouping Specification

## Overview

This document summarizes the new spec for **Enrichment Contact Grouping**, which consolidates enrichment suggestions by contact into grouped modals instead of individual toasts.

## Spec Location

All spec files are located in `.kiro/specs/enrichment-contact-grouping/`:
- `requirements.md` - User stories and acceptance criteria
- `design.md` - Architecture, components, and correctness properties
- `tasks.md` - Implementation plan with actionable tasks

## Problem Statement

Currently, enrichment suggestions are displayed as individual toasts that:
- Create visual clutter when multiple suggestions arrive
- Can overlap and compete for screen space
- Auto-dismiss independently, potentially missing suggestions
- Don't provide context about which contact each suggestion applies to

## Solution

Group enrichment suggestions by contact, displaying all suggestions for a single contact in one modal. When multiple suggestions arrive for the same contact before the modal auto-dismisses, they are added to the existing modal rather than creating new ones.

## Key Features

### 1. Contact-Based Grouping
- Suggestions are grouped by contact ID on the backend
- One modal per contact displays all suggestions for that contact
- Contact name and avatar shown prominently in modal header

### 2. Smart Auto-Dismiss
- 10-second auto-dismiss timer per modal
- Timer resets when new suggestions arrive for that contact
- Prevents premature dismissal while suggestions are still being received
- Clears on user interaction

### 3. Modal Stacking
- Multiple contact modals stack vertically without overlapping
- Consistent spacing between modals
- Responsive layout for mobile devices
- Reflows correctly when modals are added/removed

### 4. Bulk Actions
- "Confirm All" button to accept all suggestions for a contact
- "Reject All" button to reject all suggestions for a contact
- Individual checkboxes for fine-grained control
- Inline editing support for suggestion values

### 5. Accessibility
- Full keyboard navigation (Tab, Enter, Escape)
- Proper focus management
- ARIA attributes for screen readers
- Respects `prefers-reduced-motion` preference

## Architecture Changes

### Backend (Voice Note Service)
- Group suggestions by contact ID before emission
- Emit one `enrichment_update` event per contact
- Include `contactId` and `contactName` in event payload

### WebSocket Handler
- Preserve contact grouping in messages
- Validate message structure
- Send contact-grouped payload to frontend

### Frontend (Enrichment Review)
- Maintain `Map<contactId, ModalState>` for active modals
- Implement modal lifecycle management
- Handle auto-dismiss timer reset logic
- Render grouped modals with bulk actions

### Frontend (Voice Notes Handler)
- Receive grouped suggestions from WebSocket
- Pass contact information to enrichment review
- Maintain contact grouping through pipeline

## Correctness Properties

The design includes 10 correctness properties that ensure:

1. **Modal Uniqueness** - At most one modal per contact
2. **Timer Reset** - Auto-dismiss timer resets on new suggestions
3. **Stack Consistency** - Modals stack without overlapping
4. **Bulk Action Atomicity** - All suggestions updated together
5. **Individual Independence** - Individual actions don't affect others
6. **Backend Grouping** - Suggestions grouped correctly on backend
7. **Message Validity** - WebSocket messages have valid structure
8. **Contact Accuracy** - Contact info displayed correctly
9. **Deduplication** - Duplicate suggestions removed
10. **Keyboard Accessibility** - Full keyboard navigation support

## Implementation Strategy

### Phase 1: Backend Grouping (Tasks 1-2)
- Modify voice-note-service to group suggestions
- Update WebSocket handler to preserve grouping
- Add message validation

### Phase 2: Frontend State Management (Tasks 3-4)
- Implement modal state management
- Add auto-dismiss timer logic
- Handle modal lifecycle

### Phase 3: UI Rendering (Tasks 5-8)
- Create modal HTML templates
- Add CSS styling
- Implement contact information display
- Handle suggestion deduplication

### Phase 4: User Interactions (Tasks 6-7)
- Implement bulk actions
- Add individual suggestion controls
- Support inline editing

### Phase 5: Accessibility (Task 10)
- Add keyboard navigation
- Implement focus management
- Add ARIA attributes

### Phase 6: Integration & Testing (Tasks 11-13)
- Run full integration tests
- Test all user interactions
- Verify accessibility

## Related Specs

This spec builds on the **Enrichment Animation Enhancements** spec (`.kiro/specs/enrichment-animation-enhancements/`), which defines:
- Toast animation timing and easing
- State change animations
- Loading and success states
- Accessibility considerations

The grouping feature will use the animation system defined in that spec for modal entrance/exit animations.

## Key Differences from Animation Spec

| Aspect | Animation Spec | Grouping Spec |
|--------|---|---|
| Focus | Animation timing and visual feedback | Modal organization and consolidation |
| Scope | Toast animations, state changes, loading | Contact-based grouping, auto-dismiss, stacking |
| Overlap | Addresses overlapping toasts visually | Addresses overlapping toasts structurally |
| Timing | 200-400ms animations | 10-second auto-dismiss timer |

## Testing Approach

### Property-Based Tests
- 10 properties with corresponding PBT tests
- Each property tests a specific correctness guarantee
- Tests use random input generation to verify properties hold

### Unit Tests
- Modal creation and retrieval
- Timer management
- Deduplication logic
- Contact information handling

### Integration Tests
- Full enrichment flow with grouped modals
- Multiple contacts with simultaneous suggestions
- User interactions (confirm/reject/edit)
- Keyboard navigation
- Mobile layout

## Files to Modify

### Backend
- `src/voice/voice-note-service.ts` - Group suggestions by contact
- `src/voice/websocket-handler.ts` - Preserve grouping in messages

### Frontend
- `public/js/enrichment-review.js` - Modal management and display
- `public/js/voice-notes.js` - Handle grouped suggestions from WebSocket

## Rollout Plan

1. **Implement backend grouping** (non-breaking change)
2. **Update WebSocket handler** to send grouped data
3. **Implement frontend modal system**
4. **Test with manual voice note recording**
5. **Verify all interactions work correctly**
6. **Deploy and monitor**

## Success Criteria

- ✅ Suggestions grouped by contact in modals
- ✅ Auto-dismiss timer resets on new suggestions
- ✅ Multiple modals stack without overlapping
- ✅ Bulk actions work correctly
- ✅ Individual suggestion controls work
- ✅ Full keyboard navigation support
- ✅ All property-based tests pass
- ✅ All integration tests pass
- ✅ No visual clutter from overlapping toasts

## Next Steps

1. Review the spec files in `.kiro/specs/enrichment-contact-grouping/`
2. Approve or request changes to requirements/design
3. Begin implementation following the task list
4. Run tests after each phase
5. Deploy when all tests pass

