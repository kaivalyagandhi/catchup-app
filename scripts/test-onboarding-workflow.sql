-- Test script demonstrating a complete onboarding workflow
-- This script simulates a user going through the onboarding process

\echo '=== Testing Contact Onboarding Workflow ==='
\echo ''

DO $$
DECLARE
    test_user_id UUID;
    contact1_id UUID;
    contact2_id UUID;
    contact3_id UUID;
    session_id UUID;
BEGIN
    -- Step 1: Create a test user
    RAISE NOTICE 'Step 1: Creating test user...';
    INSERT INTO users (email, password_hash, name)
    VALUES ('onboarding_test@example.com', 'test_hash', 'Test User')
    RETURNING id INTO test_user_id;
    RAISE NOTICE 'Created user: %', test_user_id;
    
    -- Step 2: Initialize onboarding
    RAISE NOTICE 'Step 2: Initializing onboarding...';
    INSERT INTO onboarding_state (
        user_id,
        current_step,
        trigger_type,
        progress_data
    ) VALUES (
        test_user_id,
        'welcome',
        'new_user',
        '{"categorizedCount": 0, "totalCount": 0}'::jsonb
    );
    RAISE NOTICE 'Onboarding initialized';
    
    -- Step 3: Import contacts
    RAISE NOTICE 'Step 3: Importing contacts...';
    INSERT INTO contacts (user_id, name, email)
    VALUES (test_user_id, 'Alice Johnson', 'alice@example.com')
    RETURNING id INTO contact1_id;
    
    INSERT INTO contacts (user_id, name, email)
    VALUES (test_user_id, 'Bob Smith', 'bob@example.com')
    RETURNING id INTO contact2_id;
    
    INSERT INTO contacts (user_id, name, email)
    VALUES (test_user_id, 'Carol Davis', 'carol@example.com')
    RETURNING id INTO contact3_id;
    
    RAISE NOTICE 'Imported 3 contacts';
    
    -- Step 4: AI suggests circles
    RAISE NOTICE 'Step 4: AI suggesting circles...';
    UPDATE contacts 
    SET 
        ai_suggested_circle = 'close',
        circle_confidence = 0.85
    WHERE id = contact1_id;
    
    UPDATE contacts 
    SET 
        ai_suggested_circle = 'active',
        circle_confidence = 0.72
    WHERE id = contact2_id;
    
    UPDATE contacts 
    SET 
        ai_suggested_circle = 'casual',
        circle_confidence = 0.65
    WHERE id = contact3_id;
    RAISE NOTICE 'AI suggestions generated';
    
    -- Step 5: User accepts first suggestion
    RAISE NOTICE 'Step 5: User accepting AI suggestion for contact 1...';
    UPDATE contacts
    SET 
        dunbar_circle = ai_suggested_circle,
        circle_assigned_at = NOW()
    WHERE id = contact1_id;
    
    INSERT INTO circle_assignments (
        user_id,
        contact_id,
        to_circle,
        assigned_by,
        confidence,
        reason
    ) VALUES (
        test_user_id,
        contact1_id,
        'close',
        'ai',
        0.85,
        'Accepted AI suggestion'
    );
    RAISE NOTICE 'Contact 1 assigned to close circle';
    
    -- Step 6: User overrides second suggestion
    RAISE NOTICE 'Step 6: User overriding AI suggestion for contact 2...';
    UPDATE contacts
    SET 
        dunbar_circle = 'close',
        circle_assigned_at = NOW()
    WHERE id = contact2_id;
    
    INSERT INTO circle_assignments (
        user_id,
        contact_id,
        from_circle,
        to_circle,
        assigned_by,
        confidence,
        reason
    ) VALUES (
        test_user_id,
        contact2_id,
        'active',
        'close',
        'user',
        NULL,
        'User override - closer friend than AI suggested'
    );
    
    INSERT INTO ai_circle_overrides (
        user_id,
        contact_id,
        suggested_circle,
        actual_circle,
        factors
    ) VALUES (
        test_user_id,
        contact2_id,
        'active',
        'close',
        '{"communication_frequency": 0.8, "recency": 0.9}'::jsonb
    );
    RAISE NOTICE 'Contact 2 assigned to close circle (user override)';
    
    -- Step 7: Update onboarding progress
    RAISE NOTICE 'Step 7: Updating onboarding progress...';
    UPDATE onboarding_state
    SET 
        current_step = 'circle_assignment',
        completed_steps = '["welcome", "import_contacts"]'::jsonb,
        progress_data = '{"categorizedCount": 2, "totalCount": 3}'::jsonb
    WHERE user_id = test_user_id;
    RAISE NOTICE 'Onboarding progress updated';
    
    -- Step 8: Award achievement
    RAISE NOTICE 'Step 8: Awarding achievement...';
    INSERT INTO onboarding_achievements (
        user_id,
        achievement_type,
        achievement_data
    ) VALUES (
        test_user_id,
        'first_contact_categorized',
        '{"contact_name": "Alice Johnson"}'::jsonb
    );
    RAISE NOTICE 'Achievement awarded: first_contact_categorized';
    
    -- Step 9: Calculate network health
    RAISE NOTICE 'Step 9: Calculating network health...';
    INSERT INTO network_health_scores (
        user_id,
        score,
        circle_balance_score,
        engagement_score,
        maintenance_score
    ) VALUES (
        test_user_id,
        75,
        80,
        70,
        75
    );
    RAISE NOTICE 'Network health score calculated: 75';
    
    -- Step 10: Create weekly catchup session
    RAISE NOTICE 'Step 10: Creating weekly catchup session...';
    INSERT INTO weekly_catchup_sessions (
        user_id,
        week_number,
        year,
        contacts_to_review
    ) VALUES (
        test_user_id,
        48,
        2025,
        jsonb_build_array(contact3_id)
    ) RETURNING id INTO session_id;
    RAISE NOTICE 'Weekly catchup session created: %', session_id;
    
    -- Display summary
    RAISE NOTICE '';
    RAISE NOTICE '=== Workflow Summary ===';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Contacts imported: 3';
    RAISE NOTICE 'Contacts categorized: 2';
    RAISE NOTICE 'AI suggestions accepted: 1';
    RAISE NOTICE 'AI suggestions overridden: 1';
    RAISE NOTICE 'Achievements earned: 1';
    RAISE NOTICE 'Network health score: 75';
    
    -- Verify data
    RAISE NOTICE '';
    RAISE NOTICE '=== Verifying Data ===';
    
    -- Check onboarding state
    IF EXISTS (
        SELECT 1 FROM onboarding_state 
        WHERE user_id = test_user_id 
        AND current_step = 'circle_assignment'
    ) THEN
        RAISE NOTICE '✓ Onboarding state correct';
    ELSE
        RAISE EXCEPTION '✗ Onboarding state incorrect';
    END IF;
    
    -- Check circle assignments
    IF (SELECT COUNT(*) FROM circle_assignments WHERE user_id = test_user_id) = 2 THEN
        RAISE NOTICE '✓ Circle assignments recorded';
    ELSE
        RAISE EXCEPTION '✗ Circle assignments incorrect';
    END IF;
    
    -- Check AI overrides
    IF EXISTS (
        SELECT 1 FROM ai_circle_overrides 
        WHERE user_id = test_user_id 
        AND suggested_circle = 'active' 
        AND actual_circle = 'close'
    ) THEN
        RAISE NOTICE '✓ AI override recorded';
    ELSE
        RAISE EXCEPTION '✗ AI override not recorded';
    END IF;
    
    -- Check achievements
    IF EXISTS (
        SELECT 1 FROM onboarding_achievements 
        WHERE user_id = test_user_id 
        AND achievement_type = 'first_contact_categorized'
    ) THEN
        RAISE NOTICE '✓ Achievement recorded';
    ELSE
        RAISE EXCEPTION '✗ Achievement not recorded';
    END IF;
    
    -- Check network health
    IF EXISTS (
        SELECT 1 FROM network_health_scores 
        WHERE user_id = test_user_id 
        AND score = 75
    ) THEN
        RAISE NOTICE '✓ Network health score recorded';
    ELSE
        RAISE EXCEPTION '✗ Network health score not recorded';
    END IF;
    
    -- Check weekly catchup
    IF EXISTS (
        SELECT 1 FROM weekly_catchup_sessions 
        WHERE user_id = test_user_id 
        AND week_number = 48 
        AND year = 2025
    ) THEN
        RAISE NOTICE '✓ Weekly catchup session created';
    ELSE
        RAISE EXCEPTION '✗ Weekly catchup session not created';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Cleanup ===';
    -- Clean up test data
    DELETE FROM users WHERE id = test_user_id;
    RAISE NOTICE 'Test data cleaned up (cascade delete removed all related records)';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== All Tests Passed! ===';
END $$;
