# Requirements Document

## Introduction

The Contact Onboarding feature provides a streamlined 3-step guided experience for users to connect their integrations, organize contacts into simplified social circles, and review group mapping suggestions. Based on Dunbar's number and Aristotle's theory of friendship, the system uses 4 circles (instead of 5) to reduce complexity while maintaining research-backed relationship management. The onboarding progress is tracked via a persistent sidebar indicator that allows users to jump to any step at any time.

## Glossary

- **Onboarding System**: The 3-step guided setup flow for new users
- **Social Circle**: A visual representation of relationship tiers based on simplified Dunbar's number (4 circles: 10, 25, 50, 100)
- **Contact Card**: A visual element representing a contact in a grid layout with search capability
- **Dunbar Layer**: One of the four relationship tiers (Inner Circle, Close Friends, Active Friends, Casual Network)
- **Step Indicator**: A persistent UI element in the sidebar showing completion status of the 3 onboarding steps
- **Manage Circles Flow**: The interface for assigning contacts to circles, accessible both during onboarding and post-onboarding
- **Integration Connection**: The process of connecting Google Calendar and Google Contacts via OAuth
- **Group Mapping Suggestions**: AI-generated recommendations for mapping Google Contact groups to CatchUp groups
- **CatchUp System**: The application that manages relationship maintenance and suggestions
- **Educational Tips**: Contextual information about Dunbar's research and Aristotle's friendship theory
- **Directory Page**: The main page containing Contacts, Circles, Groups, and Tags tabs
- **Stone & Clay Theme**: The warm color system using Stone (warm gray) and Clay (terracotta/amber) tones following the Radix Colors 12-step methodology
- **Cozy Productivity**: The design aesthetic that feels warm, tactile, and grounded like a digital coffee shop
- **Latte Mode**: Light theme with warm alabaster/cream backgrounds
- **Espresso Mode**: Dark theme with deep warm coffee/black backgrounds

## Requirements

### Requirement 1

**User Story:** As a new user, I want to see a clear 3-step onboarding indicator in the sidebar, so that I understand what setup is required and can track my progress.

#### Acceptance Criteria

1. WHEN a user has not completed onboarding, THEN the CatchUp System SHALL display a persistent 3-step indicator in the sidebar below the title section
2. WHEN displaying the step indicator, THEN the CatchUp System SHALL show visual status for each step (incomplete, in-progress, complete)
3. WHEN a user clicks on a step in the indicator, THEN the CatchUp System SHALL navigate to the appropriate page or section for that step
4. WHEN all 3 steps are completed, THEN the CatchUp System SHALL hide the onboarding indicator from the sidebar
5. WHEN a user dismisses the onboarding, THEN the CatchUp System SHALL provide a way to resume it later via a CTA button

### Requirement 2

**User Story:** As a new user starting onboarding, I want to connect my Google Calendar and Contacts in Step 1, so that CatchUp can import my data and provide intelligent suggestions.

#### Acceptance Criteria

1. WHEN a user clicks on Step 1 in the onboarding indicator, THEN the CatchUp System SHALL navigate to the Preferences page
2. WHEN on the Preferences page during Step 1, THEN the CatchUp System SHALL highlight the Google Calendar and Google Contacts connection sections
3. WHEN the user successfully connects Google Calendar, THEN the CatchUp System SHALL mark the calendar portion of Step 1 as complete
4. WHEN the user successfully connects Google Contacts, THEN the CatchUp System SHALL mark the contacts portion of Step 1 as complete
5. WHEN both integrations are connected, THEN the CatchUp System SHALL mark Step 1 as fully complete and enable Step 2

### Requirement 3

**User Story:** As a user who has connected integrations, I want to organize my contacts into 4 simplified circles in Step 2, so that I can manage my relationships without feeling overwhelmed by too many tiers.

#### Acceptance Criteria

1. WHEN a user clicks on Step 2 in the onboarding indicator, THEN the CatchUp System SHALL navigate to the Circles section in the Directory page
2. WHEN entering Step 2, THEN the CatchUp System SHALL trigger the Manage Circles flow automatically
3. WHEN the Manage Circles flow opens, THEN the CatchUp System SHALL display 4 circles with capacities: Inner Circle (up to 10), Close Friends (up to 25), Active Friends (up to 50), Casual Network (up to 100)
4. WHEN displaying circles, THEN the CatchUp System SHALL show educational tips about Dunbar's number and Aristotle's friendship theory
5. WHEN the user assigns contacts to circles, THEN the CatchUp System SHALL update Step 2 progress based on the number of contacts categorized

