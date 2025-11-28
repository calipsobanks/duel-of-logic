-- Add new columns for claim evaluation and corrections
ALTER TABLE evidence
ADD COLUMN claim_evaluation TEXT CHECK (claim_evaluation IN ('factual', 'plausible', 'misleading', 'wrong')),
ADD COLUMN suggested_correction TEXT,
ADD COLUMN quote_example TEXT;