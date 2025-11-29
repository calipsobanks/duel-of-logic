-- Enable RLS on analytics_events table if not already enabled
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own analytics events
CREATE POLICY "Users can view their own analytics events"
ON analytics_events
FOR SELECT
USING (auth.uid() = user_id);

-- Allow the admin user (edwardhill91@gmail.com) to view all analytics events
CREATE POLICY "Admin can view all analytics events"
ON analytics_events
FOR SELECT
USING (
  auth.uid() = '0ef6ab0e-153e-4d4b-b101-57295dcc467b'
);