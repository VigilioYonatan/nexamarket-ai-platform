-- NexaMarket core schema. All prices in PEN minor units (integer cents); production requires migration review.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE user_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject text NOT NULL UNIQUE, email text,
 display_name text,role text NOT NULL DEFAULT 'BUYER' CHECK(role IN ('BUYER','STAFF','ADMIN')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
 session_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_sessions_user_expiry ON user_sessions(user_id,expires_at);
CREATE TABLE oauth_flows (state_hash text PRIMARY KEY,verifier text NOT NULL,nonce text NOT NULL,return_to text NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE user_addresses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),buyer_id uuid NOT NULL REFERENCES user_profiles(id),
 label text NOT NULL,recipient text NOT NULL,line1 text NOT NULL,city text NOT NULL,region text NOT NULL,
 postal_code text NOT NULL,phone text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_addresses_buyer ON user_addresses(buyer_id);
CREATE TABLE seller_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id),
 display_name text NOT NULL,legal_name text NOT NULL,tax_id text NOT NULL,
 status text NOT NULL DEFAULT 'APPLIED' CHECK(status IN ('APPLIED','REVIEWING','APPROVED','REJECTED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sellers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id),
 display_name text NOT NULL,status text NOT NULL DEFAULT 'APPROVED' CHECK(status IN ('APPROVED','SUSPENDED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE seller_mp_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seller_id uuid NOT NULL UNIQUE REFERENCES sellers(id),
 provider_user_id text NOT NULL UNIQUE,access_token_enc text NOT NULL,refresh_token_enc text NOT NULL,
 expires_at timestamptz NOT NULL,status text NOT NULL CHECK(status IN ('CONNECTED','DISCONNECTED','EXPIRED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE seller_oauth_flows (state_hash text PRIMARY KEY,seller_id uuid NOT NULL REFERENCES sellers(id),expires_at timestamptz NOT NULL);
CREATE TABLE categories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text NOT NULL UNIQUE,name text NOT NULL);
CREATE TABLE products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),category_id uuid NOT NULL REFERENCES categories(id),
 title text NOT NULL,description text NOT NULL,image_url text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_products_category ON products(category_id,id);
CREATE INDEX ix_products_title_trgm_compat ON products(title);
CREATE TABLE seller_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_id uuid NOT NULL REFERENCES sellers(id),
 product_id uuid NOT NULL REFERENCES products(id),price_minor integer NOT NULL CHECK(price_minor>0),
 currency char(3) NOT NULL DEFAULT 'PEN' CHECK(currency='PEN'),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','PAUSED','MODERATED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_listings_public ON seller_listings(status,created_at DESC) WHERE status='PUBLISHED';
CREATE INDEX ix_listings_seller ON seller_listings(seller_id,created_at DESC);
CREATE TABLE inventory_stock (
 listing_id uuid PRIMARY KEY REFERENCES seller_listings(id),on_hand integer NOT NULL DEFAULT 0,
 reserved integer NOT NULL DEFAULT 0,version integer NOT NULL DEFAULT 0,
 CONSTRAINT valid_stock CHECK(on_hand>=0 AND reserved>=0 AND on_hand>=reserved)
);
CREATE TABLE stock_movements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),listing_id uuid NOT NULL REFERENCES seller_listings(id),
 delta integer NOT NULL CHECK(delta<>0),reason text NOT NULL,actor_seller_id uuid REFERENCES sellers(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cart_lines(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),buyer_id uuid NOT NULL REFERENCES user_profiles(id),
 listing_id uuid NOT NULL REFERENCES seller_listings(id),quantity integer NOT NULL CHECK(quantity>0 AND quantity<=100),
 UNIQUE(buyer_id,listing_id)
);
CREATE INDEX ix_cart_buyer ON cart_lines(buyer_id);
CREATE TABLE favorites(buyer_id uuid NOT NULL REFERENCES user_profiles(id),listing_id uuid NOT NULL REFERENCES seller_listings(id),
 PRIMARY KEY(buyer_id,listing_id));
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),buyer_id uuid NOT NULL REFERENCES user_profiles(id),
 address_id uuid REFERENCES user_addresses(id),idempotency_key text NOT NULL,
 status text NOT NULL CHECK(status IN ('AWAITING_PAYMENT','PARTIALLY_PAID','PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED')),
 total_minor integer NOT NULL CHECK(total_minor>=0),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(buyer_id,idempotency_key)
);
CREATE INDEX ix_orders_buyer ON orders(buyer_id,created_at DESC);
CREATE TABLE checkout_sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
 buyer_id uuid NOT NULL REFERENCES user_profiles(id),expires_at timestamptz NOT NULL
);
CREATE TABLE seller_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),seller_id uuid NOT NULL REFERENCES sellers(id),
 subtotal_minor integer NOT NULL CHECK(subtotal_minor>=0),
 status text NOT NULL CHECK(status IN ('AWAITING_PAYMENT','PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED','REFUNDED')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(order_id,seller_id)
);
CREATE INDEX ix_seller_orders_seller ON seller_orders(seller_id,created_at DESC);
CREATE TABLE order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),
 seller_order_id uuid NOT NULL REFERENCES seller_orders(id),listing_id uuid NOT NULL REFERENCES seller_listings(id),
 title_snapshot text NOT NULL,quantity integer NOT NULL CHECK(quantity>0),price_minor integer NOT NULL CHECK(price_minor>0),currency char(3) NOT NULL DEFAULT 'PEN'
);
CREATE INDEX ix_lines_order ON order_lines(order_id);
CREATE TABLE stock_reservations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),
 listing_id uuid NOT NULL REFERENCES seller_listings(id),quantity integer NOT NULL CHECK(quantity>0),
 status text NOT NULL DEFAULT 'HELD' CHECK(status IN ('HELD','CONSUMED','EXPIRED','RELEASED')),
 expires_at timestamptz NOT NULL,UNIQUE(order_id,listing_id)
);
CREATE INDEX ix_reservations_held ON stock_reservations(expires_at) WHERE status='HELD';
CREATE TABLE payment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),
 seller_order_id uuid NOT NULL REFERENCES seller_orders(id),buyer_id uuid NOT NULL REFERENCES user_profiles(id),
 seller_id uuid NOT NULL REFERENCES sellers(id),amount_minor integer NOT NULL CHECK(amount_minor>=0),
 idempotency_key text NOT NULL,provider_payment_id text UNIQUE,
 status text NOT NULL CHECK(status IN ('CREATED','SUBMITTED','PENDING','APPROVED','REJECTED','EXPIRED','REFUNDED')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(buyer_id,idempotency_key)
);
CREATE INDEX ix_attempts_seller_order ON payment_attempts(seller_order_id);
CREATE TABLE psp_webhook_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_key text NOT NULL UNIQUE,provider_payment_id text NOT NULL,
 provider_user_id text,attempts integer NOT NULL DEFAULT 0,processed_at timestamptz,last_error_code text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ledger_journals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),source_type text NOT NULL,source_id uuid NOT NULL,
 currency char(3) NOT NULL DEFAULT 'PEN',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(source_type,source_id)
);
CREATE TABLE ledger_postings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_id uuid NOT NULL REFERENCES ledger_journals(id),
 account text NOT NULL,amount_minor integer NOT NULL,currency char(3) NOT NULL DEFAULT 'PEN',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ledger_postings_journal ON ledger_postings(journal_id);
