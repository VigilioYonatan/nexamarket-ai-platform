CREATE TABLE media_assets (
 id uuid PRIMARY KEY, owner_user_id uuid NOT NULL REFERENCES user_profiles(id),kind text NOT NULL CHECK(kind IN ('brand','products')),
 path text NOT NULL UNIQUE,mime_type text NOT NULL CHECK(mime_type='image/webp'),size_bytes integer NOT NULL CHECK(size_bytes>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_media_owner ON media_assets(owner_user_id,created_at DESC);
