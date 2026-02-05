#!/bin/bash

# Google Sync Optimization - Staging Monitoring Script
# This script monitors key metrics during the 48-hour staging period

set -e  # Exit on error

echo "=========================================="
echo "Google Sync Optimization"
echo "Staging Monitoring Report"
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

# Check if running in staging environment
if [ "$NODE_ENV" != "staging" ]; then
    print_error "NODE_ENV must be set to 'staging'"
    exit 1
fi

# Verify required environment variables
REQUIRED_VARS=("DB_HOST" "DB_USER" "DB_NAME")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Missing required variable: $var"
        exit 1
    fi
done

# Function to run SQL query and return result
run_query() {
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "$1" | tr -d ' '
}

# Function to calculate percentage
calc_percentage() {
    if [ "$2" -eq 0 ]; then
        echo "0"
    else
        echo "scale=2; ($1 * 100) / $2" | bc
    fi
}

echo "Report generated at: $(date)"
echo ""

# 1. Webhook Health
print_info "=== Webhook Health ==="

TOTAL_WEBHOOKS=$(run_query "SELECT COUNT(*) FROM calendar_webhook_subscriptions;")
echo "Total active webhooks: $TOTAL_WEBHOOKS"

if [ "$TOTAL_WEBHOOKS" -gt 0 ]; then
    # Webhooks with notifications in last 48 hours
    ACTIVE_WEBHOOKS=$(run_query "SELECT COUNT(DISTINCT user_id) FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '48 hours';")
    echo "Webhooks with recent notifications: $ACTIVE_WEBHOOKS"
    
    # Silent webhooks (no notifications in 48+ hours)
    SILENT_WEBHOOKS=$(run_query "SELECT COUNT(*) FROM calendar_webhook_subscriptions WHERE user_id NOT IN (SELECT DISTINCT user_id FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '48 hours');")
    echo "Silent webhooks (>48h): $SILENT_WEBHOOKS"
    
    if [ "$SILENT_WEBHOOKS" -gt 0 ]; then
        print_warning "Found $SILENT_WEBHOOKS silent webhooks"
    else
        print_success "No silent webhooks detected"
    fi
    
    # Webhook notification success rate (last 24 hours)
    TOTAL_NOTIFICATIONS=$(run_query "SELECT COUNT(*) FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '24 hours';")
    SUCCESSFUL_NOTIFICATIONS=$(run_query "SELECT COUNT(*) FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '24 hours' AND result = 'success';")
    
    if [ "$TOTAL_NOTIFICATIONS" -gt 0 ]; then
        SUCCESS_RATE=$(calc_percentage "$SUCCESSFUL_NOTIFICATIONS" "$TOTAL_NOTIFICATIONS")
        echo "Webhook success rate (24h): ${SUCCESS_RATE}%"
        
        if (( $(echo "$SUCCESS_RATE >= 95" | bc -l) )); then
            print_success "Webhook success rate meets target (>95%)"
        else
            print_warning "Webhook success rate below target: ${SUCCESS_RATE}% (target: >95%)"
        fi
    else
        print_warning "No webhook notifications in last 24 hours"
    fi
else
    print_warning "No active webhooks found"
fi

echo ""

# 2. Onboarding Success Rate
print_info "=== Onboarding Success Rate ==="

# Count users who connected in last 48 hours
NEW_USERS=$(run_query "SELECT COUNT(DISTINCT user_id) FROM sync_schedule WHERE created_at > NOW() - INTERVAL '48 hours';")
echo "New users (last 48h): $NEW_USERS"

