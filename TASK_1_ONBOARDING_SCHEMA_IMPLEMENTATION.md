# Task 1: Contact Onboarding Database Schema Implementation

## Summary

Successfully implemented the complete database schema for the contact onboarding feature, including Dunbar circle assignments, onboarding state tracking, AI learning, weekly catchup sessions, and gamification features.

## Migration File Created

**File:** `scripts/migrations/017_create_contact_onboarding_schema.sql`

## Schema Changes

### 1. Contacts Table Extensions

Added four new columns to the existing `contacts` table:

- `dunbar_circle` (VARCHAR(20)) - The Dunbar circle assignment (inner, close, active, casual, acquaintance)
- `circle_assigned_at` (TIMESTAMP) - When the contact was assigned to their current circle
- `circle_confidence` (DECIMAL(3,2)) - AI confidence score for the assignment (0-1)
- `ai_suggested_circle` (VARCHAR(20)) - The circle suggested by AI before user override

**Indexes:**
- `idx_contacts_dunbar_circle` - Composite index on (user_id, dunbar_circle)
- `idx_contacts_circle_assigned_at` - Index on circle_assigned_at

### 2. New Tables Created

#### onboarding_state
Tracks user progress through the contact onboarding flow.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users, UNIQUE)
- `current_step` (VARCHAR(50)) - Current onboarding step
- `completed_steps` (JSONB) - Array of completed steps
- `trigger_type` (VARCHAR(20)) - How onboarding was triggered (new_user, post_import, manage)
- `started_at` (TIMESTAMP)
- `last_updated_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP, nullable)
- `progress_data` (JSONB) - Additional progress metadata

**Constraints:**
- CHECK: current_step IN ('welcome', 'import_contacts', 'circle_assignment', 'preference_setting', 'group_overlay', 'completion')
- CHECK: trigger_type IN ('new_user', 'post_import', 'manage')
- UNIQUE: One onboarding state per user

**Indexes:**
- `idx_onboarding_state_user` - Index on user_id
- `idx_onboarding_state_completed` - Partial index for incomplete onboarding

**Triggers:**
- `update_onboarding_state_updated_at` - Auto-updates last_updated_at using custom function `update_onboarding_last_updated_at()`

#### circle_assignments
Historical record of all circle assignments for contacts.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `contact_id` (UUID, FK to contacts)
- `from_circle` (VARCHAR(20), nullable) - Previous circle
- `to_circle` (VARCHAR(20)) - New circle
- `assigned_by` (VARCHAR(20)) - Who made the assignment (user, ai, system)
- `confidence` (DECIMAL(3,2), nullable) - Confidence score
- `assigned_at` (TIMESTAMP)
- `reason` (TEXT, nullable) - Reason for assignment

**Constraints:**
- CHECK: from_circle and to_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance')
- CHECK: assigned_by IN ('user', 'ai', 'system')
- CHECK: confidence between 0 and 1

**Indexes:**
- `idx_circle_assignments_contact` - Index on contact_id
- `idx_circle_assignments_user_date` - Composite index on (user_id, assigned_at DESC)
- `idx_circle_assignments_user_contact` - Composite index on (user_id, contact_id)

#### ai_circle_overrides
Records user corrections to AI suggestions for learning.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `contact_id` (UUID, FK to contacts)
- `suggested_circle` (VARCHAR(20)) - AI's suggestion
- `actual_circle` (VARCHAR(20)) - User's choice
- `factors` (JSONB, nullable) - AI factors that led to suggestion
- `recorded_at` (TIMESTAMP)

**Constraints:**
- CHECK: suggested_circle and actual_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance')

**Indexes:**
- `idx_ai_overrides_user` - Index on user_id
- `idx_ai_overrides_user_date` - Composite index on (user_id, recorded_at DESC)

#### weekly_catchup_sessions
Manages weekly contact review sessions.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `week_number` (INTEGER) - Week of year (1-53)
- `year` (INTEGER) - Year (2020-2100)
- `contacts_to_review` (JSONB) - Array of contact IDs to review
- `reviewed_contacts` (JSONB) - Array of reviewed contact IDs
- `started_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP, nullable)
- `skipped` (BOOLEAN, default false)

**Constraints:**
- CHECK: week_number between 1 and 53
- CHECK: year between 2020 and 2100
- UNIQUE: One session per user per week

