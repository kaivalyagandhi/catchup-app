#!/bin/bash

# CatchUp Database Migration Runner
# This script runs all database migrations in order

set -e

# Database connection parameters
DB_NAME="${DB_NAME:-catchup_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

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
echo "✓ All migrations completed successfully!"
