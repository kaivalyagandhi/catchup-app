#!/bin/bash

# CatchUp Database Migration Runner for Google Cloud SQL (Alternative Port)
# This script runs migrations on Google Cloud SQL via Cloud SQL Proxy on port 5433

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}CatchUp Cloud SQL Migration Runner (Port 5433)${NC}"
echo ""

# Check if Cloud SQL Proxy is running on port 5433
if ! lsof -i :5433 > /dev/null 2>&1; then
  echo -e "${RED}Error: Cloud SQL Proxy is not running on port 5433${NC}"
  echo ""
  echo "Please start Cloud SQL Proxy first:"
  echo -e "${YELLOW}cloud-sql-proxy catchup-479221:us-central1:catchup-db --port 5433${NC}"
  echo ""
  exit 1
fi

# Database connection parameters for Cloud SQL Proxy
export DATABASE_HOST="127.0.0.1"
export DATABASE_PORT="5433"
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
  echo "Please check your password and ensure Cloud SQL Proxy is running on port 5433"
  exit 1
fi

echo -e "${GREEN}✓ Connection successful${NC}"
echo ""

echo -e "${GREEN}Running ALL migrations (001-046)...${NC}"
echo ""

# Run all migrations by calling the main script with updated env vars
./scripts/run-migrations.sh

echo ""
echo -e "${GREEN}✓ All migrations completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart Cloud Run:"
echo "   gcloud run services update catchup --region=us-central1 --update-env-vars=MIGRATIONS_COMPLETE=\$(date +%s)"
echo "2. Verify in production: https://catchup.club"
echo ""