### Requirement 4

**User Story:** As a user organizing contacts in Step 2, I want to search for specific contacts and view them in a grid layout, so that I can quickly find and assign people to circles.

#### Acceptance Criteria

1. WHEN the Manage Circles flow is active, THEN the CatchUp System SHALL display a search bar at the top of the interface
2. WHEN a user types in the search bar, THEN the CatchUp System SHALL filter the contact grid in real-time to show matching results
3. WHEN displaying contacts, THEN the CatchUp System SHALL render them as cards in a scrollable grid layout
4. WHEN a contact card is clicked, THEN the CatchUp System SHALL allow the user to assign that contact to a circle
5. WHEN search results are empty, THEN the CatchUp System SHALL display a helpful message indicating no matches were found

### Requirement 5

**User Story:** As a user who has organized contacts, I want to review group mapping suggestions in Step 3, so that I can efficiently map my Google Contact groups to CatchUp groups.

#### Acceptance Criteria

1. WHEN a user clicks on Step 3 in the onboarding indicator, THEN the CatchUp System SHALL navigate to the Groups section in the Directory page
2. WHEN entering Step 3, THEN the CatchUp System SHALL display AI-generated group mapping suggestions
3. WHEN displaying suggestions, THEN the CatchUp System SHALL show which Google Contact groups map to which CatchUp groups with confidence scores
4. WHEN the user accepts a mapping suggestion, THEN the CatchUp System SHALL apply the mapping and mark it as reviewed
5. WHEN all mapping suggestions are reviewed, THEN the CatchUp System SHALL mark Step 3 as complete and finish the onboarding flow

### Requirement 6

**User Story:** As an existing user who has completed onboarding, I want to access the Manage Circles flow anytime from the Circles section, so that I can update my contact organization as relationships evolve.

#### Acceptance Criteria

1. WHEN a user views the Circles section in the Directory page, THEN the CatchUp System SHALL display a "Manage Circles" button
2. WHEN the user clicks "Manage Circles", THEN the CatchUp System SHALL open the same interface used in Step 2 of onboarding
3. WHEN in the Manage Circles flow post-onboarding, THEN the CatchUp System SHALL show current circle assignments and allow modifications
4. WHEN the user makes changes, THEN the CatchUp System SHALL save updates immediately
5. WHEN the user exits the Manage Circles flow, THEN the CatchUp System SHALL return to the Circles section with updated data

### Requirement 7

**User Story:** As a user learning about circles, I want to see educational tips about Dunbar's number and Aristotle's friendship theory, so that I understand the research behind the feature and make informed decisions.

#### Acceptance Criteria

1. WHEN the Manage Circles flow is displayed, THEN the CatchUp System SHALL show educational tips explaining the 4-circle structure
2. WHEN displaying educational content, THEN the CatchUp System SHALL reference Dunbar's research on cognitive limits of social relationships
3. WHEN explaining circle purposes, THEN the CatchUp System SHALL incorporate Aristotle's three types of friendship (utility, pleasure, virtue)
4. WHEN a user hovers over or clicks on a circle, THEN the CatchUp System SHALL display contextual information about that tier's characteristics
5. WHEN educational tips are shown, THEN the CatchUp System SHALL present them in a non-intrusive, easily dismissible format

### Requirement 8

**User Story:** As a user organizing contacts, I want the system to suggest which circle each contact belongs to based on my interaction patterns, so that I can quickly categorize my network with minimal effort.

#### Acceptance Criteria

1. WHEN displaying a contact for assignment, THEN the CatchUp System SHALL analyze communication frequency, recency, and calendar co-attendance
2. WHEN AI analysis is complete, THEN the CatchUp System SHALL suggest the most appropriate circle with a confidence indicator
3. WHEN the AI confidence is high, THEN the CatchUp System SHALL pre-select the suggested circle for one-click acceptance
4. WHEN the user overrides an AI suggestion, THEN the CatchUp System SHALL learn from the correction for future suggestions
5. WHEN no interaction data exists, THEN the CatchUp System SHALL prompt the user to manually select a circle without a suggestion