**Indexes:**
- `idx_weekly_catchup_user_date` - Composite index on (user_id, year DESC, week_number DESC)
- `idx_weekly_catchup_incomplete` - Partial index for incomplete sessions

#### onboarding_achievements
Tracks gamification achievements earned by users.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `achievement_type` (VARCHAR(50)) - Type of achievement
- `achievement_data` (JSONB, nullable) - Additional achievement metadata
- `earned_at` (TIMESTAMP)

**Constraints:**
- CHECK: achievement_type IN ('first_contact_categorized', 'inner_circle_complete', 'all_contacts_categorized', 'week_streak_3', 'week_streak_10', 'balanced_network', 'network_health_excellent')

**Indexes:**
- `idx_achievements_user` - Composite index on (user_id, earned_at DESC)
- `idx_achievements_type` - Composite index on (user_id, achievement_type)

#### network_health_scores
Historical record of network health metrics.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `score` (INTEGER) - Overall health score (0-100)
- `circle_balance_score` (INTEGER, nullable) - Circle balance component (0-100)
- `engagement_score` (INTEGER, nullable) - Engagement component (0-100)
- `maintenance_score` (INTEGER, nullable) - Maintenance component (0-100)
- `calculated_at` (TIMESTAMP)

**Constraints:**
- CHECK: All scores between 0 and 100

**Indexes:**
- `idx_network_health_user` - Composite index on (user_id, calculated_at DESC)
- `idx_network_health_latest` - Composite index for recent scores

## Data Integrity Features

### Foreign Key Relationships
All tables have proper foreign key constraints with CASCADE delete:
- Deleting a user cascades to all their onboarding data
- Deleting a contact cascades to circle assignments and AI overrides

### Check Constraints
- Circle values restricted to valid Dunbar circles
- Confidence scores restricted to 0-1 range
- Week numbers restricted to 1-53
- Years restricted to reasonable range (2020-2100)
- Achievement types restricted to valid values
- Health scores restricted to 0-100 range

### Unique Constraints
- One onboarding state per user
- One weekly catchup session per user per week

### Indexes for Performance
- All foreign keys indexed
- Composite indexes for common query patterns
- Partial indexes for filtering incomplete records
- Descending indexes for time-based queries

## Testing Performed

### 1. Migration Execution
✅ Migration runs successfully on fresh database
✅ Migration is idempotent (can be run multiple times)

### 2. Data Insertion
✅ All tables accept valid data
✅ Foreign key relationships work correctly
✅ Default values are applied correctly

### 3. Constraint Validation
✅ Invalid circle values are rejected
✅ Invalid confidence scores are rejected
✅ Invalid onboarding steps are rejected
✅ Invalid week numbers are rejected
✅ Invalid achievement types are rejected

### 4. Index Verification
✅ All indexes created successfully
✅ Partial indexes work correctly
✅ Composite indexes created in correct order

### 5. Cascade Deletes
✅ Foreign key CASCADE rules configured correctly
✅ All onboarding tables cascade from users table

## Documentation Updates

Updated `scripts/migrations/README.md` to include:
- Migration 017 in the file list
- New "Contact Onboarding Tables" section
- Description of all new tables

## Requirements Validated

This implementation satisfies the following requirements from the design document:

- **Requirement 1.1, 1.5**: Onboarding state tracking and resumption
- **Requirement 2.2**: Contact metadata preservation (circle assignments)
- **Requirement 3.3**: Circle assignment tracking
- **Requirement 7.1**: Weekly catchup session management
- **Requirement 8.3, 8.5**: Gamification (achievements and health scores)
- **Requirement 15.2**: Data privacy isolation (user_id on all tables)

## Next Steps

The database schema is now ready for:
1. Repository implementation (Task 2)
2. Service layer implementation (Tasks 3-5)
3. API endpoint implementation (Task 6)
4. Frontend implementation (Tasks 7-18)

## Files Modified

1. **Created:** `scripts/migrations/017_create_contact_onboarding_schema.sql`
2. **Updated:** `scripts/migrations/README.md`
3. **Created:** `TASK_1_ONBOARDING_SCHEMA_IMPLEMENTATION.md` (this file)

## Migration Command

To apply this migration:

```bash
psql -h localhost -U postgres -d catchup_db -f scripts/migrations/017_create_contact_onboarding_schema.sql
```

Or run all migrations:

```bash
npm run db:migrate
```
