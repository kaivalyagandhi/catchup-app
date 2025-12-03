# Compact Edits UI - Quick Start Guide

## What Changed?

The edits page now uses a modern, compact interface that:
- Groups edits by contact
- Reduces visual footprint by 40-50%
- Provides independent accept/reject controls
- Shows confidence scores with color coding
- Displays source attribution with expandable context

## How to Use

### Viewing Edits

1. Navigate to the **Edits** page from the main menu
2. Edits are automatically grouped by contact
3. Each contact group shows: `X/Y Accepted` (e.g., "2/5 Accepted")

### Expanding/Collapsing Groups

- Click the **▼** chevron to expand a contact group
- Click again to collapse
- Groups expand by default

### Accepting/Rejecting Edits

**Individual edits:**
- Click the **✓** button to accept an edit (turns green)
- Click the **✗** button to reject an edit (turns red)
- Click again to toggle back to pending

**All edits for a contact:**
- Hover over the contact header
- Click **✓ Accept All** to accept all edits for that contact
- Click **✗ Reject All** to reject all edits for that contact

### Viewing Edit Details

- **Confidence Score**: Shows as a percentage badge (red/yellow/green)
  - Red: 0-50% (low confidence)
  - Yellow: 50-75% (medium confidence)
  - Green: 75-100% (high confidence)

- **Source Attribution**: Shows where the edit came from
  - Hover over the source badge to see full context
  - Click to expand a tooltip with full transcript and timestamp

### Submitting Edits

After selecting which edits to accept:
1. Accepted edits are marked with a green background
2. Rejected edits are marked with a muted appearance
3. Edits are automatically submitted when you navigate away or refresh

### Edit History

- Switch to the **Edit History** tab to see all previously applied edits
- History is read-only (cannot be modified)
- Shows timestamp, edit type, target contact, and applied value

## Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│ Edits                                                   │
├─────────────────────────────────────────────────────────┤
│ ▼ Alice Johnson                    2/3 Accepted         │
│   ✓ Accept All  ✗ Reject All                           │
│   🏷️  Add Tag        "friend"      92%  ✓ ✗             │
│   📍  Update Location "NYC"         78%  ✓ ✗             │
│   👥  Add to Group   "Close Friends" 45% ✓ ✗            │
├─────────────────────────────────────────────────────────┤
│ ▶ Bob Smith                        0/2 Accepted         │
├─────────────────────────────────────────────────────────┤
│ ▶ Carol Davis                      1/1 Accepted ✓       │
└─────────────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

- **Tab**: Navigate between edits
- **Enter**: Toggle accept/reject state
- **Escape**: Close any expanded tooltips

## Mobile Experience

On mobile devices (< 480px):
- Action buttons stack vertically
- Source attribution is hidden by default
- Full-width edit items for better readability
- Touch-friendly button sizes (44x44px minimum)

## Troubleshooting

**Edits not showing?**
- Refresh the page
- Check that you have pending edits from voice notes
- Ensure you're logged in

**Confidence scores not displaying?**
- Scores are calculated by the AI system
- May take a moment to appear after recording
- Refresh the page if they don't show

**Can't expand a group?**
- Click directly on the contact name or chevron
- Avoid clicking on the count badge

**Changes not saving?**
- Changes are saved automatically
- Check your internet connection
- Look for error toast notifications

## Tips & Tricks

1. **Bulk Actions**: Use "Accept All" or "Reject All" to quickly process all edits for a contact

2. **Confidence Filtering**: Focus on red (low confidence) edits first - these may need review

3. **Source Context**: Click the source badge to see the exact transcript that generated the edit

4. **Contact Navigation**: Click a contact name to jump to their details page

5. **History Review**: Check Edit History to see what changes have been applied

## Performance

- Displays 5-6 edits without scrolling on standard desktop
- Smooth animations and transitions
- Responsive to all screen sizes
- Optimized for mobile devices

## Support

For detailed information:
- See `EDITS_UI_REDESIGN_IMPLEMENTATION.md` for technical details
- See `.kiro/specs/edits-ui-redesign/` for design specifications
- Check `EDITS_UI_INTEGRATION_COMPLETE.md` for integration details

---

**Version**: 1.0  
**Last Updated**: December 2025
