-- Add question field to controversial_topics table
ALTER TABLE controversial_topics 
ADD COLUMN IF NOT EXISTS question text;

-- Update existing records with question format based on title
UPDATE controversial_topics 
SET question = 
  CASE category
    WHEN 'Politics' THEN 'Should ' || lower(title) || '?'
    WHEN 'Religion' THEN 'How should we balance ' || lower(title) || '?'
    WHEN 'Finance' THEN 'Is ' || lower(title) || ' the right approach?'
    ELSE title || '?'
  END
WHERE question IS NULL;