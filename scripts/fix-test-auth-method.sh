#!/bin/bash

# Script to add auth_method to all test user insertions
# This fixes the check_auth_method constraint violations

echo "Fixing test files to include auth_method..."

# List of files that need fixing
files=(
  "src/api/routes/manual-sync.test.ts"
  "src/api/routes/admin-sync-health.test.ts"
  "src/api/middleware/admin.test.ts"
  "src/scripts/promote-admin.test.ts"
  "src/jobs/processors/webhook-health-check-processor.test.ts"
  "src/integrations/webhook-metrics-service.test.ts"
  "src/integrations/token-health-monitor.test.ts"
  "src/integrations/adaptive-sync-scheduler.test.ts"
  "src/integrations/sync-orchestrator.test.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Add auth_method to INSERT statements that don't have it
    # Pattern 1: (id, email, name, google_id, created_at
    sed -i.bak 's/(id, email, name, google_id, created_at/(id, email, name, google_id, auth_method, created_at/g' "$file"
    
    # Pattern 2: (id, email, name, is_admin, google_id, created_at
    sed -i.bak 's/(id, email, name, is_admin, google_id, created_at/(id, email, name, is_admin, google_id, auth_method, created_at/g' "$file"
    
    # Pattern 3: (id, email, name, created_at (no google_id)
    sed -i.bak 's/(id, email, name, created_at/(id, email, name, auth_method, created_at/g' "$file"
    
    # Add 'google' value in VALUES clause
    # This is trickier - need to add after google_id value or after name if no google_id
    
    rm -f "$file.bak"
    echo "  ✓ Fixed $file"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo ""
echo "Done! Please review the changes and manually add 'google' values in VALUES clauses."
echo "Run: git diff to see changes"
