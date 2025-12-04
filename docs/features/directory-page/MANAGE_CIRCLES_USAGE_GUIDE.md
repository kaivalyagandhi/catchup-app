# Manage Circles Feature - Usage Guide

## Overview
The "Manage Circles" feature allows users to organize their contacts into relationship circles based on Dunbar's number theory. This guide explains how to use the feature and what to expect.

## Accessing the Feature

### From the Directory Page
1. Click "📁 Directory" in the main navigation
2. Click the "🎯 Circles" tab
3. Click the "⚙️ Manage Circles" button in the header

### Button Location
The "Manage Circles" button is prominently positioned in the Circles tab header, right-aligned next to the "Circles" heading.

## Using the Manage Circles Modal

### Modal Layout
When you click "Manage Circles", a modal window opens with:
- **Header**: Title and close button (×)
- **Instructions**: Information about circle organization
- **Contact List**: Grid of contact cards
- **Footer**: Cancel and Save Changes buttons

### Circle Types
You can assign contacts to five different circles:

1. **Inner Circle** (Purple)
   - Your closest relationships
   - Recommended: 5 people
   - Example: Immediate family, best friends

2. **Close Friends** (Blue)
   - Regular contact
   - Recommended: 15 people
   - Example: Close friends you see often

3. **Active Friends** (Green)
   - Frequent interaction
   - Recommended: 50 people
   - Example: Friends you see regularly

4. **Casual Network** (Amber)
   - Occasional contact
   - Recommended: 150 people
   - Example: Colleagues, acquaintances

5. **Acquaintances** (Gray)
   - Infrequent contact
   - Recommended: 500 people
   - Example: People you know but rarely interact with

### Assigning Contacts to Circles

1. **Review Contact Cards**
   - Each card shows the contact's name and email/phone
   - Current circle assignment is pre-selected in the dropdown

2. **Change Circle Assignment**
   - Click the dropdown for any contact
   - Select the appropriate circle
   - The change is saved immediately to the database

3. **Save or Cancel**
   - Click "Save Changes" to complete and close the modal
   - Click "Cancel" to close without completing the onboarding session
   - Click the × button to cancel

### What Happens When You Save
1. Success message appears
2. Modal closes
3. You return to the Circles tab
4. The CircularVisualizer refreshes with your updated assignments
5. Contacts appear in their new circles

### What Happens When You Cancel
1. Modal closes
2. You return to the Circles tab
3. Any changes you made are still saved (they save as you make them)
4. The onboarding session is not marked as complete

## Tips and Best Practices

### Organizing Your Circles
- Start with your closest relationships (Inner Circle)
- Work outward to less frequent contacts
- Don't worry about getting it perfect - you can always adjust later
- Use the recommended sizes as guidelines, not strict limits

### Managing Large Contact Lists
- The modal is scrollable for large contact lists
- Contact cards are displayed in a responsive grid
- Use the search feature (if available) to find specific contacts

### Keyboard Shortcuts
- **Esc**: Close the modal (same as Cancel)
- **Tab**: Navigate between dropdowns
- **Enter**: Open/close dropdown

## Troubleshooting

### "You don't have any contacts yet"
If you see this message:
1. Click "OK" to import contacts from Google
2. You'll be taken to the Preferences page
3. Connect your Google account
4. Import your contacts
5. Return to the Circles tab and try again

### Modal Won't Open
- Ensure you're logged in
- Check that you have contacts in the system
- Refresh the page and try again

### Changes Not Saving
- Check your internet connection
- Look for error messages in the toast notifications
- Try refreshing the page and making changes again

### CircularVisualizer Not Updating
- The visualizer should refresh automatically after saving
- If it doesn't, try refreshing the page
- Check that your changes were saved by opening the modal again

## State Preservation

### What Gets Preserved
When you open the Manage Circles modal:
- Your current tab (Circles)
- Your scroll position
- Any active filters

When you close the modal:
- You return to the same tab
- Your scroll position is restored
- Your filters are restored

### Why This Matters
This ensures a seamless experience - you won't lose your place when managing circles.

## Integration with Other Features

### CircularVisualizer
- After saving changes, the visualizer updates automatically
- Contacts move to their new circles
- Circle capacity indicators update

### Contact Details
- Circle assignments are saved to the contact record
- You can see a contact's circle in the Contacts table
- Circle information is used for suggestions and reminders

### Onboarding Flow
- This is part of the contact onboarding system
- Completing the modal marks the onboarding step as complete
- You can access this anytime, not just during initial setup

## API Endpoints Used

The feature interacts with these API endpoints:
- `POST /api/onboarding/initialize` - Start onboarding session
- `POST /api/onboarding/complete` - Complete onboarding session
- `PATCH /api/contacts/:id` - Update contact circle assignment

## Browser Compatibility

The feature works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

The modal is designed with accessibility in mind:
- Keyboard navigation supported
- Screen reader friendly
- High contrast colors
- Clear focus indicators

## Privacy and Security

- All changes are saved to your account only
- Circle assignments are private to you
- No data is shared with other users
- Changes are encrypted in transit

## Getting Help

If you encounter issues:
1. Check this guide for troubleshooting tips
2. Refresh the page and try again
3. Check the browser console for error messages
4. Contact support with details about the issue

## Related Features

- **Circles Tab**: View your contacts in the circular visualization
- **Contacts Table**: See circle assignments in table format
- **Group Filter**: Filter circles by group membership
- **Weekly Catchup**: Get suggestions based on circle assignments

## Future Enhancements

Planned improvements:
- Search/filter contacts in the modal
- Bulk assignment actions
- Undo/redo functionality
- Visual feedback during save
- Progress indicator for large lists
- AI-powered circle suggestions

## Conclusion

The Manage Circles feature makes it easy to organize your contacts into meaningful relationship tiers. Use it regularly to keep your circles up to date as your relationships evolve.
