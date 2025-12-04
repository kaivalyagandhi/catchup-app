# Google Contacts Group Review - Complete Implementation Guide

## Overview

The Google Contacts Group Review feature allows users to review and approve/reject suggested mappings between their Google Contact groups and CatchUp groups. This happens automatically after a Google Contacts sync when new groups are detected.

## Architecture

### Components

1. **GoogleMappingsReview** (`public/js/google-mappings-review.js`)
   - Standalone UI component for displaying and managing group mappings
   - Handles approve/reject actions
   - Manages member display and exclusion

2. **GroupsTable Integration** (`public/js/groups-table.js`)
   - Embeds GoogleMappingsReview at the top of the Groups tab
   - Refreshes groups list after mapping actions
   - Manages red dot indicator for pending mappings

3. **Backend API** (`src/api/routes/google-contacts-sync.ts`)
   - Provides endpoints for fetching, approving, and rejecting mappings
   - Handles group creation and member assignment

## How It Works

### 1. **Sync Detection**

When a user syncs their Google Contacts:

```typescript
// Backend: src/integrations/group-sync-service.ts
async syncGroups(userId: string, accessToken: string) {
  // Fetch Google Contact groups
  const googleGroups = await fetchGoogleGroups(accessToken);
  
  // For each new group, create a mapping suggestion
  for (const googleGroup of googleGroups) {
    await createMappingSuggestion(userId, googleGroup);
  }
}
```

### 2. **Mapping Suggestion Creation**

The backend analyzes each Google group and creates a suggestion:

```typescript
interface GroupMapping {
  id: string;
  userId: string;
  googleResourceName: string;  // Google's unique ID
  googleName: string;          // "SE 2018", "SJU", etc.
  memberCount: number;         // Number of contacts in group
  suggestedAction: 'create_new' | 'map_existing';
  suggestedGroupName: string;  // Suggested CatchUp group name
  suggestionReason: string;    // Why this suggestion was made
  confidenceScore: number;     // 0.0 to 1.0
  mappingStatus: 'pending' | 'approved' | 'rejected';
}
```

**Suggestion Logic:**
- **Create New**: If no similar CatchUp group exists
- **Map Existing**: If a CatchUp group with similar name exists
- **Confidence Score**: Based on name similarity and member overlap

### 3. **UI Display**

When user navigates to Groups tab:

```javascript
// Frontend: public/js/groups-table.js
async initializeMappingsReview() {
  // Create GoogleMappingsReview instance
  this.mappingsReview = new GoogleMappingsReview(container, {
    onApprove: async (mappingId, result) => {
      await this.refreshAfterMappingAction();
    },
    onReject: async (mappingId) => {
      await this.refreshAfterMappingAction();
    }
  });
  
  // Render the review UI
  await this.mappingsReview.render();
}
```

The UI shows:
- **Header**: "Google Contact Groups Review" with pending count
- **Mapping Cards**: One card per pending mapping
  - Google group name
  - Member count (clickable to expand)
  - Confidence score (color-coded: green >80%, orange >60%, red <60%)
  - Suggested action (Create New or Map Existing)
  - Reason for suggestion
  - Approve/Reject buttons

### 4. **Member Display**

Users can click on "👥 X members" to see who's in the group:

```javascript
async function toggleMappingMembers(mappingId) {
  // Fetch members from API
  const response = await fetch(
    `/api/contacts/sync/groups/mappings/${mappingId}/members`
  );
  
  const data = await response.json();
  
  // Display member cards with:
  // - Avatar (initials)
  // - Name
  // - Contact info (email/phone/location)
}
```

### 5. **Approve Action**

When user clicks "✓ Approve":

