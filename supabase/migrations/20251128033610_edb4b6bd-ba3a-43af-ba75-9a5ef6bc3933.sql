-- Add rating columns to evidence table
ALTER TABLE evidence 
ADD COLUMN source_rating integer CHECK (source_rating >= 1 AND source_rating <= 5),
ADD COLUMN source_reasoning text;