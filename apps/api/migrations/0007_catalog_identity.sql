-- Seller-neutral canonical product identity: a GTIN identifies a product, not a seller listing.
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin varchar(14);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand varchar(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS model varchar(120);
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD CONSTRAINT products_gtin_valid CHECK(gtin IS NULL OR gtin ~ '^[0-9]{8}([0-9]{4}([0-9]{1}([0-9]{1})?)?)?$');
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_gtin ON products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_products_fts ON products USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));
CREATE TABLE IF NOT EXISTS product_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id),
 seller_id uuid NOT NULL REFERENCES sellers(id),
 attribute_key text NOT NULL CHECK(length(attribute_key) BETWEEN 2 AND 80),
 attribute_value text NOT NULL CHECK(length(attribute_value) BETWEEN 1 AND 500),
 source_type text NOT NULL CHECK(source_type IN ('SELLER_DECLARED','MANUFACTURER_DOCUMENT','GTIN_REGISTRY')),
 source_reference text NOT NULL CHECK(length(source_reference) BETWEEN 1 AND 400),
 status text NOT NULL DEFAULT 'UNVERIFIED' CHECK(status IN ('UNVERIFIED','VERIFIED','REJECTED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_product_evidence ON product_evidence(product_id,status,attribute_key);
