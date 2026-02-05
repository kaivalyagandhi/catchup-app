#!/bin/bash

# Google Sync Optimization - Production Deployment Script
# This script automates the deployment to production environment

set -e  # Exit on error

echo "=========================================="
echo "Google Sync Optimization"
echo "Production Deployment"
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

# Check if running in production environment
if [ "$NODE_ENV" != "production" ]; then
    print_error "NODE_ENV must be set to 'production'"
    exit 1
fi

# Confirmation prompt
print_warning "You are about to deploy to PRODUCTION"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    print_info "Deployment cancelled"
    exit 0
fi

# Verify required environment variables
print_info "Verifying environment variables..."
REQUIRED_VARS=(
    "DB_HOST"
    "DB_USER"
    "DB_NAME"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "WEBHOOK_BASE_URL"
    "WEBHOOK_VERIFICATION_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Missing required variable: $var"
        exit 1
    fi
done
print_success "All required environment variables are set"

# Step 1: Backup database
print_info "Step 1: Creating database backup..."
BACKUP_FILE="backup_production_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    print_success "Database backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    print_error "Failed to create database backup"
    exit 1
fi

# Step 2: Install dependencies
print_info "Step 2: Installing dependencies..."
npm ci --production
print_success "Dependencies installed"

# Step 3: Build application
print_info "Step 3: Building application..."
npm run build
print_success "Application built successfully"

# Step 4: Run migrations
print_info "Step 4: Running database migrations..."

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
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "scripts/migrations/$migration" > /dev/null 2>&1; then
        print_success "Migration $migration completed"
    else
        print_warning "Migration $migration may have already been applied (skipping)"
    fi
done

# Step 5: Verify migrations
print_info "Step 5: Verifying migrations..."

TABLES=(
    "token_health"
    "circuit_breaker_state"
    "sync_schedule"
    "calendar_webhook_subscriptions"
    "sync_metrics"
    "token_health_notifications"
    "webhook_notifications"
)

for table in "${TABLES[@]}"; do
    COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" | tr -d ' ')
    if [ "$COUNT" -eq 1 ]; then
        print_success "Table $table exists"
    else
        print_error "Table $table missing"
        print_error "Rolling back deployment..."
        # Restore from backup
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
        exit 1
    fi
done

# Verify admin columns
COLUMNS=("is_admin" "admin_promoted_at" "admin_promoted_by")
for column in "${COLUMNS[@]}"; do
    COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = '$column';" | tr -d ' ')
    if [ "$COUNT" -eq 1 ]; then
        print_success "Column users.$column exists"
    else
        print_error "Column users.$column missing"
        print_error "Rolling back deployment..."
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
        exit 1
    fi
done

# Verify onboarding_until column
COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sync_schedule' AND column_name = 'onboarding_until';" | tr -d ' ')
if [ "$COUNT" -eq 1 ]; then
    print_success "Column sync_schedule.onboarding_until exists"
else
    print_error "Column sync_schedule.onboarding_until missing"
    print_error "Rolling back deployment..."
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
    exit 1
fi

print_success "All migrations verified successfully"

# Step 6: Restart services
print_info "Step 6: Restarting services..."
# This will vary based on your deployment setup
# Example for PM2:
# pm2 restart catchup-production
# Example for systemd:
# sudo systemctl restart catchup-production
print_warning "Please restart services manually based on your deployment setup"

# Step 7: Verify deployment
print_info "Step 7: Verifying deployment..."

# Wait for services to start
sleep 10

# Check health endpoint
if curl -f -s "$WEBHOOK_BASE_URL/health" > /dev/null; then
    print_success "Health endpoint responding"
else
    print_error "Health endpoint not responding"
    print_error "Services may not have started correctly"
    exit 1
fi

# Check admin dashboard endpoint (should return 401 without auth)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_BASE_URL/api/admin/sync-health")
if [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
    print_success "Admin dashboard endpoint responding (requires auth)"
else
    print_warning "Admin dashboard endpoint returned unexpected code: $HTTP_CODE"
fi

echo ""
echo "=========================================="
echo "Production Deployment Complete!"
echo "=========================================="
echo ""
print_info "Next steps:"
echo "  1. Promote admin users: npm run promote-admin -- promote admin@example.com"
echo "  2. Test admin dashboard: $WEBHOOK_BASE_URL/admin/sync-health.html"
echo "  3. Monitor logs closely for first 24 hours"
echo "  4. Track success metrics for 2 weeks"
echo "  5. Be ready to rollback if issues arise"
echo ""
print_info "Backup file: $BACKUP_FILE"
print_warning "Keep this backup for at least 2 weeks"
echo ""
print_warning "IMPORTANT: Monitor the following metrics:"
echo "  - Webhook health (target >95% reliability)"
echo "  - Onboarding success rate (target >95%)"
echo "  - API usage reduction (target 70-85%)"
echo "  - Sync success rate (target >90%)"
echo "  - User complaints about stale data"
echo ""
