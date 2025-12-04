# Pending Edits Not Appearing - Fix

## Problem
Enrichment suggestions were being generated during voice recording and pending edits were being created via the API, but they weren't appearing in the pending edits panel.

## Root Cause
The issue was a missing event listener. The frontend was:
1. Creating pending edits via `/api/edits/pending` endpoint ✓
2. Dispatching `edits-updated` event ✓
3. **But NOT listening for the `edits-updated` event** ✗

Without the listener, the pending edits panel never knew to refresh and display the new edits.

## Solution
Added an event listener for `edits-updated` in `app.js` that:
1. Fetches the updated pending edits count from the API
2. Updates the counter in the chat window and floating icon
3. Refreshes the pending edits list if the user is on the edits page

## Changes Made

### public/js/app.js
Added event listener in the `DOMContentLoaded` handler:

```javascript
// Listen for edits updates from voice notes enrichment
window.addEventListener('edits-updated', async () => {
    console.log('edits-updated event received, currentPage:', currentPage);
    
    // Always fetch and update the pending edits count
    try {
        const response = await fetch(`${API_BASE}/edits/pending`, {
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': userId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const count = (data.edits || []).length;
            console.log('Updated pending edits count:', count);
            updatePendingEditCounts(count);
        }
    } catch (error) {
        console.error('Error fetching pending edits count:', error);
    }
    
    // Refresh pending edits if on edits page
    if (currentPage === 'edits') {
        console.log('Refreshing pending edits');
        loadPendingEdits();
    }
});
```

### public/js/voice-notes.js
Updated the endpoint from `/api/edits` to `/api/edits/pending` (correct endpoint).

## Flow Now

1. **During Recording:**
   - Backend generates enrichment suggestions
   - Suggestions sent to frontend via WebSocket
   - Frontend displays suggestions in floating enrichment panel
   - Frontend creates pending edits via `/api/edits/pending`
   - Frontend dispatches `edits-updated` event

2. **Event Listener Triggered:**
   - Fetches updated pending edits count
   - Updates counter in chat window and floating icon
   - If on edits page, refreshes the pending edits list

3. **User Sees:**
   - Counter updates in real-time
   - Pending edits appear in the edits panel
   - Can review, edit, and apply enrichment

## Testing

To verify the fix works:

1. Start a voice recording
2. Speak naturally, mentioning contacts and details
3. Watch the floating enrichment panel for suggestions
4. Stop recording
5. Check the pending edits counter (should show number > 0)
6. Navigate to the Edits page
7. Verify pending edits appear in the list
8. Can review, edit, and apply enrichment

## Files Modified

- `public/js/app.js` - Added `edits-updated` event listener
- `public/js/voice-notes.js` - Fixed endpoint URL to `/api/edits/pending`

## No Backend Changes Required

The backend was already working correctly:
- `/api/edits/pending` endpoint exists and works
- Pending edits are being created successfully
- The issue was purely on the frontend (missing event listener)
