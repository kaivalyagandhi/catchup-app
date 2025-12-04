# Circle Column Usage Guide

## Overview

The Circle column in the Contacts table displays each contact's Dunbar circle assignment, allowing you to quickly see relationship tiers at a glance.

---

## Circle Badges

Each contact displays a colored badge indicating their circle:

### Circle Types

| Circle | Color | Badge Example | Description |
|--------|-------|---------------|-------------|
| **Inner Circle** | Purple (#8b5cf6) | `Inner Circle` | Your closest relationships (max 5) |
| **Close Friends** | Blue (#3b82f6) | `Close Friends` | Good friends you see regularly (max 15) |
| **Active Friends** | Green (#10b981) | `Active Friends` | Friends you maintain regular contact with (max 50) |
| **Casual Network** | Amber (#f59e0b) | `Casual Network` | Acquaintances and occasional contacts (max 150) |
| **Acquaintances** | Gray (#6b7280) | `Acquaintances` | People you know but rarely interact with (max 500) |
| **Uncategorized** | Light Gray | `Uncategorized` | Contacts not yet assigned to a circle |

---

## Sorting by Circle

### How to Sort

1. Click the **Circle** column header
2. First click: Sort ascending (Inner → Acquaintances → Uncategorized)
3. Second click: Sort descending (Uncategorized → Acquaintances → Inner)
4. Sort indicator (▲/▼) shows current direction

### Sort Order

**Ascending (▲):**
1. Inner Circle
2. Close Friends
3. Active Friends
4. Casual Network
5. Acquaintances
6. Uncategorized

**Descending (▼):**
1. Uncategorized
2. Acquaintances
3. Casual Network
4. Active Friends
5. Close Friends
6. Inner Circle

### Sort Persistence

Your sort preference is saved in the browser session and restored when:
- Refreshing the page
- Adding/editing contacts
- Switching between tabs

---

## Filtering by Circle

### Filter Syntax

Use the search bar with the `circle:` prefix:

```
circle:inner          # Show only Inner Circle contacts
circle:close          # Show only Close Friends
circle:active         # Show only Active Friends
circle:casual         # Show only Casual Network
circle:acquaintance   # Show only Acquaintances
```

### Autocomplete

As you type `circle:`, autocomplete suggestions appear:
- `circle:inner` - Filter by Inner Circle
- `circle:close` - Filter by Close Friends
- `circle:active` - Filter by Active Friends
- `circle:casual` - Filter by Casual Network
- `circle:acquaintance` - Filter by Acquaintances

### Combining Filters

Combine circle filters with other filters using AND logic:

```
circle:inner tag:family           # Inner Circle contacts with "family" tag
circle:close source:google        # Close Friends from Google Contacts
circle:active group:work          # Active Friends in "work" group
circle:casual location:NYC        # Casual Network in New York
```

### Filter Chips

Active filters display as chips below the search bar:
- Click the ✕ to remove a specific filter
- Click "Clear all filters" button to remove all filters

---

## Use Cases

### 1. Focus on Close Relationships
```
circle:inner
```
Shows only your Inner Circle (5 closest people) for focused relationship maintenance.

### 2. Review Active Friendships
```
circle:active
```
Shows Active Friends to ensure you're maintaining regular contact.

### 3. Find Uncategorized Contacts
```
circle:uncategorized
```
Shows contacts that haven't been assigned to a circle yet.

### 4. Work Contacts in Close Circle
```
circle:close tag:work
```
Shows Close Friends who are also work colleagues.

### 5. Google Contacts by Circle
```
circle:close source:google
```
Shows Close Friends imported from Google Contacts.

---

## Visual Examples

### Table View

```
┌──────────────┬────────────┬──────────────────┬─────────┐
│ Name         │ Email      │ Circle           │ Tags    │
├──────────────┼────────────┼──────────────────┼─────────┤
│ Alice        │ alice@...  │ [Inner Circle]   │ family  │
│ Bob          │ bob@...    │ [Close Friends]  │ work    │
│ Carol        │ carol@...  │ [Active Friends] │ friend  │
│ David        │ david@...  │ [Casual Network] │ network │
│ Eve          │ eve@...    │ [Acquaintances]  │ event   │
│ Frank        │ frank@...  │ [Uncategorized]  │         │
└──────────────┴────────────┴──────────────────┴─────────┘
```

### Filter Chips

```
┌─────────────────────────────────────────────────────┐
│ 🔍 circle:inner tag:family                          │
├─────────────────────────────────────────────────────┤
│ [circle: inner ✕] [tag: family ✕]                  │
└─────────────────────────────────────────────────────┘
```

---

## Mobile View

On mobile devices, the Circle column appears as a labeled field in the card view:

```
┌─────────────────────────────────┐
│ Alice Johnson                   │
├─────────────────────────────────┤
│ Email: alice@example.com        │
│ Phone: +1-555-0101              │
│ Circle: [Inner Circle]          │
│ Tags: [family]                  │
│ Groups: [Family]                │
└─────────────────────────────────┘
```

---

## Tips & Best Practices

### 1. Regular Review
- Sort by circle to review relationship distribution
- Ensure you're not exceeding recommended circle sizes
- Move contacts between circles as relationships evolve

### 2. Prioritize Inner Circle
- Filter to `circle:inner` to focus on closest relationships
- Ensure weekly contact frequency for Inner Circle
- Use for important life updates and events

### 3. Maintain Active Friends
- Filter to `circle:active` monthly
- Check last interaction dates
- Schedule catch-ups for those you haven't contacted recently

### 4. Categorize New Contacts
- Filter to uncategorized contacts regularly
- Assign appropriate circles based on relationship depth
- Use onboarding flow for bulk categorization

### 5. Combine with Other Filters
- `circle:close tag:work` - Work friends to grab lunch with
- `circle:active location:NYC` - Friends in your city
- `circle:casual source:google` - Imported contacts to review

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Focus search bar | `/` |
| Clear filters | `Esc` (when search focused) |
| Sort by circle | Click column header |
| Navigate table | `Tab` / `Shift+Tab` |

---

## Troubleshooting

### Circle badge not showing
- Check if contact has `dunbarCircle` or `circle` field
- Verify field value is one of: inner, close, active, casual, acquaintance
- Contacts without circle assignment show "Uncategorized"

### Filter not working
- Ensure syntax is correct: `circle:value` (no spaces)
- Check spelling: inner, close, active, casual, acquaintance
- Try autocomplete by typing `circle:` and selecting from suggestions

### Sort not persisting
- Check browser allows sessionStorage
- Sort preference is session-based (clears when browser closes)
- Re-sort if needed after page refresh

---

## Related Features

- **Circles Tab:** Visual representation of contacts in concentric circles
- **Manage Circles:** Bulk assignment of contacts to circles
- **Circle Capacity:** Warnings when exceeding recommended sizes
- **Frequency Preferences:** Default contact frequency per circle

---

## Next Steps

1. ✅ Circle column implemented and functional
2. ⏭️ Implement Circles tab with visual representation
3. ⏭️ Add circle assignment UI (drag-and-drop or modal)
4. ⏭️ Add circle capacity indicators
5. ⏭️ Integrate with onboarding flow

---

## Support

For issues or questions:
1. Check `verify-circle-column.html` for test examples
2. Review `DIRECTORY_PAGE_TASK_16_SUMMARY.md` for implementation details
3. See `design.md` for requirements and specifications
