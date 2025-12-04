# Directory Tab State Persistence

## Feature
When refreshing the page while on the Groups, Tags, or Circles tab in the Directory page, the app now remembers which tab you were on and returns you to it instead of defaulting to the Contacts tab.

## Implementation

**File: `public/js/app.js`**

### Changes Made

1. **Save tab state on switch**:
   - Added `localStorage.setItem('currentDirectoryTab', tab)` in `switchDirectoryTab()`
   - Saves the current tab whenever the user switches tabs

2. **Restore tab state on load**:
   - Updated `loadDirectory()` to check localStorage for saved tab
   - Priority order:
     1. URL hash (e.g., `#directory/groups`) - highest priority
     2. localStorage saved tab - fallback if no hash
     3. Default to 'contacts' - if neither exists

## How It Works

1. **User switches to Groups tab**: 
   - `switchDirectoryTab('groups')` is called
   - Saves `'groups'` to localStorage
   - Updates URL to `#directory/groups`

2. **User refreshes page**:
   - `loadDirectory()` checks URL hash first
   - If no hash, checks localStorage
   - Finds `'groups'` in localStorage
   - Calls `switchDirectoryTab('groups')`
   - User returns to Groups tab

3. **User navigates via URL**:
   - URL hash takes priority over localStorage
   - Ensures shareable URLs work correctly

## Benefits

- Better UX: Users don't lose their place when refreshing
- Maintains context during development/testing
- Works across all directory tabs: Contacts, Circles, Groups, Tags
- Respects URL-based navigation for sharing links
