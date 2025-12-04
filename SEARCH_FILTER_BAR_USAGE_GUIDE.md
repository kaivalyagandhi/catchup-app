# SearchFilterBar Usage Guide

## Overview
The SearchFilterBar component provides advanced search and filtering capabilities for the Directory page. It supports real-time text search and property-based filtering with autocomplete suggestions.

## Quick Start

### Basic Usage

```javascript
// Create a SearchFilterBar instance
const searchFilterBar = new SearchFilterBar('container-id', {
    onSearch: (text, filters) => {
        // Handle search/filter changes
        const filteredData = searchFilterBar.applyFilters(allData, text, filters);
        updateDisplay(filteredData);
    },
    onFetchTags: async () => {
        // Return available tags for autocomplete
        return ['work', 'family', 'friend'];
    },
    onFetchGroups: async () => {
        // Return available groups for autocomplete
        return [
            { id: 'g1', name: 'Work' },
            { id: 'g2', name: 'Family' }
        ];
    }
});

// Render the component
searchFilterBar.render();
```

## Filter Syntax

### Supported Filters

| Filter | Syntax | Example | Description |
|--------|--------|---------|-------------|
| Tag | `tag:VALUE` | `tag:work` | Filter by tag name |
| Group | `group:VALUE` | `group:family` | Filter by group name |
| Source | `source:VALUE` | `source:google` | Filter by source (google, manual) |
| Circle | `circle:VALUE` | `circle:inner` | Filter by Dunbar circle |
| Location | `location:VALUE` | `location:NYC` | Filter by location |

### Circle Values
- `inner` - Inner Circle (0-5 contacts)
- `close` - Close Friends (5-15 contacts)
- `active` - Active Friends (15-50 contacts)
- `casual` - Casual Network (50-150 contacts)
- `acquaintance` - Acquaintances (150+ contacts)

### Multiple Filters
Combine multiple filters with spaces. All filters use AND logic:

```
tag:work source:google          → Contacts with "work" tag AND from Google
circle:inner tag:friend         → Inner circle contacts with "friend" tag
tag:work group:colleagues       → Contacts with "work" tag in "colleagues" group
```

### Text Search
Any text without a filter prefix searches across name, email, and phone:

```
alice                           → Search for "alice" in name/email/phone
alice tag:work                  → Search "alice" AND has "work" tag
```

## API Reference

### Constructor

```javascript
new SearchFilterBar(container, options)
```

**Parameters:**
- `container` (string|HTMLElement) - Container element or ID
- `options` (object) - Configuration options
  - `onSearch` (function) - Callback when search/filters change: `(text, filters) => {}`
  - `onFilter` (function) - Callback when filters change: `(filters) => {}`
  - `onFetchTags` (function) - Async function to fetch available tags
  - `onFetchGroups` (function) - Async function to fetch available groups
  - `placeholder` (string) - Input placeholder text

### Methods

#### `render()`
Renders the search filter bar in the container.

```javascript
searchFilterBar.render();
```

#### `parseQuery(query)`
Parses a search query into text and filters.

```javascript
const parsed = searchFilterBar.parseQuery('alice tag:work');
// Returns: { text: 'alice', filters: { tag: ['work'] } }
```

#### `applyFilters(data, text, filters)`
Applies filters to a dataset.

```javascript
const filtered = searchFilterBar.applyFilters(contacts, 'alice', { tag: ['work'] });
```

#### `clearFilters()`
Clears all filters and resets the search input.

```javascript
searchFilterBar.clearFilters();
```

#### `getQuery()`
Gets the current search query.

```javascript
const query = searchFilterBar.getQuery();
```

#### `getFilters()`
Gets the current active filters.

```javascript
const filters = searchFilterBar.getFilters();
// Returns: { tag: ['work'], source: ['google'] }
```

#### `setQuery(query)`
Sets the search query programmatically.

```javascript
searchFilterBar.setQuery('tag:work source:google');
```

## Autocomplete

### How It Works
The autocomplete system provides suggestions as you type:

1. **Filter Type Suggestions**: When typing without a colon
   - Type `tag` → Suggests `tag:`
   - Type `gro` → Suggests `group:`

2. **Filter Value Suggestions**: When typing after a colon
   - Type `tag:w` → Suggests `tag:work`, `tag:weekend`
   - Type `circle:i` → Suggests `circle:inner`

3. **Dynamic Data**: Tags and groups are fetched from your data
   - Provided via `onFetchTags` and `onFetchGroups` callbacks

### Customizing Autocomplete

