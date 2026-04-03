# Requirements Document

## Introduction

This feature improves the three action buttons on suggestion cards ("Reach out", "Snooze", "Not now") in the home dashboard. Currently, "Reach out" silently marks a suggestion as accepted, "Snooze" snoozes with no duration choice and no feedback, and "Not now" shows a generic toast after dismissal. The goal is to make each action more useful: "Reach out" opens the user's messaging or email app with the contact pre-filled, "Snooze" shows an inline duration picker, and "Not now" displays a more informative dismissal toast.

## Glossary

- **Dashboard**: The home dashboard page rendered by `public/js/home-dashboard.js`
- **Suggestion_Card**: A UI card displaying an AI-generated suggestion to reach out to a contact or group
- **Action_Buttons**: The set of buttons at the bottom of a Suggestion_Card ("Reach out", "Snooze", "Not now")
- **Contact_Info**: The `contacts` array on a suggestion object, where each entry has `name`, `email`, and `phone` fields
- **Snooze_Picker**: An inline UI element that appears on the Suggestion_Card allowing the user to select a snooze duration
- **Toast**: A brief notification message shown at the bottom of the screen
- **Messaging_App**: The user's default SMS/text messaging application, opened via `sms:` URI scheme
- **Email_App**: The user's default email application, opened via `mailto:` URI scheme

## Requirements

### Requirement 1: Reach Out Opens Contact Channel

**User Story:** As a user, I want the "Reach out" button to open my messaging or email app with the contact pre-filled, so that I can immediately start a conversation without manually looking up contact info.

#### Acceptance Criteria

1. WHEN the user clicks "Reach out" on a Suggestion_Card and the first contact has a `phone` value, THE Dashboard SHALL open the Messaging_App with the phone number pre-filled using the `sms:` URI scheme
2. WHEN the user clicks "Reach out" on a Suggestion_Card and the first contact has an `email` value but no `phone` value, THE Dashboard SHALL open the Email_App with the email address pre-filled using the `mailto:` URI scheme
3. WHEN the user clicks "Reach out" on a Suggestion_Card and the first contact has both `phone` and `email` values, THE Dashboard SHALL prefer the Messaging_App over the Email_App
4. WHEN the user clicks "Reach out" on a Suggestion_Card and the first contact has neither `phone` nor `email`, THE Dashboard SHALL display a Toast with the message "No contact info available"
5. WHEN the user clicks "Reach out", THE Dashboard SHALL call the accept API endpoint to mark the suggestion as accepted regardless of whether Contact_Info is available
6. WHEN the accept API call succeeds, THE Dashboard SHALL remove the Suggestion_Card from the list

### Requirement 2: Reach Out Handles Group Suggestions

**User Story:** As a user, I want "Reach out" on a group suggestion to open a channel to the first contact in the group, so that I can initiate coordination.

#### Acceptance Criteria

1. WHEN the user clicks "Reach out" on a group Suggestion_Card, THE Dashboard SHALL use the first contact in the `contacts` array to determine the communication channel
2. WHEN the group Suggestion_Card's first contact has a `phone` value, THE Dashboard SHALL open the Messaging_App with that phone number
3. WHEN the group Suggestion_Card's first contact has only an `email` value, THE Dashboard SHALL open the Email_App with that email address

### Requirement 3: Snooze Duration Picker

**User Story:** As a user, I want to choose how long to snooze a suggestion, so that I can be reminded at an appropriate time.

#### Acceptance Criteria

1. WHEN the user clicks "Snooze" on a Suggestion_Card, THE Dashboard SHALL display a Snooze_Picker inline on the card with three duration options: "3 days", "1 week", "2 weeks"
2. THE Snooze_Picker SHALL appear below the Action_Buttons, similar to how the feedback presets appear for "Not now"
3. WHEN the Snooze_Picker is already visible and the user clicks "Snooze" again, THE Dashboard SHALL hide the Snooze_Picker and re-enable the Action_Buttons
4. THE Snooze_Picker SHALL include a "Cancel" button that hides the picker and re-enables the Action_Buttons
5. WHEN the user selects a duration option, THE Dashboard SHALL send a POST request to `/api/suggestions/:id/snooze` with the corresponding duration in hours (72 for 3 days, 168 for 1 week, 336 for 2 weeks)
6. WHEN the snooze API call succeeds, THE Dashboard SHALL display a Toast with the message "Snoozed for [duration label]" and remove the Suggestion_Card
7. IF the snooze API call fails, THEN THE Dashboard SHALL display an error Toast and re-enable the Action_Buttons

### Requirement 4: Snooze Picker Accessibility

**User Story:** As a user who relies on assistive technology, I want the snooze picker to be accessible, so that I can use it with a screen reader or keyboard.

#### Acceptance Criteria

1. THE Snooze_Picker SHALL have a `role="group"` attribute and an `aria-label="Snooze duration options"` attribute
2. THE Snooze_Picker SHALL include a visible prompt text (e.g., "Snooze for how long?") above the duration buttons
3. WHEN the Snooze_Picker is displayed, THE Dashboard SHALL disable the Action_Buttons to prevent conflicting interactions

### Requirement 5: Improved Dismissal Toast

**User Story:** As a user, I want a more informative message after dismissing a suggestion, so that I know the app will adjust future suggestions based on my feedback.

#### Acceptance Criteria

1. WHEN a suggestion is dismissed via the "Not now" feedback flow, THE Dashboard SHALL display a Toast with the message "Got it, we'll adjust future suggestions" instead of "Suggestion dismissed"
2. WHEN a suggestion is dismissed with the "Don't suggest this contact" preset, THE Dashboard SHALL display a Toast with the message "Got it, we won't suggest this contact again"
3. IF the feedback API call fails, THEN THE Dashboard SHALL display an error Toast with the message "Failed to dismiss suggestion. Please try again."

### Requirement 6: Reach Out Toast Feedback

**User Story:** As a user, I want clear feedback after clicking "Reach out", so that I know the suggestion was processed.

#### Acceptance Criteria

1. WHEN the user clicks "Reach out" and a communication channel is opened, THE Dashboard SHALL display a Toast with the message "Reaching out to [contact name]"
2. WHEN the user clicks "Reach out" and no Contact_Info is available, THE Dashboard SHALL display a Toast with the message "No contact info available" with a warning style
3. IF the accept API call fails, THEN THE Dashboard SHALL display an error Toast with the message "Failed to accept suggestion. Please try again."
