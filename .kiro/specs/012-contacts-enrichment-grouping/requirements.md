# Requirements Document: Enrichment Contact Grouping

## Introduction

The enrichment review system currently displays suggestions as individual toasts that can accumulate and clutter the screen. This feature groups enrichment suggestions by contact, consolidating multiple suggestions for the same contact into a single modal. When multiple suggestions arrive for a contact before the modal auto-dismisses, they are added to the existing modal rather than creating new ones. This reduces visual clutter and improves the user experience during voice recording.

## Glossary

- **Enrichment Suggestion**: A proposed contact field update, tag, or group assignment extracted from voice notes
- **Contact Modal**: A grouped display container showing all suggestions for a single contact
- **Auto-Dismiss Timer**: A 10-second countdown that removes a modal if no new suggestions arrive
- **Modal Stack**: Multiple contact modals displayed simultaneously, positioned vertically
- **Suggestion Consolidation**: The process of adding new suggestions to an existing modal instead of creating a new one
- **Contact Grouping**: Organizing suggestions by contact ID before display
- **Enrichment Payload**: The data structure sent from backend containing suggestions and contact information

## Requirements

### Requirement 1: Contact-Based Modal Grouping

**User Story:** As a user, I want enrichment suggestions grouped by contact, so that I can see all information about one contact at a time without multiple overlapping popups.

#### Acceptance Criteria

1. WHEN an enrichment suggestion arrives for a contact THEN the System SHALL display it in a modal labeled with that contact's name
2. WHEN a second suggestion arrives for the same contact THEN the System SHALL add it to the existing modal instead of creating a new one
3. WHEN suggestions are grouped by contact THEN the System SHALL display the contact name and avatar prominently in the modal header
4. WHEN multiple contacts have suggestions THEN the System SHALL display separate modals for each contact
5. WHEN a contact modal is displayed THEN the System SHALL show all suggestions for that contact in a scrollable list
6. WHEN a contact has no suggestions THEN the System SHALL NOT display a modal for that contact

### Requirement 2: Auto-Dismiss Timer Reset on New Suggestions

**User Story:** As a user, I want the modal to stay open while I'm receiving suggestions, so that I don't miss information while the system is still processing.

#### Acceptance Criteria

1. WHEN a contact modal is displayed THEN the System SHALL start a 10-second auto-dismiss timer
2. WHEN a new suggestion arrives for a contact with an active modal THEN the System SHALL reset the auto-dismiss timer to 10 seconds
3. WHEN the auto-dismiss timer expires THEN the System SHALL remove the modal from the screen
4. WHEN the user interacts with a modal (confirm/reject) THEN the System SHALL clear the auto-dismiss timer
5. WHEN a modal is manually closed THEN the System SHALL clear the auto-dismiss timer
6. WHEN multiple suggestions arrive rapidly for the same contact THEN the System SHALL not dismiss the modal prematurely

### Requirement 3: Modal Stacking and Layout

**User Story:** As a user, I want multiple contact modals to display without overlapping, so that I can see all active suggestions clearly.

#### Acceptance Criteria

1. WHEN multiple contact modals are displayed THEN the System SHALL stack them vertically without overlapping
2. WHEN a new contact modal appears THEN the System SHALL position it below existing modals
3. WHEN a modal is removed THEN the System SHALL reflow remaining modals to fill the space
4. WHEN modals are displayed on mobile THEN the System SHALL adapt the layout to fit the screen width
5. WHEN the number of modals exceeds available space THEN the System SHALL make modals scrollable or limit visible count
6. WHEN modals are stacked THEN the System SHALL maintain consistent spacing between them

### Requirement 4: Bulk Actions on Grouped Suggestions

**User Story:** As a user, I want to confirm or reject all suggestions for a contact at once, so that I can quickly process multiple suggestions.

#### Acceptance Criteria

1. WHEN a contact modal displays multiple suggestions THEN the System SHALL provide "Confirm All" and "Reject All" buttons
2. WHEN the user clicks "Confirm All" THEN the System SHALL mark all suggestions in that modal as accepted
3. WHEN the user clicks "Reject All" THEN the System SHALL mark all suggestions in that modal as rejected
4. WHEN the user confirms/rejects all suggestions THEN the System SHALL animate the modal out and remove it
5. WHEN bulk actions are performed THEN the System SHALL update the contact summary count
6. WHEN the user performs a bulk action THEN the System SHALL NOT show a separate toast notification

