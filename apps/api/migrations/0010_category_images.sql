-- Migration 0010: Category custom images
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url text;
