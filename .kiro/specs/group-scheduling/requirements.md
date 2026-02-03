# Requirements Document

## Introduction

This document captures the requirements for the Group Scheduling feature in CatchUp. This feature adds a new "Scheduling" page to the sidebar navigation that enables users to coordinate catchups with friends through intelligent availability collection and AI-powered conflict resolution.

The feature addresses key user needs:
1. **Group Availability Sharing** - Create "Catchup Plans" with multiple friends, collect availability, and find optimal meeting times
2. **Friend Invitation System** - Invite friends to join CatchUp via shareable links (copy/paste to external messaging apps)
3. **AI Conflict Resolution** - Use AI to suggest optimal times and resolve scheduling conflicts
4. **Privacy-First Design** - Users control who sees their calendar availability

Key design decisions:
- No SMS/Twilio integration - users copy invite links and share via their preferred messaging app
- Lightweight availability collection page for non-app users (no login required)
- AI conflict resolution within 14-day window with activity alternatives
- Support for "must attend" vs "nice to have" attendee marking
- Default privacy: only the user sees their own calendar availability

Success metrics:
- Reduce time to schedule group catchups by 50%
- Increase successful group meetup completion rate
- Reduce back-and-forth messaging for scheduling coordination

## Glossary

- **Catchup_Plan**: A scheduling request created by a user to coordinate a meetup with one or more contacts
- **Plan_Initiator**: The user who creates and manages a Catchup Plan
- **Invitee**: A contact invited to participate in a Catchup Plan
- **Availability_Window**: The date range (up to 14 days) within which participants can mark their available times
- **Availability_Page**: A lightweight public web page where non-app users can mark their availability
- **Invite_Link**: A unique, shareable URL that allows invitees to access the Availability Page
- **Must_Attend**: An attendee designation indicating the person is required for the catchup to happen
- **Nice_To_Have**: An attendee designation indicating the person is optional for the catchup
- **Conflict_Resolution**: The AI-powered process of finding optimal meeting times when perfect overlap doesn't exist
- **Free_Busy_View**: A privacy-preserving view showing only whether time slots are free or busy, not event details
- **Inner_Circle**: The closest relationship tier in CatchUp (up to 10 contacts)
- **Activity_Type**: The type of catchup (e.g., coffee, dinner, video call, activity)
- **Scheduling_Page**: The new navigation page for managing all Catchup Plans
- **Scheduling_Preferences**: User-defined preferences for scheduling including preferred days, times, duration, and locations
- **Contact_Group**: A user-defined grouping of contacts (e.g., "Work Friends", "Book Club")
- **Contact_Circle**: A Dunbar-based relationship tier (Inner Circle, Close Friends, Active Friends, Casual Network)

---

## Requirements

### Requirement 1: Scheduling Page Navigation

**User Story:** As a user, I want to access a dedicated Scheduling page from the sidebar, so that I can manage all my catchup plans in one place.

#### Acceptance Criteria

1. THE System SHALL add a "Scheduling" navigation item to the sidebar between "Suggestions" and "Edits"
2. THE Scheduling navigation item SHALL display a calendar/schedule icon
3. WHEN a user has pending availability requests, THE System SHALL display a badge count on the Scheduling nav item
4. WHEN a user clicks the Scheduling nav item, THE System SHALL navigate to the Scheduling page
5. THE Scheduling page SHALL display a "New Plan" button prominently at the top
6. THE Scheduling page SHALL support both calendar view and list view toggle
7. THE System SHALL remember the user's preferred view (calendar/list) in localStorage
8. THE Scheduling page SHALL be responsive and work on mobile devices (viewport >= 320px)

---

### Requirement 2: Create Catchup Plan

**User Story:** As a user, I want to create a new Catchup Plan with selected contacts, so that I can coordinate a meetup with friends.

#### Acceptance Criteria

