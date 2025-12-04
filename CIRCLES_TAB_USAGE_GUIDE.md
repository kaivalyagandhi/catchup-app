# Circles Tab Usage Guide

## Overview
The Circles tab in the Directory page displays your contacts organized in concentric circles based on Dunbar's number theory. This visualization helps you understand your relationship network at a glance.

---

## Accessing the Circles Tab

### From Directory Page
1. Click **📁 Directory** in the main navigation
2. Click the **🎯 Circles** tab button
3. The URL will update to `#directory/circles`

### Direct Link
Navigate directly to: `http://localhost:3000/#directory/circles`

---

## Understanding the Visualization

### Circle Zones
The visualization displays 5 concentric circles representing different relationship tiers:

| Circle | Color | Recommended Size | Description |
|--------|-------|------------------|-------------|
| **Inner Circle** | 🟣 Purple | 5 contacts | Your closest relationships - family and best friends |
| **Close Friends** | 🔵 Blue | 15 contacts | Good friends you see regularly |
| **Active Friends** | 🟢 Green | 50 contacts | Friends you maintain regular contact with |
| **Casual Network** | 🟠 Amber | 150 contacts | Acquaintances and occasional contacts |
| **Acquaintances** | ⚫ Gray | 500 contacts | People you know but rarely interact with |

### Legend
At the top of the visualization, you'll see a legend showing:
- **Circle name** and color badge
- **Contact count** in "X / Y" format (current / recommended)
- **Color-coded status**:
  - 🟢 **Green**: Within recommended size
  - 🟠 **Orange**: Exceeds recommended but not maximum
  - 🔴 **Red**: Exceeds maximum size

---

## Interacting with Contacts

### Viewing Contact Details
**Hover** over any contact dot to see a tooltip with:
- Contact name
- Email address
- Phone number
- Group memberships

### Editing Contacts
**Click** on any contact dot to open the edit contact modal where you can:
- Update contact information
- Change circle assignment
- Modify tags and groups
- Add notes

---

## Contact Dot Features

### Visual Indicators

#### Initials
Each contact dot displays the contact's initials (first and last name)

#### Colors
Contact dots are colored based on a hash of the contact's name for easy visual identification

#### Group Badge
Contacts in groups show a purple badge with:
- Single dot for 1 group
- Number for multiple groups

#### AI Suggestion Indicator
Contacts with high-confidence AI circle suggestions show a green dot indicator

---

## Managing Circles

### Assign Contacts to Circles
Click the **⚙️ Manage Circles** button to:
1. Open the onboarding flow
2. Review AI-suggested circle assignments
3. Manually assign contacts to circles
4. Save your changes

The visualization will automatically refresh after you complete the onboarding flow.

---

## Capacity Management

### Understanding Capacity Indicators

The legend shows capacity status for each circle:

#### Within Capacity (Green)
```
Inner Circle: 3 / 5
```
You're within the recommended size. This is ideal for maintaining quality relationships.

#### Over Recommended (Orange)
```
Close Friends: 18 / 15
```
You've exceeded the recommended size but are still within the maximum. Consider if all contacts truly belong in this tier.

#### Over Maximum (Red)
```
Active Friends: 65 / 50
```
You've exceeded the maximum recommended size. This may indicate:
- Some contacts should be moved to a different circle
- You're trying to maintain too many relationships at this tier
- Consider reorganizing your network

### Best Practices
1. **Inner Circle**: Reserve for your absolute closest relationships (5 max)
2. **Close Friends**: People you see regularly and maintain close bonds with (15 max)
3. **Active Friends**: Friends you actively keep in touch with (50 max)
4. **Casual Network**: Acquaintances you occasionally interact with (150 max)
5. **Acquaintances**: People you know but rarely contact (500 max)

---

## Responsive Design

### Desktop View
- Full visualization with all circles visible
- Large contact dots with clear labels
- Detailed tooltips on hover

### Mobile View
- Scaled visualization to fit screen
- Touch-friendly contact dots
- Optimized legend layout
- Horizontal scrolling for tabs if needed

