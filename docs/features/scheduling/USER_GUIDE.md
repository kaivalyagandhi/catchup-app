# Group Scheduling User Guide

This guide explains how to use the Group Scheduling feature in CatchUp to coordinate catchups with your friends.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a Plan](#creating-a-plan)
3. [Sharing Invite Links](#sharing-invite-links)
4. [Marking Your Availability](#marking-your-availability)
5. [Viewing the Availability Dashboard](#viewing-the-availability-dashboard)
6. [Using AI Suggestions](#using-ai-suggestions)
7. [Finalizing a Plan](#finalizing-a-plan)
8. [Managing Plans](#managing-plans)
9. [Scheduling Preferences](#scheduling-preferences)
10. [Privacy Settings](#privacy-settings)
11. [For Invitees (Non-App Users)](#for-invitees-non-app-users)

---

## Getting Started

### Accessing the Scheduling Page

1. Click on **"Scheduling"** in the sidebar navigation (between "Suggestions" and "Edits")
2. The Scheduling page displays all your catchup plans
3. Use the view toggle to switch between **Calendar** and **List** views
4. Filter plans by status: **All**, **Pending**, **Scheduled**, or **Past**

### Quick Actions

The Scheduling page provides quick action buttons for common scenarios:
- **Plan with Inner Circle** - Create a plan with all your Inner Circle contacts
- **Plan with Close Friends** - Create a plan with all your Close Friends

---

## Creating a Plan

### Step 1: Start a New Plan

1. Click the **"New Plan"** button at the top of the Scheduling page
2. The Plan Creation modal opens with a multi-step form

### Step 2: Select Contacts

1. **Search**: Type in the search box to find contacts by name
2. **Filter by Circle**: Click circle buttons to filter by relationship tier
   - 💜 Inner Circle
   - 💗 Close Friends
   - 💚 Active Friends
   - 💙 Casual Network
3. **Filter by Group**: Use the dropdown to filter by your custom groups
4. **Add All**: Click "Add All Visible" to add all filtered contacts
5. **Select Individual Contacts**: Click on contact cards to add/remove them

Selected contacts appear as chips at the bottom of the picker.

### Step 3: Set Plan Details

1. **Activity Type** (optional): Choose from:
   - ☕ Coffee
   - 🍽️ Dinner
   - 📹 Video Call
   - 🎯 Activity
   - 📝 Other

2. **Duration**: Select expected duration:
   - 30 minutes
   - 1 hour (default)
   - 2 hours
   - Half day

3. **Date Range**: Set the window for availability collection (max 14 days)

4. **Attendance Type**: For each contact, mark as:
   - **Must Attend** - Required for the catchup to happen
   - **Nice to Have** - Optional, can be excluded if needed

5. **Location** (optional): Enter a location or meeting link
   - If you have saved favorite locations, click to auto-fill

6. **Apply Preferences**: If you have saved scheduling preferences, click "Apply" to auto-fill your preferred settings

### Step 4: Create the Plan

Click **"Create Plan"** to generate invite links for all participants.

---

## Sharing Invite Links

After creating a plan, you'll see unique invite links for each participant.

### Copying Links

1. **Individual Copy**: Click the copy button (📋) next to each link
2. **Copy All**: Click "Copy All Links" to copy all links at once
3. A confirmation toast appears when links are copied

### Sharing Links

Share the copied links with your friends via:
- Text message
- Email
- WhatsApp
- Any messaging app

**Note**: CatchUp does not send invitations automatically. You share links through your preferred communication channels.

### Link Status

On the plan details page, you can see:
- ✅ **Submitted** - Invitee has marked their availability
- 👁️ **Viewed** - Invitee has opened the link but not submitted
- ⏳ **Pending** - Invitee hasn't opened the link yet

### Regenerating Links

If a link needs to be resent:
1. Open the plan details
2. Click "Regenerate" next to the invitee's link
3. The old link becomes invalid
4. Share the new link with the invitee

---

## Marking Your Availability

As the plan initiator, you should also mark your availability.

### Manual Selection

1. Open your plan from the Scheduling page
2. Click **"Mark Your Availability"**
3. Click on time slots in the calendar grid to mark as available
4. Click again to deselect
5. Click **"Save"** when done

### Using Google Calendar

If you have Google Calendar connected:
1. Your free time slots are automatically pre-selected
2. Review and adjust as needed
3. Manually add or remove slots
4. Save your availability

---

## Viewing the Availability Dashboard

The Availability Dashboard shows a visual overview of all participants' availability.

### Understanding the Grid

- **Columns**: Days in the date range
- **Rows**: 30-minute time slots
- **Colors**:
  - 🟢 **Green (Perfect Overlap)**: All must-attend participants available
  - 🟡 **Yellow (Near Overlap)**: Missing 1 must-attend participant
  - 🟠 **Orange (Partial Overlap)**: Some participants available
  - ⬜ **Gray (No Overlap)**: No one available

### Participant Legend

- Each participant has a color indicator
- **Bold names**: Must-attend participants
- **Regular names**: Nice-to-have participants
- **Checkmark**: Has submitted availability
- **Clock**: Pending response

### Viewing Details

- **Hover/tap** on a time slot to see who's available
- The count shows "X/Y available" (e.g., "3/4 available")

---

## Using AI Suggestions

When there's no perfect overlap, AI can help find solutions.

### Getting Suggestions

1. Click **"Get AI Help"** on the Availability Dashboard
2. AI analyzes all availability data
3. Suggestions appear in a panel

### Types of Suggestions

1. **Time Suggestions**: Alternative times that maximize attendance
   - Shows how many can attend
   - Explains why this time works

2. **Exclude Attendee**: Suggests removing a nice-to-have participant
   - Only suggests optional attendees
   - Shows how many more options this opens

3. **Activity Change**: Suggests a different activity type
   - E.g., "Video call instead of dinner"
   - Shorter activities may have more availability

### Applying Suggestions

1. Review the suggestion and reasoning
2. Click **"Apply Suggestion"** to use it
3. The dashboard updates with the new selection
4. You can still modify before finalizing

---

## Finalizing a Plan

Once you've found a suitable time:

### Selecting a Time

1. Click on a time slot in the Availability Dashboard
2. Or apply an AI suggestion

### Confirmation

1. Review the selected time, duration, and activity
2. See which participants can attend
3. Add an optional location or meeting link
4. Add optional notes for participants
5. Click **"Finalize Plan"**

### After Finalization

- Plan status changes to "Scheduled"
- All participants who responded receive a notification
- The plan appears on your calendar view
- If Google Calendar is connected, you can create a calendar event

---

## Managing Plans

### Editing a Plan

Before finalization:
1. Open the plan details
2. Click **"Edit Plan"**
3. Modify date range, activity, duration, or location
4. Add or remove invitees
5. Save changes

**Note**: Finalized plans cannot be edited. Cancel and create a new plan instead.

### Cancelling a Plan

1. Open the plan details
2. Click **"Cancel Plan"**
3. Confirm the cancellation
4. All invite links become invalid
5. Participants who responded receive a notification

### Sending Reminders

For invitees who haven't responded:
1. Open the plan details
2. Click **"Send Reminders"**
3. Reminder notifications are created
4. Share the invite links again with pending invitees

### Viewing Past Plans

1. On the Scheduling page, click the **"Past"** filter
2. Completed and cancelled plans are shown
3. Plans are auto-archived 7 days after completion

---

## Scheduling Preferences

Save your preferences to speed up plan creation.

### Accessing Preferences

1. Click the **settings icon** on the Scheduling page
2. Select **"Scheduling Preferences"**

### Available Settings

1. **Preferred Days**: Select which days work best for you
   - Multi-select: Monday through Sunday

2. **Preferred Time Ranges**: Set your ideal meeting times
   - E.g., "Mornings 9-12", "Evenings 6-9"
   - Add multiple ranges

3. **Preferred Durations**: Select your typical meeting lengths
   - 30 minutes, 1 hour, 2 hours, half-day

4. **Favorite Locations**: Save up to 10 locations
   - Quick access when creating plans
   - E.g., "Starbucks on Main St", "Central Park"

5. **Default Activity Type**: Set your go-to activity

6. **Apply by Default**: Auto-apply preferences to new plans

### Using Preferences

When creating a plan:
1. If preferences exist, you'll see "Apply my preferences"
2. Click to auto-fill your saved settings
3. Override any setting for this specific plan

---

## Privacy Settings

Control who can see your calendar availability.

### Accessing Privacy Settings

1. Click the **settings icon** on the Scheduling page
2. Select **"Privacy Settings"**

### Options

1. **Private (Default)**: Only you see your calendar availability
   - Others see only the availability you manually mark

2. **Share with Inner Circle**: Auto-share free/busy with Inner Circle contacts
   - Only shows free/busy, not event details
   - Helps Inner Circle members see when you're available

### What's Never Shared

- Event titles
- Event descriptions
- Event attendees
- Event locations
- Any calendar details

Only **free/busy status** is ever shared, and only when explicitly enabled.

---

## For Invitees (Non-App Users)

If you received an invite link and don't have a CatchUp account:

### Opening the Link

1. Click the invite link you received
2. A simple availability page opens
3. No login or account required

### Marking Availability

1. Enter your name (may be pre-filled)
2. Your timezone is auto-detected
3. Click on time slots to mark as available
4. Click again to deselect
5. Navigate between weeks if needed

### Submitting

1. Review your selected time slots
2. Click **"Submit Availability"**
3. You'll see a confirmation message
4. The plan organizer is notified

### Updating Availability

Before the plan is finalized:
1. Open the same invite link
2. Your previous selections are shown
3. Make changes as needed
4. Submit again to update

### Link Expiration

- Links expire after 30 days
- Links become invalid when the plan is finalized or cancelled
- Contact the organizer if you need a new link

---

## Tips & Best Practices

### For Better Results

1. **Keep date ranges reasonable**: 7-14 days works best
2. **Mark must-attend carefully**: Only mark truly essential attendees
3. **Share links promptly**: The sooner invitees respond, the sooner you can finalize
4. **Use AI suggestions**: They often find solutions you might miss
5. **Save preferences**: Speeds up future plan creation

### Troubleshooting

**No perfect overlap?**
- Try extending the date range
- Consider marking some attendees as "nice to have"
- Use AI suggestions for alternatives

**Invitee can't access link?**
- Check if the link expired
- Regenerate the link if needed
- Ensure they're using a modern browser

**Calendar not syncing?**
- Verify Google Calendar is connected
- Check calendar selection in settings
- Refresh the page

---

## Related Documentation

- [API Reference](API_REFERENCE.md) - Technical API documentation
- [Feature Overview](README.md) - Feature summary
- [Google Calendar Integration](../google-integrations/) - Calendar setup
