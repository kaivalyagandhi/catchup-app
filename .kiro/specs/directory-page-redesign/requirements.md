# Requirements Document

## Introduction

The Directory page redesign consolidates the existing Contacts and Groups & Tags pages into a unified, modern interface with tabular data presentation, advanced filtering, and seamless navigation between Contacts, Groups, and Tags. The redesign aims to improve data density, scannability, and editing efficiency while maintaining the existing Google Contacts integration features.

## Glossary

- **Directory**: The unified page that consolidates Contacts, Groups, and Tags management
- **Tabular UI**: A table-based interface displaying data in rows and columns with sortable headers
- **In-line Editing**: The ability to edit cell values directly within the table without opening a modal
- **A-Z Scrollbar**: A vertical alphabetical navigation component for quick access to contacts
- **Filter Bar**: A search interface supporting property-based filtering using structured queries
- **Tab Section**: A navigation component allowing users to switch between Contacts, Groups, and Tags views
- **Google Contacts Mappings Review**: The existing UI for reviewing and mapping Google Contact groups to CatchUp groups
- **Red Dot Indicator**: A visual notification badge indicating pending actions or reviews
- **Sort Order**: The arrangement of table rows based on selected criteria (Alphabetical, Recently Added, Recently Met)
- **Add Contact Row**: A new, editable row in the table for creating contacts inline
- **Dashboard Page**: A separate page (not part of this spec) that will contain Circles features

## Requirements

### Requirement 1

**User Story:** As a user, I want to view all my contacts in a compact tabular format, so that I can quickly scan and compare contact information.

#### Acceptance Criteria

1. WHEN a user navigates to the Directory page THEN the system SHALL display contacts in a table with columns for Name, Phone, Email, Location, Timezone, Frequency, Tags, Groups, and Source
2. WHEN displaying the contacts table THEN the system SHALL show all contact metadata as inline columns without requiring hover or expansion
3. WHEN the contacts table is rendered THEN the system SHALL apply compact spacing to maximize visible rows per screen
4. WHEN a contact has a Google source THEN the system SHALL display a Google badge in the Source column
5. WHEN a contact has tags or groups THEN the system SHALL display them as compact badges within their respective columns

### Requirement 2

**User Story:** As a user, I want to edit contact information directly in the table, so that I can make quick updates without opening modals.

#### Acceptance Criteria

1. WHEN a user clicks on an editable cell THEN the system SHALL convert the cell to an input field allowing inline editing
2. WHEN a user completes an inline edit THEN the system SHALL save the change to the database immediately
3. WHEN an inline edit fails THEN the system SHALL revert the cell to its previous value and display an error notification
4. WHEN a user edits tags or groups inline THEN the system SHALL provide an autocomplete dropdown with existing options
5. WHEN a user presses Escape during inline editing THEN the system SHALL cancel the edit and restore the original value

### Requirement 3

**User Story:** As a user, I want to quickly navigate to any contact alphabetically, so that I can find contacts without scrolling through the entire list.

#### Acceptance Criteria

1. WHEN the contacts table is displayed THEN the system SHALL show an A-Z scrollbar on the right side of the table
2. WHEN a user clicks a letter in the A-Z scrollbar THEN the system SHALL scroll to the first contact whose name starts with that letter
3. WHEN no contacts exist for a selected letter THEN the system SHALL scroll to the next available letter alphabetically
4. WHEN the user scrolls the table THEN the system SHALL highlight the current letter range in the A-Z scrollbar
5. WHEN the table contains fewer than 20 contacts THEN the system SHALL hide the A-Z scrollbar

### Requirement 4

**User Story:** As a user, I want to search and filter contacts using property-based queries, so that I can find specific contacts based on multiple criteria.

#### Acceptance Criteria

1. WHEN a user types in the search bar THEN the system SHALL filter contacts by name, email, or phone number in real-time
2. WHEN a user enters a filter query like "tag:work" THEN the system SHALL filter contacts to show only those with the "work" tag
3. WHEN a user enters a filter query like "group:family" THEN the system SHALL filter contacts to show only those in the "family" group
4. WHEN a user enters a filter query like "source:google" THEN the system SHALL filter contacts to show only Google-sourced contacts
5. WHEN a user combines multiple filters THEN the system SHALL apply all filters using AND logic
6. WHEN a user clears the search bar THEN the system SHALL restore the full unfiltered contact list

### Requirement 5

**User Story:** As a user, I want to add new contacts directly in the table, so that I can create contacts without interrupting my workflow.

#### Acceptance Criteria

1. WHEN a user clicks the "Add Contact" button THEN the system SHALL insert a new editable row at the top of the table
2. WHEN a user fills in the new contact row and presses Enter or clicks Save THEN the system SHALL create the contact in the database
3. WHEN a new contact is saved THEN the system SHALL automatically sort the contact into the table based on the current sort order
4. WHEN a user cancels adding a new contact THEN the system SHALL remove the new row without saving
5. WHEN a user attempts to save a contact without a name THEN the system SHALL prevent saving and display a validation error

### Requirement 6

**User Story:** As a user, I want to sort contacts by different criteria, so that I can view contacts in the order most relevant to my current task.

#### Acceptance Criteria

