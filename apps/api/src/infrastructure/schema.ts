/**
 * NexaMarket AI Platform — Drizzle ORM PostgreSQL Schema
 * Conforms to Vigilio persistence conventions (snake_case column inference, typed tables, constraints).
 */
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// ==========================================
// IDENTITY & USERS
// ==========================================
export const profiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  subject: text("subject").notNull(),
  email: text("email"),
  display_name: text("display_name"),
  role: text("role").notNull().default("BUYER"),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  session_hash: text("session_hash").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked_at: timestamp("revoked_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userAddresses = pgTable("user_addresses", {
  id: uuid("id").primaryKey(),
  buyer_id: uuid("buyer_id").notNull(),
  label: text("label").notNull(),
  recipient: text("recipient").notNull(),
  line1: text("line1").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  postal_code: text("postal_code").notNull(),
  phone: text("phone").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});

export const oauthFlows = pgTable("oauth_flows", {
  state_hash: text("state_hash").primaryKey(),
  verifier: text("verifier").notNull(),
  nonce: text("nonce").notNull(),
  return_to: text("return_to").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ==========================================
// CATALOG & TAXONOMY
// ==========================================
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  parent_id: uuid("parent_id"),
  icon: text("icon"),
  image_url: text("image_url"),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey(),
  category_id: uuid("category_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image_url: text("image_url"),
  brand: text("brand"),
  model: text("model"),
  gtin: text("gtin"),
  specifications: jsonb("specifications"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// SELLERS & LISTINGS
// ==========================================
export const sellers = pgTable("sellers", {
  id: uuid("id").primaryKey(),
  owner_user_id: uuid("owner_user_id").notNull(),
  display_name: text("display_name").notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sellerApplications = pgTable("seller_applications", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  display_name: text("display_name").notNull(),
  legal_name: text("legal_name").notNull(),
  tax_id: text("tax_id").notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable("seller_listings", {
  id: uuid("id").primaryKey(),
  seller_id: uuid("seller_id").notNull(),
  product_id: uuid("product_id").notNull(),
  price_minor: integer("price_minor").notNull(),
  currency: text("currency").notNull().default("PEN"),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// INVENTORY & STOCK
// ==========================================
export const inventory = pgTable("inventory_stock", {
  listing_id: uuid("listing_id").primaryKey(),
  on_hand: integer("on_hand").notNull(),
  reserved: integer("reserved").notNull(),
  version: integer("version").notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey(),
  listing_id: uuid("listing_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  actor_seller_id: uuid("actor_seller_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockReservations = pgTable("stock_reservations", {
  id: uuid("id").primaryKey(),
  order_id: uuid("order_id").notNull(),
  listing_id: uuid("listing_id").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ==========================================
// CART & FAVORITES
// ==========================================
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

export const favorites = pgTable("favorites", {
  buyer_id: uuid("buyer_id").notNull(),
  listing_id: uuid("listing_id").notNull(),
});

// ==========================================
// ORDERS & FULFILLMENT
// ==========================================
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  buyer_id: uuid("buyer_id").notNull(),
  address_id: uuid("address_id"),
  idempotency_key: text("idempotency_key").notNull(),
  status: text("status").notNull(),
  total_minor: integer("total_minor").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sellerOrders = pgTable("seller_orders", {
  id: uuid("id").primaryKey(),
  order_id: uuid("order_id").notNull(),
  seller_id: uuid("seller_id").notNull(),
  subtotal_minor: integer("subtotal_minor").notNull(),
  status: text("status").notNull(),
  application_fee_minor: integer("application_fee_minor").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderLines = pgTable("order_lines", {
  id: uuid("id").primaryKey(),
  order_id: uuid("order_id").notNull(),
  seller_order_id: uuid("seller_order_id").notNull(),
  listing_id: uuid("listing_id").notNull(),
  title_snapshot: text("title_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  price_minor: integer("price_minor").notNull(),
  currency: text("currency").notNull().default("PEN"),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey(),
  seller_order_id: uuid("seller_order_id").notNull(),
  tracking_number: text("tracking_number").notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const checkoutSessions = pgTable("checkout_sessions", {
  id: uuid("id").primaryKey(),
  order_id: uuid("order_id").notNull(),
  buyer_id: uuid("buyer_id").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ==========================================
// PAYMENTS & MERCADO PAGO
// ==========================================
export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").primaryKey(),
  order_id: uuid("order_id").notNull(),
  seller_order_id: uuid("seller_order_id").notNull(),
  buyer_id: uuid("buyer_id").notNull(),
  seller_id: uuid("seller_id").notNull(),
  amount_minor: integer("amount_minor").notNull(),
  idempotency_key: text("idempotency_key").notNull(),
  provider_payment_id: text("provider_payment_id"),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sellerMpConnections = pgTable("seller_mp_connections", {
  id: uuid("id").primaryKey(),
  seller_id: uuid("seller_id").notNull(),
  provider_user_id: text("provider_user_id").notNull(),
  access_token_enc: text("access_token_enc").notNull(),
  refresh_token_enc: text("refresh_token_enc").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sellerOauthFlows = pgTable("seller_oauth_flows", {
  state_hash: text("state_hash").primaryKey(),
  seller_id: uuid("seller_id").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ==========================================
// GOVERNANCE, SETTINGS & COMMISSIONS
// ==========================================
export const settingsVersions = pgTable("global_settings_versions", {
  id: uuid("id").primaryKey(),
  version: integer("version").notNull(),
  status: text("status").notNull(),
  tokens: jsonb("tokens").notNull(),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  published_at: timestamp("published_at", { withTimezone: true }),
});

export const commissionVersions = pgTable("platform_commission_versions", {
  id: uuid("id").primaryKey(),
  version: integer("version").notNull(),
  commission_bps: integer("commission_bps").notNull(),
  status: text("status").notNull(),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  published_at: timestamp("published_at", { withTimezone: true }),
});

export const featureFlags = pgTable("feature_flags", {
  name: text("name").primaryKey(),
  enabled: boolean("enabled").notNull(),
  updated_by: uuid("updated_by"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// TRUST, REVIEWS, SUPPORT & RETURNS
// ==========================================
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey(),
  order_id: uuid("order_id").notNull(),
  buyer_id: uuid("buyer_id").notNull(),
  listing_id: uuid("listing_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey(),
  requester_id: uuid("requester_id").notNull(),
  order_id: uuid("order_id"),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: uuid("id").primaryKey(),
  ticket_id: uuid("ticket_id").notNull(),
  author_id: uuid("author_id").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trustCases = pgTable("trust_cases", {
  id: uuid("id").primaryKey(),
  subject_type: text("subject_type").notNull(),
  subject_id: uuid("subject_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  opened_by: uuid("opened_by").notNull(),
  resolved_by: uuid("resolved_by"),
  resolution: text("resolution"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const returns = pgTable("returns", {
  id: uuid("id").primaryKey(),
  order_id: uuid("order_id").notNull(),
  seller_order_id: uuid("seller_order_id").notNull(),
  buyer_id: uuid("buyer_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decision_reason: text("decision_reason"),
  decided_by: uuid("decided_by"),
  decided_at: timestamp("decided_at", { withTimezone: true }),
});

// ==========================================
// MEDIA, NOTIFICATIONS & AUDIT
// ==========================================
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey(),
  owner_user_id: uuid("owner_user_id").notNull(),
  kind: text("kind").notNull(),
  path: text("path").notNull(),
  mime_type: text("mime_type").notNull(),
  size_bytes: integer("size_bytes").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  source_event_id: uuid("source_event_id"),
  read_at: timestamp("read_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey(),
  actor_user_id: uuid("actor_user_id"),
  action: text("action").notNull(),
  resource_id: uuid("resource_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outbox = pgTable("outbox_events", {
  id: uuid("id").primaryKey(),
  event_type: text("event_type").notNull(),
  aggregate_id: uuid("aggregate_id"),
  payload: jsonb("payload").notNull(),
  processed_at: timestamp("processed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
