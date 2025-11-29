-- Add topic column to analytics_events table
ALTER TABLE analytics_events 
ADD COLUMN topic text;

-- Add comment for documentation
COMMENT ON COLUMN analytics_events.topic IS 'The debate topic being viewed when the event occurred';