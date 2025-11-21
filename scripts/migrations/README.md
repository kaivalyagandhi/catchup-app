# Database Migrations

This directory contains SQL migration files for the CatchUp database schema.

## Migration Files

- `001_create_core_tables.sql` - Creates contacts, groups, tags, and their junction tables
- `002_create_interaction_suggestion_tables.sql` - Creates interaction logs, suggestions, voice notes, and google calendars tables
- `003_create_preferences_tables.sql` - Creates availability parameters, notification preferences, and OAuth token storage

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
- `suggestions` - System-generated connection suggestions
- `voice_notes` - Voice recordings and transcriptions
- `google_calendars` - Connected Google Calendar accounts

### Preferences Tables
- `availability_params` - User availability configuration
- `notification_preferences` - Notification delivery preferences
- `oauth_tokens` - OAuth credentials for third-party integrations

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
