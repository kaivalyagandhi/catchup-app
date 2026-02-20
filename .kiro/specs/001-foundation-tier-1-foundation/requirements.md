# Requirements Document

## Introduction

This document captures the requirements for the Tier 1 Foundation features of CatchUp - the critical path items needed for core product functionality and user acquisition. These features are targeted for completion in 4-6 weeks and include:

1. **Landing Page & Marketing Site** - First impression for all users, blocking user acquisition
2. **Simplified "Manage Circles" Flow** - Core onboarding friction reduction
3. **Timezone Preferences** - Technical debt affecting all calendar features
4. **Contact Preview & Archival** - Core contact management functionality

The success metrics for Tier 1 are:
- Landing page conversion rate > 10%
- Onboarding completion rate > 60% (currently ~40%)
- Time to first circle assignment < 5 minutes (target: <30 seconds)

## Glossary

- **Landing_Page**: The public-facing marketing website that introduces CatchUp to potential users
- **Dunbar_Circle**: A relationship tier based on Dunbar's number research (Inner Circle: 10, Close Friends: 25, Active Friends: 50, Casual Network: 100)
- **Circle_Assignment**: The process of categorizing a contact into a Dunbar circle
- **Quick_Start_Flow**: The AI-powered initial onboarding that suggests top contacts for Inner Circle
- **Batch_Assignment**: The ability to assign multiple contacts to a circle in a single action
- **Quick_Refine**: A swipe-style interface for rapidly categorizing remaining uncategorized contacts
- **Timezone_Preference**: The user's preferred timezone for displaying calendar times and availability
- **Contact_Archival**: Soft-deleting contacts to remove them from the active directory while preserving data
- **Conversion_Rate**: The percentage of landing page visitors who sign up for the application
- **Onboarding_Completion_Rate**: The percentage of users who complete the circle assignment process
- **Time_To_Value**: The time from signup to first meaningful action (circle assignment)

---

## Requirements

### Requirement 1: Landing Page Hero Section

**User Story:** As a potential user, I want to see a compelling hero section when I visit the landing page, so that I immediately understand what CatchUp does and why I should use it.

#### Acceptance Criteria

1. WHEN a visitor loads the landing page, THE Landing_Page SHALL display a hero section within the viewport without scrolling
2. THE Landing_Page SHALL display the primary value proposition headline "Your AI-powered Rolodex that actually remembers to call" or equivalent compelling copy
3. THE Landing_Page SHALL display a subheadline explaining the core benefit of reducing coordination friction for maintaining friendships
4. THE Landing_Page SHALL display a prominent call-to-action button for sign up or login
5. WHEN a visitor clicks the CTA button, THE Landing_Page SHALL navigate to the authentication flow
6. THE Landing_Page SHALL render correctly on mobile devices with viewport width >= 320px
7. THE Landing_Page SHALL render correctly on desktop devices with viewport width >= 1024px

---

### Requirement 2: Landing Page Feature Explanation

**User Story:** As a potential user, I want to understand the key features of CatchUp, so that I can decide if it meets my needs for relationship management.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a section explaining Dunbar's circles and relationship management concepts
2. THE Landing_Page SHALL display at least 3 feature highlights with visual demonstrations or icons
3. THE Landing_Page SHALL explain the voice-first context capture capability
4. THE Landing_Page SHALL explain the smart scheduling suggestions capability
5. WHEN a visitor scrolls through the features section, THE Landing_Page SHALL display each feature with a clear title and description
6. THE Landing_Page SHALL use visual elements (icons, illustrations, or screenshots) to demonstrate each feature

---

### Requirement 3: Landing Page Social Proof

**User Story:** As a potential user, I want to see social proof and testimonials, so that I can trust that CatchUp is effective for others.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a social proof section with testimonials or user quotes
2. THE Landing_Page SHALL display at least 2 testimonials with attribution (name or role)
3. IF testimonials are not yet available, THEN THE Landing_Page SHALL display placeholder content that can be easily updated
4. THE Landing_Page SHALL position the social proof section after the feature highlights

---

### Requirement 4: Landing Page SEO and Performance

**User Story:** As a product owner, I want the landing page to be SEO-optimized and performant, so that potential users can discover CatchUp through search engines.

#### Acceptance Criteria

1. THE Landing_Page SHALL include appropriate meta tags (title, description, og:image)
2. THE Landing_Page SHALL include semantic HTML structure with proper heading hierarchy (h1, h2, h3)
3. THE Landing_Page SHALL achieve a Lighthouse performance score >= 80
4. THE Landing_Page SHALL achieve a Lighthouse accessibility score >= 90
5. THE Landing_Page SHALL load within 3 seconds on a 3G connection
6. THE Landing_Page SHALL include alt text for all images