---

## Troubleshooting

### Visualization Not Loading
**Problem**: Circles tab shows loading spinner indefinitely

**Solutions**:
1. Check that you're logged in
2. Ensure you have contacts in your account
3. Refresh the page
4. Check browser console for errors

### Contacts Not Appearing
**Problem**: Circles are empty even though you have contacts

**Solutions**:
1. Contacts need circle assignments (dunbarCircle field)
2. Use "Manage Circles" button to assign contacts
3. Check that contacts have valid circle values: inner, close, active, casual, acquaintance

### Click Not Working
**Problem**: Clicking contact dots doesn't open edit modal

**Solutions**:
1. Ensure JavaScript is enabled
2. Check browser console for errors
3. Try refreshing the page
4. Verify circular-visualizer.js is loaded

### Capacity Colors Wrong
**Problem**: Legend shows wrong colors for capacity status

**Solutions**:
1. Verify contact counts are correct
2. Check circle definitions in CIRCLE_DEFINITIONS
3. Ensure contacts have valid circle assignments

---

## Technical Details

### Data Requirements

Contacts must have the following structure:
```javascript
{
  id: 'contact-id',
  name: 'Contact Name',
  email: 'email@example.com',
  phone: '555-0123',
  circle: 'inner', // or 'close', 'active', 'casual', 'acquaintance'
  dunbarCircle: 'inner', // legacy field, mapped to circle
  groups: ['group-id-1', 'group-id-2'],
  color: '#8b5cf6' // optional custom color
}
```

### Circle Assignment
Contacts can be assigned to circles via:
1. **Onboarding flow**: Interactive UI for bulk assignment
2. **Edit contact modal**: Individual contact assignment
3. **API**: Direct database updates

### URL Hash
The Circles tab uses URL hash routing:
- Format: `#directory/circles`
- Persists across page refreshes
- Enables direct linking
- Updates on tab switch

---

## Integration with Other Features

### Groups
- Contacts in groups show group badges
- Future: Group filtering will highlight specific groups

### Tags
- Tags are displayed in contact tooltips
- Tags don't affect circle visualization

### Google Contacts
- Google-synced contacts can be assigned to circles
- Source doesn't affect visualization

### Voice Notes
- Voice notes can suggest circle assignments
- AI confidence shown with green indicator

---

## Keyboard Shortcuts

Currently, the Circles tab doesn't have keyboard shortcuts, but you can:
- Use **Tab** to navigate between UI elements
- Use **Enter** to click buttons
- Use **Escape** to close modals

---

## Performance

### Optimization
- Virtualized rendering for large contact lists
- Efficient SVG rendering
- Smooth animations and transitions
- Responsive to window resize

### Limits
- Recommended maximum: 1000 total contacts
- Performance may degrade with 2000+ contacts
- Consider archiving inactive contacts

---

## Future Enhancements

Planned features for upcoming releases:
1. **Group filtering**: Filter visualization by group membership
2. **Search**: Find specific contacts in visualization
3. **Zoom controls**: Zoom in/out on specific circles
4. **Export**: Export visualization as image
5. **Analytics**: Relationship network statistics
6. **Animations**: Smooth transitions when updating circles

---

## Support

### Getting Help
- Check the verification file: `verify-circles-tab.html`
- Review the implementation summary: `DIRECTORY_PAGE_TASK_17_SUMMARY.md`
- Check browser console for error messages
- Contact support with specific error details

### Reporting Issues
When reporting issues, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console error messages
5. Screenshot if applicable

---

## Related Documentation

- [Directory Page Overview](DIRECTORY_PAGE_TASK_1_SUMMARY.md)
- [Circular Visualizer Component](public/js/circular-visualizer.js)
- [Onboarding Flow](public/js/onboarding-controller.js)
- [Requirements Document](.kiro/specs/directory-page-redesign/requirements.md)
- [Design Document](.kiro/specs/directory-page-redesign/design.md)
