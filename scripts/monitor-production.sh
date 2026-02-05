#!/bin/bash

# Google Sync Optimization - Production Monitoring Script
# This script monitors key metrics in production environment

set -e  # Exit on error

echo "=========================================="
echo "Google Sync Optimization"
echo "Production Monitoring Report"
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

# Check if running in production environment
if [ "$NODE_ENV" != "production" ]; then
    print_error "NODE_ENV must be set to 'production'"
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

# Parse command line arguments
TIME_RANGE="${1:-24h}"  # Default to 24 hours

case "$TIME_RANGE" in
    "24h")
        INTERVAL="24 hours"
        ;;
    "7d")
        INTERVAL="7 days"
        ;;
    "14d")
        INTERVAL="14 days"
        ;;
    *)
        print_error "Invalid time range. Use: 24h, 7d, or 14d"
        exit 1
        ;;
esac

echo "Report generated at: $(date)"
echo "Time range: $TIME_RANGE"
echo ""

# 1. Overall Health Score
print_info "=== Overall Health Score ==="

HEALTH_SCORE=100
ISSUES=()

# Calculate health metrics
TOTAL_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE created_at > NOW() - INTERVAL '$INTERVAL';")
SUCCESSFUL_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'success' AND created_at > NOW() - INTERVAL '$INTERVAL';")
EXECUTED_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result IN ('success', 'failure') AND created_at > NOW() - INTERVAL '$INTERVAL';")

if [ "$EXECUTED_SYNCS" -gt 0 ]; then
    SYNC_SUCCESS_RATE=$(calc_percentage "$SUCCESSFUL_SYNCS" "$EXECUTED_SYNCS")
    if (( $(echo "$SYNC_SUCCESS_RATE < 90" | bc -l) )); then
        HEALTH_SCORE=$((HEALTH_SCORE - 20))
        ISSUES+=("Low sync success rate: ${SYNC_SUCCESS_RATE}%")
    fi
fi

# Check webhook health
TOTAL_WEBHOOKS=$(run_query "SELECT COUNT(*) FROM calendar_webhook_subscriptions;")
if [ "$TOTAL_WEBHOOKS" -gt 0 ]; then
    SILENT_WEBHOOKS=$(run_query "SELECT COUNT(*) FROM calendar_webhook_subscriptions WHERE user_id NOT IN (SELECT DISTINCT user_id FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '48 hours');")
    if [ "$SILENT_WEBHOOKS" -gt 0 ]; then
        SILENT_RATE=$(calc_percentage "$SILENT_WEBHOOKS" "$TOTAL_WEBHOOKS")
        if (( $(echo "$SILENT_RATE > 5" | bc -l) )); then
            HEALTH_SCORE=$((HEALTH_SCORE - 15))
            ISSUES+=("High silent webhook rate: ${SILENT_RATE}%")
        fi
    fi
fi

# Check token health
TOTAL_TOKENS=$(run_query "SELECT COUNT(*) FROM token_health;")
if [ "$TOTAL_TOKENS" -gt 0 ]; then
    INVALID_TOKENS=$(run_query "SELECT COUNT(*) FROM token_health WHERE status IN ('expired', 'revoked');")
    if [ "$INVALID_TOKENS" -gt 0 ]; then
        INVALID_RATE=$(calc_percentage "$INVALID_TOKENS" "$TOTAL_TOKENS")
        if (( $(echo "$INVALID_RATE > 10" | bc -l) )); then
            HEALTH_SCORE=$((HEALTH_SCORE - 15))
            ISSUES+=("High invalid token rate: ${INVALID_RATE}%")
        fi
    fi
fi

# Check circuit breakers
TOTAL_CIRCUIT_BREAKERS=$(run_query "SELECT COUNT(*) FROM circuit_breaker_state;")
if [ "$TOTAL_CIRCUIT_BREAKERS" -gt 0 ]; then
    OPEN_CIRCUIT_BREAKERS=$(run_query "SELECT COUNT(*) FROM circuit_breaker_state WHERE state = 'open';")
    if [ "$OPEN_CIRCUIT_BREAKERS" -gt 0 ]; then
        OPEN_RATE=$(calc_percentage "$OPEN_CIRCUIT_BREAKERS" "$TOTAL_CIRCUIT_BREAKERS")
        if (( $(echo "$OPEN_RATE > 5" | bc -l) )); then
            HEALTH_SCORE=$((HEALTH_SCORE - 10))
            ISSUES+=("High open circuit breaker rate: ${OPEN_RATE}%")
        fi
    fi
