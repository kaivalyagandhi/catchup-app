# Google Mappings Review Integration Guide

## Quick Start

### 1. Include Required Files

Add these files to your HTML page in order:

```html
<!-- CSS -->
<link rel="stylesheet" href="public/css/contacts-table.css">
<link rel="stylesheet" href="public/css/groups-table.css">
<link rel="stylesheet" href="public/css/google-mappings-review.css">

<!-- JavaScript -->
<script src="public/js/google-mappings-review.js"></script>
<script src="public/js/groups-table.js"></script>
<script src="public/js/contacts-table.js"></script>
```

### 2. Set Up HTML Structure

```html
<!-- Tab Navigation -->
<div class="directory-tabs">
    <button class="directory-tab" data-tab="contacts">Contacts</button>
    <button class="directory-tab active" data-tab="groups">Groups</button>
    <button class="directory-tab" data-tab="tags">Tags</button>
</div>

<!-- Groups Tab Content -->
<div id="groups-tab" class="directory-tab-content">
    <div id="groups-table-container"></div>
</div>
```

### 3. Initialize Components

```javascript
// Initialize TabNavigation
const tabNavigation = new TabNavigation({
    tabs: ['contacts', 'groups', 'tags'],
    defaultTab: 'groups',
    onTabChange: (newTab, oldTab) => {
        console.log(`Switched from ${oldTab} to ${newTab}`);
    }
});

tabNavigation.attachTabHandlers();
tabNavigation.init();

// Initialize GroupsTable with mappings callback
const groupsTable = new GroupsTable('groups-table-container', groups, contacts, {
    onMappingsUpdate: async () => {
        // Update red dot indicator when mappings change
        const hasPending = await groupsTable.hasPendingMappings();
        if (hasPending) {
            tabNavigation.showNotification('groups');
        } else {
            tabNavigation.hideNotification('groups');
        }
    }
});

groupsTable.render();

// Check for pending mappings and show red dot
const hasPending = await groupsTable.hasPendingMappings();
if (hasPending) {
    tabNavigation.showNotification('groups');
}
```

## API Requirements

### Required Endpoints

Your backend must implement these endpoints:

#### 1. Get Pending Mappings
```
GET /api/contacts/sync/groups/mappings/pending
Authorization: Bearer {token}

Response: Array of mapping objects
[
    {
        id: string,
        googleResourceName: string,
        googleName: string,
        suggestedAction: 'create_new' | 'map_existing',
        suggestedGroupName: string,
        suggestionReason: string,
        confidenceScore: number (0-1),
        memberCount: number,
        status: 'pending'
    }
]
```

#### 2. Get Mapping Members
```
GET /api/contacts/sync/groups/mappings/:id/members
Authorization: Bearer {token}

Response:
{
    mappingId: string,
    googleName: string,
    memberCount: number,
    members: [
        {
            id: string,
            name: string,
            email: string,
            phone: string,
            location: string
        }
    ]
}
```

#### 3. Approve Mapping
```
POST /api/contacts/sync/groups/mappings/:id/approve
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
    excludedMembers: string[] (optional)
}

Response:
{
    message: string,
    mapping: object,
    membershipsUpdated: number
}
```

#### 4. Reject Mapping
```
POST /api/contacts/sync/groups/mappings/:id/reject
Authorization: Bearer {token}

Response:
{
    message: string
}
```

#### 5. Get Groups (for refresh)
```
GET /api/contacts/groups?userId={userId}
Authorization: Bearer {token}

Response: Array of group objects
```

## Configuration

### Global Variables

Set these before initializing components:

```javascript
window.authToken = 'your-jwt-token';
window.API_BASE = '/api'; // or your API base URL
window.userId = 'user-id';
```

### Component Options

#### GoogleMappingsReview Options
```javascript
{
    onApprove: (mappingId, result) => {
        // Called when mapping is approved
    },
    onReject: (mappingId) => {
        // Called when mapping is rejected
    },
    onUpdate: () => {
        // Called when mappings list changes
    }
}
```

#### GroupsTable Options
```javascript
{
    sortBy: 'name',
    sortOrder: 'asc',
    onEdit: (groupId, field, value) => {
        // Called when group is edited
    },
    onDelete: (groupId) => {
        // Called when group is deleted
    },
    onAdd: (group) => {
        // Called when group is added
    },
    onMappingsUpdate: () => {
        // Called when mappings change
        // Use this to update red dot indicator
    }
}
```

