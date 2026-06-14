import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { PgStore } from "../infrastructure/db.js";
import { adjustStockDto, applySellerDto, createProductDto } from "../shared/dto.js";
import {
  CurrentUser,
  type Principal,
  parseUuid,
  SellerGuard,
  SessionGuard,
  ZodPipe,
} from "../shared/http.js";
@Injectable()
export class SellerService {
  constructor(private readonly db: PgStore) {}
  async apply(user_id: string, body: { display_name: string; legal_name: string; tax_id: string }) {
    const existing = await this.db.one(
      "SELECT id,status FROM seller_applications WHERE user_id=$1",
      [user_id],
    );
    if (existing) throw new ConflictException({ code: "APPLICATION_EXISTS" });
    return this.db.one(
      `INSERT INTO seller_applications(user_id,display_name,legal_name,tax_id) VALUES($1,$2,$3,$4) RETURNING id,status`,
      [user_id, body.display_name, body.legal_name, body.tax_id],
    );
  }
  application(user_id: string) {
    return this.db.one(
      "SELECT id,display_name,status,created_at FROM seller_applications WHERE user_id=$1",
      [user_id],
    );
  }
  list(seller_id: string) {
    return this.db.query(
      `SELECT l.id,l.price_minor,l.status,p.title,p.image_url,i.on_hand,i.reserved,i.version FROM seller_listings l
    JOIN products p ON p.id=l.product_id JOIN inventory_stock i ON i.listing_id=l.id WHERE l.seller_id=$1 ORDER BY l.created_at DESC`,
      [seller_id],
    );
  }
  async create(
    seller_id: string,
    input: {
      title: string;
      description: string;
      category_id: string;
      image_url?: string;
      brand?: string;
      model?: string;
      gtin?: string;
      price_minor: number;
      quantity: number;
    },
  ) {
    return this.db.transaction(async (c) => {
      const cat = await c.query("SELECT id FROM categories WHERE id=$1", [input.category_id]);
      if (!cat.rowCount) throw new BadRequestException({ code: "UNKNOWN_CATEGORY" });
      // Canonical identity is shared only for a validated GTIN. Never deduplicate by fuzzy title alone.
      const p = await c.query<{ id: string }>(
        `INSERT INTO products(category_id,title,description,image_url,brand,model,gtin)
       VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id`,
        [
          input.category_id,
          input.title,
          input.description,
          input.image_url ?? null,
          input.brand ?? null,
          input.model ?? null,
          input.gtin ?? null,
        ],
      );
      const product_id =
        p.rows[0]?.id ??
        (input.gtin
          ? (await c.query<{ id: string }>("SELECT id FROM products WHERE gtin=$1", [input.gtin]))
              .rows[0]?.id
          : undefined);
      if (!product_id) throw new ConflictException({ code: "CANONICAL_PRODUCT_CONFLICT" });
      const listing = await c.query<{ id: string }>(
        `INSERT INTO seller_listings(seller_id,product_id,price_minor,status,currency) VALUES($1,$2,$3,'DRAFT','PEN') RETURNING id`,
        [seller_id, product_id, input.price_minor],
      );
      await c.query("INSERT INTO inventory_stock(listing_id,on_hand) VALUES($1,$2)", [
        listing.rows[0]!.id,
        input.quantity,
      ]);
      return { id: listing.rows[0]!.id, status: "DRAFT" };
    });
  }
  async publish(seller_id: string, id: string) {
    const r = await this.db.one(
      `UPDATE seller_listings SET status='PUBLISHED' WHERE id=$1 AND seller_id=$2 AND status IN ('DRAFT','PAUSED') RETURNING id,status`,
      [id, seller_id],
    );
    if (!r) throw new NotFoundException({ code: "LISTING_NOT_FOUND_OR_STATE" });
    return r;
  }
  async pause(seller_id: string, id: string) {
    const r = await this.db.one(
      `UPDATE seller_listings SET status='PAUSED' WHERE id=$1 AND seller_id=$2 AND status='PUBLISHED' RETURNING id,status`,
      [id, seller_id],
    );
    if (!r) throw new NotFoundException();
    return r;
  }
  async adjust(
    seller_id: string,
    listing_id: string,
    input: { delta: number; reason: string; expected_version: number },
  ) {
    return this.db.transaction(async (c) => {
      const r = await c.query<{ on_hand: number; reserved: number; version: number }>(
        `UPDATE inventory_stock i SET on_hand=i.on_hand+$3,version=i.version+1
       FROM seller_listings l WHERE i.listing_id=l.id AND l.id=$1 AND l.seller_id=$2 AND i.version=$4
       AND i.on_hand+$3 >= i.reserved AND i.on_hand+$3>=0 RETURNING i.on_hand,i.reserved,i.version`,
        [listing_id, seller_id, input.delta, input.expected_version],
      );
      if (!r.rows[0]) throw new ConflictException({ code: "INVENTORY_CONFLICT" });
      await c.query(
        "INSERT INTO stock_movements(listing_id,delta,reason,actor_seller_id) VALUES($1,$2,$3,$4)",
        [listing_id, input.delta, input.reason, seller_id],
      );
      return r.rows[0];
    });
  }
  async orders(seller_id: string) {
    return this.db.query(
      `SELECT so.id,so.order_id,so.status,so.subtotal_minor,so.created_at FROM seller_orders so WHERE so.seller_id=$1 ORDER BY so.created_at DESC`,
      [seller_id],
    );
  }
  async markShipped(seller_id: string, seller_order_id: string, tracking: string) {
    if (!/^[a-zA-Z0-9 -]{4,80}$/.test(tracking))
      throw new BadRequestException({ code: "INVALID_TRACKING" });
    return this.db.transaction(async (c) => {
      const r = await c.query(
        `UPDATE seller_orders SET status='SHIPPED' WHERE id=$1 AND seller_id=$2 AND status IN ('PAID','PREPARING') RETURNING id,order_id`,
        [seller_order_id, seller_id],
      );
      if (!r.rows[0]) throw new ConflictException({ code: "INVALID_ORDER_STATE" });
      await c.query(
        `INSERT INTO shipments(seller_order_id,tracking_number,status) VALUES($1,$2,'SHIPPED') ON CONFLICT(seller_order_id) DO UPDATE SET tracking_number=EXCLUDED.tracking_number,status='SHIPPED'`,
        [seller_order_id, tracking],
      );
      // The parent is SHIPPED only once every seller group is shipped/delivered.
      // Do not rewrite a partially-paid order or a cancelled seller group.
      await c.query(
        `UPDATE orders o SET status='SHIPPED' WHERE o.id=$1
        AND o.status IN ('PAID','PREPARING')
        AND NOT EXISTS(SELECT 1 FROM seller_orders so WHERE so.order_id=o.id AND so.status NOT IN ('SHIPPED','DELIVERED'))`,
        [r.rows[0].order_id],
      );
      await c.query("INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES($1,$2,$3)", [
        "SellerOrderShipped",
        seller_order_id,
        JSON.stringify({ order_id: r.rows[0].order_id }),
      ]);
      return { id: seller_order_id, status: "SHIPPED" };
    });
  }
  summary(seller_id: string) {
    return this.db.one(
      `SELECT (SELECT count(*)::int FROM seller_listings WHERE seller_id=$1) AS listings,
    (SELECT count(*)::int FROM seller_orders WHERE seller_id=$1) AS orders,
    (SELECT coalesce(sum(subtotal_minor),0)::bigint FROM seller_orders WHERE seller_id=$1 AND status IN ('PAID','PREPARING','SHIPPED','DELIVERED')) AS gross_sales_minor`,
      [seller_id],
    );
  }
}
@Controller("api/v1/seller")
@UseGuards(SessionGuard)
export class SellerOnboardingController {
  constructor(private readonly sellers: SellerService) {}
  @Post("applications") apply(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(applySellerDto)) d: {
      display_name: string;
      legal_name: string;
      tax_id: string;
    },
  ) {
    return this.sellers.apply(p.user_id, d);
  }
  @Get("application") application(@CurrentUser() p: Principal) {
    return this.sellers.application(p.user_id);
  }
}
@Controller("api/v1/seller")
@UseGuards(SessionGuard, SellerGuard)
export class SellerController {
  constructor(private readonly sellers: SellerService) {}
  @Get("listings") list(@CurrentUser() p: Principal) {
    return this.sellers.list(p.seller_id!);
  }
  @Post("listings") create(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(createProductDto)) d: {
      title: string;
      description: string;
      category_id: string;
      image_url?: string;
      brand?: string;
      model?: string;
      gtin?: string;
      price_minor: number;
      quantity: number;
    },
  ) {
    return this.sellers.create(p.seller_id!, d);
  }
  @Post("listings/:id/publish") publish(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.sellers.publish(p.seller_id!, parseUuid(id));
  }
  @Post("listings/:id/pause") pause(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.sellers.pause(p.seller_id!, parseUuid(id));
  }
  @Post("inventory/:id/adjustments") adjust(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(adjustStockDto)) d: {
      delta: number;
      reason: string;
      expected_version: number;
    },
  ) {
    return this.sellers.adjust(p.seller_id!, parseUuid(id), d);
  }
  @Get("orders") orders(@CurrentUser() p: Principal) {
    return this.sellers.orders(p.seller_id!);
  }
  @Post("orders/:id/ship") ship(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(
      new ZodPipe(
        z
          .object({
            tracking_number: z
              .string()
              .trim()
              .regex(/^[a-zA-Z0-9 -]{4,80}$/),
          })
          .strict(),
      ),
    )
    b: { tracking_number: string },
  ) {
    return this.sellers.markShipped(p.seller_id!, parseUuid(id), b.tracking_number);
  }
  @Get("analytics/summary") summary(@CurrentUser() p: Principal) {
    return this.sellers.summary(p.seller_id!);
  }
}