fi

# Display health score
if [ "$HEALTH_SCORE" -ge 90 ]; then
    print_success "Health Score: ${HEALTH_SCORE}/100 (Excellent)"
elif [ "$HEALTH_SCORE" -ge 75 ]; then
    print_warning "Health Score: ${HEALTH_SCORE}/100 (Good)"
elif [ "$HEALTH_SCORE" -ge 60 ]; then
    print_warning "Health Score: ${HEALTH_SCORE}/100 (Fair)"
else
    print_error "Health Score: ${HEALTH_SCORE}/100 (Poor)"
fi

if [ "${#ISSUES[@]}" -gt 0 ]; then
    echo ""
    echo "Issues detected:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
fi

echo ""

# 2. Sync Performance
print_info "=== Sync Performance ($TIME_RANGE) ==="

echo "Total syncs: $TOTAL_SYNCS"
echo "Successful syncs: $SUCCESSFUL_SYNCS"
echo "Failed syncs: $(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'failure' AND created_at > NOW() - INTERVAL '$INTERVAL';")"
echo "Skipped syncs: $(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'skipped' AND created_at > NOW() - INTERVAL '$INTERVAL';")"

if [ "$EXECUTED_SYNCS" -gt 0 ]; then
    echo "Success rate: ${SYNC_SUCCESS_RATE}%"
    
    if (( $(echo "$SYNC_SUCCESS_RATE >= 90" | bc -l) )); then
        print_success "Sync success rate meets target"
    else
        print_warning "Sync success rate below target: ${SYNC_SUCCESS_RATE}% (target: >90%)"
    fi
fi

# Average sync duration
AVG_DURATION=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COALESCE(AVG(duration_ms), 0)::INTEGER FROM sync_metrics WHERE result = 'success' AND created_at > NOW() - INTERVAL '$INTERVAL';" | tr -d ' ')
echo "Average sync duration: ${AVG_DURATION}ms"

echo ""

# 3. API Usage Reduction
print_info "=== API Usage Reduction ($TIME_RANGE) ==="

SKIPPED_SYNCS=$(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'skipped' AND created_at > NOW() - INTERVAL '$INTERVAL';")
if [ "$TOTAL_SYNCS" -gt 0 ]; then
    SKIP_RATE=$(calc_percentage "$SKIPPED_SYNCS" "$TOTAL_SYNCS")
    echo "API calls saved: ${SKIP_RATE}%"
    
    if (( $(echo "$SKIP_RATE >= 70" | bc -l) )); then
        print_success "API usage reduction meets target (70-85%)"
    else
        print_warning "API usage reduction: ${SKIP_RATE}% (target: 70-85%)"
    fi
fi

# Breakdown by optimization type
echo ""
echo "API calls saved by:"
echo "  Circuit breaker: $(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'skipped' AND skip_reason = 'circuit_breaker_open' AND created_at > NOW() - INTERVAL '$INTERVAL';")"
echo "  Invalid token: $(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'skipped' AND skip_reason = 'invalid_token' AND created_at > NOW() - INTERVAL '$INTERVAL';")"
echo "  Adaptive scheduling: $(run_query "SELECT COUNT(*) FROM sync_metrics WHERE result = 'skipped' AND skip_reason = 'not_due' AND created_at > NOW() - INTERVAL '$INTERVAL';")"

echo ""

# 4. Webhook Health
print_info "=== Webhook Health ==="

echo "Total active webhooks: $TOTAL_WEBHOOKS"