1. WHEN the contacts table is first displayed THEN the system SHALL sort contacts alphabetically by name by default
2. WHEN a user selects "Recently Added" sort order THEN the system SHALL sort contacts by creation date in descending order
3. WHEN a user selects "Recently Met" sort order THEN the system SHALL sort contacts by last interaction date in descending order
4. WHEN a user clicks a sortable column header THEN the system SHALL toggle between ascending and descending sort for that column
5. WHEN the sort order changes THEN the system SHALL persist the selection for the current session

### Requirement 7

**User Story:** As a user, I want to switch between Contacts, Groups, and Tags views seamlessly, so that I can manage all directory data from one page.

#### Acceptance Criteria

1. WHEN the Directory page loads THEN the system SHALL display tab sections for Contacts, Groups, and Tags
2. WHEN a user clicks the Groups tab THEN the system SHALL display the groups table and hide the contacts table
3. WHEN a user clicks the Tags tab THEN the system SHALL display the tags table and hide other tables
4. WHEN switching between tabs THEN the system SHALL preserve search and filter state within each tab
5. WHEN a user switches tabs THEN the system SHALL update the URL hash to reflect the current tab without page reload

### Requirement 8

**User Story:** As a user, I want to view and manage groups in a tabular format, so that I can efficiently organize my contacts into groups.

#### Acceptance Criteria

1. WHEN a user navigates to the Groups tab THEN the system SHALL display groups in a table with columns for Name, Description, Contact Count, and Actions
2. WHEN a user clicks on a group row THEN the system SHALL expand the row to show member contacts
3. WHEN a user edits a group name inline THEN the system SHALL update the group name in the database
4. WHEN a user clicks "Add Group" THEN the system SHALL insert a new editable row for creating a group
5. WHEN a user deletes a group THEN the system SHALL remove the group and unassign all member contacts

### Requirement 9

**User Story:** As a user, I want to view and manage tags in a tabular format, so that I can efficiently categorize my contacts with tags.

#### Acceptance Criteria

1. WHEN a user navigates to the Tags tab THEN the system SHALL display tags in a table with columns for Name, Contact Count, Source, and Actions
2. WHEN a user edits a tag name inline THEN the system SHALL update the tag name for all associated contacts
3. WHEN a user clicks "Add Tag" THEN the system SHALL insert a new editable row for creating a tag
4. WHEN a user deletes a tag THEN the system SHALL remove the tag from all associated contacts
5. WHEN a tag has source "ai" or "voice" THEN the system SHALL display a badge indicating the automated source

### Requirement 10

**User Story:** As a user, I want to review Google Contacts group mappings within the Groups tab, so that I can manage all group-related tasks in one place.

#### Acceptance Criteria

1. WHEN the Groups tab is displayed AND pending Google Contact mappings exist THEN the system SHALL show a red dot indicator on the Groups tab header
2. WHEN a user is viewing the Groups tab AND mappings need review THEN the system SHALL display the Google Contacts Mappings Review UI above the groups table
3. WHEN a user completes all mapping reviews THEN the system SHALL remove the red dot indicator from the Groups tab
4. WHEN no mappings need review THEN the system SHALL hide the Google Contacts Mappings Review UI
5. WHEN a user approves or rejects a mapping THEN the system SHALL update the groups table immediately to reflect changes

### Requirement 11

**User Story:** As a user, I want the Directory page to have a modern, clean design, so that the interface feels contemporary and professional.

#### Acceptance Criteria

1. WHEN the Directory page is rendered THEN the system SHALL use a clean, minimalist design with ample whitespace
2. WHEN displaying tables THEN the system SHALL use subtle borders, hover effects, and clear typography
3. WHEN the user hovers over a table row THEN the system SHALL highlight the row with a subtle background color change
4. WHEN displaying badges THEN the system SHALL use rounded corners and appropriate color coding
5. WHEN the page is viewed in dark mode THEN the system SHALL apply appropriate dark theme colors to all table elements

### Requirement 12

**User Story:** As a user, I want the Directory page to be responsive, so that I can manage contacts on mobile devices.

#### Acceptance Criteria

1. WHEN the Directory page is viewed on a mobile device THEN the system SHALL adapt the table layout to a card-based view
2. WHEN in mobile view THEN the system SHALL stack table columns vertically within each card
3. WHEN in mobile view THEN the system SHALL hide the A-Z scrollbar and provide alternative navigation
4. WHEN in mobile view THEN the system SHALL make tab sections horizontally scrollable if needed
5. WHEN switching between desktop and mobile views THEN the system SHALL preserve the current tab and filter state

### Requirement 13

**User Story:** As a developer, I want the Directory page to exclude Circles features, so that those features can be implemented separately in the Dashboard page.

#### Acceptance Criteria

1. WHEN the Directory page is rendered THEN the system SHALL NOT display Dunbar Circle assignments in the contacts table
2. WHEN the Directory page is rendered THEN the system SHALL NOT provide filtering or sorting by Circle
3. WHEN the Directory page is rendered THEN the system SHALL NOT include Circle-related columns in the table
4. WHEN a contact has a Circle assignment THEN the system SHALL store it in the database but not display it in the Directory
5. WHEN the Dashboard page is implemented THEN the system SHALL retrieve and display Circle data from the existing database schema
