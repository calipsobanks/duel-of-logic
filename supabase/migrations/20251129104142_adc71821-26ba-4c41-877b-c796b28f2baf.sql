-- Add context fields to analytics_events table
ALTER TABLE analytics_events 
ADD COLUMN discussion_id uuid,
ADD COLUMN duration_seconds integer;

-- Add index for discussion_id lookups
CREATE INDEX idx_analytics_discussion_id ON analytics_events(discussion_id);

-- Add comments for documentation
COMMENT ON COLUMN analytics_events.discussion_id IS 'The discussion being viewed when the event occurred';
COMMENT ON COLUMN analytics_events.duration_seconds IS 'Time spent on page/section in seconds (capped at 900 seconds / 15 minutes)';