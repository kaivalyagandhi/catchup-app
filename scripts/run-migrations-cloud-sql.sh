#!/bin/bash

# CatchUp Database Migration Runner for Google Cloud SQL
# This script runs migrations on Google Cloud SQL via Cloud SQL Proxy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}CatchUp Cloud SQL Migration Runner${NC}"
echo ""

# Check if Cloud SQL Proxy is running
if ! lsof -i :5432 > /dev/null 2>&1; then
  echo -e "${RED}Error: Cloud SQL Proxy is not running on port 5432${NC}"
  echo ""
  echo "Please start Cloud SQL Proxy first:"
  echo -e "${YELLOW}cloud-sql-proxy catchup-479221:us-central1:catchup-db${NC}"
  echo ""
  exit 1
fi

# Database connection parameters for Cloud SQL Proxy
export DATABASE_HOST="127.0.0.1"
export DATABASE_PORT="5432"
export DATABASE_USER="postgres"
export DATABASE_NAME="catchup_db"

echo "Database: $DATABASE_NAME"
echo "Host: $DATABASE_HOST:$DATABASE_PORT (via Cloud SQL Proxy)"
echo "User: $DATABASE_USER"
echo ""

# Prompt for password
echo -e "${YELLOW}Enter PostgreSQL password:${NC}"
read -s PGPASSWORD
export PGPASSWORD

echo ""
echo -e "${GREEN}Testing connection...${NC}"

# Test connection
if ! psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${RED}Error: Could not connect to database${NC}"
  echo "Please check your password and ensure Cloud SQL Proxy is running"
  exit 1
fi

echo -e "${GREEN}✓ Connection successful${NC}"
echo ""

# Ask which migrations to run
echo "Which migrations do you want to run?"
echo "1) Only sync optimization migrations (039-046) - RECOMMENDED"
echo "2) All migrations (001-046)"
echo "3) Specific migration number"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo -e "${GREEN}Running sync optimization migrations (039-046)...${NC}"
    echo ""
    
    echo "Running migration 039: Create token health table..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/039_create_token_health_table.sql
    
    echo ""
    echo "Running migration 040: Create circuit breaker state table..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/040_create_circuit_breaker_state_table.sql
    
    echo ""
    echo "Running migration 041: Create sync schedule table..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/041_create_sync_schedule_table.sql
    
    echo ""
    echo "Running migration 042: Create calendar webhook subscriptions table..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/042_create_calendar_webhook_subscriptions_table.sql
    
    echo ""
    echo "Running migration 043: Create sync metrics table..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/043_create_sync_metrics_table.sql
    
    echo ""
    echo "Running migration 044: Create token health notifications table..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/044_create_token_health_notifications_table.sql
    
    echo ""
    echo "Running migration 045: Add onboarding_until to sync_schedule..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/045_add_onboarding_until_to_sync_schedule.sql
    
    echo ""
    echo "Running migration 046: Create webhook_notifications table..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f scripts/migrations/046_create_webhook_notifications_table.sql
    
    echo ""
    echo -e "${GREEN}✓ Sync optimization migrations completed successfully!${NC}"
    ;;
    
  2)
    echo ""
    echo -e "${GREEN}Running all migrations...${NC}"
    echo ""
    ./scripts/run-migrations.sh
    ;;
    
  3)
    echo ""
    read -p "Enter migration number (e.g., 039): " migration_num
    migration_file="scripts/migrations/${migration_num}_*.sql"
    
    if ls $migration_file 1> /dev/null 2>&1; then
      echo ""
      echo -e "${GREEN}Running migration $migration_num...${NC}"
      psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f $migration_file
      echo ""
      echo -e "${GREEN}✓ Migration $migration_num completed successfully!${NC}"
    else
      echo -e "${RED}Error: Migration $migration_num not found${NC}"
      exit 1
    fi
    ;;
    
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy code changes: npm run deploy-production"
echo "2. Verify in production: https://catchup.club"
echo ""
