#!/bin/bash

# CatchUp Database Initialization with Migrations
# This script sets up the database and runs all migrations

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-catchup_db}
DB_USER=${DATABASE_USER:-postgres}

echo "=========================================="
echo "CatchUp Database Initialization"
echo "=========================================="
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    echo "Error: PostgreSQL is not running or not accessible"
    echo "Please ensure PostgreSQL is installed and running"
    exit 1
fi

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

echo "✓ Database ready"
echo ""

# Run initialization script
echo "Running initialization script..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/init-db.sql
echo "✓ Initialization complete"
echo ""

# Run migrations in order
echo "Running migrations..."
echo ""

echo "Migration 001: Creating core tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/001_create_core_tables.sql
echo "✓ Core tables created"
echo ""

echo "Migration 002: Creating interaction and suggestion tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/002_create_interaction_suggestion_tables.sql
echo "✓ Interaction and suggestion tables created"
echo ""

echo "Migration 003: Creating preferences and OAuth tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/003_create_preferences_tables.sql
echo "✓ Preferences and OAuth tables created"
echo ""

# Run additional migrations if they exist
if [ -f scripts/migrations/004_*.sql ]; then
    echo "Migration 004: Running additional migrations..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/004_*.sql
    echo "✓ Additional migrations complete"
    echo ""
fi

if [ -f scripts/migrations/005_create_users_table.sql ]; then
    echo "Migration 005: Creating/updating users table..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/005_create_users_table.sql
    echo "✓ Users table updated"
    echo ""
fi

if [ -f scripts/migrations/006_create_audit_logs_table.sql ]; then
    echo "Migration 006: Creating audit logs table..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/006_create_audit_logs_table.sql
    echo "✓ Audit logs table created"
    echo ""
fi

if [ -f scripts/migrations/007_create_calendar_events_table.sql ]; then
    echo "Migration 007: Creating calendar events table..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/007_create_calendar_events_table.sql
    echo "✓ Calendar events table created"
    echo ""
fi

if [ -f scripts/migrations/009_enhance_voice_notes_schema.sql ]; then
    echo "Migration 009: Enhancing voice notes schema..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/009_enhance_voice_notes_schema.sql
    echo "✓ Voice notes schema enhanced"
    echo ""
fi

if [ -f scripts/migrations/010_enhance_suggestions_for_groups.sql ]; then
    echo "Migration 010: Enhancing suggestions for groups..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/migrations/010_enhance_suggestions_for_groups.sql
    echo "✓ Suggestions enhanced for groups"
    echo ""
fi

echo "=========================================="
echo "✓ All migrations completed successfully!"
echo "=========================================="
echo ""
echo "Database is ready for use."
echo "You can now start the application with: npm run dev"
