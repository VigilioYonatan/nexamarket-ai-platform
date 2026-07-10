-- NexaMarket 0005: trust, post-sale support and operational controls.
-- Backwards-compatible: existing reviews are preserved; one review per purchased listing.
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_order_id_buyer_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_purchase_listing ON reviews(order_id,buyer_id,listing_id);
ALTER TABLE reviews ADD CONSTRAINT reviews_status_check CHECK(status IN ('PENDING','APPROVED','REJECTED'));
CREATE INDEX IF NOT EXISTS ix_reviews_public ON reviews(listing_id,created_at DESC) WHERE status='APPROVED';

ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS seller_order_id uuid REFERENCES seller_orders(id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_return_by_seller_order
  ON return_requests(buyer_id,seller_order_id) WHERE seller_order_id IS NOT NULL AND status IN ('OPEN','UNDER_REVIEW','ACCEPTED');

CREATE TABLE support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 requester_id uuid NOT NULL REFERENCES user_profiles(id),
 order_id uuid REFERENCES orders(id),
 category text NOT NULL CHECK(category IN ('ORDER','PAYMENT','RETURN','ACCOUNT','OTHER')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 5 AND 150),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','WAITING_CUSTOMER','WAITING_SUPPORT','CLOSED')),
 priority text NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL','HIGH')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ticket_requester ON support_tickets(requester_id,created_at DESC);
CREATE INDEX ix_ticket_queue ON support_tickets(status,created_at DESC);
CREATE TABLE support_ticket_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES support_tickets(id),
 author_id uuid NOT NULL REFERENCES user_profiles(id),
 content text NOT NULL CHECK(length(content) BETWEEN 2 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ticket_messages ON support_ticket_messages(ticket_id,created_at,id);

CREATE TABLE feature_flags (
 name text PRIMARY KEY CHECK(name IN ('reviews','support','ai_shopping','public_promotions')),
 enabled boolean NOT NULL,
 updated_by uuid REFERENCES user_profiles(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO feature_flags(name,enabled) VALUES
  ('reviews',true),('support',true),('ai_shopping',false),('public_promotions',false)
ON CONFLICT(name) DO NOTHING;

CREATE TABLE trust_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subject_type text NOT NULL CHECK(subject_type IN ('SELLER','LISTING','REVIEW','ORDER','APPLICATION')),
 subject_id uuid NOT NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 2000),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED')),
 opened_by uuid NOT NULL REFERENCES user_profiles(id),
 resolved_by uuid REFERENCES user_profiles(id),
 resolution text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_trust_cases_queue ON trust_cases(status,created_at DESC);
