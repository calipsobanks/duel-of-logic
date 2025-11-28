-- Drop trigger first, then function, then recreate both
DROP TRIGGER IF EXISTS evidence_timer_trigger ON evidence;
DROP FUNCTION IF EXISTS update_debate_timer();

-- Recreate function with correct search_path
CREATE OR REPLACE FUNCTION update_debate_timer()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE debates 
  SET timer_expires_at = now() + interval '24 hours'
  WHERE id = NEW.debate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER evidence_timer_trigger
AFTER INSERT ON evidence
FOR EACH ROW
EXECUTE FUNCTION update_debate_timer();