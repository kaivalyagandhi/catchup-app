-- Verification script for contact onboarding schema
-- This script verifies that all tables, columns, indexes, and constraints are properly created

\echo '=== Verifying Contact Onboarding Schema ==='
\echo ''

-- Check contacts table has new columns
\echo 'Checking contacts table columns...'
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
    AND column_name IN ('dunbar_circle', 'circle_assigned_at', 'circle_confidence', 'ai_suggested_circle')
ORDER BY column_name;

\echo ''
\echo 'Checking onboarding tables exist...'
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'onboarding_state',
        'circle_assignments',
        'ai_circle_overrides',
        'weekly_catchup_sessions',
        'onboarding_achievements',
        'network_health_scores'
    )
ORDER BY table_name;

\echo ''
\echo 'Checking indexes...'
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN (
    'onboarding_state',
    'circle_assignments',
    'ai_circle_overrides',
    'weekly_catchup_sessions',
    'onboarding_achievements',
    'network_health_scores'
)
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo 'Checking foreign key constraints...'
SELECT
    tc.table_name,
    COUNT(*) as fk_count
FROM information_schema.table_constraints AS tc
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN (
        'onboarding_state',
        'circle_assignments',
        'ai_circle_overrides',
        'weekly_catchup_sessions',
        'onboarding_achievements',
        'network_health_scores'
    )
GROUP BY tc.table_name
ORDER BY tc.table_name;

\echo ''
\echo 'Checking check constraints...'
SELECT
    tc.table_name,
    COUNT(*) as check_count
FROM information_schema.table_constraints AS tc
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_name IN (
        'contacts',
        'onboarding_state',
        'circle_assignments',
        'ai_circle_overrides',
        'weekly_catchup_sessions',
        'onboarding_achievements',
        'network_health_scores'
    )
GROUP BY tc.table_name
ORDER BY tc.table_name;

\echo ''
\echo '=== Verification Complete ==='
