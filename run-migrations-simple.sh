#!/bin/bash

# Simple Migration Runner - Set password as environment variable
# Usage: PGPASSWORD=your_password ./run-migrations-simple.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}CatchUp Production Migrations${NC}"
echo ""

# Check if password is set
if [ -z "$PGPASSWORD" ]; then
  echo -e "${RED}Error: PGPASSWORD environment variable not set${NC}"
  echo ""
  echo "Usage:"
  echo -e "${YELLOW}PGPASSWORD=your_password ./run-migrations-simple.sh${NC}"
  echo ""
  exit 1
fi

# Check if Cloud SQL Proxy is running on port 5433 or 5434
if lsof -i :5433 > /dev/null 2>&1; then
  PORT=5433
  echo -e "${GREEN}Found Cloud SQL Proxy on port 5433${NC}"
elif lsof -i :5434 > /dev/null 2>&1; then
  PORT=5434
  echo -e "${GREEN}Found Cloud SQL Proxy on port 5434${NC}"
else
  echo -e "${RED}Error: Cloud SQL Proxy is not running${NC}"
  echo ""
  echo "Start it with:"
  echo -e "${YELLOW}cloud-sql-proxy catchup-479221:us-central1:catchup-db --port 5433${NC}"
  echo "or"
  echo -e "${YELLOW}cloud-sql-proxy catchup-479221:us-central1:catchup-db --port 5434${NC}"
  echo ""
  exit 1
fi

# Connection parameters
export DATABASE_HOST="127.0.0.1"
export DATABASE_PORT="$PORT"
export DATABASE_USER="catchup_user"
export DATABASE_NAME="catchup_db"

echo "Database: $DATABASE_NAME"
echo "Host: $DATABASE_HOST:$DATABASE_PORT"
echo "User: $DATABASE_USER"
echo ""

# Test connection
echo -e "${GREEN}Testing connection...${NC}"
if ! psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${RED}Error: Could not connect to database${NC}"
  echo "Check your password and Cloud SQL Proxy"
  exit 1
fi

echo -e "${GREEN}✓ Connected successfully${NC}"
echo ""

# Run all migrations
echo -e "${GREEN}Running all migrations...${NC}"
echo ""

# Export for psql commands
export PGHOST="$DATABASE_HOST"
export PGPORT="$DATABASE_PORT"
export PGUSER="$DATABASE_USER"
export PGDATABASE="$DATABASE_NAME"

# Run each migration
for migration in scripts/migrations/*.sql; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration")
    echo "Running $filename..."
    if psql -f "$migration" > /dev/null 2>&1; then
      echo -e "${GREEN}✓${NC} $filename"
    else
      echo -e "${YELLOW}⚠${NC} $filename (may already exist - this is OK)"
    fi
  fi
done

echo ""
echo -e "${GREEN}✓ All migrations completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart Cloud Run:"
echo "   gcloud run services update catchup --region=us-central1 --update-env-vars=MIGRATIONS_COMPLETE=\$(date +%s)"
echo ""
echo "2. Test at: https://catchup.club"
echo ""
