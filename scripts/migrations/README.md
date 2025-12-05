# Database Migrations

This directory contains SQL migration files for the CatchUp database schema.

## Migration Files

- `001_create_core_tables.sql` - Creates contacts, groups, tags, and their junction tables
- `002_create_interaction_suggestion_tables.sql` - Creates interaction logs, suggestions, voice notes, and google calendars tables
- `003_create_preferences_tables.sql` - Creates availability parameters, notification preferences, and OAuth token storage
- `004_add_composite_indexes.sql` - Adds composite indexes for performance optimization
- `005_create_users_table.sql` - Creates users table with authentication support
- `006_create_audit_logs_table.sql` - Creates audit logs for tracking system changes
- `007_create_calendar_events_table.sql` - Creates calendar events table
- `008_add_unique_constraints.sql` - Adds unique constraints for data integrity
- `009_enhance_voice_notes_schema.sql` - Enhances voice notes for real-time transcription and multi-contact support
- `010_enhance_suggestions_for_groups.sql` - Adds group catchup support to suggestions
- `011_make_tags_user_specific.sql` - Makes tags user-specific instead of global
- `012_add_name_to_users.sql` - Adds name field to users table
- `013_add_google_contacts_source_tracking.sql` - Adds Google Contacts source tracking to contacts
- `014_create_google_contacts_sync_state.sql` - Creates sync state tracking for Google Contacts
- `015_create_google_contact_groups.sql` - Creates Google Contact groups table
- `016_add_group_mapping_suggestions.sql` - Adds group mapping suggestions for Google Contacts
- `017_create_contact_onboarding_schema.sql` - Creates contact onboarding schema with Dunbar circles, onboarding state, achievements, and weekly catchup sessions
- `018_create_sms_mms_enrichment_schema.sql` - Creates SMS/MMS enrichment schema with phone number verification and source tracking
- `019_add_user_id_to_enrichment_items.sql` - Adds user_id column to enrichment_items table
- `020_add_sms_performance_indexes.sql` - Adds performance indexes for SMS/MMS queries
- `021_add_google_sso_support.sql` - Adds Google SSO authentication support to users table
- `022_fix_calendar_events_schema.sql` - Fixes calendar events schema
- `023_add_contact_google_memberships.sql` - Adds Google Contact group memberships tracking
- `024_add_excluded_members_to_mappings.sql` - Adds excluded members to group mappings
- `026_create_chat_edits_tables.sql` - Creates chat edits tables for AI-powered contact enrichment
- `027_add_pending_edits_deduplication.sql` - Adds deduplication support for pending edits
- `028_add_frequency_options.sql` - Adds frequency options for contact interactions
- `029_add_ai_edit_tag_source.sql` - Adds AI edit tag source tracking
- `030_update_contact_onboarding_for_simplified_circles.sql` - Updates onboarding schema for simplified 4-circle system and adds group mapping suggestions

## Running Migrations

### Prerequisites

1. PostgreSQL must be installed and running
2. A database named `catchup_db` must exist (or set `DB_NAME` environment variable)
3. Database connection parameters can be configured via environment variables:
   - `DB_NAME` (default: catchup_db)
   - `DB_USER` (default: postgres)
   - `DB_HOST` (default: localhost)
   - `DB_PORT` (default: 5432)

### Run All Migrations

From the project root directory:

```bash
./scripts/run-migrations.sh
```

Or with custom database parameters:

```bash
DB_NAME=my_db DB_USER=myuser ./scripts/run-migrations.sh
```

### Run Individual Migrations

You can also run migrations individually:

```bash
psql -d catchup_db -f scripts/migrations/001_create_core_tables.sql
psql -d catchup_db -f scripts/migrations/002_create_interaction_suggestion_tables.sql
psql -d catchup_db -f scripts/migrations/003_create_preferences_tables.sql
```

## Schema Overview

### Core Tables
- `users` - User accounts
- `contacts` - Contact profiles with metadata
- `groups` - Contact groups (Close Friends, etc.)
- `contact_groups` - Many-to-many relationship between contacts and groups
- `tags` - Auto-generated tags for contacts
- `contact_tags` - Many-to-many relationship between contacts and tags

### Interaction & Suggestion Tables
- `interaction_logs` - History of catchup interactions
- `suggestions` - System-generated connection suggestions (individual and group)
- `suggestion_contacts` - Junction table for suggestions to contacts (supports group suggestions)
- `voice_notes` - Voice recordings with real-time transcription and status tracking
- `voice_note_contacts` - Junction table for voice notes to multiple contacts
- `enrichment_items` - Tracks enrichment proposals and acceptance status
- `google_calendars` - Connected Google Calendar accounts

### Preferences Tables
- `availability_params` - User availability configuration
- `notification_preferences` - Notification delivery preferences
- `oauth_tokens` - OAuth credentials for third-party integrations

### Contact Onboarding Tables
- `onboarding_state` - Tracks user progress through the contact onboarding flow
- `circle_assignments` - Historical record of all circle assignments for contacts (Dunbar circles: inner, close, active, casual, acquaintance)
- `ai_circle_overrides` - Records user corrections to AI suggestions for learning
- `weekly_catchup_sessions` - Manages weekly contact review sessions
- `onboarding_achievements` - Tracks gamification achievements earned by users
- `network_health_scores` - Historical record of network health metrics

### SMS/MMS Enrichment Tables
- `user_phone_numbers` - Verified phone numbers linked to user accounts for SMS/MMS enrichment
- `enrichment_items` - Enhanced with `source` and `source_metadata` columns to track enrichment origin (web, sms, mms, voice)

## Database Enums

The following PostgreSQL enum types are defined:
- `frequency_option` - daily, weekly, monthly, yearly, flexible
- `interaction_type` - hangout, call, text, calendar_event
- `tag_source` - voice_memo, manual, notification_reply
- `suggestion_status` - pending, accepted, dismissed, snoozed
- `trigger_type` - shared_activity, timebound

## Indexes

All tables include appropriate indexes on:
- Foreign keys (user_id, contact_id, etc.)
- Frequently queried fields (status, created_at, etc.)
- Fields used in WHERE clauses and JOINs

## Cascading Deletes

The schema implements cascading deletes to maintain referential integrity:
- Deleting a user cascades to all their contacts, groups, suggestions, etc.
- Deleting a contact cascades to their tags, group memberships, and interactions
- Deleting a group removes group memberships but preserves contacts