1. WHEN a user clicks "New Plan", THE System SHALL display a plan creation modal/form
2. THE Plan_Creation form SHALL allow users to select contacts from their contact list
3. THE Plan_Creation form SHALL support searching contacts by name
4. THE Plan_Creation form SHALL allow filtering contacts by Circle (Inner Circle, Close Friends, Active Friends, Casual Network)
5. THE Plan_Creation form SHALL allow filtering contacts by Group (user-defined groups)
6. THE Plan_Creation form SHALL display circle and group badges on each contact for easy identification
7. THE Plan_Creation form SHALL allow selecting an entire Circle or Group with one click ("Add all Inner Circle")
8. THE Plan_Creation form SHALL allow selecting multiple contacts (minimum 1, no maximum)
9. THE Plan_Creation form SHALL allow setting an optional activity type (coffee, dinner, video call, activity, other)
10. THE Plan_Creation form SHALL allow setting an optional duration preference (30min, 1hr, 2hr, half-day)
11. THE Plan_Creation form SHALL allow setting a date range preference (default: next 14 days)
12. THE Plan_Creation form SHALL allow marking each invitee as "Must Attend" or "Nice to Have" (default: Must Attend)
13. THE Plan_Creation form SHALL offer to apply user's saved scheduling preferences (if any exist)
14. WHEN a user submits the plan, THE System SHALL create the Catchup Plan in the database
15. WHEN a plan is created, THE System SHALL generate unique invite links for each non-CatchUp contact
16. THE System SHALL display the generated invite links with copy-to-clipboard functionality
17. THE System SHALL validate that at least one contact is selected before allowing plan creation

---

### Requirement 3: Invite Link Generation and Sharing

**User Story:** As a plan initiator, I want to copy invite links and share them externally, so that my friends can provide their availability.

#### Acceptance Criteria

1. WHEN a Catchup Plan is created, THE System SHALL generate a unique invite link for each invitee
2. THE Invite_Link SHALL be a short, shareable URL (e.g., /availability/{token})
3. THE Invite_Link SHALL expire after 30 days or when the plan is finalized
4. THE System SHALL display invite links in a copyable format with "Copy" button for each
5. WHEN a user clicks "Copy", THE System SHALL copy the link to clipboard and show confirmation toast
6. THE System SHALL provide a "Copy All Links" button to copy all invite links at once
7. THE System SHALL display the invitee name next to each link for easy identification
8. THE System SHALL track which invite links have been accessed (viewed) vs submitted
9. IF an invitee is already a CatchUp user, THE System SHALL note this and still generate a link
10. THE System SHALL allow regenerating an invite link if needed (invalidates old link)

---

### Requirement 4: Availability Collection Page (Non-App Users)

**User Story:** As an invitee without a CatchUp account, I want to mark my availability on a simple web page, so that I can participate in scheduling without creating an account.

#### Acceptance Criteria

1. WHEN an invitee opens an invite link, THE System SHALL display a lightweight availability page
2. THE Availability_Page SHALL NOT require login or account creation
3. THE Availability_Page SHALL display the plan initiator's name and optional activity type
4. THE Availability_Page SHALL display a calendar grid for the specified date range
5. THE Calendar_Grid SHALL allow clicking/tapping time slots to mark as available
6. THE Calendar_Grid SHALL support selecting multiple time slots
7. THE Calendar_Grid SHALL display time slots in 30-minute increments
8. THE Calendar_Grid SHALL respect the invitee's local timezone (auto-detected)
9. THE Availability_Page SHALL allow the invitee to enter their name (pre-filled if known)
10. WHEN an invitee submits availability, THE System SHALL store the selections and notify the plan initiator
11. THE Availability_Page SHALL display a confirmation message after submission
12. THE Availability_Page SHALL allow updating availability before the plan is finalized
13. THE Availability_Page SHALL be mobile-responsive (viewport >= 320px)
14. THE Availability_Page SHALL load quickly (<2 seconds) with minimal JavaScript

---

### Requirement 5: Plan Initiator Availability

