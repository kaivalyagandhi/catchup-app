# Requirements Document

## Introduction

This feature replaces the existing voice notes recording flow with a conversational chat-based interface for capturing and managing contact edits. The system introduces a floating chat icon that enables incremental voice recording, automatically extracts contact information, and presents suggestions in a pending edits queue with full source attribution and confidence scoring. Users can review, adjust, and submit edits through a fuzzy-matching interface that handles ambiguous contacts gracefully.

## Glossary

- **Edit**: A proposed change to contact data (new contact, updated field, new tag, etc.) extracted from user input
- **Pending Edit**: An edit that has been detected but not yet confirmed/submitted by the user
- **Edit History**: An immutable log of all previously submitted edits
- **Floating Chat Icon**: A persistent UI element that provides access to the conversational interface
- **Incremental Recording**: Continuous voice capture that extracts edits in real-time as the user speaks
- **Confidence Score**: A numerical value (0-1) indicating the system's certainty about an extracted edit
- **Source Attribution**: Metadata indicating where an edit suggestion originated (voice transcript segment, timestamp)
- **Fuzzy Matching**: Approximate string matching algorithm for finding similar contacts/fields
- **Disambiguation Prompt**: A clarification request shown when the system cannot confidently identify a contact
- **Session**: A single chat interaction period from opening to closing the chat interface, during which edits are grouped together

## Requirements

### Requirement 1: Edits Menu Structure

**User Story:** As a user, I want a unified "Edits" menu that organizes my contact changes, so that I can easily manage pending and historical edits in one place.

#### Acceptance Criteria

1. WHEN the user navigates to the main menu THEN the System SHALL display an "Edits" menu item replacing the previous "Voice Notes" menu
2. WHEN the user opens the Edits menu THEN the System SHALL display two tabs: "Pending Edits" and "Edit History"
3. WHEN the user selects the "Pending Edits" tab THEN the System SHALL display all unsubmitted edit suggestions
4. WHEN the user selects the "Edit History" tab THEN the System SHALL display a chronological list of all previously submitted edits
5. WHEN displaying Edit History entries THEN the System SHALL render them as read-only records
6. WHEN the Pending Edits tab contains zero items THEN the System SHALL display an empty state with a button to open the chat interface
7. WHEN rendering Pending Edits and Edit History tabs THEN the System SHALL use a consistent visual layout for edit items across both views

### Requirement 2: Floating Chat Interface

**User Story:** As a user, I want a floating chat icon that lets me interact with the system conversationally, so that I can capture contact information naturally without navigating away from my current view.

#### Acceptance Criteria

1. WHEN the application loads THEN the System SHALL display a floating chat icon in a fixed position on the screen
2. WHEN the user taps the floating chat icon THEN the System SHALL open a chat interface overlay
3. WHEN the chat interface is open THEN the System SHALL display a microphone button for voice input
4. WHEN the user activates voice recording THEN the System SHALL change the floating icon color to red
5. WHEN voice recording is active THEN the System SHALL process audio incrementally for edit extraction
6. WHEN the user deactivates voice recording THEN the System SHALL return the floating icon to its default state

### Requirement 3: Conversational Chat Experience

**User Story:** As a user, I want my interactions with the system to feel like a natural conversation, so that I can review what I've said and how the system responded.

#### Acceptance Criteria

1. WHEN the user stops voice recording THEN the System SHALL display the transcribed text as a user message bubble in the chat
2. WHEN the user sends a text message THEN the System SHALL display the text as a user message bubble in the chat
3. WHEN the user completes a voice or text input THEN the System SHALL respond with a conversational acknowledgment message
4. WHEN the acknowledgment message references detected edits THEN the System SHALL render each edit as a clickable element
5. WHEN the user clicks an edit reference in the acknowledgment THEN the System SHALL scroll to and highlight that edit in the pending edits view
6. WHEN the system requires disambiguation THEN the System SHALL display the question as a system message bubble
7. WHEN the user responds to disambiguation THEN the System SHALL display the response as a user message bubble
8. WHEN the chat contains multiple messages THEN the System SHALL allow the user to scroll through the message history
9. WHEN displaying chat messages THEN the System SHALL show messages in chronological order with timestamps

### Requirement 4: Session Management

**User Story:** As a user, I want to manage my chat session so that I can cancel and discard all pending edits from the current session if needed.

#### Acceptance Criteria

1. WHEN the user opens the chat interface THEN the System SHALL start a new session
2. WHEN edits are detected during a session THEN the System SHALL associate those edits with the current session
3. WHEN the chat interface is open THEN the System SHALL display a cancel session button
4. WHEN the user cancels the session THEN the System SHALL remove all pending edits created during that session
5. WHEN the user cancels the session THEN the System SHALL close the chat interface and clear the message history
6. WHEN the user closes the chat interface without canceling THEN the System SHALL preserve pending edits from the session
7. WHEN the user reopens the chat interface THEN the System SHALL start a fresh session with empty message history

### Requirement 5: Incremental Edit Detection

**User Story:** As a user, I want the system to detect contact edits in real-time as I speak, so that I can see my information being captured without waiting for the recording to end.

#### Acceptance Criteria

