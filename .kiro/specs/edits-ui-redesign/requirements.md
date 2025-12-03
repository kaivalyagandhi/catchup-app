# Requirements Document: Edits UI Redesign

## Introduction

The current edits menu displays pending edits in a verbose table format that takes up significant screen space and lacks visual hierarchy. This redesign introduces a compact, contact-grouped view that organizes edits by contact, provides independent accept/reject controls per edit, and delivers a more polished visual experience. The new UI maintains all existing functionality while reducing visual clutter and improving usability through better information architecture.

## Glossary

- **Edit Item**: A single proposed change to contact data (tag, field, group membership)
- **Contact Group**: A collapsible section containing all edits for a specific contact
- **Compact View**: A space-efficient layout that displays multiple edits without excessive padding or whitespace
- **Accept/Reject**: Independent controls for each edit allowing granular approval decisions
- **Visual Hierarchy**: Clear distinction between contacts, edit types, and actions through typography and color
- **Confidence Indicator**: Visual representation of the system's certainty about an edit (color-coded badge)
- **Source Attribution**: Compact display of where an edit originated (voice transcript, timestamp)

## Requirements

### Requirement 1: Contact-Based Grouping

**User Story:** As a user, I want edits organized by contact, so that I can quickly review all changes for a specific person without scrolling through unrelated edits.

#### Acceptance Criteria

1. WHEN viewing pending edits THEN the System SHALL group all edits by contact name
2. WHEN a contact has multiple edits THEN the System SHALL display them under a single contact header
3. WHEN a contact group is collapsed THEN the System SHALL display only the contact name and edit count
4. WHEN a contact group is expanded THEN the System SHALL display all edits for that contact
5. WHEN the user clicks a contact header THEN the System SHALL toggle the expanded/collapsed state
6. WHEN all edits for a contact are accepted THEN the System SHALL visually indicate completion (checkmark or highlight)
7. WHEN all edits for a contact are rejected THEN the System SHALL visually indicate rejection (strikethrough or muted)

### Requirement 2: Compact Edit Item Display

**User Story:** As a user, I want a compact edit display that shows essential information without wasting space, so that I can see more edits at once.

#### Acceptance Criteria

1. WHEN displaying an edit item THEN the System SHALL show: edit type icon, target field/value, confidence score, and action buttons
2. WHEN displaying an edit item THEN the System SHALL use a single-line layout for simple edits (tags, groups)
3. WHEN displaying an edit item THEN the System SHALL use a two-line layout for field edits with longer values
4. WHEN an edit item is displayed THEN the System SHALL use consistent vertical spacing (8-12px) between items
5. WHEN displaying multiple edits THEN the System SHALL maintain a maximum width of 600px for optimal readability
6. WHEN the viewport is narrow THEN the System SHALL stack action buttons vertically to maintain usability

### Requirement 3: Independent Accept/Reject Controls

**User Story:** As a user, I want to accept or reject each edit independently, so that I can make granular decisions about which changes to apply.

#### Acceptance Criteria

1. WHEN displaying a pending edit THEN the System SHALL display a checkbox for selection
2. WHEN displaying a pending edit THEN the System SHALL display an "Accept" button (or checkmark icon)
3. WHEN displaying a pending edit THEN the System SHALL display a "Reject" button (or X icon)
4. WHEN the user clicks Accept THEN the System SHALL mark the edit as accepted and apply visual feedback
5. WHEN the user clicks Reject THEN the System SHALL mark the edit as rejected and apply visual feedback
6. WHEN an edit is accepted THEN the System SHALL highlight it with a success color (green)
7. WHEN an edit is rejected THEN the System SHALL dim it or apply a strikethrough style
8. WHEN the user accepts/rejects an edit THEN the System SHALL update the contact group summary count

### Requirement 4: Visual Design and Polish

**User Story:** As a user, I want the edits interface to feel modern and polished, so that I enjoy using it and trust the system's suggestions.

#### Acceptance Criteria

1. WHEN displaying the edits menu THEN the System SHALL use a clean, minimal design with ample whitespace
2. WHEN displaying edit items THEN the System SHALL use consistent typography (font sizes, weights, colors)
3. WHEN displaying edit items THEN the System SHALL use color-coded badges for edit types (green for add, red for remove, blue for update)
4. WHEN displaying confidence scores THEN the System SHALL use a color gradient (red for low, yellow for medium, green for high)
5. WHEN the user hovers over an edit item THEN the System SHALL apply a subtle background highlight
6. WHEN the user hovers over an action button THEN the System SHALL apply a hover state (color change, slight scale)
7. WHEN displaying source attribution THEN the System SHALL use a compact, inline format with an expandable details section
8. WHEN the interface transitions between states THEN the System SHALL use smooth animations (200-300ms) for visual continuity

### Requirement 5: Efficient Space Usage

