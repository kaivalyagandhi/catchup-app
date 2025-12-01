-- Verification script for SMS/MMS enrichment schema
-- Run this to verify migration 018 was applied correctly

\echo '=== Verifying user_phone_numbers table ==='
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_phone_numbers'
ORDER BY ordinal_position;

\echo ''
\echo '=== Verifying user_phone_numbers indexes ==='
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_phone_numbers'
ORDER BY indexname;

\echo ''
\echo '=== Verifying enrichment_items source columns ==='
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'enrichment_items'
    AND column_name IN ('source', 'source_metadata')
ORDER BY column_name;

\echo ''
\echo '=== Verifying enrichment_items source indexes ==='
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'enrichment_items'
    AND indexname LIKE '%source%'
ORDER BY indexname;

\echo ''
\echo '=== Verifying foreign key constraints ==='
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'user_phone_numbers';

\echo ''
\echo '=== Verification complete ==='

