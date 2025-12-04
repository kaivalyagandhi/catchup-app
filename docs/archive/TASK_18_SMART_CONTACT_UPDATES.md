# Task 18: Smart Contact Updates Implementation

## Overview

Implemented smart contact update logic that preserves manually added CatchUp-specific fields during Google Contacts synchronization while updating only Google-sourced fields.

## Implementation Details

### Smart Update Logic

Modified `ImportServiceImpl.updateContact()` to:

1. **Fetch existing contact** before updating to access current field values
2. **Update only Google-sourced fields**:
   - `name` - Contact name from Google
   - `phone` - Phone number from Google
   - `email` - Email address from Google
   - `linkedIn` - LinkedIn URL extracted from Google URLs
   - `location` - Address/location from Google
   - `googleResourceName` - Google's unique identifier
   - `googleEtag` - Google's entity tag for concurrency control
   - `lastSyncedAt` - Timestamp of last sync
   - `source` - Always set to 'google'

3. **Preserve CatchUp-specific fields** (not included in update):
   - `instagram` - User-added Instagram handle
   - `xHandle` - User-added X/Twitter handle
   - `otherSocialMedia` - User-added social media links
   - `timezone` - User-selected timezone preference
   - `frequencyPreference` - User-selected contact frequency
   - `lastContactDate` - CatchUp interaction tracking

### Intelligent Custom Notes Merging

Implemented `mergeCustomNotes()` method with smart logic:

1. **No existing notes**: Use Google organization data
2. **No Google data**: Preserve existing user notes
3. **Notes already contain Google data**: Keep as-is (no duplication)
4. **Notes match Google pattern** (e.g., "Engineer at Company"): Replace with new Google data
5. **User-added notes**: Preserve and append Google data with separator

This ensures:
- User-added notes are never lost
- Google organization data is kept up-to-date
- No duplicate information in notes field

## Requirements Validated

- **Requirement 3.4**: Contact updates preserve manually added data
- **Requirement 13.5**: CatchUp-specific fields maintained during sync

## Test Coverage

Added comprehensive unit tests:

1. **Preserve CatchUp-specific fields**: Verifies that fields like `instagram`, `xHandle`, `timezone`, etc. are not overwritten during sync
2. **Merge custom notes intelligently**: Tests that user notes are preserved and Google data is appended
3. **Replace Google-style notes**: Tests that old Google organization data is replaced with new data
4. **Preserve user notes without Google data**: Tests that user notes remain unchanged when no Google organization data exists

All tests passing ✓

## Files Modified

- `src/contacts/import-service.ts`:
  - Enhanced `updateContact()` method with smart field preservation
  - Added `mergeCustomNotes()` private method for intelligent notes merging
  
- `src/contacts/import-service.test.ts`:
  - Added 4 new test cases for smart update functionality
  - Fixed existing tests to mock `findById` method

## Data Integrity

The implementation ensures:
- Google-sourced data stays synchronized with Google Contacts
- User-added CatchUp data is never lost during sync
- No field conflicts or data corruption
- Clear separation between Google and CatchUp data domains

## Example Behavior

### Before Sync
```typescript
{
  name: "John Doe",
  email: "john@example.com",
  instagram: "@johndoe",        // User-added
  timezone: "America/New_York",  // User-added
  customNotes: "Met at conference 2024",  // User-added
  source: "google"
}
```

### After Sync (Google updated name and email)
```typescript
{
  name: "John Updated Doe",      // ✓ Updated from Google
  email: "john.new@example.com", // ✓ Updated from Google
  instagram: "@johndoe",         // ✓ Preserved (CatchUp-specific)
  timezone: "America/New_York",  // ✓ Preserved (CatchUp-specific)
  customNotes: "Met at conference 2024\n\nSenior Engineer at Tech Corp",  // ✓ Merged
  source: "google"
}
```

## Next Steps

This completes Task 18. The smart contact update logic is now ready for:
- Integration with the full sync service
- Testing with real Google Contacts data
- UI updates to show which fields are synced vs. local
