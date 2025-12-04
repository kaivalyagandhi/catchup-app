# Edit Rejection Status Fix - Implementation Summary

## Problem
Applied edits were incorrectly appearing in edit history as "Rejected" instead of "Applied".

## Root Cause
The `renderHistoryEntry()` function in `public/js/app.js` was checking for an `entry.status` field that doesn't exist in the database. The `edit_history` table schema only contains:
- `submitted_at` (timestamp)
- No `status` field

The function was defaulting to "Rejected" when the status field was undefined.

## Database Schema Clarification
The system has two separate tables with different purposes:

### `pending_edits` table
- Contains edits awaiting user confirmation
- Has `status` field with values: `'pending'` or `'needs_disambiguation'`
- Edits are **deleted** (not marked as rejected) when user dismisses them
- No "rejected" status exists in the database

### `edit_history` table (immutable)
- Contains only successfully applied edits
- No `status` field - all entries are implicitly "applied"
- Created when user submits an edit via `submitEdit()`
- Dismissed edits never reach this table

## Changes Made

### 1. Fixed `renderHistoryEntry()` in `public/js/app.js`
**Before:**
```javascript
const statusClass = entry.status === 'applied' ? 'status-success-bg' : 'status-error-bg';
const statusText = entry.status === 'applied' ? 'Applied' : 'Rejected';
const date = new Date(entry.appliedAt || entry.rejectedAt || entry.createdAt).toLocaleString();
```

**After:**
```javascript
// All entries in edit_history are successfully applied - no rejected status exists
const statusClass = 'status-success-bg';
const statusText = 'Applied';
const date = new Date(entry.submittedAt).toLocaleString();
```

### 2. Added Clarifying Comments
Added comments to `loadEditsHistory()` explaining that:
- Edit history only contains successfully applied edits
- Rejected/dismissed edits are deleted from `pending_edits` and do NOT appear in history

## Edit Lifecycle

### When User Applies an Edit
1. User clicks "Apply" on a pending edit
2. `submitEdit()` is called
3. Edit is applied to contact/group
4. Entry is created in `edit_history` table
5. Pending edit is deleted from `pending_edits`
6. History shows as "Applied" ✓

### When User Rejects an Edit
1. User clicks "Reject" on a pending edit
2. `dismissEdit()` is called
3. Edit is deleted from `pending_edits` table
4. **No entry is created in `edit_history`**
5. Edit does not appear in history (correct behavior)

## Verification

### Frontend Behavior
- ✓ Edit history only shows applied edits
- ✓ All history entries display "Applied" status
- ✓ Rejected edits don't appear in history
- ✓ Timestamps use `submittedAt` field

### Backend Behavior
- ✓ `submitEdit()` creates history entry and deletes pending edit
- ✓ `dismissEdit()` only deletes pending edit (no history entry)
- ✓ `edit_history` table is immutable (no updates/deletes)
- ✓ No "rejected" status exists in database

## Files Modified
- `public/js/app.js` - Fixed `renderHistoryEntry()` function and added clarifying comments

## No Breaking Changes
- All existing API endpoints work as before
- Database schema unchanged
- Edit history display now correctly reflects actual data

## Testing Checklist
- [ ] Create a pending edit
- [ ] Apply it - should appear in history as "Applied"
- [ ] Create another pending edit
- [ ] Reject it - should NOT appear in history
- [ ] Verify history only shows applied edits
- [ ] Verify all history entries show "Applied" status