if [ "$TOTAL_WEBHOOKS" -gt 0 ]; then
    ACTIVE_WEBHOOKS=$(run_query "SELECT COUNT(DISTINCT user_id) FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '48 hours';")
    echo "Webhooks with recent activity: $ACTIVE_WEBHOOKS"
    
    SILENT_WEBHOOKS=$(run_query "SELECT COUNT(*) FROM calendar_webhook_subscriptions WHERE user_id NOT IN (SELECT DISTINCT user_id FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '48 hours');")
    echo "Silent webhooks (>48h): $SILENT_WEBHOOKS"
    
    if [ "$SILENT_WEBHOOKS" -eq 0 ]; then
        print_success "No silent webhooks"
    else
        SILENT_RATE=$(calc_percentage "$SILENT_WEBHOOKS" "$TOTAL_WEBHOOKS")
        if (( $(echo "$SILENT_RATE > 5" | bc -l) )); then
            print_warning "High silent webhook rate: ${SILENT_RATE}%"
        else
            print_info "Silent webhook rate: ${SILENT_RATE}%"
        fi
    fi
    
    # Webhook success rate
    TOTAL_NOTIFICATIONS=$(run_query "SELECT COUNT(*) FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '24 hours';")
    if [ "$TOTAL_NOTIFICATIONS" -gt 0 ]; then
        SUCCESSFUL_NOTIFICATIONS=$(run_query "SELECT COUNT(*) FROM webhook_notifications WHERE created_at > NOW() - INTERVAL '24 hours' AND result = 'success';")
        WEBHOOK_SUCCESS_RATE=$(calc_percentage "$SUCCESSFUL_NOTIFICATIONS" "$TOTAL_NOTIFICATIONS")
        echo "Webhook success rate (24h): ${WEBHOOK_SUCCESS_RATE}%"
        
        if (( $(echo "$WEBHOOK_SUCCESS_RATE >= 95" | bc -l) )); then
            print_success "Webhook success rate meets target"
        else
            print_warning "Webhook success rate: ${WEBHOOK_SUCCESS_RATE}% (target: >95%)"
        fi
    fi
fi

echo ""

# 5. Onboarding Performance
print_info "=== Onboarding Performance ($TIME_RANGE) ==="

NEW_USERS=$(run_query "SELECT COUNT(DISTINCT user_id) FROM sync_schedule WHERE created_at > NOW() - INTERVAL '$INTERVAL';")
echo "New users: $NEW_USERS"

if [ "$NEW_USERS" -gt 0 ]; then
    SUCCESSFUL_ONBOARDING=$(run_query "SELECT COUNT(DISTINCT user_id) FROM sync_metrics WHERE sync_type = 'initial' AND result = 'success' AND created_at > NOW() - INTERVAL '$INTERVAL';")
    ONBOARDING_RATE=$(calc_percentage "$SUCCESSFUL_ONBOARDING" "$NEW_USERS")
    echo "Successful onboarding: $SUCCESSFUL_ONBOARDING"
    echo "Onboarding success rate: ${ONBOARDING_RATE}%"
    
    if (( $(echo "$ONBOARDING_RATE >= 95" | bc -l) )); then
        print_success "Onboarding success rate meets target"
    else
        print_warning "Onboarding success rate: ${ONBOARDING_RATE}% (target: >95%)"
    fi
fi

echo ""

# 6. Token Health
print_info "=== Token Health ==="

echo "Total tokens: $TOTAL_TOKENS"

if [ "$TOTAL_TOKENS" -gt 0 ]; then
    echo "Valid tokens: $(run_query "SELECT COUNT(*) FROM token_health WHERE status = 'valid';")"
    echo "Expiring soon: $(run_query "SELECT COUNT(*) FROM token_health WHERE status = 'expiring_soon';")"
    echo "Expired: $(run_query "SELECT COUNT(*) FROM token_health WHERE status = 'expired';")"
    echo "Revoked: $(run_query "SELECT COUNT(*) FROM token_health WHERE status = 'revoked';")"
    
    if [ "$INVALID_TOKENS" -eq 0 ]; then
        print_success "No invalid tokens"
    else
        INVALID_RATE=$(calc_percentage "$INVALID_TOKENS" "$TOTAL_TOKENS")
        if (( $(echo "$INVALID_RATE > 10" | bc -l) )); then
            print_warning "High invalid token rate: ${INVALID_RATE}%"
        else
            print_info "Invalid token rate: ${INVALID_RATE}%"
        fi
    fi
fi

echo ""

