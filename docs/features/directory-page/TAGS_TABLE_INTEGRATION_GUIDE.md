# TagsTable Integration Guide

## Overview

This guide explains how to integrate the TagsTable component into the main Directory page.

## Files to Update

### 1. public/index.html

Add the Tags tab button and content area:

```html
<!-- In the directory tabs section -->
<div class="directory-tabs">
  <button class="directory-tab active" data-tab="contacts">Contacts</button>
  <button class="directory-tab" data-tab="circles">Circles</button>
  <button class="directory-tab" data-tab="groups">Groups</button>
  <button class="directory-tab" data-tab="tags">Tags</button> <!-- ADD THIS -->
</div>

<!-- In the directory content section -->
<div id="tags-tab" class="directory-tab-content hidden">
  <div id="tags-search-container"></div>
  <div id="tags-table-container"></div>
</div>
```

Add the CSS and JS files:

```html
<head>
  <!-- Existing stylesheets -->
  <link rel="stylesheet" href="/css/tags-table.css">
</head>

<body>
  <!-- Existing scripts -->
  <script src="/js/tags-table.js"></script>
</body>
```

### 2. public/js/app.js

Initialize the TagsTable when the Directory page loads:

```javascript
// Add to the directory page initialization
let tagsTable;
let tagsSearchBar;

async function initDirectoryPage() {
  // ... existing code for contacts, groups ...

  // Initialize Tags Table
  try {
    const tagsResponse = await fetch('/api/groups-tags/tags');
    if (tagsResponse.ok) {
      const tags = await tagsResponse.json();
      
      // Get contacts for count calculation
      const contactsResponse = await fetch('/api/contacts?userId=' + userId);
      const contacts = contactsResponse.ok ? await contactsResponse.json() : [];
      
      tagsTable = new TagsTable('tags-table-container', tags, contacts, {
        onEdit: async (tagId, field, value) => {
          console.log('Tag edited:', tagId, field, value);
          // Refresh contacts to show updated tags
          await refreshContacts();
        },
        onDelete: async (tagId) => {
          console.log('Tag deleted:', tagId);
          // Refresh contacts to remove deleted tag
          await refreshContacts();
        },
        onAdd: async (tag) => {
          console.log('Tag added:', tag);
        }
      });
      
      tagsTable.render();
      
      // Initialize search bar for tags
      tagsSearchBar = new SearchFilterBar('tags-search-container', {
        placeholder: 'Search tags...',
        onSearch: (text, filters) => {
          tagsTable.filter(text);
        }
      });
      
      tagsSearchBar.render();
    }
  } catch (error) {
    console.error('Error initializing tags table:', error);
  }
}

// Add refresh function for tags
async function refreshTags() {
  try {
    const tagsResponse = await fetch('/api/groups-tags/tags');
    if (tagsResponse.ok) {
      const tags = await tagsResponse.json();
      
      const contactsResponse = await fetch('/api/contacts?userId=' + userId);
      const contacts = contactsResponse.ok ? await contactsResponse.json() : [];
      
      if (tagsTable) {
        tagsTable.refresh(tags, contacts);
      }
    }
  } catch (error) {
    console.error('Error refreshing tags:', error);
  }
}
```

### 3. Tab Navigation Integration

Update the TabNavigation to include the tags tab:

```javascript
// In the TabNavigation initialization
const tabNav = new TabNavigation({
  tabs: ['contacts', 'circles', 'groups', 'tags'], // Add 'tags'
  defaultTab: 'contacts',
  onTabChange: (newTab, oldTab) => {
    console.log('Tab changed from', oldTab, 'to', newTab);
    
    // Refresh data when switching to tags tab
    if (newTab === 'tags') {
      refreshTags();
    }
  }
});
```

## API Endpoints Required

The TagsTable component uses these endpoints:

1. **GET /api/groups-tags/tags**
   - Returns array of tags with metadata
   - Response: `[{ id, text, source, userId }]`

2. **POST /api/groups-tags/tags**
   - Creates a new tag
   - Body: `{ text: string, source: 'manual' }`
   - Response: `{ id, text, source, userId }`