### Requirement 9

**User Story:** As a user with many contacts, I want to see my progress through the circle assignment process, so that I stay motivated and understand how much work remains.

#### Acceptance Criteria

1. WHEN the Manage Circles flow is active, THEN the CatchUp System SHALL display a progress indicator showing contacts categorized vs. total contacts
2. WHEN a contact is assigned to a circle, THEN the CatchUp System SHALL update the progress indicator in real-time
3. WHEN a circle reaches its recommended capacity, THEN the CatchUp System SHALL provide visual feedback without blocking further assignments
4. WHEN significant progress is made, THEN the CatchUp System SHALL show encouraging messages to maintain user engagement
5. WHEN all contacts are categorized, THEN the CatchUp System SHALL display a completion celebration and mark Step 2 as complete

### Requirement 10

**User Story:** As a user managing circles, I want to understand the recommended capacity for each circle tier, so that I can maintain a balanced and manageable social network.

#### Acceptance Criteria

1. WHEN displaying the Inner Circle, THEN the CatchUp System SHALL indicate a capacity of up to 10 people with explanation of closest relationships
2. WHEN displaying Close Friends, THEN the CatchUp System SHALL indicate a capacity of up to 25 people with explanation of regular contact relationships
3. WHEN displaying Active Friends, THEN the CatchUp System SHALL indicate a capacity of up to 50 people with explanation of periodic contact relationships
4. WHEN displaying Casual Network, THEN the CatchUp System SHALL indicate a capacity of up to 100 people with explanation of occasional contact relationships
5. WHEN a circle exceeds recommended capacity, THEN the CatchUp System SHALL provide gentle suggestions to rebalance without forcing changes

### Requirement 11

**User Story:** As a mobile user, I want the onboarding experience and Manage Circles flow to work seamlessly on my phone, so that I can organize contacts anywhere.

#### Acceptance Criteria

1. WHEN accessing onboarding on mobile, THEN the CatchUp System SHALL render a touch-optimized interface with appropriate sizing
2. WHEN viewing the step indicator on mobile, THEN the CatchUp System SHALL adapt the layout for small screens without losing functionality
3. WHEN using the Manage Circles flow on mobile, THEN the CatchUp System SHALL provide a mobile-friendly grid layout and search interface
4. WHEN interacting with contact cards on mobile, THEN the CatchUp System SHALL support touch gestures for selection and assignment
5. WHEN the screen orientation changes, THEN the CatchUp System SHALL reflow the interface without losing state or progress

### Requirement 12

**User Story:** As a user who wants to skip onboarding, I want the ability to dismiss or postpone the setup process, so that I can explore the app first and complete onboarding later.

#### Acceptance Criteria

1. WHEN viewing the onboarding indicator, THEN the CatchUp System SHALL provide a way to dismiss or minimize the indicator
2. WHEN onboarding is dismissed, THEN the CatchUp System SHALL save the current progress and allow resumption at any time
3. WHEN a user wants to resume onboarding, THEN the CatchUp System SHALL display a CTA button in the sidebar to restart the flow
4. WHEN resuming onboarding, THEN the CatchUp System SHALL continue from the last incomplete step
5. WHEN onboarding is skipped, THEN the CatchUp System SHALL still allow access to all features without blocking functionality

### Requirement 13

**User Story:** As a user completing Step 1, I want clear feedback that my integrations are connected successfully, so that I know I can proceed to the next step.

#### Acceptance Criteria

1. WHEN Google Calendar connection succeeds, THEN the CatchUp System SHALL display a success message and update the step indicator
2. WHEN Google Contacts connection succeeds, THEN the CatchUp System SHALL display a success message and begin importing contacts
3. WHEN both integrations are connected, THEN the CatchUp System SHALL show a visual indicator that Step 1 is complete
4. WHEN integration connection fails, THEN the CatchUp System SHALL display a clear error message with troubleshooting guidance
5. WHEN Step 1 is complete, THEN the CatchUp System SHALL enable Step 2 and provide a prompt to continue

### Requirement 14

