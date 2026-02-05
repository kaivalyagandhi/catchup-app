#!/bin/bash

# Google Sync Optimization - Rollback Script
# This script rolls back the deployment if critical issues are found

set -e  # Exit on error

echo "=========================================="
echo "Google Sync Optimization"
echo "Deployment Rollback"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    echo "ℹ $1"
}

# Verify required environment variables
REQUIRED_VARS=("DB_HOST" "DB_USER" "DB_NAME")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Missing required variable: $var"
        exit 1
    fi
done

# Confirmation prompt
print_warning "WARNING: You are about to rollback the Google Sync Optimization deployment"
print_warning "This will:"
echo "  1. Stop all background jobs"
echo "  2. Revert code to previous version"
echo "  3. Restore database from backup"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    print_info "Rollback cancelled"
    exit 0
fi

# Ask for backup file
echo ""
print_info "Available backup files:"
ls -lh backup_*.sql 2>/dev/null || echo "No backup files found"
echo ""
read -p "Enter backup file name (or 'skip' to skip database rollback): " BACKUP_FILE

# Step 1: Stop background jobs
print_info "Step 1: Stopping background jobs..."
# This will vary based on your deployment setup
# Example for PM2:
# pm2 stop catchup-jobs
# Example for systemd:
# sudo systemctl stop catchup-jobs
print_warning "Please stop background jobs manually based on your deployment setup"
read -p "Press Enter when jobs are stopped..."
print_success "Background jobs stopped"

# Step 2: Stop application
print_info "Step 2: Stopping application..."
# This will vary based on your deployment setup
# Example for PM2:
# pm2 stop catchup-app
# Example for systemd:
# sudo systemctl stop catchup-app
print_warning "Please stop application manually based on your deployment setup"
read -p "Press Enter when application is stopped..."
print_success "Application stopped"

# Step 3: Rollback database (if backup file provided)
if [ "$BACKUP_FILE" != "skip" ] && [ -f "$BACKUP_FILE" ]; then
    print_info "Step 3: Rolling back database..."
    print_warning "This will restore database from: $BACKUP_FILE"
    read -p "Continue? (yes/no): " CONFIRM_DB
    
    if [ "$CONFIRM_DB" = "yes" ]; then
        # Create a backup of current state before rollback
        ROLLBACK_BACKUP="backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql"
        print_info "Creating backup of current state: $ROLLBACK_BACKUP"
        pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$ROLLBACK_BACKUP"
        
        # Restore from backup
        print_info "Restoring database from backup..."
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
        print_success "Database restored from backup"
        print_info "Current state backed up to: $ROLLBACK_BACKUP"
    else
        print_info "Skipping database rollback"
    fi
elif [ "$BACKUP_FILE" = "skip" ]; then
    print_info "Step 3: Skipping database rollback"
else
    print_warning "Step 3: Backup file not found, attempting manual rollback..."
    print_info "Dropping sync optimization tables..."
    
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS webhook_notifications CASCADE;
DROP TABLE IF EXISTS token_health_notifications CASCADE;
DROP TABLE IF EXISTS sync_metrics CASCADE;
DROP TABLE IF EXISTS calendar_webhook_subscriptions CASCADE;
DROP TABLE IF EXISTS sync_schedule CASCADE;
DROP TABLE IF EXISTS circuit_breaker_state CASCADE;
DROP TABLE IF EXISTS token_health CASCADE;

-- Remove admin columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
ALTER TABLE users DROP COLUMN IF EXISTS admin_promoted_at;
ALTER TABLE users DROP COLUMN IF EXISTS admin_promoted_by;
EOF
    
    print_success "Sync optimization tables dropped"
fi

# Step 4: Revert code
print_info "Step 4: Reverting code to previous version..."
print_warning "Please specify the git commit hash or tag to revert to"
read -p "Enter commit hash/tag (or 'skip' to skip): " GIT_REF

if [ "$GIT_REF" != "skip" ]; then
    git checkout "$GIT_REF"
    npm install
    npm run build
    print_success "Code reverted to: $GIT_REF"
else
    print_info "Skipping code revert"
fi

# Step 5: Verify rollback
print_info "Step 5: Verifying rollback..."

# Check that sync optimization tables are gone
TABLES=(
    "token_health"
    "circuit_breaker_state"
    "sync_schedule"
    "calendar_webhook_subscriptions"
    "sync_metrics"
    "token_health_notifications"
    "webhook_notifications"
)

ALL_REMOVED=true
for table in "${TABLES[@]}"; do
    COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" | tr -d ' ')
    if [ "$COUNT" -eq 0 ]; then
        print_success "Table $table removed"
    else
        print_warning "Table $table still exists"
        ALL_REMOVED=false
    fi
done

if [ "$ALL_REMOVED" = true ]; then
    print_success "All sync optimization tables removed"
else
    print_warning "Some tables still exist - manual cleanup may be required"
fi

# Step 6: Restart application
print_info "Step 6: Restarting application..."
# This will vary based on your deployment setup
print_warning "Please restart application manually based on your deployment setup"
read -p "Press Enter when application is restarted..."

# Wait for application to start
sleep 5

# Check health endpoint
if [ -n "$WEBHOOK_BASE_URL" ]; then
    if curl -f -s "$WEBHOOK_BASE_URL/health" > /dev/null; then
        print_success "Application is responding"
    else
        print_error "Application is not responding"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Rollback Complete"
echo "=========================================="
echo ""
print_info "Post-rollback checklist:"
echo "  1. Verify application is working correctly"
echo "  2. Check that old sync behavior is restored"
echo "  3. Monitor error logs for any issues"
echo "  4. Document rollback reason and issues encountered"
echo "  5. Plan fixes for re-deployment"
echo ""

if [ "$BACKUP_FILE" != "skip" ] && [ -f "$ROLLBACK_BACKUP" ]; then
    print_info "Backup of state before rollback: $ROLLBACK_BACKUP"
    print_warning "Keep this backup in case you need to restore the sync optimization state"
fi

echo ""
print_warning "IMPORTANT: Create an incident report documenting:"
echo "  - Reason for rollback"
echo "  - Issues encountered"
echo "  - Impact on users"
echo "  - Steps taken"
echo "  - Plan for re-deployment"
echo ""