---

### Requirement 5: AI Quick Start Suggestions

**User Story:** As a new user with imported contacts, I want to see AI-suggested Inner Circle contacts immediately, so that I can set up my closest relationships in seconds.

#### Acceptance Criteria

1. WHEN a user enters the circle assignment flow, THE System SHALL display the top 10 AI-suggested Inner Circle contacts
2. THE System SHALL generate suggestions using weighted factors optimized for new users without app history:
   - Shared calendar events (35% weight): count of past calendar events where contact's email appears as attendee
   - Contact metadata richness (30% weight): number of populated fields (birthday, email, address, multiple phone numbers, company, job title, notes, social profiles)
   - Contact age (15% weight): how long the contact has existed in Google Contacts (older = likely more established relationship)
   - Communication frequency (10% weight): interactions per month from interaction logs (if available)
   - Recency (10% weight): days since last contact (if available)
3. THE System SHALL prioritize shared calendar events as the strongest signal for relationship depth during initial onboarding
4. THE System SHALL calculate metadata richness score based on: birthday (+10), email (+5), phone (+5 each, max 15), address (+10), company (+5), job title (+5), notes (+10), social profiles (+5 each)
5. THE System SHALL only suggest contacts with a confidence score >= 85% for Inner Circle
6. THE System SHALL display each suggested contact with their name, confidence score, and reasoning (e.g., "12 shared calendar events, birthday saved")
7. THE System SHALL provide an "Accept All" button that assigns all 10 contacts to Inner Circle in one click
8. THE System SHALL provide a "Review Individually" option to examine each suggestion
9. THE System SHALL provide a "Skip for Now" option to bypass the Quick Start
10. WHEN a user clicks "Accept All", THE System SHALL complete the batch assignment within 2 seconds
11. WHEN a user clicks "Accept All", THE System SHALL display a visual confirmation with undo option
12. THE System SHALL display a mini circular visualizer that updates in real-time as contacts are assigned
13. IF a user has fewer than 10 contacts with >= 85% confidence, THEN THE System SHALL show only the qualifying contacts

---

### Requirement 6: Smart Batching by Relationship Signals

**User Story:** As a user with many contacts, I want to categorize contacts in batches based on relationship signals, so that I don't have to review each contact individually.

#### Acceptance Criteria

1. WHEN a user proceeds past Quick Start, THE System SHALL group remaining contacts by relationship signal strength
2. THE System SHALL create batches based on combined signals:
   - High signal (Close Friends): 5+ shared calendar events OR metadata richness score >= 40
   - Medium signal (Active Friends): 2-4 shared calendar events OR metadata richness score 20-39
   - Low signal (Casual Network): 0-1 shared calendar events AND metadata richness score < 20
3. THE System SHALL display each batch with a summary (e.g., "15 contacts with frequent calendar overlap")
4. THE System SHALL suggest an appropriate circle for each batch based on signal strength
5. THE System SHALL provide an "Accept Batch" button for each group
6. THE System SHALL provide an "Expand to Review" option to see individual contacts in a batch
7. THE System SHALL provide a "Skip" option for each batch
8. WHEN a user accepts a batch, THE System SHALL update the progress bar by 20-30% per batch
9. THE System SHALL display the signal-to-circle mapping rationale (e.g., "5+ shared events → Close Friends")
10. IF a user has existing interaction history in CatchUp, THEN THE System SHALL also factor in communication frequency and recency

---

### Requirement 7: Quick Refine Interface

**User Story:** As a user who has accepted batch suggestions, I want to quickly review and adjust remaining uncategorized contacts, so that I can complete my circle setup efficiently.

#### Acceptance Criteria

1. WHEN a user enters Quick Refine mode, THE System SHALL display only uncategorized or low-confidence contacts
2. THE System SHALL display contacts one at a time in a card-based interface
3. THE System SHALL provide circle assignment buttons (Inner, Close, Active, Casual, Skip) below each card
4. WHEN a user assigns a contact, THE System SHALL immediately show the next contact
5. THE System SHALL display the remaining count of uncategorized contacts
6. THE System SHALL provide a "Done for Now" button that exits the flow at any point
7. WHEN a user exits Quick Refine, THE System SHALL save all progress and allow resumption later
8. THE System SHALL display the last contact date and any available context for each contact

---

### Requirement 8: Undo Capability for Bulk Actions

**User Story:** As a user making bulk assignments, I want to undo my actions within a short window, so that I can recover from mistakes without losing progress.

