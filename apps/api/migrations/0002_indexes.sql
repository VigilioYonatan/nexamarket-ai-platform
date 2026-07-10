-- Practical search baseline. OpenSearch/vector ANN requires benchmark and ADR.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ix_products_title_trgm ON products USING gin (title gin_trgm_ops);
CREATE INDEX ix_products_description_trgm ON products USING gin (description gin_trgm_ops);
CREATE INDEX ix_payment_attempts_status ON payment_attempts(status,updated_at);
