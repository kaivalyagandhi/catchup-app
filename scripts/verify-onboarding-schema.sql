-- Verification script for contact onboarding schema
-- This script verifies that all required tables, columns, and constraints exist

\echo '=== Verifying Contact Onboarding Schema ==='
\echo ''

-- Check onboarding_state table exists
\echo 'Checking onboarding_state table...'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_state')
        THEN '✓ onboarding_state table exists'
        ELSE '✗ onboarding_state table missing'
    END AS status;

-- Check onboarding_state columns
\echo ''
\echo 'Checking onboarding_state columns...'
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'onboarding_state'
ORDER BY ordinal_position;

-- Check group_mapping_suggestions table exists
\echo ''
\echo 'Checking group_mapping_suggestions table...'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_mapping_suggestions')
        THEN '✓ group_mapping_suggestions table exists'
        ELSE '✗ group_mapping_suggestions table missing'
    END AS status;

-- Check group_mapping_suggestions columns
\echo ''
\echo 'Checking group_mapping_suggestions columns...'
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'group_mapping_suggestions'
ORDER BY ordinal_position;

-- Check contacts table circle columns
\echo ''
\echo 'Checking contacts table circle-related columns...'
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'contacts'
AND column_name IN ('dunbar_circle', 'circle', 'circle_assigned_by', 'circle_assigned_at', 'circle_confidence', 'ai_suggested_circle')
ORDER BY column_name;

-- Check circle constraints (should only allow 4 circles)
\echo ''
\echo 'Checking circle constraints...'
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'contacts'::regclass
AND conname LIKE '%circle%';

-- Check indexes
\echo ''
\echo 'Checking onboarding-related indexes...'
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('onboarding_state', 'group_mapping_suggestions', 'contacts')
AND (indexname LIKE '%onboarding%' OR indexname LIKE '%circle%' OR indexname LIKE '%mapping%')
ORDER BY tablename, indexname;

-- Test inserting sample data
\echo ''
\echo 'Testing sample data insertion...'

-- Create a test user if not exists
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Check if test user exists
    SELECT id INTO test_user_id FROM users WHERE email = 'test_onboarding@example.com';
    
    IF test_user_id IS NULL THEN
        INSERT INTO users (email, name, password_hash) 
        VALUES ('test_onboarding@example.com', 'Test Onboarding User', 'test_hash')
        RETURNING id INTO test_user_id;
        RAISE NOTICE 'Created test user: %', test_user_id;
    ELSE
        RAISE NOTICE 'Using existing test user: %', test_user_id;
    END IF;
    
    -- Test onboarding_state insertion
    INSERT INTO onboarding_state (user_id, current_step, integrations_complete)
    VALUES (test_user_id, 1, false)
    ON CONFLICT (user_id) DO UPDATE 
    SET current_step = 1, integrations_complete = false;
    
    RAISE NOTICE '✓ Successfully inserted/updated onboarding_state';
    
    -- Test group_mapping_suggestions insertion
    INSERT INTO group_mapping_suggestions (
        user_id, 
        google_group_id, 
        google_group_name, 
        member_count, 
        confidence
    )
    VALUES (
        test_user_id,
        'test_google_group_123',
        'Test Google Group',
        10,
        85
    )
    ON CONFLICT (user_id, google_group_id) DO UPDATE
    SET member_count = 10, confidence = 85;
    
    RAISE NOTICE '✓ Successfully inserted/updated group_mapping_suggestions';
    
    -- Test contact with circle assignment
    INSERT INTO contacts (
        user_id,
        name,
        dunbar_circle,
        circle_assigned_by
    )
    VALUES (
        test_user_id,
        'Test Contact',
        'inner',
        'user'
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✓ Successfully inserted contact with circle assignment';
    
    -- Test that invalid circle values are rejected
    BEGIN
        INSERT INTO contacts (user_id, name, dunbar_circle)
        VALUES (test_user_id, 'Invalid Circle Test', 'acquaintance');
        RAISE NOTICE '✗ ERROR: Should have rejected "acquaintance" circle value';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ Correctly rejected invalid circle value "acquaintance"';
    END;
    
END $$;

\echo ''
\echo '=== Schema Verification Complete ==='