**User Story:** As a user in the Manage Circles flow, I want to see how many contacts are currently in each circle, so that I can understand my network distribution at a glance.

#### Acceptance Criteria

1. WHEN displaying circles, THEN the CatchUp System SHALL show the current count of contacts in each circle
2. WHEN a contact is assigned to a circle, THEN the CatchUp System SHALL update the count immediately
3. WHEN a contact is moved between circles, THEN the CatchUp System SHALL update both circle counts in real-time
4. WHEN displaying counts, THEN the CatchUp System SHALL indicate how the current count compares to the recommended capacity
5. WHEN a circle is empty, THEN the CatchUp System SHALL display a message encouraging the user to add contacts

### Requirement 15

**User Story:** As a user with privacy concerns, I want assurance that my contact organization and integration data are secure, so that I feel comfortable connecting my accounts and categorizing relationships.

#### Acceptance Criteria

1. WHEN onboarding begins, THEN the CatchUp System SHALL display a privacy notice explaining data usage and security
2. WHEN integrations are connected, THEN the CatchUp System SHALL use secure OAuth flows without storing passwords
3. WHEN contacts are categorized, THEN the CatchUp System SHALL store all circle assignments privately in the user's account
4. WHEN AI analysis occurs, THEN the CatchUp System SHALL process data without sharing it with third parties
5. WHEN the user requests data deletion, THEN the CatchUp System SHALL permanently remove all onboarding and circle data

### Requirement 16

**User Story:** As a user experiencing the onboarding flow, I want all UI elements to follow the Stone & Clay design system with warm, earthy tones, so that the experience feels cohesive with the rest of the application.

#### Acceptance Criteria

1. WHEN viewing any onboarding screen, THEN the CatchUp System SHALL use CSS custom properties from the Stone & Clay theme following the Radix Colors 12-step methodology
2. WHEN viewing backgrounds, THEN the CatchUp System SHALL use --bg-app for main backgrounds, --bg-surface for cards, and --bg-sidebar for the sidebar
3. WHEN viewing text, THEN the CatchUp System SHALL use --text-primary for high-contrast text and --text-secondary for low-contrast text
4. WHEN viewing borders, THEN the CatchUp System SHALL use --border-subtle for subtle borders and create depth with 1px borders instead of heavy shadows
5. WHEN viewing accent elements, THEN the CatchUp System SHALL use --accent-primary (Amber-600 or Terracotta) for highlights and interactive elements

### Requirement 17

**User Story:** As a user, I want the onboarding step indicator and Manage Circles flow to support both Latte (light) and Espresso (dark) themes, so that I can complete setup comfortably in any lighting condition.

#### Acceptance Criteria

1. WHEN the user toggles between Latte and Espresso modes, THEN the CatchUp System SHALL update all onboarding UI elements using CSS custom properties
2. WHEN in Latte mode, THEN the CatchUp System SHALL use warm alabaster backgrounds (#FDFCF8) and Stone-700 text (#44403C)
3. WHEN in Espresso mode, THEN the CatchUp System SHALL use deep coffee backgrounds (#1C1917) and Stone-100 text (#F5F5F4)
4. WHEN displaying the step indicator, THEN the CatchUp System SHALL use theme-appropriate colors for incomplete, in-progress, and complete states
5. WHEN displaying educational tips, THEN the CatchUp System SHALL use --bg-secondary backgrounds with appropriate theme colors

### Requirement 18

**User Story:** As a user viewing the Manage Circles interface, I want the contact cards and circle visualization to use warm, modern styling, so that organizing relationships feels pleasant and inviting.

#### Acceptance Criteria

1. WHEN displaying contact cards, THEN the CatchUp System SHALL use --bg-surface backgrounds with --border-subtle borders and 12px border radius
2. WHEN displaying contact avatars without images, THEN the CatchUp System SHALL use warm pastel colors (Sage, Sand, Dusty Rose, Stone) for initials
3. WHEN displaying circle capacity indicators, THEN the CatchUp System SHALL use --accent-primary for progress bars and warm styling for counts
4. WHEN hovering over interactive elements, THEN the CatchUp System SHALL use --bg-hover for hover states without heavy shadows
5. WHEN displaying the search bar, THEN the CatchUp System SHALL use --bg-app background with --border-subtle borders and warm focus states
