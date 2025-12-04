# Circles Group Filter - Usage Guide

## Overview
The Circles tab now includes group filtering functionality, allowing you to focus on specific groups within your relationship network. This guide explains how to use the group filter feature.

## Accessing the Group Filter

### Location
The group filter dropdown is located at the top of the Circles visualization, above the circle legend.

### Visibility
- **Visible:** When you have one or more groups defined
- **Hidden:** When you have no groups (the dropdown automatically hides)

## Using the Group Filter

### Filtering by Group

1. **Navigate to Circles Tab**
   - Click the "🎯 Circles" tab in the Directory page
   - The CircularVisualizer will load with all your contacts

2. **Open Group Filter Dropdown**
   - Look for the "Filter by Group:" dropdown at the top
   - Click the dropdown to see available groups

3. **Select a Group**
   - Choose a group from the dropdown (e.g., "Family", "Work", "Friends")
   - The visualization will update immediately

### What Happens When You Filter

**Matching Contacts:**
- Contacts in the selected group remain at **full opacity**
- They appear bright and clearly visible
- All visual elements (circle, text, badges) remain prominent

**Non-Matching Contacts:**
- Contacts NOT in the selected group are **dimmed to 20% opacity**
- They appear faded and less prominent
- Text is dimmed to 30% opacity
- This helps you focus on the filtered group while maintaining context

### Clearing the Filter

1. **Select "All Contacts"**
   - Open the group filter dropdown
   - Select "All Contacts" (the first option)
   - All contacts will return to full opacity

2. **Result**
   - All contacts become fully visible again
   - No contacts are dimmed
   - The visualization returns to its default state

## Visual Examples

### Before Filtering
```
All contacts at full opacity:
🟣 Inner Circle: 5 contacts (all bright)
🔵 Close Friends: 15 contacts (all bright)
🟢 Active Friends: 50 contacts (all bright)
```

### After Filtering by "Work"
```
Only Work group contacts at full opacity:
🟣 Inner Circle: 2 contacts bright, 3 dimmed
🔵 Close Friends: 8 contacts bright, 7 dimmed
🟢 Active Friends: 15 contacts bright, 35 dimmed
```

### After Clearing Filter
```
All contacts return to full opacity:
🟣 Inner Circle: 5 contacts (all bright)
🔵 Close Friends: 15 contacts (all bright)
🟢 Active Friends: 50 contacts (all bright)
```

## Use Cases

### 1. Focus on Work Contacts
**Scenario:** You want to see only your work colleagues in the visualization.

**Steps:**
1. Select "Work" from the group filter
2. Work contacts remain bright
3. Personal contacts are dimmed
4. Easily identify work relationships across all circles

### 2. Review Family Relationships
**Scenario:** You want to check which family members are in which circles.

**Steps:**
1. Select "Family" from the group filter
2. Family members remain bright
3. Non-family contacts are dimmed
4. See family distribution across Inner Circle, Close Friends, etc.

### 3. Analyze Friend Groups
**Scenario:** You want to see how your friends are distributed.

**Steps:**
1. Select "Friends" from the group filter
2. Friends remain bright
3. Other contacts are dimmed
4. Understand friend distribution across relationship tiers

### 4. View All Contacts
**Scenario:** You want to see everyone without filtering.

**Steps:**
1. Select "All Contacts" from the dropdown
2. All contacts return to full visibility
3. Get the complete picture of your network

## Tips and Best Practices

### Organizing Contacts into Groups
- Create meaningful groups (Family, Work, Friends, Hobbies, etc.)
- Assign contacts to groups in the Groups tab
- Contacts can belong to multiple groups
- Use groups to organize by context, not just relationship strength

### Using Filters Effectively
- **Quick Focus:** Use filters to quickly focus on a specific context
- **Relationship Review:** Filter by group to review relationships in that context
- **Planning:** Use filters when planning outreach to specific groups
- **Context Switching:** Switch between groups to see different aspects of your network

### Understanding the Visualization
- **Dimmed contacts are still visible** - This maintains context
- **20% opacity** - Enough to see structure, not distracting
- **Smooth transitions** - Filter changes are smooth and clear
- **Hover still works** - You can still hover over dimmed contacts to see details

## Keyboard Shortcuts
Currently, the group filter is mouse/touch-driven. Future enhancements may include:
- Arrow keys to navigate dropdown
- Number keys to select groups
- Escape to clear filter

## Troubleshooting

### Dropdown Not Visible
**Problem:** The group filter dropdown doesn't appear.

**Solution:**
- Check if you have any groups defined
- Go to the Groups tab and create at least one group
- Assign contacts to groups
- Return to Circles tab - dropdown should now appear

### Filter Not Working
**Problem:** Selecting a group doesn't dim other contacts.

**Solution:**
- Ensure contacts are properly assigned to groups
- Check that the group has members
- Try refreshing the page
- Clear browser cache if issue persists

### All Contacts Dimmed
**Problem:** All contacts appear dimmed after filtering.

**Solution:**
- The selected group may have no members
- Select "All Contacts" to clear the filter
- Check group membership in the Groups tab

## Technical Details

### Filter State
- Filter state is stored in the CircularVisualizer instance
- State persists while on the Circles tab
- State resets when navigating away and back

### Performance
- Filtering is instant, even with hundreds of contacts
- No performance impact on visualization
- Smooth opacity transitions

### Compatibility
- Works in all modern browsers
- Requires JavaScript enabled
- SVG support required

## Related Features

### Groups Tab
- Create and manage groups
- Assign contacts to groups
- View group membership

### Contacts Tab
- View contacts with group badges
- Filter contacts by group using search syntax
- Edit group assignments inline

### Google Contacts Integration
- Import groups from Google Contacts
- Map Google groups to CatchUp groups
- Sync group membership

## Future Enhancements

Planned improvements for group filtering:
- Multiple group selection (OR logic)
- Exclude groups (NOT logic)
- Save filter presets
- Keyboard shortcuts
- Filter by multiple criteria (group + circle)
- Visual indicator showing filtered count

## Feedback and Support

If you encounter issues or have suggestions for the group filter feature:
1. Check this guide for solutions
2. Review the verification page: `verify-circles-group-filter.html`
3. Report issues with specific steps to reproduce
4. Suggest enhancements based on your workflow

## Summary

The group filter in the Circles view provides a powerful way to focus on specific subsets of your network. By dimming non-matching contacts to 20% opacity, you can maintain context while focusing on the group that matters for your current task. Use this feature to:

- Focus on work contacts during work hours
- Review family relationships
- Plan friend gatherings
- Analyze group distribution across circles
- Understand your network structure by context

The filter is easy to use, performs well, and integrates seamlessly with the rest of the Directory page functionality.