**User Story:** As a user, I want the edits interface to use space efficiently, so that I can see more information without excessive scrolling.

#### Acceptance Criteria

1. WHEN displaying the edits menu THEN the System SHALL reduce padding and margins compared to the current design
2. WHEN displaying contact groups THEN the System SHALL use a compact header (32-40px height) instead of full-height rows
3. WHEN displaying edit items THEN the System SHALL use 36-44px height per item instead of 60px+
4. WHEN displaying action buttons THEN the System SHALL use icon-only buttons (24x24px) instead of text buttons
5. WHEN the viewport height is limited THEN the System SHALL display at least 5-6 edits without scrolling
6. WHEN the user scrolls THEN the System SHALL maintain sticky contact headers for context
7. WHEN displaying empty states THEN the System SHALL use minimal vertical space (80-100px) instead of full-screen

### Requirement 6: Confidence Score Visualization

**User Story:** As a user, I want to quickly understand the system's confidence in each edit, so that I can prioritize review of uncertain suggestions.

#### Acceptance Criteria

1. WHEN displaying a pending edit THEN the System SHALL show the confidence score as a percentage (0-100%)
2. WHEN confidence is below 50% THEN the System SHALL display the score in red with a warning indicator
3. WHEN confidence is 50-75% THEN the System SHALL display the score in yellow/orange
4. WHEN confidence is above 75% THEN the System SHALL display the score in green
5. WHEN the user hovers over the confidence score THEN the System SHALL display a tooltip explaining the score
6. WHEN displaying multiple edits THEN the System SHALL sort by confidence (lowest first) to highlight uncertain edits
7. WHEN all edits have high confidence THEN the System SHALL display a success indicator at the contact group level

### Requirement 7: Source Attribution Compactness

**User Story:** As a user, I want to see where each edit came from without cluttering the interface, so that I can verify the source if needed.

#### Acceptance Criteria

1. WHEN displaying source attribution THEN the System SHALL show a compact badge (e.g., "Voice" or "Manual")
2. WHEN the source is a voice transcript THEN the System SHALL display a truncated excerpt (max 50 characters)
3. WHEN the user clicks the source attribution THEN the System SHALL expand to show full context and timestamp
4. WHEN the source attribution is expanded THEN the System SHALL display in a tooltip or modal overlay
5. WHEN the user clicks outside the expanded view THEN the System SHALL collapse the source attribution
6. WHEN displaying multiple edits THEN the System SHALL not show source attribution by default (only on hover or click)

### Requirement 8: Bulk Actions

**User Story:** As a user, I want to perform bulk actions on edits, so that I can quickly accept or reject all edits for a contact.

#### Acceptance Criteria

1. WHEN a contact group is displayed THEN the System SHALL show "Accept All" and "Reject All" buttons for that contact
2. WHEN the user clicks "Accept All" for a contact THEN the System SHALL mark all edits for that contact as accepted
3. WHEN the user clicks "Reject All" for a contact THEN the System SHALL mark all edits for that contact as rejected
4. WHEN the user performs a bulk action THEN the System SHALL update the contact group summary immediately
5. WHEN all edits for a contact are accepted THEN the System SHALL display a completion indicator (checkmark)
6. WHEN the user can undo a bulk action THEN the System SHALL display an "Undo" button for 5 seconds after the action

### Requirement 9: Responsive Design

**User Story:** As a user, I want the edits interface to work well on mobile devices, so that I can review edits on any screen size.

#### Acceptance Criteria

1. WHEN the viewport width is less than 480px THEN the System SHALL stack action buttons vertically
2. WHEN the viewport width is less than 480px THEN the System SHALL reduce font sizes by 10-15%
3. WHEN the viewport width is less than 480px THEN the System SHALL use full-width edit items
4. WHEN the viewport width is less than 480px THEN the System SHALL hide source attribution by default
5. WHEN the user is on a mobile device THEN the System SHALL use touch-friendly button sizes (44x44px minimum)
6. WHEN the viewport is narrow THEN the System SHALL maintain readability and usability without horizontal scrolling

### Requirement 10: Edit Modification

**User Story:** As a user, I want to modify edit values before accepting them, so that I can correct any errors in the AI's interpretation.

#### Acceptance Criteria

1. WHEN the user clicks an edit value THEN the System SHALL enter edit mode with an inline text input
2. WHEN in edit mode THEN the System SHALL display Save and Cancel buttons
3. WHEN the user saves changes THEN the System SHALL validate the new value and update the edit
4. WHEN validation fails THEN the System SHALL display an error message inline
5. WHEN the user cancels editing THEN the System SHALL revert to the original value
6. WHEN the user presses Enter THEN the System SHALL save the changes
7. WHEN the user presses Escape THEN the System SHALL cancel editing

</content>
</invoke>