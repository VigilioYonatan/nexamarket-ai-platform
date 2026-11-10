import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PgStore } from "../../../infrastructure/db.js";
import type { AddressDto } from "../dtos/account.dto.js";

@Injectable()
export class AccountService {
  constructor(private readonly db: PgStore) {}

  getAddresses(id: string) {
    return this.db.query(
      "SELECT id,label,recipient,line1,city,region,postal_code,phone FROM user_addresses WHERE buyer_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC",
      [id],
    );
  }

  async addAddress(id: string, d: AddressDto | Record<string, string>) {
    return this.db.one(
      "INSERT INTO user_addresses(buyer_id,label,recipient,line1,city,region,postal_code,phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,label,recipient,line1,city,region,postal_code,phone",
      [id, d.label, d.recipient, d.line1, d.city, d.region, d.postal_code, d.phone],
    );
  }

  async deleteAddress(id: string, addressId: string) {
    await this.db.query(
      "UPDATE user_addresses SET deleted_at=now() WHERE id=$1 AND buyer_id=$2 AND deleted_at IS NULL",
      [addressId, id],
    );
  }

  getFavorites(id: string) {
    return this.db.query(
      `SELECT f.listing_id,p.title,p.image_url,l.price_minor FROM favorites f JOIN seller_listings l ON l.id=f.listing_id JOIN products p ON p.id=l.product_id WHERE f.buyer_id=$1`,
      [id],
    );
  }

  async addFavorite(id: string, listingId: string) {
    const result = await this.db.query(
      `INSERT INTO favorites(buyer_id,listing_id) SELECT $1,l.id FROM seller_listings l JOIN sellers s ON s.id=l.seller_id
      WHERE l.id=$2 AND l.status='PUBLISHED' AND s.status='APPROVED' ON CONFLICT DO NOTHING RETURNING listing_id`,
      [id, listingId],
    );
    if (!result.length) {
      const exists = await this.db.one(
        "SELECT listing_id FROM favorites WHERE buyer_id=$1 AND listing_id=$2",
        [id, listingId],
      );
      if (!exists) throw new NotFoundException({ code: "LISTING_NOT_FOUND" });
    }
    return { saved: true };
  }

  async deleteFavorite(id: string, listingId: string) {
    await this.db.query("DELETE FROM favorites WHERE buyer_id=$1 AND listing_id=$2", [
      id,
      listingId,
    ]);
    return { saved: false };
  }

  async createReturn(id: string, order_id: string, reason: string, seller_order_id?: string) {
    return this.db.transaction(async (c) => {
      const sellers = await c.query<{ id: string }>(
        `SELECT so.id FROM seller_orders so JOIN orders o ON o.id=so.order_id
        WHERE o.id=$1 AND o.buyer_id=$2 AND so.status IN ('PAID','PREPARING','SHIPPED','DELIVERED') FOR UPDATE OF so`,
        [order_id, id],
      );
      if (!sellers.rowCount) throw new NotFoundException({ code: "ORDER_NOT_ELIGIBLE" });
      if (sellers.rowCount !== 1 && !seller_order_id)
        throw new ConflictException({ code: "SELECT_SELLER_ORDER" });
      const selected = seller_order_id ?? sellers.rows[0]!.id;
      if (!sellers.rows.some((x) => x.id === selected))
        throw new NotFoundException({ code: "SELLER_ORDER_NOT_ELIGIBLE" });
      const existing = await c.query(
        `SELECT id FROM return_requests WHERE buyer_id=$1 AND seller_order_id=$2
       AND status IN ('OPEN','UNDER_REVIEW','ACCEPTED')`,
        [id, selected],
      );
      if (existing.rowCount) throw new ConflictException({ code: "RETURN_ALREADY_REQUESTED" });
      const result = await c.query(
        `INSERT INTO return_requests(order_id,buyer_id,seller_order_id,reason)
       VALUES($1,$2,$3,$4) RETURNING id,seller_order_id,status,reason,created_at`,
        [order_id, id, selected, reason],
      );
      const created = result.rows[0];
      await c.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES('ReturnRequested',$1,$2)`,
        [created.id, JSON.stringify({ order_id, return_id: created.id })],
      );
      return created;
    });
  }

  getReturns(id: string) {
    return this.db.query(
      "SELECT id,order_id,seller_order_id,status,reason,created_at FROM return_requests WHERE buyer_id=$1 ORDER BY created_at DESC",
      [id],
    );
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const res = await this.db.query(
      `UPDATE user_profiles SET avatar_url=$1 WHERE id=$2 RETURNING id, avatar_url, display_name`,
      [avatarUrl, userId],
    );
    return res[0] ?? { avatar_url: avatarUrl };
  }
}
