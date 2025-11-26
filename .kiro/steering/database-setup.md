# Database Setup Guide

## Overview

CatchUp uses PostgreSQL for data storage. This guide explains how to set up the database and run migrations.

## Prerequisites

- PostgreSQL 12+ installed and running
- Environment variables configured in `.env` file

## Environment Variables

Required database configuration in `.env`:

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=catchup_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password_here
DATABASE_SSL=false
```

## Database Setup

### Option 1: Complete Setup with Migrations (Recommended)

Run the complete initialization script that sets up the database and runs all migrations:

```bash
npm run db:init
```

This script will:
1. Check PostgreSQL connection
2. Create the database if it doesn't exist
3. Run initialization script (creates extensions, functions)
4. Run all migrations in order

### Option 2: Manual Setup

If you prefer to run steps individually:

```bash
# 1. Create database
npm run db:setup

# 2. Run migrations
npm run db:migrate

# 3. Test connection
npm run db:test
```

## Database Schema

The database includes the following main tables:

### Core Tables
- `users` - User accounts and authentication
- `contacts` - Contact information
- `groups` - Contact groups
- `contact_groups` - Many-to-many relationship between contacts and groups
- `tags` - Tags for categorizing contacts
- `contact_tags` - Many-to-many relationship between contacts and tags

### Interaction & Suggestions
- `interaction_logs` - Tracks user interactions with contacts
- `suggestions` - AI-generated suggestions for reaching out
- `suggestion_contacts` - Links suggestions to contacts/groups
- `voice_notes` - Voice note recordings and transcriptions
- `voice_note_contacts` - Links voice notes to contacts
- `enrichment_items` - Proposed enrichments from voice notes

### Calendar & Availability
- `google_calendars` - User's Google Calendar information
- `calendar_events` - Cached calendar events
- `availability_params` - User availability preferences

### Preferences & Configuration
- `notification_preferences` - Notification delivery settings
- `oauth_tokens` - OAuth credentials for third-party integrations

### Audit & Logging
- `audit_logs` - Security and compliance audit trail

## Migrations

Migrations are located in `scripts/migrations/` and run in order:

1. **001_create_core_tables.sql** - Core contact and group tables
2. **002_create_interaction_suggestion_tables.sql** - Interaction and suggestion tables
3. **003_create_preferences_tables.sql** - Preferences, availability, and OAuth tables
4. **004+** - Additional migrations as needed

Each migration is idempotent (safe to run multiple times) using `CREATE TABLE IF NOT EXISTS`.

## Troubleshooting

### PostgreSQL Connection Error

```
Error: PostgreSQL is not running or not accessible
```

**Solution:**
- Ensure PostgreSQL is installed and running
- Check `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER` in `.env`
- Verify PostgreSQL credentials

### Database Already Exists

If the database already exists, the setup script will skip creation and proceed with migrations.

### Migration Errors

If a migration fails:

1. Check the error message for details
2. Verify the database connection
3. Check that all previous migrations completed successfully
4. Review the migration file for syntax errors

### Reset Database (Development Only)

To completely reset the database:

```bash
# Drop the database
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS catchup_db;"

# Recreate from scratch
npm run db:init
```

## Verification

After setup, verify the database is ready:

```bash
npm run db:test
```

Expected output:
```
Database connection successful
```

## Development Workflow

1. Set up database once: `npm run db:init`
2. Start development server: `npm run dev`
3. Make code changes
4. If schema changes needed, create new migration in `scripts/migrations/`
5. Run new migration: `npm run db:migrate`

## Production Deployment

For production:

1. Set `DATABASE_SSL=true` in environment
2. Use secure credentials management (AWS Secrets Manager, etc.)
3. Run migrations before deploying application code
4. Keep backups of production database
5. Test migrations in staging environment first

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Migration Files](../scripts/migrations/)