### Requirement 5: Individual Suggestion Management

**User Story:** As a user, I want to accept or reject individual suggestions within a grouped modal, so that I have fine-grained control over which suggestions to apply.

#### Acceptance Criteria

1. WHEN a contact modal displays suggestions THEN the System SHALL show a checkbox for each suggestion
2. WHEN the user checks a suggestion THEN the System SHALL mark it as accepted
3. WHEN the user unchecks a suggestion THEN the System SHALL mark it as rejected
4. WHEN the user edits a suggestion value THEN the System SHALL allow inline editing with validation
5. WHEN a suggestion is edited THEN the System SHALL update the modal's data without closing it
6. WHEN individual suggestions are modified THEN the System SHALL NOT dismiss the modal

### Requirement 6: Backend Suggestion Grouping

**User Story:** As a developer, I want suggestions grouped by contact on the backend, so that the frontend receives organized data.

#### Acceptance Criteria

1. WHEN enrichment suggestions are generated THEN the System SHALL group them by contact ID before emission
2. WHEN suggestions are emitted to the frontend THEN the System SHALL include contact ID and contact name in the payload
3. WHEN multiple suggestions exist for a contact THEN the System SHALL emit them in a single event per contact
4. WHEN suggestions are grouped THEN the System SHALL maintain the order of suggestions within each group
5. WHEN a contact has no suggestions THEN the System SHALL NOT emit an event for that contact
6. WHEN suggestions are grouped THEN the System SHALL preserve all suggestion metadata (type, field, value, etc.)

### Requirement 7: WebSocket Message Structure

**User Story:** As a developer, I want a clear message structure for grouped suggestions, so that the frontend can easily parse and display them.

#### Acceptance Criteria

1. WHEN enrichment suggestions are sent via WebSocket THEN the System SHALL use a structured message format
2. WHEN a message contains grouped suggestions THEN the System SHALL include `contactId`, `contactName`, and `suggestions` array
3. WHEN suggestions are sent THEN the System SHALL maintain backward compatibility with existing message handlers
4. WHEN the message structure changes THEN the System SHALL version the message format for future extensibility
5. WHEN a message is received THEN the System SHALL validate the structure before processing
6. WHEN invalid messages are received THEN the System SHALL log errors and skip processing

### Requirement 8: Contact Information Preservation

**User Story:** As a user, I want to see accurate contact information in modals, so that I know which contact each suggestion applies to.

#### Acceptance Criteria

1. WHEN a contact modal is displayed THEN the System SHALL show the contact's name accurately
2. WHEN a contact modal is displayed THEN the System SHALL show the contact's avatar or initials
3. WHEN a contact name is unknown THEN the System SHALL display "Unknown Contact" with a generic avatar
4. WHEN contact information changes THEN the System SHALL update the modal display
5. WHEN multiple contacts have similar names THEN the System SHALL distinguish them clearly
6. WHEN a contact is deleted THEN the System SHALL handle the modal gracefully

### Requirement 9: Suggestion Deduplication

**User Story:** As a user, I want to avoid seeing duplicate suggestions, so that the interface remains clean and uncluttered.

#### Acceptance Criteria

1. WHEN multiple identical suggestions arrive for a contact THEN the System SHALL deduplicate them
2. WHEN a suggestion already exists in a modal THEN the System SHALL NOT add a duplicate
3. WHEN suggestions are deduplicated THEN the System SHALL preserve the first occurrence
4. WHEN deduplication occurs THEN the System SHALL NOT show duplicate entries in the modal
5. WHEN suggestions are compared for deduplication THEN the System SHALL use type, field, and value as comparison keys
6. WHEN a duplicate is detected THEN the System SHALL log it for debugging purposes

### Requirement 10: Accessibility and Keyboard Navigation

**User Story:** As a user with accessibility needs, I want to navigate and interact with grouped modals using keyboard, so that I can use the system without a mouse.

#### Acceptance Criteria

1. WHEN a contact modal is displayed THEN the System SHALL be keyboard navigable
2. WHEN the user presses Tab THEN the System SHALL move focus through modal buttons and checkboxes
3. WHEN the user presses Enter on a button THEN the System SHALL trigger the button action
4. WHEN the user presses Escape THEN the System SHALL close the modal
5. WHEN a modal is closed THEN the System SHALL restore focus to the previous element
6. WHEN multiple modals are displayed THEN the System SHALL maintain proper focus management between them