**User Story:** As a plan initiator, I want to provide my own availability for the catchup plan, so that the system can find times that work for everyone including me.

#### Acceptance Criteria

1. WHEN a plan is created, THE System SHALL prompt the initiator to mark their availability
2. THE System SHALL offer to auto-populate availability from the initiator's connected Google Calendar
3. IF the initiator has a connected calendar, THE System SHALL show their free time slots pre-selected
4. THE System SHALL allow the initiator to manually adjust their availability
5. THE System SHALL allow the initiator to skip providing availability (use calendar data only)
6. THE System SHALL update the initiator's availability in real-time as they make changes
7. THE System SHALL clearly distinguish between calendar-derived and manually-marked availability

---

### Requirement 6: Availability Dashboard

**User Story:** As a plan initiator, I want to see all collected availability in one view, so that I can understand when everyone is free.

#### Acceptance Criteria

1. WHEN viewing a Catchup Plan, THE System SHALL display an availability dashboard
2. THE Availability_Dashboard SHALL show a visual grid of all participants' availability
3. THE Availability_Dashboard SHALL highlight time slots where all "Must Attend" participants are available
4. THE Availability_Dashboard SHALL show partial overlap times with participant count (e.g., "3/4 available")
5. THE Availability_Dashboard SHALL distinguish between "Must Attend" and "Nice to Have" participants visually
6. THE Availability_Dashboard SHALL show which invitees have responded vs pending
7. THE Availability_Dashboard SHALL update in real-time as new availability is submitted
8. THE System SHALL send the initiator a notification when an invitee submits availability
9. THE Availability_Dashboard SHALL allow filtering by specific participants
10. THE Availability_Dashboard SHALL display participant names on hover/tap for each time slot

---

### Requirement 7: AI Conflict Resolution

**User Story:** As a plan initiator, I want AI to suggest optimal meeting times and alternatives when perfect overlap doesn't exist, so that I can make informed scheduling decisions.

#### Acceptance Criteria

1. WHEN availability is collected, THE System SHALL analyze overlaps and conflicts
2. IF perfect overlap exists for all "Must Attend" participants, THE System SHALL highlight those times as "Recommended"
3. IF no perfect overlap exists, THE System SHALL invoke AI conflict resolution
4. THE AI_Conflict_Resolution SHALL suggest alternative times within the 14-day window
5. THE AI_Conflict_Resolution SHALL suggest which "Nice to Have" attendees could be excluded to enable more options
6. THE AI_Conflict_Resolution SHALL suggest alternative activities if duration is a constraint (e.g., "video call instead of dinner")
7. THE AI_Conflict_Resolution SHALL rank suggestions by number of participants who can attend
8. THE AI_Conflict_Resolution SHALL explain the reasoning for each suggestion
9. THE System SHALL use Google Gemini API for conflict resolution suggestions
10. THE System SHALL present AI suggestions in a clear, actionable format
11. THE System SHALL allow the initiator to accept, modify, or reject AI suggestions

---

### Requirement 8: Privacy Controls for Calendar Sharing

**User Story:** As a user, I want to control who can see my calendar availability, so that my schedule remains private by default.

#### Acceptance Criteria

1. THE System SHALL default to keeping calendar availability private (only the user can see their own)
2. THE System SHALL provide an option to auto-share availability with Inner Circle contacts only
3. WHEN resolving conflicts, THE System SHALL use only free/busy information, not event details
4. THE System SHALL never expose event titles, descriptions, or attendees to other users
5. THE System SHALL display a privacy indicator showing current sharing settings
6. THE System SHALL allow users to change privacy settings from the Scheduling page settings
7. WHEN a user enables Inner Circle sharing, THE System SHALL only share with contacts in their Inner Circle
8. THE System SHALL store privacy preferences in user settings (database)
9. THE System SHALL respect privacy settings when displaying availability to plan initiators

---

### Requirement 9: Finalize and Confirm Catchup