3. **PUT /api/groups-tags/tags/:id**
   - Updates tag name
   - Body: `{ text: string }`
   - Response: `{ id, text, source, userId }`

4. **DELETE /api/groups-tags/tags/:id**
   - Deletes tag and removes from all contacts
   - Response: 204 No Content

## Data Flow

1. **Initial Load:**
   - Fetch tags from `/api/groups-tags/tags`
   - Fetch contacts from `/api/contacts` for count calculation
   - Initialize TagsTable with both datasets

2. **Tag Edit:**
   - User clicks on tag name
   - InlineEditCell component handles editing
   - On save, PUT request to `/api/groups-tags/tags/:id`
   - Optimistic UI update, revert on error
   - Refresh contacts to show updated tag

3. **Tag Add:**
   - User clicks "Add Tag" button
   - New row inserted at top
   - User enters tag name
   - POST request to `/api/groups-tags/tags`
   - New tag added to table and sorted

4. **Tag Delete:**
   - User clicks delete button
   - Confirmation dialog shows contact count
   - DELETE request to `/api/groups-tags/tags/:id`
   - Tag removed from table
   - Refresh contacts to remove tag associations

5. **Search/Filter:**
   - User types in search bar
   - TagsTable.filter() called with query
   - Table filtered client-side
   - No API calls needed

## State Management

### Tab State Preservation

The TagsTable should preserve its state when switching tabs:

```javascript
// In TabNavigation.saveCurrentTabState()
if (this.currentTab === 'tags' && window.tagsSearchBar) {
  state.searchQuery = window.tagsSearchBar.getQuery();
}

// In TabNavigation.restoreTabState()
if (tabId === 'tags' && window.tagsSearchBar && state.searchQuery) {
  window.tagsSearchBar.setQuery(state.searchQuery);
}
```

## Styling Notes

- TagsTable uses the same color scheme as ContactsTable and GroupsTable
- AI/voice badges use purple theme (#7c3aed)
- Hover effects match other tables
- Dark mode automatically supported
- Mobile responsive out of the box

## Testing Checklist

Before deploying, verify:

- [ ] Tags tab appears in navigation
- [ ] Tags table loads with data
- [ ] Inline editing works (click tag name)
- [ ] Add tag button creates new tag
- [ ] Delete tag shows confirmation
- [ ] AI/voice badges display correctly
- [ ] Search filters tags
- [ ] Sorting by name works
- [ ] Sorting by count works
- [ ] Contact counts are accurate
- [ ] Tab switching preserves state
- [ ] Dark mode works
- [ ] Mobile responsive

## Common Issues

### Issue: Contact counts are 0
**Solution:** Ensure contacts are passed to TagsTable constructor with proper tag associations.

### Issue: Inline editing doesn't work
**Solution:** Verify InlineEditCell is loaded from contacts-table.js before tags-table.js.

### Issue: API calls fail
**Solution:** Check that `/api/groups-tags/tags` endpoints are properly configured and authenticated.

### Issue: Tags don't update in contacts
**Solution:** Call `refreshContacts()` after tag operations to sync data.

## Example Usage

```javascript
// Initialize with data
const tagsTable = new TagsTable('tags-table-container', tags, contacts, {
  onEdit: (tagId, field, value) => {
    console.log('Tag edited');
    refreshContacts();
  },
  onDelete: (tagId) => {
    console.log('Tag deleted');
    refreshContacts();
  },
  onAdd: (tag) => {
    console.log('Tag added');
  }
});

tagsTable.render();

// Refresh with new data
tagsTable.refresh(newTags, newContacts);

// Filter tags
tagsTable.filter('work');

// Sort tags
tagsTable.sort('text', 'asc');
tagsTable.sort('contactCount', 'desc');
```

## Next Steps

1. Add Tags tab to directory navigation
2. Initialize TagsTable in app.js
3. Wire up API endpoints
4. Test all CRUD operations
5. Verify tab state preservation
6. Test on mobile devices
7. Verify dark mode
8. Deploy to production

## Support

For issues or questions:
- Check verify-tags-table.html for working example
- Review DIRECTORY_PAGE_TASK_11_SUMMARY.md for implementation details
- Consult public/js/tags-table.js for component API
