-- Record the actual reason and operator of a return decision for appeal and audits.
-- Accepting a request NEVER initiates a PSP refund; financial fulfillment remains separate.
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS decision_reason text;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES user_profiles(id);
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS decided_at timestamptz;
ALTER TABLE return_requests ADD CONSTRAINT return_decision_reason_length CHECK (decision_reason IS NULL OR length(decision_reason) BETWEEN 10 AND 1000);
CREATE INDEX IF NOT EXISTS ix_returns_decided_by ON return_requests(decided_by,decided_at DESC) WHERE decided_by IS NOT NULL;
