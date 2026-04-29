/** Query schema for typed Drizzle reads; SQL migrations are authoritative DDL. */
import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
export const profiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  subject: text("subject").notNull(),
  email: text("email"),
  display_name: text("display_name"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
});
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  parent_id: uuid("parent_id"),
  icon: text("icon"),
});
export const products = pgTable("products", {
  id: uuid("id").primaryKey(),
  category_id: uuid("category_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image_url: text("image_url"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
});
export const sellers = pgTable("sellers", {
  id: uuid("id").primaryKey(),
  owner_user_id: uuid("owner_user_id").notNull(),
  display_name: text("display_name").notNull(),
  status: text("status").notNull(),
});
export const listings = pgTable("seller_listings", {
  id: uuid("id").primaryKey(),
  seller_id: uuid("seller_id").notNull(),
  product_id: uuid("product_id").notNull(),
  price_minor: integer("price_minor").notNull(),
  status: text("status").notNull(),
});
export const inventory = pgTable("inventory_stock", {
  listing_id: uuid("listing_id").primaryKey(),
  on_hand: integer("on_hand").notNull(),
  reserved: integer("reserved").notNull(),
  version: integer("version").notNull(),
});
export const cartLines = pgTable(
  "cart_lines",
  {
    id: uuid("id").primaryKey(),
    buyer_id: uuid("buyer_id").notNull(),
    listing_id: uuid("listing_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => ({ unique: uniqueIndex("cart_buyer_listing_unique").on(t.buyer_id, t.listing_id) }),
);
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  buyer_id: uuid("buyer_id").notNull(),
  status: text("status").notNull(),
  total_minor: integer("total_minor").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
});
export const settingsVersions = pgTable("global_settings_versions", {
  id: uuid("id").primaryKey(),
  version: integer("version").notNull(),
  status: text("status").notNull(),
  tokens: jsonb("tokens").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
});
export const outbox = pgTable("outbox_events", {
  id: uuid("id").primaryKey(),
  event_type: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
});
