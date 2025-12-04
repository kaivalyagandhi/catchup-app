# Groups Contact Count Fix

## Problem
The groups table was not showing accurate contact counts and member lists. When clicking to expand a group, no members were displayed even though the group had contacts.

## Root Cause
The backend API (`/api/groups-tags/groups`) was returning groups with only a `contactCount` property (number), but the frontend `GroupsTable` component expected a `contactIds` array to:
1. Calculate and display the contact count
2. Show the list of members when a group is expanded

## Solution
Updated the `PostgresGroupRepository` to include contact IDs in the response:

### Changes Made

**File: `src/contacts/group-repository.ts`**

1. **Updated interface** to include `contactIds`:
```typescript
export interface GroupWithCount extends Group {
  contactCount: number;
  contactIds?: string[];
}
```

2. **Updated SQL query** in `listGroupsWithContactCounts()` to aggregate contact IDs:
```sql
SELECT 
  g.*,
  COUNT(cg.contact_id) as contact_count,
  ARRAY_AGG(cg.contact_id) FILTER (WHERE cg.contact_id IS NOT NULL) as contact_ids
FROM groups g
LEFT JOIN contact_groups cg ON g.id = cg.group_id
WHERE g.user_id = $1 AND g.archived = false
GROUP BY g.id
ORDER BY g.name ASC
```

3. **Updated SQL query** in `getGroupWithContactCount()` with the same aggregation

4. **Updated mapper** to include contact IDs in the response:
```typescript
private mapRowToGroupWithCount(row: any): GroupWithCount {
  return {
    ...this.mapRowToGroup(row),
    contactCount: parseInt(row.contact_count, 10) || 0,
    contactIds: row.contact_ids || [],
  };
}
```

## How It Works Now

1. **Backend**: Returns groups with both `contactCount` (number) and `contactIds` (array of UUIDs)
2. **Frontend**: Uses `contactIds.length` to display the count and maps IDs to contact details when expanded
3. **Member Display**: When a group is expanded, the component looks up each contact ID in the contacts array and displays member information

## Additional Frontend Fix

The `renderGroupsTable()` function was not receiving the contacts array, so it couldn't map contact IDs to contact details.

**File: `public/js/groups-table.js`**
- Updated `renderGroupsTable()` to accept contacts parameter and fall back to `window.contacts`

**File: `public/js/app.js`**
- Updated `loadGroupsList()` to pass the `contacts` array when calling `renderGroupsTable()`

## Testing

Use the test file to verify the fix:
```bash
open http://localhost:3000/test-groups-contact-count.html
```

Steps:
1. Login with your credentials
2. Click "Fetch Contacts" to load contact data
3. Click "Fetch Groups" to see the groups with contact counts and IDs
4. Verify that groups show:
   - Correct `contactCount` values
   - `contactIds` array with actual UUIDs
   - Member names when contacts are loaded

## Verification in UI

1. Navigate to the Directory page
2. Click on the "Groups" tab
3. Verify contact counts are displayed correctly
4. Click the expand arrow (▶) next to a group with contacts
5. Verify the member list appears showing contact names, emails, and phone numbers

## Group Mapping Approval Fix

When approving a Google Contacts group mapping, the groups table was showing 0 contact counts until page refresh.

**Issue**: The `refreshAfterMappingAction()` function was fetching from the old `/api/contacts/groups` endpoint which doesn't return `contactIds`.

**Fix**: Updated to fetch from `/api/groups-tags/groups` and also refresh the contacts array to ensure the latest data is available for member display.