#### Acceptance Criteria

1. WHEN a user performs a bulk action (Accept All, Accept Batch), THE System SHALL display an undo toast notification
2. THE System SHALL provide a 10-second window to undo the action
3. THE System SHALL display a countdown timer on the undo toast
4. WHEN a user clicks "Undo", THE System SHALL revert all contacts from the bulk action to their previous state
5. WHEN the 10-second window expires, THE System SHALL dismiss the undo toast and finalize the action
6. THE System SHALL support undo for the most recent bulk action only

---

### Requirement 9: Progress Tracking and Milestones

**User Story:** As a user organizing contacts, I want to see my progress visually, so that I feel motivated to continue and complete the setup.

#### Acceptance Criteria

1. THE System SHALL display a progress bar showing percentage of contacts categorized
2. THE System SHALL display absolute numbers (e.g., "60 of 100 contacts organized")
3. THE System SHALL display estimated time remaining based on current pace
4. THE System SHALL display circle capacity indicators showing fill level for each circle
5. WHEN a user reaches 25%, 50%, 75%, or 100% completion, THE System SHALL display a celebration animation
6. THE System SHALL display milestone messages (e.g., "Halfway there! You're building a well-organized relationship network.")
7. THE System SHALL update the mini circular visualizer in real-time as contacts are assigned

---

### Requirement 10: Skip and Resume Capability

**User Story:** As a user who cannot complete circle assignment in one session, I want to skip the process and return later, so that I can use the app without being blocked.

#### Acceptance Criteria

1. THE System SHALL provide a "Skip for Now" option at every step of the circle assignment flow
2. WHEN a user skips, THE System SHALL save all progress made so far
3. THE System SHALL display the count of uncategorized contacts in the Directory tab
4. THE System SHALL provide a "Continue Organizing" CTA in the Directory when uncategorized contacts exist
5. WHEN a user returns to circle assignment, THE System SHALL resume from where they left off
6. THE System SHALL not block access to other app features if circle assignment is incomplete

---

### Requirement 11: Timezone Preference Storage

**User Story:** As a user, I want to set my timezone preference, so that all calendar times are displayed in my local time.

#### Acceptance Criteria

1. THE System SHALL store a timezone preference field in the user preferences table
2. THE System SHALL support all IANA timezone identifiers (e.g., "America/New_York", "Europe/London")
3. WHEN a user signs up, THE System SHALL auto-detect their timezone from the browser
4. THE System SHALL allow users to manually change their timezone in settings
5. THE System SHALL persist timezone preference across sessions
6. IF a user has not set a timezone, THEN THE System SHALL default to UTC

---

### Requirement 12: Timezone Selection UI

**User Story:** As a user, I want to easily select my timezone from a searchable list, so that I can ensure my calendar displays times correctly.

#### Acceptance Criteria

1. THE System SHALL display a timezone selection dropdown in the user settings page
2. THE System SHALL provide a searchable list of timezones
3. THE System SHALL group timezones by region (Americas, Europe, Asia, etc.)
4. THE System SHALL display the current time in the selected timezone as a preview
5. THE System SHALL display the UTC offset for each timezone option
6. WHEN a user changes their timezone, THE System SHALL immediately update all displayed times

---

### Requirement 13: Timezone Application to Calendar Features

**User Story:** As a user viewing calendar availability, I want all times displayed in my timezone, so that I can accurately understand when I'm available.

#### Acceptance Criteria

1. WHEN displaying availability slots, THE System SHALL convert all times to the user's timezone preference
2. WHEN displaying calendar events, THE System SHALL convert all times to the user's timezone preference
3. WHEN generating calendar feed events, THE System SHALL include the user's timezone in the event data
4. THE System SHALL use a timezone library (date-fns-tz) for accurate conversions including DST handling
5. WHEN a user's timezone preference is updated, THE System SHALL refresh all displayed calendar data

---

### Requirement 14: Contact Archival Preview

**User Story:** As a user managing my contacts, I want to preview which contacts will be archived before applying the action, so that I can verify my selections.

#### Acceptance Criteria