# 7. Circuit Breaker Status
print_info "=== Circuit Breaker Status ==="

echo "Total circuit breakers: $TOTAL_CIRCUIT_BREAKERS"

if [ "$TOTAL_CIRCUIT_BREAKERS" -gt 0 ]; then
    echo "Closed: $(run_query "SELECT COUNT(*) FROM circuit_breaker_state WHERE state = 'closed';")"
    echo "Open: $OPEN_CIRCUIT_BREAKERS"
    echo "Half-open: $(run_query "SELECT COUNT(*) FROM circuit_breaker_state WHERE state = 'half_open';")"
    
    if [ "$OPEN_CIRCUIT_BREAKERS" -eq 0 ]; then
        print_success "No open circuit breakers"
    else
        OPEN_RATE=$(calc_percentage "$OPEN_CIRCUIT_BREAKERS" "$TOTAL_CIRCUIT_BREAKERS")
        if (( $(echo "$OPEN_RATE > 5" | bc -l) )); then
            print_warning "High open circuit breaker rate: ${OPEN_RATE}%"
        else
            print_info "Open circuit breaker rate: ${OPEN_RATE}%"
        fi
    fi
fi

echo ""

# 8. Top Errors
print_info "=== Top Errors ($TIME_RANGE) ==="

echo "Most common errors:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT error_message, COUNT(*) as count FROM sync_metrics WHERE error_message IS NOT NULL AND created_at > NOW() - INTERVAL '$INTERVAL' GROUP BY error_message ORDER BY count DESC LIMIT 5;"

echo ""

# 9. Recommendations
print_info "=== Recommendations ==="

if [ "${#ISSUES[@]}" -eq 0 ]; then
    print_success "System is healthy - No action required"
else
    echo "Action items:"
    
    # Check for high failure rate
    if [ "$EXECUTED_SYNCS" -gt 0 ] && (( $(echo "$SYNC_SUCCESS_RATE < 90" | bc -l) )); then
        echo "  1. Investigate sync failures - check error logs"
        echo "     Run: psql -c \"SELECT error_message, COUNT(*) FROM sync_metrics WHERE result = 'failure' GROUP BY error_message;\""
    fi
    
    # Check for silent webhooks
    if [ "$TOTAL_WEBHOOKS" -gt 0 ] && [ "$SILENT_WEBHOOKS" -gt 0 ]; then
        SILENT_RATE=$(calc_percentage "$SILENT_WEBHOOKS" "$TOTAL_WEBHOOKS")
        if (( $(echo "$SILENT_RATE > 5" | bc -l) )); then
            echo "  2. Re-register silent webhooks"
            echo "     The webhook health check job should handle this automatically"
        fi
    fi
    
    # Check for invalid tokens
    if [ "$TOTAL_TOKENS" -gt 0 ] && [ "$INVALID_TOKENS" -gt 0 ]; then
        INVALID_RATE=$(calc_percentage "$INVALID_TOKENS" "$TOTAL_TOKENS")
        if (( $(echo "$INVALID_RATE > 10" | bc -l) )); then
            echo "  3. Send notifications to users with invalid tokens"
            echo "     Check token_health_notifications table"
        fi
    fi
    
    # Check for open circuit breakers
    if [ "$TOTAL_CIRCUIT_BREAKERS" -gt 0 ] && [ "$OPEN_CIRCUIT_BREAKERS" -gt 0 ]; then
        OPEN_RATE=$(calc_percentage "$OPEN_CIRCUIT_BREAKERS" "$TOTAL_CIRCUIT_BREAKERS")
        if (( $(echo "$OPEN_RATE > 5" | bc -l) )); then
            echo "  4. Investigate open circuit breakers"
            echo "     Run: psql -c \"SELECT user_id, integration_type, last_failure_reason FROM circuit_breaker_state WHERE state = 'open';\""
        fi
    fi
fi

echo ""
echo "=========================================="
echo "End of Monitoring Report"
echo "=========================================="
echo ""
echo "To run this report for different time ranges:"
echo "  24 hours: ./monitor-production.sh 24h"
echo "  7 days:   ./monitor-production.sh 7d"
echo "  14 days:  ./monitor-production.sh 14d"
echo ""
