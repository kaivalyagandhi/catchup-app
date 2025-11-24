-- Quick seed script to add test contacts
-- Replace YOUR_USER_ID with your actual user ID

-- Insert test contacts
INSERT INTO contacts (user_id, name, email, phone, location, timezone, frequency_preference, last_contact_date, custom_notes)
VALUES 
  ('0fd50ce5-c033-42b6-a7e1-182bba2469af', 'Alice Johnson', 'alice@example.com', '+1234567890', 'San Francisco', 'America/Los_Angeles', 'weekly', NOW() - INTERVAL '14 days', 'Test contact - overdue by 7 days'),
  ('0fd50ce5-c033-42b6-a7e1-182bba2469af', 'Bob Martinez', 'bob@example.com', NULL, 'New York City', 'America/New_York', 'monthly', NOW() - INTERVAL '45 days', 'Test contact - overdue by 15 days'),
  ('0fd50ce5-c033-42b6-a7e1-182bba2469af', 'Carol Chen', 'carol@example.com', '+1987654321', 'Los Angeles', 'America/Los_Angeles', 'weekly', NOW() - INTERVAL '20 days', 'Test contact - overdue by 13 days'),
  ('0fd50ce5-c033-42b6-a7e1-182bba2469af', 'David Kim', 'david@example.com', NULL, 'Seattle', 'America/Los_Angeles', 'monthly', NOW() - INTERVAL '60 days', 'Test contact - VERY overdue by 30 days!'),
  ('0fd50ce5-c033-42b6-a7e1-182bba2469af', 'Emma Wilson', 'emma@example.com', NULL, 'San Francisco', 'America/Los_Angeles', 'weekly', NOW() - INTERVAL '10 days', 'Test contact - overdue by 3 days');

SELECT 'Test contacts created!' AS status;
