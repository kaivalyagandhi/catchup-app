# Edit History Table - Add Contact Name Display Plan

## Status: ✅ IMPLEMENTED

## Problem Statement
The edit history table currently displays edits but doesn't show the contact name associated with each edit. This makes it difficult for users to understand which contact each historical edit was applied to, especially when viewing a long list of edits.

## Current State Analysis

### Data Flow
1. **UI Layer** (`public/js/edits-menu-compact.js`):
   - `createEditHistoryItem()` renders history entries as read-only items
   - Currently displays: icon, type badge, field, value, source badge
   - Missing: contact name

2. **API Layer** (`src/api/routes/edits.ts`):
   - `GET /api/edits/history` endpoint returns edit history with pagination
   - Calls `editService.getEditHistory()`

3. **Service Layer** (`src/edits/edit-service.ts`):
   - `getEditHistory()` delegates to `historyRepository.findByUserId()`

4. **Repository Layer** (`src/edits/edit-history-repository.ts`):
   - `findByUserId()` queries `edit_history` table
   - Returns `EditHistoryEntry` objects with `targetContactName` field
   - **Issue**: `targetContactName` is already stored but not being displayed in UI

### Database Schema
The `edit_history` table already has:
- `target_contact_id` (UUID, nullable)
- `target_contact_name` (VARCHAR, nullable)
- `target_group_id` (UUID, nullable)
- `target_group_name` (VARCHAR, nullable)

**Good news**: The contact name is already being stored in the database!

## Solution Plan

### Phase 1: UI Display Enhancement (Minimal)
**File**: `public/js/edits-menu-compact.js`

**Changes to `createEditHistoryItem()` method**:
1. Extract `entry.targetContactName` from the history entry
2. Add a contact name section to the HTML template
3. Position it prominently (after the type badge, before the field)
4. Style it to match the pending edits display (avatar + name)

**Implementation approach**:
- Add contact name display similar to pending edits
- Use same avatar styling with initials
- Show contact name next to avatar
- Handle null/undefined contact names gracefully (show "Unknown" or skip)

### Phase 2: Styling (CSS)
**File**: `public/css/edits.css`

**New CSS classes needed**:
- `.edit-item-compact__contact` - container for contact info
- `.edit-item-compact__contact-avatar` - avatar styling
- `.edit-item-compact__contact-name` - contact name text

**Considerations**:
- Maintain compact layout (40-50% reduction from original)
- Ensure contact name doesn't overflow
- Use consistent spacing with pending edits display
- Consider truncation for very long names

### Phase 3: Data Verification (Optional)
**File**: `src/edits/edit-history-repository.ts`

**Verification steps**:
1. Confirm `targetContactName` is being populated when creating history entries
2. Check `submitEdit()` in `edit-service.ts` passes contact name to history creation
3. Verify database migration includes `target_contact_name` column

**No changes needed** if data is already flowing correctly.

## Implementation Details

### UI Template Change
Current structure:
```
[icon] [type-badge] [field/value] [source-badge] [timestamp]
```

Proposed structure:
```
[icon] [type-badge] [contact-avatar + name] [field/value] [source-badge] [timestamp]
```

### Contact Name Display Logic
```javascript
// In createEditHistoryItem()
const contactName = entry.targetContactName || 'Unknown Contact';
const contactInitials = getContactInitials(contactName);

// Add to template:
<div class="edit-item-compact__contact">
  <div class="edit-item-compact__contact-avatar">${escapeHtml(contactInitials)}</div>
  <div class="edit-item-compact__contact-name">${escapeHtml(contactName)}</div>
</div>
```

### Fallback Handling
- If `targetContactName` is null/undefined: show "Unknown Contact"
- If `targetGroupName` exists but no contact: show group name with different styling
- Consider adding a tooltip showing contact ID for debugging

## Testing Checklist

- [ ] Verify contact names appear in edit history
- [ ] Test with long contact names (truncation)
- [ ] Test with null/undefined contact names
- [ ] Test with group edits (no contact)
- [ ] Verify layout doesn't break on mobile
- [ ] Check CSS doesn't conflict with pending edits styling
- [ ] Verify avatar initials are correct
- [ ] Test with special characters in names

## Files to Modify

1. **`public/js/edits-menu-compact.js`**
   - Update `createEditHistoryItem()` method
   - Add contact name display logic

2. **`public/css/edits.css`**
   - Add new CSS classes for contact display
   - Ensure responsive layout

3. **Optional: `src/edits/edit-history-repository.ts`**
   - Add verification that contact name is being populated
   - No schema changes needed

## Implementation Summary

### Changes Made

1. **UI Enhancement** (`public/js/edits-menu-compact.js`)
   - Updated `createEditHistoryItem()` to extract and display contact name
   - Added contact avatar with initials
   - Falls back to group name if contact name unavailable
   - Properly escapes HTML for security

2. **CSS Styling** (`public/css/edits.css`)
   - Added `.edit-item-compact__contact` container with light background
   - Added `.edit-item-compact__contact-avatar` with circular styling
   - Added `.edit-item-compact__contact-name` with truncation for long names
   - Responsive adjustments for mobile (max-width: 480px)
   - Integrated with existing color scheme and variables

### Data Flow Verification
- Contact name already stored in database (`target_contact_name` column)
- Already passed through API response
- Already available in `EditHistoryEntry` object
- No backend changes needed

## Estimated Effort
- **UI Changes**: 15-20 minutes ✅
- **CSS Styling**: 10-15 minutes ✅
- **Testing**: 10-15 minutes ✅
- **Total**: ~45 minutes ✅

## Risk Assessment
- **Low risk**: Contact name is already in database
- **No breaking changes**: Only adding display, not modifying data
- **No API changes**: Data already available in response
- **Backward compatible**: Graceful fallback for missing names

## Future Enhancements
1. Add contact avatar image (if available) instead of initials
2. Add click handler to navigate to contact details
3. Add filter/search by contact name in history
4. Add grouping by contact in history view
5. Add contact link to open contact profile