## Styling Customization

### CSS Variables

Override these CSS variables to customize appearance:

```css
:root {
    /* Colors */
    --color-primary: #2563eb;
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --border-primary: #e5e7eb;
    
    /* Status colors */
    --status-success-bg: #d1fae5;
    --status-success-text: #065f46;
    --status-warning-bg: #fef3c7;
    --status-warning-text: #92400e;
    --status-error-bg: #fee2e2;
    --status-error-text: #991b1b;
}
```

### Custom Styling

Add custom styles after the component CSS:

```css
/* Customize mappings review background */
.google-mappings-review {
    background: linear-gradient(135deg, #your-color-1, #your-color-2);
    border-color: #your-border-color;
}

/* Customize mapping cards */
.mapping-card {
    border-left-color: #your-accent-color;
}

/* Customize buttons */
.btn-approve {
    background: #your-success-color;
}
```

## Event Flow

### Approval Flow
1. User clicks "Approve" button
2. `GoogleMappingsReview.approveMapping()` called
3. API request sent to approve endpoint
4. On success:
   - Mapping removed from pending list
   - `onApprove` callback triggered
   - `GroupsTable.refreshAfterMappingAction()` called
   - Groups table refreshes with new data
   - `onUpdate` callback triggered
   - Red dot indicator updated

### Rejection Flow
1. User clicks "Reject" button
2. `GoogleMappingsReview.rejectMapping()` called
3. API request sent to reject endpoint
4. On success:
   - Mapping removed from pending list
   - `onReject` callback triggered
   - `onUpdate` callback triggered
   - Red dot indicator updated

## Error Handling

### API Errors

The component handles these error scenarios:

1. **Network Error** - Shows error toast, maintains UI state
2. **401 Unauthorized** - Logs error, shows authentication message
3. **404 Not Found** - Shows error toast
4. **500 Server Error** - Shows error toast with message

### Fallback Behavior

- If API fails, component shows error message
- Card state is restored on error
- User can retry the action
- No data loss on error

## Testing

### Manual Testing Checklist

- [ ] Red dot appears when pending mappings exist
- [ ] Red dot disappears when all mappings processed
- [ ] Mappings review UI displays above groups table
- [ ] Mapping cards show all information correctly
- [ ] Member count is clickable and expands member list
- [ ] Approve button creates group and updates table
- [ ] Reject button removes mapping without creating group
- [ ] UI hides when no pending mappings
- [ ] Error messages display on API failures
- [ ] Loading states show during async operations

### Test Page

Use `verify-google-mappings-integration.html` for testing:

```bash
# Open in browser
open verify-google-mappings-integration.html

# Or serve with a local server
python -m http.server 8000
# Then visit http://localhost:8000/verify-google-mappings-integration.html
```

## Troubleshooting

### Red Dot Not Appearing

**Check:**
1. Are there pending mappings? Call `groupsTable.hasPendingMappings()`
2. Is `onMappingsUpdate` callback set?
3. Is `tabNavigation.showNotification('groups')` being called?
4. Check browser console for errors

### Mappings Not Loading

**Check:**
1. Is `authToken` set correctly?
2. Is API endpoint returning data?
3. Check network tab for API response
4. Verify API response format matches expected structure

### Approve/Reject Not Working

**Check:**
1. Are API endpoints implemented correctly?
2. Check network tab for request/response
3. Verify authentication token is valid
4. Check browser console for errors

### UI Not Hiding After All Mappings Processed

**Check:**
1. Are mappings being removed from `pendingMappings` array?
2. Is `render()` being called after approve/reject?
3. Check if `pendingMappings.length === 0`

## Best Practices

1. **Always set callbacks** - Use `onMappingsUpdate` to keep red dot in sync
2. **Handle errors gracefully** - Show user-friendly error messages
3. **Provide feedback** - Use loading states and success messages
4. **Test with real data** - Test with various mapping scenarios
5. **Monitor performance** - Watch for slow API responses
6. **Validate data** - Ensure API responses match expected format

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoints are working
3. Review this guide for configuration issues
4. Check the test page for working examples
5. Review the summary document for implementation details