1. THE System SHALL provide a preview function that shows contacts matching archival criteria
2. THE System SHALL make the archival preview accessible from:
   - The Directory page via an "Archive Contacts" action in the contact management menu
   - The Settings page under a "Manage Contacts" section
   - The onboarding flow during initial contact import (to archive contacts user doesn't want to track)
3. WHEN a user requests a preview, THE System SHALL display contact details (name, email, phone) for each affected contact
4. THE System SHALL display the total count of contacts that will be archived
5. THE System SHALL allow users to modify their selection before applying
6. THE System SHALL not modify any data during the preview operation
7. IF no contacts match the criteria, THEN THE System SHALL display an appropriate message

---

### Requirement 15: Contact Archival Application

**User Story:** As a user, I want to archive contacts I no longer want to track, so that my active directory only shows relevant relationships.

#### Acceptance Criteria

1. WHEN a user confirms archival, THE System SHALL soft-delete the selected contacts by setting an archived_at timestamp
2. THE System SHALL exclude archived contacts from the main directory view by default
3. THE System SHALL exclude archived contacts from circle assignment flows
4. THE System SHALL exclude archived contacts from suggestion generation
5. THE System SHALL preserve all archived contact data for potential restoration
6. WHEN archival is complete, THE System SHALL display a confirmation with the count of archived contacts

---

### Requirement 16: Archived Contacts Management

**User Story:** As a user, I want to view and restore archived contacts, so that I can recover contacts I archived by mistake.

#### Acceptance Criteria

1. THE System SHALL provide an "Archived Contacts" view accessible from the Directory
2. THE System SHALL display all archived contacts with their archived_at date
3. THE System SHALL provide a "Restore" action for each archived contact
4. WHEN a user restores a contact, THE System SHALL clear the archived_at timestamp
5. WHEN a user restores a contact, THE System SHALL return the contact to the main directory
6. THE System SHALL allow bulk restoration of multiple archived contacts
7. THE System SHALL display the total count of archived contacts

---

### Requirement 17: New API Endpoints for Circle Assignment

**User Story:** As a developer, I want well-defined API endpoints for the new circle assignment features, so that the frontend can efficiently communicate with the backend.

#### Acceptance Criteria

1. THE System SHALL provide a GET /api/ai/quick-start-suggestions endpoint that returns top 10 Inner Circle candidates
2. THE System SHALL provide a GET /api/ai/batch-suggestions endpoint that returns contacts grouped by communication frequency
3. THE System SHALL provide a POST /api/contacts/circles/batch-accept endpoint that accepts batch assignments
4. WHEN calling quick-start-suggestions, THE System SHALL return contacts with confidence scores and reasoning
5. WHEN calling batch-suggestions, THE System SHALL return batches with suggested circles and contact counts
6. WHEN calling batch-accept, THE System SHALL process all assignments atomically (all succeed or all fail)
7. THE System SHALL return appropriate error responses for invalid requests

---

### Requirement 18: Landing Page Integration with Auth Flow

**User Story:** As a visitor who decides to sign up, I want a seamless transition from the landing page to the authentication flow, so that I can quickly start using the app.

#### Acceptance Criteria

1. WHEN a visitor clicks the sign-up CTA, THE Landing_Page SHALL redirect to the Google SSO authentication flow
2. WHEN a visitor clicks the login CTA, THE Landing_Page SHALL redirect to the Google SSO authentication flow
3. WHEN authentication is successful, THE System SHALL redirect new users to the onboarding flow
4. WHEN authentication is successful, THE System SHALL redirect returning users to the main dashboard
5. THE Landing_Page SHALL display the authentication state (logged in/out) if the user is already authenticated
6. IF a logged-in user visits the landing page, THEN THE Landing_Page SHALL display a "Go to Dashboard" CTA instead of sign-up

---

### Requirement 19: Contextual Education During Circle Assignment

**User Story:** As a new user, I want to understand why circles matter and how to use them, so that I can make informed decisions during setup.

#### Acceptance Criteria

1. THE System SHALL display contextual tips at each step of the circle assignment flow
2. THE System SHALL explain Dunbar's number concept in simple terms when first showing circles
3. THE System SHALL show circle capacity as users assign contacts (e.g., "8/10 Inner Circle")
4. WHEN a circle reaches capacity, THE System SHALL display an educational message about Dunbar's research
5. THE System SHALL provide a "Learn more" link to detailed circle explanation
6. THE System SHALL not overwhelm users with all educational content at once (progressive disclosure)

---

### Requirement 20: Mobile-Responsive Circle Assignment

**User Story:** As a mobile user, I want to complete circle assignment on my phone, so that I can set up CatchUp from any device.

#### Acceptance Criteria

1. THE System SHALL render the Quick Start flow correctly on mobile devices (viewport >= 320px)
2. THE System SHALL render the Smart Batching flow correctly on mobile devices
3. THE System SHALL render the Quick Refine flow correctly on mobile devices
4. THE System SHALL use touch-friendly button sizes (minimum 44x44px tap targets)
5. THE System SHALL support swipe gestures in the Quick Refine interface on touch devices
6. THE System SHALL adapt the circular visualizer for smaller screens

