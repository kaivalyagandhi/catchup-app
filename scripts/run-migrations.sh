#!/bin/bash

# CatchUp Database Migration Runner
# This script runs all database migrations in order

set -e

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters - use environment variables from .env
DB_NAME="${DATABASE_NAME:-catchup_db}"
DB_USER="${DATABASE_USER:-postgres}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"

echo "Running CatchUp database migrations..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Run initial database setup
echo "Running initial database setup..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/init-db.sql

# Run migrations in order
echo ""
echo "Running migration 001: Core tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/001_create_core_tables.sql

echo ""
echo "Running migration 002: Interaction and suggestion tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/002_create_interaction_suggestion_tables.sql

echo ""
echo "Running migration 003: Preferences tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/003_create_preferences_tables.sql

echo ""
echo "Running migration 004: Composite indexes..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/004_add_composite_indexes.sql

echo ""
echo "Running migration 005: Users table..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/005_create_users_table.sql

echo ""
echo "Running migration 006a: Email to OAuth tokens..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/006_add_email_to_oauth_tokens.sql

echo ""
echo "Running migration 006b: Audit logs table..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/006_create_audit_logs_table.sql

echo ""
echo "Running migration 007: Calendar events table..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/007_create_calendar_events_table.sql

echo ""
echo "Running migration 008: Unique constraints..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/008_add_unique_constraints.sql

echo ""
echo "Running migration 009: Enhance voice notes schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/009_enhance_voice_notes_schema.sql

echo ""
echo "Running migration 010a: Add enrichment data column..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/010_add_enrichment_data_column.sql

echo ""
echo "Running migration 010b: Enhance suggestions for groups..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/010_enhance_suggestions_for_groups.sql

echo ""
echo "Running migration 011: Make tags user specific..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/011_make_tags_user_specific.sql

echo ""
echo "Running migration 012: Add name to users..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/012_add_name_to_users.sql

echo ""
echo "✓ All migrations completed successfully!"
