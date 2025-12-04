# Sorting Feature Guide

## Overview
The contacts table now supports comprehensive sorting functionality with multiple sort options, column header sorting, and persistent preferences.

## Features

### 1. Sort Dropdown Control

Located in the top-right of the contacts table controls:

```
[➕ Add Contact]                    [Sort by: ▼ Alphabetical]
```

**Options:**
- **Alphabetical** - Sort contacts A-Z by name (default)
- **Recently Added** - Show newest contacts first
- **Recently Met** - Show contacts you've interacted with most recently

**Usage:**
1. Click the dropdown
2. Select your preferred sort order
3. Table updates immediately
4. Preference is saved for your session

### 2. Column Header Sorting

Click any sortable column header to sort by that column:

**Sortable Columns:**
- **Name** - Alphabetical sorting
- **Location** - Sort by city/location
- **Timezone** - Sort by timezone
- **Frequency** - Sort by contact frequency preference
- **Circle** - Sort by relationship tier (inner → acquaintance)

**Visual Indicators:**
- **▲** - Ascending order (A-Z, oldest-newest, inner-outer)
- **▼** - Descending order (Z-A, newest-oldest, outer-inner)

**Usage:**
1. Click a column header to sort by that column (ascending)
2. Click again to reverse the sort order (descending)
3. Click a different header to sort by that column
4. The active sort column shows a blue arrow indicator

### 3. Sort Order Examples

#### Alphabetical Sort (Default)
```
Name              Email                    Phone
─────────────────────────────────────────────────
Alice Johnson     alice.johnson@...        +1 (555) 123-4567
Bob Smith         bob.smith@...            +1 (555) 234-5678
Charlie Brown     charlie.brown@...        +1 (555) 345-6789
Diana Prince      diana.prince@...         +1 (555) 456-7890
```

#### Recently Added Sort
```
Name              Created At               Source
─────────────────────────────────────────────────
Tina Turner       2025-12-01              🔵 Google
Sam Wilson        2025-11-28              Manual
Rachel Green      2025-11-15              🔵 Google
Quinn Taylor      2025-10-30              Manual
```

#### Recently Met Sort
```
Name              Last Interaction         Circle
─────────────────────────────────────────────────
Peter Parker      2025-12-02              Inner Circle
Olivia Martinez   2025-11-30              Close Friends
Noah Kim          2025-11-25              Active Friends
Maya Patel        2025-11-20              Casual Network
```

#### Circle Sort
```
Name              Circle                   Frequency
─────────────────────────────────────────────────
Alice Johnson     Inner Circle            Weekly
Bob Smith         Close Friends           Bi-weekly
Charlie Brown     Active Friends          Monthly
Diana Prince      Casual Network          Quarterly
Eve Adams         Acquaintances           Quarterly
Frank Miller      Uncategorized           -
```

### 4. Sort Persistence

Your sort preference is automatically saved and restored:

**Behavior:**
- ✅ Persists across page refreshes
- ✅ Maintained after adding/editing/deleting contacts
- ✅ Restored when returning to the page
- ✅ Session-specific (cleared when browser closes)

**Example:**
1. Sort by "Recently Met" (descending)
2. Refresh the page (F5)
3. Table automatically shows "Recently Met" sort
4. Sort indicator shows ▼ on the active column

### 5. Keyboard Shortcuts

While the table is focused:
- **Tab** - Navigate between sort dropdown and column headers
- **Enter/Space** - Activate dropdown or sort by column
- **Arrow Keys** - Navigate dropdown options

### 6. Mobile Experience

On mobile devices (< 768px):
- Sort controls stack vertically
- Dropdown expands to full width
- Column headers remain clickable
- Sort indicators scale appropriately

```
┌─────────────────────────┐
│  ➕ Add Contact         │
├─────────────────────────┤
│ Sort by: ▼ Alphabetical │
└─────────────────────────┘
```

## Technical Details

### Sort Algorithms

1. **Text Sorting** (Name, Location)
   - Case-insensitive comparison
   - Handles null/undefined values
   - Alphabetical order

2. **Date Sorting** (Recently Added, Recently Met)
   - Timestamp-based comparison
   - Descending order (newest first)
   - Handles missing dates

3. **Circle Sorting**
   - Custom hierarchy: inner → close → active → casual → acquaintance → uncategorized
   - Supports ascending and descending
   - Uncategorized contacts always last (ascending) or first (descending)

### Storage

Sort preferences are stored in `sessionStorage`:
- **Key:** `contactsTableSortBy` (e.g., "name", "createdAt", "lastInteractionAt")
- **Key:** `contactsTableSortOrder` (e.g., "asc", "desc")

### Performance

- Client-side sorting (instant updates)
- Efficient comparison algorithms
- No server round-trips
- Handles 1000+ contacts smoothly

## Common Use Cases

### Use Case 1: Find Recently Added Contacts
1. Select "Recently Added" from dropdown
2. Newest contacts appear at the top
3. Quickly review recent additions

### Use Case 2: Prioritize Recent Interactions
1. Select "Recently Met" from dropdown
2. See who you've talked to recently
3. Identify contacts you haven't reached out to

### Use Case 3: Review by Relationship Tier
1. Click "Circle" column header
2. Contacts grouped by relationship closeness
3. Focus on inner circle first

### Use Case 4: Find Contacts by Location
1. Click "Location" column header
2. Contacts grouped by city
3. Plan meetups with nearby contacts

### Use Case 5: Custom Sort Preference
1. Choose your preferred sort order
2. Work with contacts in that order
3. Preference persists across sessions

## Tips & Tricks

1. **Quick Toggle**: Click the same column header twice to reverse sort order
2. **Reset to Default**: Select "Alphabetical" from dropdown to return to A-Z
3. **Clear Preference**: Clear browser data or use incognito mode for fresh start
4. **Combine with Filters**: Use search filters with sorting for powerful queries
5. **Mobile Sorting**: Use dropdown on mobile for easier sorting than column headers

## Troubleshooting

**Sort not persisting?**
- Check if sessionStorage is enabled in your browser
- Ensure you're not in private/incognito mode
- Try clearing browser cache

**Sort indicator not showing?**
- Refresh the page
- Check if you're sorting by a sortable column
- Verify JavaScript is enabled

**Dropdown not working?**
- Ensure JavaScript is enabled
- Check browser console for errors
- Try refreshing the page

## Future Enhancements

Potential improvements for future versions:
- Multi-column sorting (sort by circle, then by name)
- Custom sort orders (user-defined)
- Permanent preferences (localStorage or user settings)
- Sort by tags or groups
- Advanced sorting options (case-sensitive, natural sort)
