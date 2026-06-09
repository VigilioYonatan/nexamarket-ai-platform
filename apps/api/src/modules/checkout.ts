import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Injectable,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { assertMoneyMinor, assertPositiveQty } from "@nexa/domain";
import type { PoolClient } from "pg";
import { PgStore } from "../infrastructure/db.js";
import { createCheckoutDto } from "../shared/dto.js";
import { CurrentUser, type Principal, parseUuid, SessionGuard, ZodPipe } from "../shared/http.js";

interface CartRow {
  listing_id: string;
  seller_id: string;
  quantity: number;
  price_minor: number;
  currency: string;
  title: string;
  seller_name: string;
  ready: boolean;
}
@Injectable()
export class CheckoutService {
  constructor(private readonly db: PgStore) {}
  async create(buyer_id: string, idempotency_key: string, address_id?: string) {
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotency_key))
      throw new BadRequestException({ code: "IDEMPOTENCY_KEY_REQUIRED" });
    return this.db.transaction(async (client) => {
      // Per-buyer+key lock: concurrent retried request never reserves twice.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `${buyer_id}:${idempotency_key}`,
      ]);
      const past = await client.query<{ id: string; address_id: string | null }>(
        "SELECT id,address_id FROM orders WHERE buyer_id=$1 AND idempotency_key=$2",
        [buyer_id, idempotency_key],
      );
      if (past.rows[0]) {
        if ((past.rows[0].address_id ?? null) !== (address_id ?? null))
          throw new ConflictException({ code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_ADDRESS" });
        return this.describe(client, buyer_id, past.rows[0].id);
      }
      if (address_id) {
        const addr = await client.query(
          "SELECT id FROM user_addresses WHERE id=$1 AND buyer_id=$2 AND deleted_at IS NULL",
          [address_id, buyer_id],
        );
        if (!addr.rowCount) throw new NotFoundException({ code: "ADDRESS_NOT_FOUND" });
      }
      const cart = await client.query<CartRow>(
        `SELECT cl.listing_id,cl.quantity,l.seller_id,l.price_minor,l.currency,p.title,s.display_name AS seller_name,
        (s.status='APPROVED' AND l.status='PUBLISHED' AND mc.id IS NOT NULL) AS ready
        FROM cart_lines cl JOIN seller_listings l ON l.id=cl.listing_id
        JOIN products p ON p.id=l.product_id JOIN sellers s ON s.id=l.seller_id
        LEFT JOIN seller_mp_connections mc ON mc.seller_id=s.id AND mc.status='CONNECTED'
        WHERE cl.buyer_id=$1 ORDER BY cl.listing_id FOR UPDATE OF cl`,
        [buyer_id],
      );
      if (!cart.rowCount) throw new ConflictException({ code: "EMPTY_CART" });
      if (cart.rows.some((x) => !x.ready))
        throw new ConflictException({ code: "SELLER_PAYMENT_NOT_CONFIGURED" });
      if (cart.rows.some((x) => x.currency !== "PEN"))
        throw new ConflictException({ code: "CURRENCY_NOT_SUPPORTED" });
      let total = 0;
      const groups = new Map<string, { name: string; amount: number; lines: CartRow[] }>();
      for (const item of cart.rows) {
        assertPositiveQty(item.quantity);
        assertMoneyMinor(item.price_minor);
        const amount = item.price_minor * item.quantity;
        total = assertMoneyMinor(total + amount);
        const group = groups.get(item.seller_id) ?? {
          name: item.seller_name,
          amount: 0,
          lines: [],
        };
        group.amount = assertMoneyMinor(group.amount + amount);
        group.lines.push(item);
        groups.set(item.seller_id, group);
      }
      const policy = await client.query<{ commission_bps: number }>(
        `SELECT commission_bps FROM platform_commission_versions WHERE status='PUBLISHED' LIMIT 1`,
      );
      const bps = policy.rows[0]?.commission_bps ?? 0;
      const order = await client.query<{ id: string }>(
        `INSERT INTO orders(buyer_id,status,total_minor,idempotency_key,address_id) VALUES($1,'AWAITING_PAYMENT',$2,$3,$4) RETURNING id`,
        [buyer_id, total, idempotency_key, address_id ?? null],
      );
      const id = order.rows[0]!.id;
      await client.query(
        `INSERT INTO checkout_sessions(order_id,buyer_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')`,
        [id, buyer_id],
      );
      // Global deterministic lock ordering across all distinct listings to eliminate deadlocks:
      const uniqueListingIds = [...new Set(cart.rows.map((r) => r.listing_id))].sort();
      for (const lid of uniqueListingIds) {
        await client.query(
          `SELECT listing_id FROM inventory_stock WHERE listing_id=$1 FOR UPDATE`,
          [lid],
        );
      }
      for (const [seller_id, g] of groups) {
        const fee = Math.floor((g.amount * bps + 5000) / 10000);
        const so = await client.query<{ id: string }>(
          `INSERT INTO seller_orders(order_id,seller_id,subtotal_minor,application_fee_minor,status) VALUES($1,$2,$3,$4,'AWAITING_PAYMENT') RETURNING id`,
          [id, seller_id, g.amount, fee],
        );
        for (const item of g.lines) {
          const updated = await client.query(
            `UPDATE inventory_stock SET reserved=reserved+$2,version=version+1 WHERE listing_id=$1 AND on_hand-reserved >= $2 RETURNING listing_id`,
            [item.listing_id, item.quantity],
          );
          if (updated.rowCount !== 1)
            throw new ConflictException({
              code: "INSUFFICIENT_STOCK",
              listing_id: item.listing_id,
            });
          await client.query(
            `INSERT INTO stock_reservations(order_id,listing_id,quantity,expires_at) VALUES($1,$2,$3,now()+interval '15 minutes')`,
            [id, item.listing_id, item.quantity],
          );
          await client.query(
            `INSERT INTO order_lines(order_id,seller_order_id,listing_id,title_snapshot,quantity,price_minor,currency) VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [
              id,
              so.rows[0]!.id,
              item.listing_id,
              item.title,
              item.quantity,
              item.price_minor,
              item.currency,
            ],
          );
        }
      }
      // Checkout consumes the buyer cart atomically with its inventory reservations.
      // It prevents accidental second orders under another idempotency key while the
      // customer pays seller groups. A failed checkout rolls the deletion back.
      await client.query("DELETE FROM cart_lines WHERE buyer_id=$1", [buyer_id]);
      await client.query(
        "INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES($1,$2,$3)",
        ["CheckoutCreated", id, JSON.stringify({ order_id: id })],
      );
      return this.describe(client, buyer_id, id);
    });
  }
  async describe(client: PoolClient, buyer_id: string, order_id: string) {
    const order = await client.query(
      `SELECT o.id,o.status,o.total_minor,o.created_at,c.expires_at FROM orders o JOIN checkout_sessions c ON c.order_id=o.id WHERE o.id=$1 AND o.buyer_id=$2`,
      [order_id, buyer_id],
    );
    if (!order.rowCount) throw new NotFoundException({ code: "CHECKOUT_NOT_FOUND" });
    const groups = await client.query(
      `SELECT so.id AS seller_order_id,so.seller_id,s.display_name AS seller_name,so.status,so.subtotal_minor,so.application_fee_minor
      FROM seller_orders so JOIN sellers s ON s.id=so.seller_id WHERE so.order_id=$1 ORDER BY s.display_name`,
      [order_id],
    );
    return {
      order: order.rows[0],
      seller_groups: groups.rows,
      currency: "PEN",
      multi_seller: groups.rowCount !== 1,
      payment_policy: "ONE_PAYMENT_PER_SELLER",
      warning:
        groups.rowCount !== 1
          ? "Cada vendedor requiere un pago independiente con Mercado Pago."
          : null,
    };
  }
  async get(buyer_id: string, order_id: string) {
    const client = await this.db.pool.connect();
    try {
      return await this.describe(client, buyer_id, order_id);
    } finally {
      client.release();
    }
  }
  async expire() {
    return this.db.transaction(async (client) => {
      // Each seller group settles independently. A partially-paid parent must not keep
      // reservations of unpaid seller groups forever. Ambiguous provider attempts block expiry.
      const expired = await client.query<{
        id: string;
        status: string;
      }>(`SELECT o.id,o.status FROM orders o JOIN checkout_sessions cs ON cs.order_id=o.id
      WHERE cs.expires_at<now() AND o.status IN ('AWAITING_PAYMENT','PARTIALLY_PAID')
      AND EXISTS (SELECT 1 FROM seller_orders so WHERE so.order_id=o.id AND so.status='AWAITING_PAYMENT')
      AND NOT EXISTS (SELECT 1 FROM payment_attempts pa JOIN seller_orders so ON so.id=pa.seller_order_id
        WHERE so.order_id=o.id AND so.status='AWAITING_PAYMENT' AND pa.status IN ('SUBMITTED','PENDING'))
      ORDER BY cs.expires_at LIMIT 50 FOR UPDATE OF o SKIP LOCKED`);
      for (const order of expired.rows) {
        // The candidate query may have waited for a payment transaction. Recheck
        // under the parent row lock before expiring any held reservation.
        const unresolved = await client.query(
          `SELECT 1 FROM payment_attempts pa
        JOIN seller_orders so ON so.id=pa.seller_order_id
        WHERE so.order_id=$1 AND so.status='AWAITING_PAYMENT'
          AND pa.status IN ('SUBMITTED','PENDING') LIMIT 1`,
          [order.id],
        );
        if (unresolved.rowCount) continue;
        const reservations = await client.query<{ listing_id: string; quantity: number }>(
          `UPDATE stock_reservations sr SET status='EXPIRED'
       WHERE sr.order_id=$1 AND sr.status='HELD' AND EXISTS (
         SELECT 1 FROM order_lines ol JOIN seller_orders so ON so.id=ol.seller_order_id
         WHERE ol.order_id=sr.order_id AND ol.listing_id=sr.listing_id AND so.status='AWAITING_PAYMENT')
       RETURNING sr.listing_id,sr.quantity`,
          [order.id],
        );
        for (const r of reservations.rows)
          await client.query(
            "UPDATE inventory_stock SET reserved=reserved-$2,version=version+1 WHERE listing_id=$1 AND reserved >= $2",
            [r.listing_id, r.quantity],
          );
        await client.query(
          `UPDATE seller_orders SET status='CANCELLED' WHERE order_id=$1 AND status='AWAITING_PAYMENT'`,
          [order.id],
        );
        if (order.status === "AWAITING_PAYMENT")
          await client.query(`UPDATE orders SET status='CANCELLED' WHERE id=$1`, [order.id]);
        await client.query(
          "INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES($1,$2,$3)",
          [
            "CheckoutExpired",
            order.id,
            JSON.stringify({ order_id: order.id, partial: order.status === "PARTIALLY_PAID" }),
          ],
        );
      }
      return expired.rowCount;
    });
  }
}
@Controller("api/v1/checkouts")
@UseGuards(SessionGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}
  @Post() create(
    @CurrentUser() p: Principal,
    @Headers("idempotency-key") key: string,
    @Body(new ZodPipe(createCheckoutDto)) dto: { address_id?: string },
  ) {
    return this.checkout.create(p.user_id, key, dto.address_id);
  }
  @Get(":id") get(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.checkout.get(p.user_id, parseUuid(id));
  }
}