-- Deferred journal balancing: a complete transaction must write every posting before COMMIT.
CREATE FUNCTION check_journal_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE j uuid;total bigint;
BEGIN
  j:=COALESCE(NEW.journal_id,OLD.journal_id);
  SELECT COALESCE(sum(amount_minor),0) INTO total FROM ledger_postings WHERE journal_id=j;
  IF total<>0 THEN RAISE EXCEPTION 'Unbalanced journal %',j USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ledger_balance_check AFTER INSERT OR UPDATE OR DELETE ON ledger_postings
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
CREATE TABLE shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_order_id uuid NOT NULL UNIQUE REFERENCES seller_orders(id),
 tracking_number text NOT NULL,status text NOT NULL DEFAULT 'CREATED',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE return_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),buyer_id uuid NOT NULL REFERENCES user_profiles(id),
 reason text NOT NULL,status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','UNDER_REVIEW','ACCEPTED','REJECTED','REFUNDED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),buyer_id uuid NOT NULL REFERENCES user_profiles(id),
 listing_id uuid NOT NULL REFERENCES seller_listings(id),rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),comment text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(order_id,buyer_id)
);
CREATE TABLE notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES user_profiles(id),type text NOT NULL,
 subject text NOT NULL,source_event_id uuid UNIQUE,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE global_settings_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),version integer NOT NULL UNIQUE,status text NOT NULL CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')),
 tokens jsonb NOT NULL,created_by uuid REFERENCES user_profiles(id),created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz
);
CREATE UNIQUE INDEX ux_one_published_theme ON global_settings_versions(status) WHERE status='PUBLISHED';
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_user_id uuid REFERENCES user_profiles(id),
 action text NOT NULL,resource_id uuid,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_events_time ON audit_events(created_at DESC);
CREATE TABLE outbox_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_type text NOT NULL,aggregate_id uuid NOT NULL,
 payload jsonb NOT NULL,processed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_outbox_unprocessed ON outbox_events(created_at) WHERE processed_at IS NULL;
