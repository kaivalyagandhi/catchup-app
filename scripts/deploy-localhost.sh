#!/bin/bash

# Google Sync Optimization - Localhost Deployment Script
# This script deploys to your local development environment for testing

set -e  # Exit on error

echo "=========================================="
echo "Google Sync Optimization"
echo "Localhost Deployment"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found"
    print_info "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please update .env with your credentials before continuing"
        exit 1
    else
        print_error ".env.example not found"
        exit 1
    fi
fi

# Load environment variables
source .env

# Verify required environment variables
print_info "Verifying environment variables..."

# Support both DB_* and DATABASE_* naming conventions
if [ -n "$DATABASE_HOST" ]; then
    DB_HOST="$DATABASE_HOST"
fi
if [ -n "$DATABASE_USER" ]; then
    DB_USER="$DATABASE_USER"
fi
if [ -n "$DATABASE_NAME" ]; then
    DB_NAME="$DATABASE_NAME"
fi
if [ -n "$DATABASE_PASSWORD" ]; then
    DB_PASSWORD="$DATABASE_PASSWORD"
fi

REQUIRED_VARS=(
    "DB_HOST"
    "DB_USER"
    "DB_NAME"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var (or ${var/DB_/DATABASE_})"
    done
    print_info "Please update your .env file"
    exit 1
fi

print_success "All required environment variables are set"
print_info "Using database: $DB_NAME on $DB_HOST"

# Step 1: Check if PostgreSQL is running
print_info "Step 1: Checking PostgreSQL connection..."

# Build psql connection string
PSQL_OPTS="-h $DB_HOST -U $DB_USER"
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

if psql $PSQL_OPTS -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "PostgreSQL is running"
else
    print_error "Cannot connect to PostgreSQL"
    print_info "Make sure PostgreSQL is running:"
    print_info "  macOS: brew services start postgresql"
    print_info "  Linux: sudo systemctl start postgresql"
    print_info ""
    print_info "Connection details:"
    print_info "  Host: $DB_HOST"
    print_info "  User: $DB_USER"
    print_info "  Database: postgres"
    exit 1
fi

# Step 2: Create database if it doesn't exist
print_info "Step 2: Checking database..."
DB_EXISTS=$(psql $PSQL_OPTS -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | tr -d ' ')
if [ "$DB_EXISTS" = "1" ]; then
    print_success "Database $DB_NAME exists"
else
    print_info "Creating database $DB_NAME..."
    psql $PSQL_OPTS -d postgres -c "CREATE DATABASE $DB_NAME;"
    print_success "Database created"
fi

# Step 3: Backup database (optional for localhost)
print_info "Step 3: Creating database backup (optional)..."
read -p "Create backup? (y/n): " CREATE_BACKUP
if [ "$CREATE_BACKUP" = "y" ]; then
    BACKUP_FILE="backup_localhost_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump $PSQL_OPTS -d "$DB_NAME" > "$BACKUP_FILE"
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        print_success "Database backup created: $BACKUP_FILE ($BACKUP_SIZE)"
    fi
else
    print_info "Skipping backup"
fi

# Step 4: Install dependencies
print_info "Step 4: Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 5: Build application
print_info "Step 5: Building application..."
npm run build
print_success "Application built successfully"

# Step 6: Run migrations
print_info "Step 6: Running database migrations..."

MIGRATIONS=(
    "038_add_admin_role_support.sql"
    "039_create_token_health_table.sql"
    "040_create_circuit_breaker_state_table.sql"
    "041_create_sync_schedule_table.sql"
    "042_create_calendar_webhook_subscriptions_table.sql"
    "043_create_sync_metrics_table.sql"
    "044_create_token_health_notifications_table.sql"
    "045_add_onboarding_until_to_sync_schedule.sql"
    "046_create_webhook_notifications_table.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    print_info "Running migration: $migration"
    if psql $PSQL_OPTS -d "$DB_NAME" -f "scripts/migrations/$migration" > /dev/null 2>&1; then
        print_success "Migration $migration completed"
    else
        print_warning "Migration $migration may have already been applied (skipping)"
    fi
done

# Step 7: Verify migrations
print_info "Step 7: Verifying migrations..."

TABLES=(
    "token_health"
    "circuit_breaker_state"
    "sync_schedule"
    "calendar_webhook_subscriptions"
    "sync_metrics"
    "token_health_notifications"
    "webhook_notifications"
)

ALL_VERIFIED=true
for table in "${TABLES[@]}"; do
    COUNT=$(psql $PSQL_OPTS -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" | tr -d ' ')
    if [ "$COUNT" -eq 1 ]; then
        print_success "Table $table exists"
    else
        print_error "Table $table missing"
        ALL_VERIFIED=false
    fi
done

# Verify admin columns
COLUMNS=("is_admin" "admin_promoted_at" "admin_promoted_by")
for column in "${COLUMNS[@]}"; do
    COUNT=$(psql $PSQL_OPTS -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = '$column';" | tr -d ' ')
    if [ "$COUNT" -eq 1 ]; then
        print_success "Column users.$column exists"
    else
        print_error "Column users.$column missing"
        ALL_VERIFIED=false
    fi
done

# Verify onboarding_until column
COUNT=$(psql $PSQL_OPTS -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sync_schedule' AND column_name = 'onboarding_until';" | tr -d ' ')
if [ "$COUNT" -eq 1 ]; then
    print_success "Column sync_schedule.onboarding_until exists"
else
    print_error "Column sync_schedule.onboarding_until missing"
    ALL_VERIFIED=false
fi

if [ "$ALL_VERIFIED" = true ]; then
    print_success "All migrations verified successfully"
else
    print_error "Some migrations failed - please check the errors above"
    exit 1
fi

# Step 8: Run tests (optional)
print_info "Step 8: Running tests..."
read -p "Run tests? (y/n): " RUN_TESTS
if [ "$RUN_TESTS" = "y" ]; then
    npm test
    print_success "All tests passed"
else
    print_info "Skipping tests"
fi

echo ""
echo "=========================================="
echo "Localhost Deployment Complete!"
echo "=========================================="
echo ""
print_info "Next steps:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Promote yourself as admin:"
echo "   npm run promote-admin -- promote your-email@example.com"
echo ""
echo "3. Access the application:"
echo "   http://localhost:3000"
echo ""
echo "4. Access admin dashboard:"
echo "   http://localhost:3000/admin/sync-health.html"
echo ""
echo "5. Test the features:"
echo "   - Connect Google Contacts/Calendar"
echo "   - Test immediate first sync"
echo "   - Test manual sync"
echo "   - Check admin dashboard metrics"
echo ""
print_warning "Note: For webhooks to work, you'll need:"
echo "  - A publicly accessible URL (use ngrok or similar)"
echo "  - Or test without webhooks (calendar will use polling)"
echo ""
if [ -n "$BACKUP_FILE" ]; then
    print_info "Backup file: $BACKUP_FILE"
fi
echo ""
