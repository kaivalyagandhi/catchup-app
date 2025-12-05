# Contact Onboarding Database Schema

## Overview

This document describes the database schema for the Contact Onboarding feature, which implements a simplified 3-step onboarding flow with a 4-circle relationship management system based on Dunbar's research.

## Migration

**Migration File**: `scripts/migrations/030_update_contact_onboarding_for_simplified_circles.sql`

This migration updates the existing contact onboarding schema to support:
- Simplified 4-circle system (inner, close, active, casual)
- Streamlined onboarding state tracking
- Group mapping suggestions for Google Contacts integration

## Tables

### 1. onboarding_state

Tracks user progress through the 3-step onboarding flow.

**Columns**:
- `user_id` (UUID, PRIMARY KEY) - References users(id)
- `is_complete` (BOOLEAN) - Whether onboarding is fully complete
- `current_step` (INTEGER) - Current step (1-3)
- `dismissed_at` (TIMESTAMP) - When user dismissed onboarding
- `integrations_complete` (BOOLEAN) - Step 1 completion status
- `google_calendar_connected` (BOOLEAN) - Google Calendar connection status
- `google_contacts_connected` (BOOLEAN) - Google Contacts connection status
- `circles_complete` (BOOLEAN) - Step 2 completion status
- `contacts_categorized` (INTEGER) - Number of contacts assigned to circles
- `total_contacts` (INTEGER) - Total number of contacts
- `groups_complete` (BOOLEAN) - Step 3 completion status
- `mappings_reviewed` (INTEGER) - Number of group mappings reviewed
- `total_mappings` (INTEGER) - Total number of group mappings
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes**:
- `onboarding_state_pkey` - Primary key on user_id
- `idx_onboarding_state_user` - Index on user_id
- `idx_onboarding_state_incomplete` - Partial index for incomplete onboarding

**Constraints**:
- `current_step` must be between 1 and 3
- Foreign key to users(id) with CASCADE delete

**Triggers**:
- `update_onboarding_state_timestamp` - Auto-updates updated_at on changes

### 2. group_mapping_suggestions

Stores AI-generated suggestions for mapping Google Contact groups to CatchUp groups.

**Columns**:
- `id` (UUID, PRIMARY KEY) - Unique identifier
- `user_id` (UUID) - References users(id)
- `google_group_id` (VARCHAR) - Google Contact group identifier
- `google_group_name` (VARCHAR) - Google Contact group name
- `member_count` (INTEGER) - Number of members in the group
- `suggested_group_id` (UUID) - References groups(id), suggested CatchUp group
- `confidence` (INTEGER) - AI confidence score (0-100)
- `reasons` (JSONB) - Array of reasons for the suggestion
- `reviewed` (BOOLEAN) - Whether user has reviewed this suggestion
- `accepted` (BOOLEAN) - Whether user accepted the suggestion
- `rejected` (BOOLEAN) - Whether user rejected the suggestion
- `reviewed_at` (TIMESTAMP) - When the suggestion was reviewed
- `created_at` (TIMESTAMP) - Record creation timestamp

**Indexes**:
- `group_mapping_suggestions_pkey` - Primary key on id
- `idx_group_mapping_suggestions_user` - Index on user_id
- `idx_group_mapping_suggestions_unreviewed` - Partial index for unreviewed suggestions
- `idx_group_mapping_suggestions_google_group` - Index on google_group_id
- `unique_mapping_suggestion_per_user` - Unique constraint on (user_id, google_group_id)

**Constraints**:
- `confidence` must be between 0 and 100
- Foreign key to users(id) with CASCADE delete
- Foreign key to groups(id) with SET NULL delete

### 3. contacts (Updated Columns)

The contacts table was updated to support the simplified 4-circle system.

**New/Updated Columns**:
- `dunbar_circle` (VARCHAR) - Circle assignment: 'inner', 'close', 'active', or 'casual'
- `circle` (VARCHAR, GENERATED) - Alias for dunbar_circle (stored generated column)
- `circle_assigned_at` (TIMESTAMP) - When the contact was assigned to their current circle
- `circle_confidence` (NUMERIC) - AI confidence score for the assignment (0-1)
- `ai_suggested_circle` (VARCHAR) - The circle suggested by AI before user override
- `circle_assigned_by` (VARCHAR) - Who assigned the circle: 'user', 'ai', or 'system'

**Updated Constraints**:
- `dunbar_circle` must be one of: 'inner', 'close', 'active', 'casual' (removed 'acquaintance')
- `ai_suggested_circle` must be one of: 'inner', 'close', 'active', 'casual'
- `circle_confidence` must be between 0 and 1

