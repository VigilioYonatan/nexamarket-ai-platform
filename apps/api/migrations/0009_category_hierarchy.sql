-- Category hierarchy and subcategories support
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon varchar(50);
CREATE INDEX IF NOT EXISTS ix_categories_parent ON categories(parent_id);
