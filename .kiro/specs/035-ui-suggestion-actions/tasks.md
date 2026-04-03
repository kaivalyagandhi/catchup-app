# Tasks

## Task 1: Add resolveContactChannel utility function
- [x] 1.1 Create `resolveContactChannel(suggestion)` function in `public/js/home-dashboard.js` that returns `{ type, value, contactName }` based on `contacts[0]` fields (phone preferred over email, fallback to 'none')
- [x] 1.2 Define `SNOOZE_DURATIONS` constant array with `{ label, hours }` entries for "3 days" (72), "1 week" (168), "2 weeks" (336)
- [x] 1.3 Add `getDismissalToastMessage(preset)` helper that returns the correct toast message based on feedback preset

## Task 2: Update handleSuggestionAccept to open contact channel
- [x] 2.1 Look up the suggestion from `dashboardData.suggestions` by ID in `handleSuggestionAccept`
- [x] 2.2 Call `resolveContactChannel` and open `sms:{phone}` or `mailto:{email}` via `window.open` before calling the accept API
- [x] 2.3 Show "No contact info available" warning toast when channel type is 'none'
- [x] 2.4 Show "Reaching out to [contact name]" success toast when accept API succeeds and a channel was opened
- [x] 2.5 Show "Failed to accept suggestion. Please try again." error toast on API failure

## Task 3: Implement inline snooze duration picker
- [x] 3.1 Add `renderSnoozePicker(suggestionId)` function returning HTML with `role="group"`, `aria-label="Snooze duration options"`, prompt text, three duration buttons, and a cancel button
- [x] 3.2 Update `handleSuggestionSnooze` to toggle the snooze picker inline on the card (show/hide on repeated clicks), disabling action buttons when picker is visible
- [x] 3.3 Add `handleSnoozeSelect(suggestionId, durationHours, durationLabel)` that sends POST to `/api/suggestions/:id/snooze` with `{ duration }`, shows "Snoozed for [label]" toast on success, removes card
- [x] 3.4 Add `cancelSnooze(suggestionId)` that removes the picker and re-enables action buttons
- [x] 3.5 Show error toast and re-enable buttons on snooze API failure

## Task 4: Add snooze picker CSS styles
- [x] 4.1 Add `.snooze-picker`, `.snooze-picker__prompt`, `.snooze-picker__options`, `.snooze-picker__option`, and `.snooze-picker__cancel` styles to `public/css/dashboard-tabs.css` following the existing `.suggestion-feedback` pattern
- [x] 4.2 Add mobile responsive styles for snooze picker in the existing `@media (max-width: 767px)` block
- [x] 4.3 Add snooze picker selectors to the existing `@media (prefers-reduced-motion: reduce)` block

## Task 5: Update dismissal toast messages
- [x] 5.1 Update `submitFeedback` function to use `getDismissalToastMessage(preset)` instead of the hardcoded "Suggestion dismissed" string
- [x] 5.2 Update the error toast in `submitFeedback` to show "Failed to dismiss suggestion. Please try again."

## Task 6: Write property-based tests
- [x] 6.1 Create test file with fast-check property test for Property 1 (channel resolution prefers phone over email, falls back to email, then none)
- [x] 6.2 Add fast-check property test for Property 2 (channel resolution returns first contact's name)
- [x] 6.3 Add fast-check property test for Property 3 (dismissal toast message selection based on preset)

## Task 7: Write unit tests and manual HTML test
- [x] 7.1 Add unit tests for snooze picker rendering (correct labels, accessibility attributes, prompt text)
- [x] 7.2 Add unit tests for error handling (accept failure, snooze failure, feedback failure toasts)
- [x] 7.3 Create `tests/html/suggestion-actions.html` manual test page with mock suggestion cards to verify reach out, snooze picker, and toast behaviors