if [ "$NEW_USERS" -gt 0 ]; then
    # Count successful initial syncs
    SUCCESSFUL_ONBOARDING=$(run_query "SELECT COUNT(DISTINCT user_id) FROM sync_metrics WHERE sync_type = 'initial' AND result = 'success' AND created_at > NOW() - INTERVAL '48 hours';")
    echo "Successful onboarding syncs: $SUCCESSFUL_ONBOARDING"
    
    ONBOARDING_RATE=$(calc_percentage "$SUCCESSFUL_ONBOARDING" "$NEW_USERS")
    echo "Onboarding success rate: ${ONBOARDING_RATE}%"
    
    if (( $(echo "$ONBOARDING_RATE >= 95" | bc -l) )); then
        print_success "Onboarding success rate meets target (>95%)"
    else
        print_warning "Onboarding success rate below target: ${ONBOARDING_RATE}% (target: >95%)"
    fi
    
    # Check for failed onboarding syncs
    FAILED_ONBOARDING=$(run_query "SELECT COUNT(DISTINCT user_id) FROM sync_metrics WHERE sync_type = 'initial' AND result = 'failure' AND created_at > NOW() - INTERVAL '48 hours';")
    if [ "$FAILED_ONBOARDING" -gt 0 ]; then
        print_warning "Found $FAILED_ONBOARDING failed onboarding syncs"
        echo "Failed onboarding reasons:"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT error_message, COUNT(*) as count FROM sync_metrics WHERE sync_type = 'initial' AND result = 'failure' AND created_at > NOW() - INTERVAL '48 hours' GROUP BY error_message;"
    fi
else
    print_warning "No new users in last 48 hours"
fi

echo ""

# 3. API Usage Reduction
print_info "=== API Usage Reduction ==="

# Count syncs in last 24 hours
TOTAL_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE created_at > NOW() - INTERVAL '24 hours';")
echo "Total syncs (24h): $TOTAL_SYNCS"

# Count skipped syncs (API calls saved)
SKIPPED_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'skipped' AND created_at > NOW() - INTERVAL '24 hours';")
echo "Skipped syncs (24h): $SKIPPED_SYNCS"

if [ "$TOTAL_SYNCS" -gt 0 ]; then
    SKIP_RATE=$(calc_percentage "$SKIPPED_SYNCS" "$TOTAL_SYNCS")
    echo "Skip rate: ${SKIP_RATE}%"
    
    if (( $(echo "$SKIP_RATE >= 70" | bc -l) )); then
        print_success "API usage reduction meets target (70-85%)"
    else
        print_warning "API usage reduction below target: ${SKIP_RATE}% (target: 70-85%)"
    fi
fi

# Breakdown by skip reason
echo ""
echo "Skip reasons:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT skip_reason, COUNT(*) as count FROM sync_metrics WHERE result = 'skipped' AND created_at > NOW() - INTERVAL '24 hours' GROUP BY skip_reason;"

echo ""

# 4. Sync Success Rate
print_info "=== Sync Success Rate ==="

EXECUTED_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result IN ('success', 'failure') AND created_at > NOW() - INTERVAL '24 hours';")
SUCCESSFUL_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'success' AND created_at > NOW() - INTERVAL '24 hours';")

if [ "$EXECUTED_SYNCS" -gt 0 ]; then
    SYNC_SUCCESS_RATE=$(calc_percentage "$SUCCESSFUL_SYNCS" "$EXECUTED_SYNCS")
    echo "Sync success rate (24h): ${SYNC_SUCCESS_RATE}%"
    
    if (( $(echo "$SYNC_SUCCESS_RATE >= 90" | bc -l) )); then
        print_success "Sync success rate meets target (>90%)"
    else
        print_warning "Sync success rate below target: ${SYNC_SUCCESS_RATE}% (target: >90%)"
    fi
    
    # Show failure reasons
    FAILED_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'failure' AND created_at > NOW() - INTERVAL '24 hours';")
    if [ "$FAILED_SYNCS" -gt 0 ]; then
        echo ""
        echo "Failure reasons:"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT error_message, COUNT(*) as count FROM sync_metrics WHERE result = 'failure' AND created_at > NOW() - INTERVAL '24 hours' GROUP BY error_message LIMIT 10;"
    fi
else
    print_warning "No executed syncs in last 24 hours"
fi

echo ""

# 5. Token Health
print_info "=== Token Health ==="

TOTAL_TOKENS=$(run_query "SELECT COUNT(*) FROM token_health;")
echo "Total tokens tracked: $TOTAL_TOKENS"

if [ "$TOTAL_TOKENS" -gt 0 ]; then
    INVALID_TOKENS=$(run_query "SELECT COUNT(*) FROM token_health WHERE status IN ('expired', 'revoked');")
    echo "Invalid tokens: $INVALID_TOKENS"
    
    if [ "$INVALID_TOKENS" -gt 0 ]; then
        INVALID_RATE=$(calc_percentage "$INVALID_TOKENS" "$TOTAL_TOKENS")
        print_warning "Invalid token rate: ${INVALID_RATE}%"
    else
        print_success "No invalid tokens"
    fi
    
    EXPIRING_TOKENS=$(run_query "SELECT COUNT(*) FROM token_health WHERE status = 'expiring_soon';")
    if [ "$EXPIRING_TOKENS" -gt 0 ]; then
        print_warning "Tokens expiring soon: $EXPIRING_TOKENS"
    fi
