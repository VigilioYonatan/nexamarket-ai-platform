import { Controller, Get, Injectable, Param } from "@nestjs/common";
import { PgStore } from "../infrastructure/db.js";
import { parseUuid } from "../shared/http.js";
@Injectable()
export class RecommendationService {
  constructor(private readonly db: PgStore) {}
  /** Cold-start popularity baseline, not an ML model. Only verified paid orders count. */
  async trending() {
    const items =
      await this.db.query(`SELECT l.id AS listing_id,p.title,p.image_url,p.brand,p.specifications,l.price_minor,l.currency,
    s.display_name AS seller_name,s.id AS seller_id,p.id AS product_id,p.description,
    GREATEST(0,i.on_hand-i.reserved) AS available,
    COALESCE(sum(CASE WHEN so.status IN ('PAID','PREPARING','SHIPPED','DELIVERED') THEN ol.quantity ELSE 0 END),0)::int AS units_sold
    FROM seller_listings l JOIN products p ON p.id=l.product_id
      JOIN sellers s ON s.id=l.seller_id AND s.status='APPROVED'
      JOIN inventory_stock i ON i.listing_id=l.id
      LEFT JOIN order_lines ol ON ol.listing_id=l.id
      LEFT JOIN seller_orders so ON so.id=ol.seller_order_id
    WHERE l.status='PUBLISHED' AND i.on_hand>i.reserved
      AND p.image_url IS NOT NULL
      AND p.title NOT ILIKE '%testing%'
      AND p.title NOT ILIKE '%qa%'
    GROUP BY l.id,p.id,s.id,i.on_hand,i.reserved
    ORDER BY units_sold DESC,l.created_at DESC LIMIT 8`);
    return { algorithm: "verified-purchase-popularity-baseline", items };
  }
  async similar(id: string) {
    const items = await this.db.query(
      `SELECT l.id AS listing_id,p.id AS product_id,p.title,p.description,p.image_url,
    l.price_minor,l.currency,s.id AS seller_id,s.display_name AS seller_name,(i.on_hand-i.reserved) AS available
    FROM seller_listings seed JOIN products origin ON origin.id=seed.product_id
    JOIN products p ON p.category_id=origin.category_id AND p.id<>origin.id
    JOIN seller_listings l ON l.product_id=p.id AND l.status='PUBLISHED'
    JOIN inventory_stock i ON i.listing_id=l.id AND i.on_hand>i.reserved
    JOIN sellers s ON s.id=l.seller_id AND s.status='APPROVED'
    WHERE seed.id=$1 ORDER BY l.created_at DESC LIMIT 6`,
      [id],
    );
    return { algorithm: "same-category-baseline", items };
  }
}
@Controller("api/v1/recommendations")
export class RecommendationsController {
  constructor(private readonly recs: RecommendationService) {}
  @Get("trending") trending() {
    return this.recs.trending();
  }
  @Get("similar/:id") similar(@Param("id") id: string) {
    return this.recs.similar(parseUuid(id));
  }
}
