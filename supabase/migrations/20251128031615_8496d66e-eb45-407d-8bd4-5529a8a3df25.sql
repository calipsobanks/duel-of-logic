-- Add timer_expires_at column to debates table
ALTER TABLE debates ADD COLUMN timer_expires_at timestamp with time zone;

-- Create function to update timer to 24 hours from now
CREATE OR REPLACE FUNCTION update_debate_timer()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE debates 
  SET timer_expires_at = now() + interval '24 hours'
  WHERE id = NEW.debate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update timer when evidence is added
CREATE TRIGGER evidence_timer_trigger
AFTER INSERT ON evidence
FOR EACH ROW
EXECUTE FUNCTION update_debate_timer();