**New Indexes**:
- `idx_contacts_circle` - Index on (user_id, circle) for circle queries
- `idx_contacts_circle_assigned_at` - Index on circle_assigned_at

### 4. circle_assignments (Updated Constraints)

Historical record of all circle assignments for contacts.

**Updated Constraints**:
- `from_circle` must be one of: 'inner', 'close', 'active', 'casual'
- `to_circle` must be one of: 'inner', 'close', 'active', 'casual'

### 5. ai_circle_overrides (Updated Constraints)

Records user corrections to AI suggestions for learning.

**Updated Constraints**:
- `suggested_circle` must be one of: 'inner', 'close', 'active', 'casual'
- `actual_circle` must be one of: 'inner', 'close', 'active', 'casual'

## Circle System

The simplified 4-circle system is based on Dunbar's research on cognitive limits of social relationships:

| Circle | Capacity | Description | Dunbar Range | Contact Frequency |
|--------|----------|-------------|--------------|-------------------|
| inner | 10 | Closest confidants—people you'd call in a crisis | 5-10 | Weekly or more |
| close | 25 | Good friends you regularly share life updates with | 15-25 | Bi-weekly to monthly |
| active | 50 | People you want to stay connected with regularly | 30-50 | Monthly to quarterly |
| casual | 100 | Acquaintances you keep in touch with occasionally | 50-100 | Quarterly to annually |

## Data Migration

The migration automatically updates any existing data:
- Contacts with `dunbar_circle = 'acquaintance'` are migrated to `'casual'`
- Circle assignments with `from_circle` or `to_circle = 'acquaintance'` are migrated to `'casual'`
- AI overrides with `suggested_circle` or `actual_circle = 'acquaintance'` are migrated to `'casual'`

## Verification

Run the verification script to test the schema:

```bash
psql -d catchup_db -f scripts/verify-onboarding-schema.sql
```

This script verifies:
- All required tables exist
- All columns are present with correct types
- Constraints are properly configured
- Indexes are created
- Sample data can be inserted successfully
- Invalid circle values are rejected

## API Usage Examples

### Initialize Onboarding for New User

```sql
INSERT INTO onboarding_state (user_id, current_step)
VALUES ('user-uuid-here', 1)
ON CONFLICT (user_id) DO NOTHING;
```

### Update Step 1 Progress

```sql
UPDATE onboarding_state
SET google_calendar_connected = true,
    integrations_complete = (google_calendar_connected AND google_contacts_connected)
WHERE user_id = 'user-uuid-here';
```

### Assign Contact to Circle

```sql
UPDATE contacts
SET dunbar_circle = 'inner',
    circle_assigned_by = 'user',
    circle_assigned_at = CURRENT_TIMESTAMP
WHERE id = 'contact-uuid-here';

-- Record in history
INSERT INTO circle_assignments (user_id, contact_id, from_circle, to_circle, assigned_by)
VALUES ('user-uuid-here', 'contact-uuid-here', NULL, 'inner', 'user');
```

### Create Group Mapping Suggestion

```sql
INSERT INTO group_mapping_suggestions (
    user_id,
    google_group_id,
    google_group_name,
    member_count,
    suggested_group_id,
    confidence,
    reasons
)
VALUES (
    'user-uuid-here',
    'google-group-id',
    'Family',
    15,
    'catchup-group-uuid',
    85,
    '["High overlap in member names", "Similar group size"]'::jsonb
);
```

### Get Onboarding Progress

```sql
SELECT 
    current_step,
    is_complete,
    integrations_complete,
    circles_complete,
    groups_complete,
    contacts_categorized,
    total_contacts,
    ROUND((contacts_categorized::DECIMAL / NULLIF(total_contacts, 0)) * 100, 0) as progress_percentage
FROM onboarding_state
WHERE user_id = 'user-uuid-here';
```

### Get Circle Distribution

```sql
SELECT 
    dunbar_circle as circle,
    COUNT(*) as count
FROM contacts
WHERE user_id = 'user-uuid-here'
    AND dunbar_circle IS NOT NULL
GROUP BY dunbar_circle
ORDER BY 
    CASE dunbar_circle
        WHEN 'inner' THEN 1
        WHEN 'close' THEN 2
        WHEN 'active' THEN 3
        WHEN 'casual' THEN 4
    END;
```

## Related Documentation

- [Contact Onboarding Requirements](../../../.kiro/specs/contact-onboarding/requirements.md)
- [Contact Onboarding Design](../../../.kiro/specs/contact-onboarding/design.md)
- [Contact Onboarding Tasks](../../../.kiro/specs/contact-onboarding/tasks.md)
- [Dunbar's Number Explained](../../DUNBARS_NUMBER_EXPLAINED.md)