1. WHEN the user speaks during an active recording THEN the System SHALL transcribe audio in real-time segments
2. WHEN a transcript segment contains extractable contact information THEN the System SHALL create a pending edit within 2 seconds
3. WHEN a new pending edit is created during recording THEN the System SHALL emit a subtle pulse animation from the floating icon
4. WHEN extracting edits THEN the System SHALL assign a confidence score between 0 and 1 to each edit
5. WHEN extracting edits THEN the System SHALL record the source transcript segment and timestamp

### Requirement 6: Live Pending Edits Counter

**User Story:** As a user, I want to see a live count of detected edits while I'm speaking, so that I know the system is capturing information without interrupting my flow.

#### Acceptance Criteria

1. WHEN the chat interface is open THEN the System SHALL display a pending edits counter indicator
2. WHEN recording is active and an edit is detected THEN the System SHALL increment the counter immediately
3. WHEN the counter value changes THEN the System SHALL animate the update to draw attention
4. WHEN the counter is zero THEN the System SHALL display the indicator in a muted state
5. WHEN the user taps the counter indicator THEN the System SHALL navigate to the Pending Edits tab

### Requirement 7: Pending Edits Management

**User Story:** As a user, I want to review and adjust pending edits before submitting them, so that I can correct any errors in the AI's interpretation.

#### Acceptance Criteria

1. WHEN displaying a pending edit THEN the System SHALL show the edit type, target contact, proposed value, confidence score, and source attribution
2. WHEN the user selects a pending edit THEN the System SHALL allow modification of the target contact via fuzzy search
3. WHEN the user searches for a contact THEN the System SHALL return matches ranked by similarity score
4. WHEN no exact contact match exists THEN the System SHALL offer an option to create a new contact
5. WHEN the user modifies a pending edit THEN the System SHALL update the edit with the new values
6. WHEN the user submits a pending edit THEN the System SHALL apply the change and move the edit to Edit History
7. WHEN the user dismisses a pending edit THEN the System SHALL remove it from the pending queue without applying changes

### Requirement 8: Contact Disambiguation

**User Story:** As a user, I want the system to ask for clarification when it's unsure which contact I'm referring to, so that edits are applied to the correct person.

#### Acceptance Criteria

1. WHEN the confidence score for a contact match falls below 0.7 THEN the System SHALL display a disambiguation prompt in the chat
2. WHEN displaying a disambiguation prompt THEN the System SHALL present the top 3 candidate contacts with similarity scores
3. WHEN the extracted contact name matches zero existing contacts THEN the System SHALL ask whether to create a new contact or select an existing one
4. WHEN the user selects a contact from disambiguation options THEN the System SHALL update the pending edit with the selected contact
5. WHEN the user provides additional context in response to disambiguation THEN the System SHALL re-evaluate the contact match

### Requirement 9: Source Attribution and Confidence Display

**User Story:** As a user, I want to see where each edit suggestion came from and how confident the system is, so that I can make informed decisions about accepting or modifying edits.

#### Acceptance Criteria

1. WHEN displaying a pending edit THEN the System SHALL show the confidence score as a percentage
2. WHEN displaying a pending edit THEN the System SHALL show the source type (voice transcript, manual entry)
3. WHEN the source is a voice transcript THEN the System SHALL display the relevant transcript excerpt
4. WHEN the user taps on source attribution THEN the System SHALL expand to show full context including timestamp
5. WHEN confidence score is below 0.5 THEN the System SHALL visually highlight the edit as requiring review

### Requirement 10: Edit History Immutability

**User Story:** As a user, I want my edit history to be permanent and unchangeable, so that I have a reliable audit trail of all changes made to my contacts.

#### Acceptance Criteria

1. WHEN an edit is submitted THEN the System SHALL create an immutable record in Edit History
2. WHEN displaying Edit History THEN the System SHALL show timestamp, edit type, target contact, applied value, and original source
3. WHEN the user views Edit History THEN the System SHALL prevent modification of any historical records
4. WHEN the user attempts to modify Edit History THEN the System SHALL not provide any edit controls

### Requirement 11: Navigation to Contacts and Groups

**User Story:** As a user, I want to click on contacts or groups in edit items to navigate directly to them, so that I can quickly view or manage the referenced entities.

#### Acceptance Criteria

1. WHEN an edit item displays a contact reference THEN the System SHALL render the contact name as a clickable link
2. WHEN an edit item displays a group reference THEN the System SHALL render the group name as a clickable link
3. WHEN the user clicks a contact link THEN the System SHALL navigate to the contacts page and scroll to the referenced contact
4. WHEN navigating to a contact THEN the System SHALL briefly highlight the contact row for 2 seconds
5. WHEN the user clicks a group link THEN the System SHALL navigate to the groups page and open the referenced group detail view
6. WHEN the referenced contact or group no longer exists THEN the System SHALL display the name as plain text without navigation

### Requirement 12: Visual Feedback for Recording State

**User Story:** As a user, I want clear visual indicators of the recording state and edit detection, so that I know when the system is listening and capturing information.

#### Acceptance Criteria

1. WHEN recording is inactive THEN the System SHALL display the floating icon in its default color state
2. WHEN recording is active THEN the System SHALL display the floating icon with a red glow effect
3. WHEN a new edit is detected during recording THEN the System SHALL emit a pulse animation from the floating icon
4. WHEN a new edit is detected THEN the System SHALL display a brief notification in the chat window indicating the edit type
5. WHEN recording encounters an error THEN the System SHALL display an error indicator on the floating icon