```javascript
// Frontend
async approveMapping(mappingId) {
  // Get excluded members (if any were removed)
  const excludedMembers = getExcludedMembers(mappingId);
  
  // Call API
  const response = await fetch(
    `/api/contacts/sync/groups/mappings/${mappingId}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ excludedMembers })
    }
  );
  
  // Show success message
  showToast(`✓ Group approved! ${result.membershipsUpdated} members added.`);
  
  // Refresh groups table
  await this.refreshAfterMappingAction();
}
```

**Backend Processing:**

```typescript
// Backend: src/api/routes/google-contacts-sync.ts
async approveMapping(mappingId: string, excludedMembers: string[]) {
  const mapping = await getMapping(mappingId);
  
  if (mapping.suggestedAction === 'create_new') {
    // Create new CatchUp group
    const group = await createGroup(mapping.suggestedGroupName);
    
    // Add all members (except excluded)
    const members = await getGoogleGroupMembers(mapping.googleResourceName);
    const membersToAdd = members.filter(m => !excludedMembers.includes(m.id));
    
    await addMembersToGroup(group.id, membersToAdd);
  } else {
    // Map to existing group
    const existingGroup = await findGroupByName(mapping.suggestedGroupName);
    
    // Add members to existing group
    const members = await getGoogleGroupMembers(mapping.googleResourceName);
    const membersToAdd = members.filter(m => !excludedMembers.includes(m.id));
    
    await addMembersToGroup(existingGroup.id, membersToAdd);
  }
  
  // Mark mapping as approved
  await updateMappingStatus(mappingId, 'approved');
  
  return { membershipsUpdated: membersToAdd.length };
}
```

### 6. **Reject Action**

When user clicks "✗ Reject":

```javascript
// Frontend
async rejectMapping(mappingId) {
  // Call API
  await fetch(
    `/api/contacts/sync/groups/mappings/${mappingId}/reject`,
    { method: 'POST' }
  );
  
  // Show success message
  showToast('Group mapping rejected');
  
  // Refresh UI
  await this.render();
}
```

**Backend Processing:**

```typescript
// Backend
async rejectMapping(mappingId: string) {
  // Simply mark as rejected - no group creation or member assignment
  await updateMappingStatus(mappingId, 'rejected');
}
```

### 7. **Auto-Hide When Complete**

When all mappings are reviewed:

```javascript
async render() {
  await this.loadPendingMappings();
  
  // Hide if no pending mappings
  if (this.pendingMappings.length === 0) {
    this.hide();
    return;
  }
  
  // Otherwise, render the UI
  this.container.innerHTML = this.renderMappings();
}
```

### 8. **Red Dot Indicator**

The Groups tab shows a red dot when there are pending mappings:

```javascript
// In GroupsTable
async initializeMappingsReview() {
  this.mappingsReview = new GoogleMappingsReview(container, {
    onUpdate: () => {
      // Update red dot indicator
      if (this.options.onMappingsUpdate) {
        this.options.onMappingsUpdate();
      }
    }
  });
}
```

The red dot is removed when:
- All mappings are approved
- All mappings are rejected
- Mix of approved/rejected (all reviewed)

## API Endpoints

### GET `/api/contacts/sync/groups/mappings/pending`
- Returns array of pending group mappings
- Requires authentication

### GET `/api/contacts/sync/groups/mappings/:id/members`
- Returns members of a specific Google group
- Used for member display in UI

### POST `/api/contacts/sync/groups/mappings/:id/approve`
- Approves a mapping and creates/updates group
- Body: `{ excludedMembers: string[] }`
- Returns: `{ membershipsUpdated: number }`

### POST `/api/contacts/sync/groups/mappings/:id/reject`
- Rejects a mapping (no group creation)
- No body required

## Data Flow

```
1. User syncs Google Contacts
   ↓
2. Backend detects new groups
   ↓
3. Backend creates mapping suggestions
   ↓
4. User navigates to Groups tab
   ↓
5. Frontend loads pending mappings
   ↓
6. UI displays review cards
   ↓
7. User clicks Approve/Reject
   ↓
8. Backend processes action
   ↓
9. Frontend refreshes groups table
   ↓
10. UI hides if no more pending
```

## Key Features

### ✅ Smart Suggestions
- Analyzes existing groups for name similarity
- Calculates confidence scores
- Provides reasoning for each suggestion

### ✅ Member Preview
- Expandable member list
- Shows contact details
- Future: Allow excluding specific members

### ✅ Batch Processing
- Review multiple groups at once
- Each card is independent
- Progress tracked with pending count

### ✅ Seamless Integration
- Embedded in Groups tab
- Auto-shows when needed
- Auto-hides when complete
- Red dot indicator for visibility

### ✅ Error Handling
- Loading states during API calls
- Error messages for failures
- Graceful degradation if component not loaded

## User Experience

1. **Discovery**: Red dot on Groups tab alerts user
2. **Review**: Clear cards with all relevant info
3. **Decision**: Simple Approve/Reject buttons
4. **Feedback**: Toast notifications confirm actions
5. **Completion**: UI disappears when done

## Future Enhancements

- [ ] Allow editing suggested group names before approval
- [ ] Bulk approve/reject all mappings
- [ ] Member exclusion UI (checkboxes to exclude specific members)
- [ ] Undo functionality for recent approvals
- [ ] History view of past mapping decisions
- [ ] Smart grouping suggestions based on contact interactions

## Testing

See `verify-google-mappings-integration.html` for manual testing steps.

## Related Files

- `public/js/google-mappings-review.js` - Main component
- `public/css/google-mappings-review.css` - Styling
- `public/js/groups-table.js` - Integration point
- `src/api/routes/google-contacts-sync.ts` - Backend API
- `src/integrations/group-sync-service.ts` - Sync logic
