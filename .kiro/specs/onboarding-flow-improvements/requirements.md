# Requirements Document

## Introduction

This document captures the requirements for improving the contact onboarding flow in CatchUp. The improvements address user feedback and usability issues identified in the current implementation:

1. **Smart Batching Removal** - Remove the confusing Smart Batching step entirely from the flow
2. **AI Quick Start Alternatives** - Users want the ability to search and manually select contacts instead of only accepting AI suggestions
3. **Inner Circle Capacity Check** - Skip AI Quick Start when inner circle is already at capacity
4. **Archive from Quick Refine** - Add ability to archive contacts directly from Quick Refine cards
5. **Traditional Circle Management** - Restore the non-AI manual circle management flow as an option

The success metrics for these improvements are:
- Reduce user confusion during onboarding (measured by support tickets)
- Increase onboarding completion rate from 60% to 75%
- Reduce overall onboarding time by removing Smart Batching step
- Provide users with more control over contact organization

## Glossary

- **Smart_Batching**: (Deprecated) The former Step 2 of onboarding that grouped contacts by relationship signals - being removed in this update
- **AI_Quick_Start**: Step 1 of onboarding that shows AI-suggested Inner Circle contacts
- **Quick_Refine**: Step 3 of onboarding with swipe-style interface for categorizing remaining contacts
- **Continue_Organizing**: The flow triggered when users return to organize uncategorized contacts
- **Dunbar_Circle**: A relationship tier (Inner Circle: 10, Close Friends: 25, Active Friends: 50, Casual Network: 100)
- **Circle_Capacity**: The recommended maximum number of contacts per circle based on Dunbar's research
- **Contact_Archival**: Soft-deleting contacts to remove them from active directory while preserving data
- **Manual_Circle_Management**: The traditional non-AI interface for assigning contacts to circles with search and grid view
- **Contact_Search**: The ability to search contacts by name within the onboarding flow

---

## Requirements

### Requirement 1: Remove Smart Batching Step

**User Story:** As a user going through the Continue Organizing flow, I want a streamlined experience without the confusing Smart Batching step, so that I can efficiently categorize my contacts.

#### Acceptance Criteria

1. WHEN a user enters the Continue Organizing flow, THE System SHALL skip the Smart Batching step entirely
2. THE System SHALL proceed directly from AI Quick Start to Quick Refine
3. THE System SHALL update the step indicator to show only 2 steps (AI Quick Start → Quick Refine)
4. THE System SHALL remove all Smart Batching UI components from the flow
5. THE System SHALL remove the "Smart Batching" education tip content
6. THE System SHALL preserve all existing progress when transitioning between steps
7. THE System SHALL update the header text to reflect the simplified 2-step flow

---

### Requirement 2: AI Quick Start Contact Search and Selection

**User Story:** As a user in the AI Quick Start step, I want to search and manually select specific contacts to include in my Inner Circle, so that I have more control over who gets added.

#### Acceptance Criteria

1. WHEN a user is in the AI Quick Start step, THE System SHALL display a "Search & Add More" button alongside the AI suggestions
2. WHEN a user clicks "Search & Add More", THE System SHALL display a searchable contact list modal
3. THE Search_Modal SHALL provide a text input field for searching contacts by name
4. WHEN a user types in the search field, THE System SHALL filter contacts in real-time (debounced at 300ms)
5. THE Search_Modal SHALL display matching contacts with their current circle assignment (if any)
6. THE Search_Modal SHALL allow users to select multiple contacts via checkboxes
7. THE Search_Modal SHALL display the current Inner Circle count and remaining capacity (e.g., "3/10 selected")
8. WHEN a user selects contacts and confirms, THE System SHALL add them to the AI Quick Start selection list
9. THE System SHALL prevent selecting more contacts than the remaining Inner Circle capacity
10. THE Search_Modal SHALL provide a "Cancel" button to close without changes
11. THE Search_Modal SHALL exclude contacts already in the AI suggestions list from search results

---

### Requirement 3: Skip AI Quick Start When Inner Circle Full

**User Story:** As a user whose Inner Circle is already at capacity, I want to skip the AI Quick Start step automatically, so that I don't waste time on suggestions I can't use.

#### Acceptance Criteria

