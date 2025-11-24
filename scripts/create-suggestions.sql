-- Create test suggestions for the contacts we just added
-- This simulates what the suggestion generation algorithm would do

-- Get the contact IDs we just created
WITH test_contacts AS (
  SELECT id, name, frequency_preference, last_contact_date
  FROM contacts 
  WHERE user_id = '0fd50ce5-c033-42b6-a7e1-182bba2469af'
  AND name IN ('Alice Johnson', 'Bob Martinez', 'Carol Chen', 'David Kim', 'Emma Wilson')
)
INSERT INTO suggestions (
  user_id,
  contact_id,
  trigger_type,
  proposed_timeslot_start,
  proposed_timeslot_end,
  proposed_timeslot_timezone,
  reasoning,
  status
)
SELECT 
  '0fd50ce5-c033-42b6-a7e1-182bba2469af',
  id,
  'timebound',
  (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours')::timestamp,
  (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '16 hours')::timestamp,
  'America/Los_Angeles',
  CASE 
    WHEN name = 'David Kim' THEN 'It''s been 60 days since you last connected (monthly preference). High priority!'
    WHEN name = 'Bob Martinez' THEN 'It''s been 45 days since you last connected (monthly preference)'
    WHEN name = 'Carol Chen' THEN 'It''s been 20 days since you last connected (weekly preference)'
    WHEN name = 'Alice Johnson' THEN 'It''s been 14 days since you last connected (weekly preference)'
    ELSE 'It''s been 10 days since you last connected (weekly preference)'
  END,
  'pending'
FROM test_contacts
ORDER BY 
  CASE 
    WHEN name = 'David Kim' THEN 1
    WHEN name = 'Bob Martinez' THEN 2
    WHEN name = 'Carol Chen' THEN 3
    WHEN name = 'Alice Johnson' THEN 4
    ELSE 5
  END;

SELECT 'Suggestions created! Check the Suggestions tab in the UI.' AS status;
