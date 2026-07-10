-- Preserve shipping history while allowing buyers to hide saved addresses.
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS ix_addresses_active ON user_addresses(buyer_id) WHERE deleted_at IS NULL;
-- A single outbox event may notify multiple participants. Inbox deduplicates per user and event.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_source_event_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_event_recipient ON notifications(source_event_id,user_id) WHERE source_event_id IS NOT NULL;