**User Story:** As a plan initiator, I want to finalize a meeting time and notify all participants, so that everyone knows when and where to meet.

#### Acceptance Criteria

1. WHEN the initiator selects a final time, THE System SHALL display a confirmation dialog
2. THE Confirmation_Dialog SHALL show the selected time, duration, and activity type
3. THE Confirmation_Dialog SHALL list all participants who can attend at that time
4. THE Confirmation_Dialog SHALL allow adding an optional location or meeting link
5. THE Confirmation_Dialog SHALL allow adding optional notes for participants
6. WHEN the initiator confirms, THE System SHALL mark the plan as "Scheduled"
7. THE System SHALL update the plan status and store the finalized details
8. THE System SHALL display the finalized catchup on the Scheduling page calendar view
9. THE System SHALL allow the initiator to cancel or reschedule a finalized plan
10. IF the initiator has Google Calendar connected, THE System SHALL offer to create a calendar event

---

### Requirement 10: View Scheduled Catchups

**User Story:** As a user, I want to view all my scheduled and pending catchups, so that I can keep track of my social commitments.

#### Acceptance Criteria

1. THE Scheduling page SHALL display all catchup plans in the selected view (calendar or list)
2. THE Calendar_View SHALL show scheduled catchups on their respective dates
3. THE List_View SHALL show catchups sorted by date (upcoming first)
4. THE System SHALL display plan status (Draft, Collecting Availability, Ready to Schedule, Scheduled, Completed, Cancelled)
5. THE System SHALL allow filtering by status (All, Pending, Scheduled, Past)
6. THE System SHALL allow filtering by plan type (Individual, Group)
7. WHEN clicking a catchup, THE System SHALL display the plan details
8. THE System SHALL show participant count and response status for each plan
9. THE System SHALL highlight plans that need attention (e.g., all availability collected, ready to finalize)
10. THE System SHALL archive completed catchups after 7 days (still viewable in Past filter)

---

### Requirement 11: Individual Catchup Plans

**User Story:** As a user, I want to create catchup plans with a single contact, so that I can use the same scheduling flow for one-on-one meetups.

#### Acceptance Criteria

1. THE System SHALL support creating plans with a single contact (individual catchup)
2. THE Individual_Plan flow SHALL be simplified (no "Must Attend" vs "Nice to Have" distinction)
3. THE Individual_Plan SHALL use the same invite link and availability collection mechanism
4. THE Individual_Plan SHALL skip AI conflict resolution if perfect overlap exists
5. THE System SHALL visually distinguish individual plans from group plans in the list view
6. THE System SHALL allow converting an individual plan to a group plan by adding more contacts

---

### Requirement 12: Plan Management

**User Story:** As a plan initiator, I want to edit, cancel, or delete my catchup plans, so that I can manage my scheduling requests.

#### Acceptance Criteria

1. THE System SHALL allow editing a plan before it is finalized (change contacts, dates, activity)
2. THE System SHALL allow cancelling a plan at any stage
3. WHEN a plan is cancelled, THE System SHALL mark all invite links as invalid
4. THE System SHALL allow deleting a plan (soft delete with archived_at timestamp)
5. THE System SHALL allow sending reminder notifications to invitees who haven't responded
6. THE System SHALL track plan history (created, modified, finalized, cancelled dates)
7. THE System SHALL prevent editing a finalized plan (must cancel and create new)
8. THE System SHALL allow the initiator to extend the availability window if needed

---

### Requirement 13: Notification System for Scheduling

**User Story:** As a user, I want to receive notifications about my catchup plans, so that I stay informed about scheduling updates.

#### Acceptance Criteria

1. WHEN an invitee submits availability, THE System SHALL notify the plan initiator (in-app notification)
2. WHEN all "Must Attend" invitees have responded, THE System SHALL notify the initiator that the plan is ready to finalize
3. WHEN a plan is finalized, THE System SHALL notify all participants (in-app notification)
4. WHEN a plan is cancelled, THE System SHALL notify all participants who had responded
5. THE System SHALL display notification badges on the Scheduling nav item for unread notifications
6. THE System SHALL store notifications in the database with read/unread status
7. THE System SHALL allow users to mark notifications as read
8. THE System SHALL NOT send SMS or email notifications (external sharing only)

