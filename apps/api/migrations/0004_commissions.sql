-- Marketplace commission is captured at checkout; existing orders retain their snapshot.
CREATE TABLE platform_commission_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version integer NOT NULL UNIQUE,
 commission_bps integer NOT NULL CHECK (commission_bps BETWEEN 0 AND 3000),
 status text NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
 created_by uuid REFERENCES user_profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz
);
CREATE UNIQUE INDEX ux_one_published_commission ON platform_commission_versions(status) WHERE status='PUBLISHED';
ALTER TABLE seller_orders ADD COLUMN application_fee_minor integer NOT NULL DEFAULT 0 CHECK(application_fee_minor>=0 AND application_fee_minor<=subtotal_minor);