1. WHEN a user enters the onboarding flow, THE System SHALL check the current Inner Circle contact count
2. IF the Inner Circle count >= 10 (Dunbar's suggested capacity), THEN THE System SHALL skip the AI Quick Start step
3. WHEN skipping AI Quick Start, THE System SHALL display a brief notification explaining why (e.g., "Your Inner Circle is full! Moving to Quick Refine.")
4. THE System SHALL proceed directly to Quick Refine when AI Quick Start is skipped
5. IF the Inner Circle count is between 8-9, THEN THE System SHALL show AI Quick Start but limit suggestions to the remaining capacity
6. THE System SHALL update the step indicator to reflect the skipped step

---

### Requirement 4: Archive Contact from Quick Refine

**User Story:** As a user in the Quick Refine step, I want to archive contacts I don't want to track, so that I can clean up my contact list while organizing.

#### Acceptance Criteria

1. WHEN displaying a contact card in Quick Refine, THE System SHALL display an "Archive" button alongside the circle assignment buttons
2. THE Archive button SHALL be visually distinct from circle assignment buttons (e.g., different color, icon)
3. WHEN a user clicks "Archive", THE System SHALL soft-delete the contact by setting archived_at timestamp
4. WHEN a contact is archived, THE System SHALL immediately show the next contact card
5. WHEN a contact is archived, THE System SHALL display a brief toast notification with undo option
6. THE System SHALL provide a 5-second undo window for archive actions
7. WHEN a user clicks "Undo", THE System SHALL restore the contact and return to that card
8. THE System SHALL support keyboard shortcut "A" for archive action
9. THE System SHALL update the remaining contacts count after archiving
10. THE System SHALL exclude archived contacts from the uncategorized count

---

### Requirement 5: Restore Traditional Manual Circle Management

**User Story:** As a user who prefers manual organization, I want access to the traditional non-AI circle management interface, so that I can organize contacts my own way.

#### Acceptance Criteria

1. WHEN a user clicks "Manage Circles" from the Directory page, THE System SHALL display an option to choose between AI-assisted and manual modes
2. THE System SHALL provide a "Manual Mode" option that opens the traditional ManageCirclesFlow dialog
3. THE Manual_Mode SHALL display all contacts in a searchable grid view
4. THE Manual_Mode SHALL allow users to assign contacts to circles via dropdown selectors
5. THE Manual_Mode SHALL display circle capacity indicators for all four circles
6. THE Manual_Mode SHALL provide search functionality to filter contacts by name
7. THE Manual_Mode SHALL show the current circle assignment for each contact
8. THE Manual_Mode SHALL allow bulk selection and assignment of multiple contacts
9. THE System SHALL remember the user's preferred mode (AI-assisted or manual) for future sessions
10. THE Manual_Mode SHALL provide "Save & Close" and "Skip for Now" buttons
11. WHEN in the onboarding flow, THE System SHALL provide a "Switch to Manual Mode" link at any step

---

### Requirement 6: Mode Toggle in Circle Management Modal

**User Story:** As a user organizing circles, I want to easily switch between AI-assisted and manual modes within the same interface, so that I can use the approach that works best for me without extra dialogs.

#### Acceptance Criteria

1. WHEN a user opens the circle management modal, THE System SHALL display a mode toggle at the top of the modal
2. THE Mode_Toggle SHALL present two options: "AI-Assisted" and "Manual"
3. THE Mode_Toggle SHALL default to "AI-Assisted" for new users
4. WHEN a user switches to "Manual" mode, THE System SHALL immediately display the traditional ManageCirclesFlow grid view within the same modal
5. WHEN a user switches to "AI-Assisted" mode, THE System SHALL display the AI Quick Start → Quick Refine flow
6. THE System SHALL remember the user's last selected mode for future sessions (stored in localStorage)
7. THE Mode_Toggle SHALL be visually prominent but not intrusive (e.g., segmented control or pill toggle)
8. THE System SHALL preserve any unsaved progress when switching modes
9. THE Mode_Toggle SHALL be accessible via keyboard navigation

---

### Requirement 7: Improved Progress Indicators

**User Story:** As a user going through onboarding, I want clear progress indicators that reflect the actual steps, so that I know where I am in the process.

#### Acceptance Criteria

1. THE System SHALL display a step indicator showing current position in the flow
2. IF AI Quick Start is skipped, THEN THE System SHALL update the step indicator to exclude that step
3. IF Smart Batching is removed, THEN THE System SHALL update the step indicator to show only remaining steps
4. THE Step_Indicator SHALL show step names (not just numbers) for clarity
5. THE Step_Indicator SHALL highlight the current step visually
6. THE Step_Indicator SHALL show completed steps with a checkmark
7. THE System SHALL update the step indicator dynamically based on user's path through the flow

---

### Requirement 8: Mobile Responsiveness for New Features

**User Story:** As a mobile user, I want all new onboarding features to work well on my device, so that I can complete setup from any device.

#### Acceptance Criteria

1. THE Search_Modal SHALL render correctly on mobile devices (viewport >= 320px)
2. THE Archive button in Quick Refine SHALL have touch-friendly size (minimum 44x44px)
3. THE Mode_Toggle SHALL render correctly on mobile devices
4. THE Manual_Mode grid SHALL adapt to single-column layout on mobile
5. THE System SHALL support swipe gestures for archive action in Quick Refine on touch devices
6. All new buttons and interactive elements SHALL meet minimum tap target size requirements