---

### Requirement 14: Database Schema for Scheduling

**User Story:** As a developer, I want a well-designed database schema for scheduling, so that the feature is performant and maintainable.

#### Acceptance Criteria

1. THE System SHALL create a `catchup_plans` table with plan metadata
2. THE System SHALL create a `plan_invitees` table linking plans to contacts with attendance type
3. THE System SHALL create a `invitee_availability` table storing time slot selections
4. THE System SHALL create a `invite_links` table with tokens, expiry, and access tracking
5. THE System SHALL use foreign keys to maintain referential integrity
6. THE System SHALL index frequently queried columns (user_id, plan_id, status)
7. THE System SHALL support soft deletes with archived_at timestamps
8. THE System SHALL store timestamps in UTC with timezone metadata

---

### Requirement 15: Mobile Responsiveness

**User Story:** As a mobile user, I want all scheduling features to work well on my device, so that I can manage catchups from anywhere.

#### Acceptance Criteria

1. THE Scheduling page SHALL render correctly on mobile devices (viewport >= 320px)
2. THE Calendar_View SHALL adapt to a day-by-day view on mobile
3. THE Plan_Creation modal SHALL be full-screen on mobile devices
4. THE Availability_Page SHALL use touch-friendly time slot selection
5. All buttons and interactive elements SHALL meet minimum tap target size (44x44px)
6. THE System SHALL support swipe gestures for navigating calendar dates on mobile
7. THE Availability_Dashboard SHALL stack participant rows vertically on mobile

---

### Requirement 16: Scheduling Preferences

**User Story:** As a user, I want to save my scheduling preferences, so that I can quickly apply them when creating new plans without re-entering the same information.

#### Acceptance Criteria

1. THE System SHALL provide a "Scheduling Preferences" section accessible from the Scheduling page settings
2. THE Scheduling_Preferences SHALL allow users to set preferred days of the week (multi-select)
3. THE Scheduling_Preferences SHALL allow users to set preferred time ranges (e.g., "mornings 9-12", "evenings 6-9")
4. THE Scheduling_Preferences SHALL allow users to set preferred duration options (30min, 1hr, 2hr, half-day)
5. THE Scheduling_Preferences SHALL allow users to save favorite locations (free text, up to 10 locations)
6. THE Scheduling_Preferences SHALL allow users to set a default activity type
7. THE System SHALL store preferences in the database linked to the user
8. WHEN creating a new plan, THE System SHALL offer to "Apply my preferences" as a one-click option
9. THE System SHALL allow users to override preferences on a per-plan basis
10. THE System SHALL allow users to save preferences as "one-time" (apply to current plan only) or "always" (default for all new plans)
11. THE Scheduling_Preferences SHALL be editable at any time from the Scheduling page settings
12. THE System SHALL display a summary of active preferences on the Scheduling page

---

### Requirement 17: Quick Plan from Circle or Group

**User Story:** As a user, I want to quickly create a catchup plan for an entire circle or group, so that I can easily schedule group activities with my established friend groups.

#### Acceptance Criteria

1. THE Scheduling page SHALL display quick-action buttons for "Plan with Inner Circle", "Plan with Close Friends", etc.
2. THE System SHALL allow creating a plan directly from a Group's detail page
3. WHEN a user selects "Plan with [Circle/Group]", THE System SHALL pre-populate the plan with all contacts in that circle/group
4. THE System SHALL allow the user to remove individual contacts from the pre-populated list
5. THE System SHALL show the count of contacts that will be invited (e.g., "8 contacts in Inner Circle")
6. THE System SHALL warn if the selected circle/group has more than 20 contacts (large group scheduling)

