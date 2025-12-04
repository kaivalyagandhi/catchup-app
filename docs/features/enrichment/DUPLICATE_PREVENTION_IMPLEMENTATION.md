# Duplicate Prevention Implementation

## Overview
Added comprehensive duplicate prevention for groups and tags throughout the application stack.

## Changes Made

### 1. Database Schema (Migration 008)
**File**: `scripts/migrations/008_add_unique_constraints.sql`

- Added unique constraint for group names per user: `UNIQUE (user_id, name)`
- Added unique constraint for tag text (case-insensitive): `UNIQUE (LOWER(text))`
- Migration handles existing duplicates by:
  - Groups: Appending numbers to duplicate names
  - Tags: Merging duplicates (keeping oldest, updating references)
- Added index for case-insensitive tag lookups

**File**: `scripts/migrations/001_create_core_tables.sql`

- Updated groups table with `CONSTRAINT unique_group_name_per_user UNIQUE (user_id, name)`
- Updated tags table with `CONSTRAINT unique_tag_text UNIQUE (LOWER(text))`
- Added index: `CREATE INDEX idx_tags_text_lower ON tags(LOWER(text))`

### 2. Service Layer

**File**: `src/contacts/group-service.ts`

- `createGroup()`: Checks for duplicate group names (case-insensitive) before creation
- `updateGroup()`: Validates uniqueness excluding current group
- `promoteTagToGroup()`: Checks for duplicate names before promoting tag
- Error message: "A group with this name already exists"

**File**: `src/contacts/tag-service.ts`

- `addTag()`: Checks if contact already has the tag before adding
- Uses existing `findOrCreateTag()` which already handles semantic similarity (85% threshold)
- Error message: "Contact already has this tag"

### 3. API Layer

**File**: `src/api/routes/groups-tags.ts`

- POST `/api/groups-tags/groups`: Returns 400 status for duplicate group names
- PUT `/api/groups-tags/groups/:id`: Returns 400 status for duplicate group names
- Error responses properly formatted with descriptive messages

### 4. Frontend

**File**: `public/js/app.js`

Existing error handling already supports duplicate prevention:

- `saveGroup()`: Displays API error messages via `showModalError()`
- `saveTag()`: Displays API error messages via `showModalError()`
- `addTagToContact()`: Client-side check prevents duplicate tags in UI
- `assignGroupToContact()`: Client-side check prevents duplicate group assignments

### 5. PRD Updates

**File**: `prd draft.md`

Updated sections:
- 4.1.2.1.4: Added group name uniqueness requirement
- 4.1.2.2.2: Added tag uniqueness and deduplication details
- 7.2.2.4: Added group duplicate prevention in data model
- 7.2.3.5: Added tag duplicate prevention in data model

## Validation Rules

### Groups
- Name must be unique per user (case-insensitive)
- Name required and cannot be empty
- Name max length: 255 characters
- Validation occurs on create, update, and promote from tag

### Tags
- Text must be unique globally (case-insensitive)
- Text required and cannot be empty
- Text max length: 100 characters
- Must be 1-3 words
- Semantic similarity matching (85% threshold) prevents near-duplicates
- Contacts cannot have the same tag assigned multiple times

## Error Messages

### User-Facing Errors
- Groups: "A group with this name already exists"
- Tags: "Contact already has this tag"

### HTTP Status Codes
- 400 Bad Request: Duplicate validation failures
- 404 Not Found: Resource not found
- 500 Internal Server Error: Unexpected errors

## Migration Instructions

To apply the unique constraints to an existing database:

```bash
# Run the migration
psql -U catchup_user -d catchup_db -f scripts/migrations/008_add_unique_constraints.sql
```

The migration safely handles existing duplicates:
- Groups with duplicate names get numbered suffixes
- Duplicate tags are merged, preserving all contact associations

## Testing

### Manual Testing
1. Try creating two groups with the same name (case variations)
2. Try updating a group to match an existing group name
3. Try adding the same tag to a contact twice
4. Try creating tags with similar text (semantic matching)
5. Verify error messages display correctly in UI

### Database Testing
```sql
-- Test group uniqueness
INSERT INTO groups (user_id, name) VALUES ('user-id', 'Test Group');
INSERT INTO groups (user_id, name) VALUES ('user-id', 'test group'); -- Should fail

-- Test tag uniqueness
INSERT INTO tags (text, source) VALUES ('hiking', 'manual');
INSERT INTO tags (text, source) VALUES ('Hiking', 'manual'); -- Should fail
```

## Benefits

1. **Data Integrity**: Database constraints prevent duplicates at the lowest level
2. **User Experience**: Clear error messages guide users
3. **Semantic Matching**: Tags with similar meanings are automatically merged
4. **Performance**: Indexes optimize duplicate checking
5. **Consistency**: Validation enforced across all entry points (API, UI, services)
