-- Add new columns to evidence table for enhanced source rating
ALTER TABLE evidence 
ADD COLUMN source_confidence TEXT CHECK (source_confidence IN ('high', 'medium', 'low')),
ADD COLUMN content_analyzed BOOLEAN,
ADD COLUMN source_warning TEXT;