fi

echo ""

# 6. Circuit Breaker Status
print_info "=== Circuit Breaker Status ==="

TOTAL_CIRCUIT_BREAKERS=$(run_query "SELECT COUNT(*) FROM circuit_breaker_state;")
echo "Total circuit breakers: $TOTAL_CIRCUIT_BREAKERS"

if [ "$TOTAL_CIRCUIT_BREAKERS" -gt 0 ]; then
    OPEN_CIRCUIT_BREAKERS=$(run_query "SELECT COUNT(*) FROM circuit_breaker_state WHERE state = 'open';")
    echo "Open circuit breakers: $OPEN_CIRCUIT_BREAKERS"
    
    if [ "$OPEN_CIRCUIT_BREAKERS" -gt 0 ]; then
        OPEN_RATE=$(calc_percentage "$OPEN_CIRCUIT_BREAKERS" "$TOTAL_CIRCUIT_BREAKERS")
        print_warning "Open circuit breaker rate: ${OPEN_RATE}%"
        
        echo ""
        echo "Open circuit breakers by integration:"
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT integration_type, COUNT(*) as count FROM circuit_breaker_state WHERE state = 'open' GROUP BY integration_type;"
    else
        print_success "No open circuit breakers"
    fi
fi

echo ""

# 7. Error Log Summary
print_info "=== Recent Errors ==="

echo "Top 5 error messages (last 24h):"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT error_message, COUNT(*) as count FROM sync_metrics WHERE error_message IS NOT NULL AND created_at > NOW() - INTERVAL '24 hours' GROUP BY error_message ORDER BY count DESC LIMIT 5;"

echo ""

# 8. Summary and Recommendations
print_info "=== Summary ==="

ISSUES_FOUND=0

# Check webhook health
if [ "$SILENT_WEBHOOKS" -gt 0 ]; then
    print_warning "Issue: Silent webhooks detected"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check onboarding rate
if [ "$NEW_USERS" -gt 0 ] && (( $(echo "$ONBOARDING_RATE < 95" | bc -l) )); then
    print_warning "Issue: Onboarding success rate below target"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check API reduction
if [ "$TOTAL_SYNCS" -gt 0 ] && (( $(echo "$SKIP_RATE < 70" | bc -l) )); then
    print_warning "Issue: API usage reduction below target"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check sync success rate
if [ "$EXECUTED_SYNCS" -gt 0 ] && (( $(echo "$SYNC_SUCCESS_RATE < 90" | bc -l) )); then
    print_warning "Issue: Sync success rate below target"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check invalid tokens
if [ "$TOTAL_TOKENS" -gt 0 ] && [ "$INVALID_TOKENS" -gt 0 ]; then
    INVALID_RATE=$(calc_percentage "$INVALID_TOKENS" "$TOTAL_TOKENS")
    if (( $(echo "$INVALID_RATE > 5" | bc -l) )); then
        print_warning "Issue: High invalid token rate (${INVALID_RATE}%)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
fi

# Check open circuit breakers
if [ "$TOTAL_CIRCUIT_BREAKERS" -gt 0 ] && [ "$OPEN_CIRCUIT_BREAKERS" -gt 0 ]; then
    OPEN_RATE=$(calc_percentage "$OPEN_CIRCUIT_BREAKERS" "$TOTAL_CIRCUIT_BREAKERS")
    if (( $(echo "$OPEN_RATE > 5" | bc -l) )); then
        print_warning "Issue: High open circuit breaker rate (${OPEN_RATE}%)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
fi

echo ""
if [ "$ISSUES_FOUND" -eq 0 ]; then
    print_success "No critical issues found - Ready for production deployment"
else
    print_warning "Found $ISSUES_FOUND issue(s) - Review before production deployment"
fi

echo ""
echo "=========================================="
echo "End of Monitoring Report"
echo "=========================================="
echo ""