```javascript
const searchFilterBar = new SearchFilterBar('container', {
    onFetchTags: async () => {
        // Fetch from API or extract from data
        const response = await fetch('/api/tags');
        const tags = await response.json();
        return tags.map(t => t.name);
    },
    onFetchGroups: async () => {
        // Fetch from API or extract from data
        const response = await fetch('/api/groups');
        return response.json(); // Array of { id, name }
    }
});
```

## Styling

### CSS Classes

The component uses these CSS classes (defined in `contacts-table.css`):

- `.search-filter-bar` - Main container
- `.search-input-wrapper` - Input wrapper with icon
- `.search-input` - Text input field
- `.search-icon` - Search icon (🔍)
- `.clear-filters-btn` - Clear button (✕)
- `.active-filters` - Container for filter chips
- `.filter-chip` - Individual filter chip
- `.search-autocomplete-list` - Autocomplete dropdown
- `.search-autocomplete-item` - Autocomplete item

### Dark Mode
All styles include dark mode support via `@media (prefers-color-scheme: dark)`.

### Mobile Responsive
The component is fully responsive and adapts to mobile viewports.

## Examples

### Example 1: Basic Integration

```javascript
// Initialize with contacts data
const contacts = [
    { id: '1', name: 'Alice', tags: [{ text: 'work' }], source: 'google' },
    { id: '2', name: 'Bob', tags: [{ text: 'friend' }], source: 'manual' }
];

const searchFilterBar = new SearchFilterBar('search-container', {
    onSearch: (text, filters) => {
        const filtered = searchFilterBar.applyFilters(contacts, text, filters);
        displayContacts(filtered);
    },
    onFetchTags: async () => {
        const tags = new Set();
        contacts.forEach(c => c.tags.forEach(t => tags.add(t.text)));
        return Array.from(tags);
    }
});

searchFilterBar.render();
```

### Example 2: With ContactsTable

```javascript
const contactsTable = new ContactsTable('table-container', contacts);
const searchFilterBar = new SearchFilterBar('search-container', {
    onSearch: (text, filters) => {
        const filtered = searchFilterBar.applyFilters(contacts, text, filters);
        contactsTable.filteredData = filtered;
        contactsTable.render();
    }
});

searchFilterBar.render();
contactsTable.render();
```

### Example 3: Programmatic Control

```javascript
// Set a filter programmatically
searchFilterBar.setQuery('tag:work source:google');

// Get current filters
const filters = searchFilterBar.getFilters();
console.log(filters); // { tag: ['work'], source: ['google'] }

// Clear all filters
searchFilterBar.clearFilters();
```

## Testing

### Manual Testing
Open `verify-search-filter.html` in a browser to test:
- Real-time search
- Filter syntax parsing
- Autocomplete suggestions
- Clear filters button
- Active filter chips

### Automated Testing
Open `test-search-filter-functionality.html` to run automated tests:
- 15 comprehensive test cases
- Covers all requirements (4.1-4.6, 8.4)
- Shows pass/fail results

## Requirements Coverage

| Requirement | Feature | Status |
|-------------|---------|--------|
| 4.1 | Real-time text search | ✅ Complete |
| 4.2 | Tag filter syntax | ✅ Complete |
| 4.3 | Group filter syntax | ✅ Complete |
| 4.4 | Source filter syntax | ✅ Complete |
| 4.5 | Multiple filters (AND logic) | ✅ Complete |
| 4.6 | Clear filters button | ✅ Complete |
| 8.4 | Circle filter syntax | ✅ Complete |

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Performance

- **Real-time filtering**: Optimized for <1000 contacts (client-side)
- **Autocomplete**: Debounced to prevent excessive rendering
- **Memory**: Minimal footprint, no memory leaks

## Troubleshooting

### Autocomplete not showing
- Ensure `onFetchTags` and `onFetchGroups` are provided
- Check that callbacks return arrays
- Verify data format: tags as strings, groups as `{ id, name }`

### Filters not working
- Check that `onSearch` callback is provided
- Verify `applyFilters` is called with correct parameters
- Ensure data structure matches expected format

### Styling issues
- Verify `contacts-table.css` is loaded
- Check for CSS conflicts with other stylesheets
- Ensure container has proper dimensions

## Next Steps

After implementing the SearchFilterBar, the next tasks are:
1. Task 6: Add contact functionality
2. Task 7: Sorting functionality
3. Task 8: Checkpoint - Ensure contacts table is fully functional

---

**Component:** SearchFilterBar  
**Version:** 1.0  
**Last Updated:** December 3, 2024  
**Requirements:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.4
