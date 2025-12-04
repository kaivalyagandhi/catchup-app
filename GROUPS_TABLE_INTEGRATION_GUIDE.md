# GroupsTable Integration Guide

## Quick Start

This guide explains how to integrate the GroupsTable component into the Directory page.

## Step 1: Add CSS to index.html

Add the GroupsTable stylesheet to your `<head>` section:

```html
<link rel="stylesheet" href="public/css/groups-table.css">
```

## Step 2: Add JavaScript to index.html

Add the GroupsTable script after contacts-table.js:

```html
<script src="public/js/contacts-table.js"></script>
<script src="public/js/groups-table.js"></script>
```

## Step 3: Add Groups Tab HTML

Add the Groups tab content section to your Directory page:

```html
<!-- Groups Tab Content -->
<div id="groups-tab" class="directory-tab-content hidden">
    <div id="groups-table-container"></div>
</div>
```

## Step 4: Add Groups Tab Button

Add the Groups tab button to your tab navigation:

```html
<button class="directory-tab" data-tab="groups">Groups</button>
```

## Step 5: Initialize GroupsTable in JavaScript

Add initialization code in your app.js or directory page script:

```javascript
// Fetch groups and contacts data
async function loadGroupsData() {
    try {
        const [groupsResponse, contactsResponse] = await Promise.all([
            fetch(`/api/contacts/groups?userId=${window.userId}`),
            fetch(`/api/contacts?userId=${window.userId}`)
        ]);

        const groups = await groupsResponse.json();
        const contacts = await contactsResponse.json();

        return { groups, contacts };
    } catch (error) {
        console.error('Error loading groups data:', error);
        return { groups: [], contacts: [] };
    }
}

// Initialize GroupsTable
let groupsTable;

async function initGroupsTable() {
    const { groups, contacts } = await loadGroupsData();

    groupsTable = new GroupsTable(
        'groups-table-container',
        groups,
        contacts,
        {
            onEdit: async (groupId, field, value) => {
                console.log('Group edited:', groupId, field, value);
                // Optionally refresh other components that depend on groups
            },
            onDelete: async (groupId) => {
                console.log('Group deleted:', groupId);
                // Optionally refresh other components that depend on groups
            },
            onAdd: async (group) => {
                console.log('Group added:', group);
                // Optionally refresh other components that depend on groups
            }
        }
    );

    groupsTable.render();
}

// Call when Groups tab is first shown
initGroupsTable();
```

## Step 6: Integrate with Tab Navigation

Update your tab switching logic to handle the Groups tab:

```javascript
// In your TabNavigation or tab switching code
function switchToGroupsTab() {
    // Hide other tabs
    document.querySelectorAll('.directory-tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Show groups tab
    document.getElementById('groups-tab').classList.remove('hidden');

    // Initialize if not already initialized
    if (!groupsTable) {
        initGroupsTable();
    }
}
```

## Step 7: Add Search/Filter (Optional)

If you want to add search functionality to the Groups tab:

```javascript
// Add search bar HTML
<div id="groups-search-container"></div>

// Initialize search bar
const groupsSearchBar = new SearchFilterBar('groups-search-container', {
    placeholder: 'Search groups...',
    onSearch: (text, filters) => {
        if (groupsTable) {
            groupsTable.filter(text);
        }
    }
});

groupsSearchBar.render();
```

## API Endpoints Required

Ensure your backend has these endpoints:

### GET /api/contacts/groups
```javascript
// Returns array of groups
[
    {
        id: 'group-id',
        userId: 'user-id',
        name: 'Group Name',
        description: 'Group description',
        contactIds: ['contact-id-1', 'contact-id-2'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
]
```

### POST /api/contacts/groups
```javascript
// Request body
{
    userId: 'user-id',
    name: 'New Group',
    description: 'Optional description',
    contactIds: []
}

// Response: created group object
```

### PUT /api/contacts/groups/:id
```javascript
// Request body
{
    userId: 'user-id',
    name: 'Updated Name',
    description: 'Updated description'
}

// Response: updated group object
```

### DELETE /api/contacts/groups/:id
```javascript
// Query params: ?userId=user-id
// Response: 204 No Content or success message
```

## Styling Customization

The GroupsTable uses CSS variables for theming. You can customize colors by overriding these variables:

```css
:root {
    --color-primary: #3b82f6;
    --color-primary-hover: #2563eb;
    --bg-primary: #ffffff;
    --text-primary: #1f2937;
    /* ... etc */
}
```

## Event Handling

The GroupsTable emits callbacks for important events:

```javascript
{
    onEdit: (groupId, field, value) => {
        // Called when a group is edited
        // Update other components that depend on this group
    },
    onDelete: (groupId) => {
        // Called when a group is deleted
        // Update other components that reference this group
    },
    onAdd: (group) => {
        // Called when a new group is created
        // Update other components that list groups
    }
}
```

## Refresh Data

To refresh the groups table with new data:

```javascript
async function refreshGroupsTable() {
    const { groups, contacts } = await loadGroupsData();
    groupsTable.refresh(groups, contacts);
}
```

## Error Handling

The component uses the global `showToast()` function for notifications. Ensure this function is available:

```javascript
window.showToast = function(message, type) {
    // Your toast notification implementation
    // type can be: 'success', 'error', 'info', 'loading'
};
```

## Mobile Considerations

The GroupsTable is fully responsive. On mobile:
- Description column is hidden
- Table adapts to smaller screens
- Touch-friendly interaction targets
- Optimized for mobile performance

## Dark Mode

Dark mode is automatically supported via CSS media queries:

```css
@media (prefers-color-scheme: dark) {
    /* Dark mode styles applied automatically */
}
```

Or use the data-theme attribute:

```html
<html data-theme="dark">
```

## Troubleshooting

### Groups not displaying
- Check that `window.userId` is set
- Verify API endpoints are returning data
- Check browser console for errors

### Inline editing not working
- Ensure `InlineEditCell` is loaded from contacts-table.js
- Check that cells have `editable` class
- Verify API endpoints for PUT requests

### Expandable rows not working
- Check that contacts data is passed to constructor
- Verify contactIds in groups match contact IDs
- Check console for JavaScript errors

### Styling issues
- Ensure groups-table.css is loaded
- Check for CSS conflicts with other stylesheets
- Verify CSS variables are defined

## Complete Example

See `verify-groups-table.html` for a complete working example with sample data.

## Next Steps

1. Test with real data from your API
2. Add integration with Google Contacts Mappings Review (Task 12)
3. Implement property-based tests (optional tasks 10.3, 10.5, 10.8)
4. Add additional features as needed

## Support

For issues or questions:
1. Check the implementation in `public/js/groups-table.js`
2. Review the styling in `public/css/groups-table.css`
3. Test with `verify-groups-table.html`
4. Check the summary in `DIRECTORY_PAGE_TASK_10_SUMMARY.md`
