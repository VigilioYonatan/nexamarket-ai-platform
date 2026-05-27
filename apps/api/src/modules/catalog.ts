import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { PgStore } from "../infrastructure/db.js";
import { parseUuid } from "../shared/http.js";
@Injectable()
export class CatalogService {
  constructor(private readonly db: PgStore) {}
  async list(input: { q?: string; category?: string; sort?: string; page?: string }) {
    const page = Math.min(100, Math.max(1, Number.parseInt(input.page ?? "1", 10) || 1));
    const offset = (page - 1) * 24;
    const sort = {
      relevance: "p.created_at DESC",
      price_asc: "l.price_minor ASC",
      price_desc: "l.price_minor DESC",
      newest: "p.created_at DESC",
    }[input.sort ?? "relevance"];
    if (!sort) throw new BadRequestException({ code: "INVALID_SORT" });
    const q = (input.q ?? "").trim().slice(0, 120),
      cat = (input.category ?? "").trim().slice(0, 80);
    const rows = await this.db.query(
      `SELECT l.id AS listing_id,p.id AS product_id,p.title,p.description,p.image_url,p.category_id,p.brand,p.model,p.gtin,p.specifications,
      c.name AS category,s.display_name AS seller_name,s.id AS seller_id,l.price_minor,l.currency,
      GREATEST(0,i.on_hand-i.reserved) AS available
      FROM seller_listings l JOIN products p ON p.id=l.product_id JOIN sellers s ON s.id=l.seller_id
      JOIN inventory_stock i ON i.listing_id=l.id LEFT JOIN categories c ON c.id=p.category_id
      WHERE l.status='PUBLISHED' AND s.status='APPROVED'
      AND ($1='' OR p.title ILIKE '%'||$1||'%' OR p.description ILIKE '%'||$1||'%')
      AND ($2='' OR c.slug=$2 OR c.parent_id = (SELECT id FROM categories WHERE slug=$2 LIMIT 1))
      ORDER BY ${sort},l.id LIMIT 24 OFFSET $3`,
      [q, cat, offset],
    );
    return { items: rows, page, has_more: rows.length === 24 };
  }
  async detail(id: string) {
    const p = await this.db.one(
      `SELECT l.id AS listing_id,p.id AS product_id,p.title,p.description,p.image_url,p.brand,p.model,p.gtin,p.specifications,l.price_minor,l.currency,
      i.on_hand-i.reserved AS available,s.id AS seller_id,s.display_name AS seller_name
      FROM seller_listings l JOIN products p ON p.id=l.product_id JOIN inventory_stock i ON i.listing_id=l.id
      JOIN sellers s ON s.id=l.seller_id AND s.status='APPROVED' WHERE l.id=$1 AND l.status='PUBLISHED'`,
      [id],
    );
    if (!p) throw new NotFoundException({ code: "PRODUCT_NOT_FOUND" });
    return p;
  }
  categories() {
    return this.db.query(
      `SELECT c.id, c.slug, c.name, c.parent_id, c.icon,
       COALESCE(c.image_url, (
         SELECT p.image_url FROM products p
         JOIN seller_listings l ON l.product_id=p.id
         WHERE (p.category_id=c.id OR p.category_id IN (SELECT id FROM categories WHERE parent_id=c.id))
           AND l.status='PUBLISHED' AND p.image_url IS NOT NULL
         ORDER BY l.created_at DESC LIMIT 1
       )) AS image_url,
       (SELECT COUNT(*)::int FROM products p JOIN seller_listings l ON l.product_id=p.id WHERE (p.category_id=c.id OR p.category_id IN (SELECT id FROM categories WHERE parent_id=c.id)) AND l.status='PUBLISHED') AS item_count
       FROM categories c ORDER BY c.name`,
    );
  }
  async sellerPublic(id: string) {
    const seller = await this.db.one<{ id: string; display_name: string; created_at: string }>(
      `SELECT id,display_name,created_at FROM sellers WHERE id=$1 AND status='APPROVED'`,
      [id],
    );
    if (!seller) return null;
    const items = await this.db.query(
      `SELECT l.id AS listing_id,p.id AS product_id,p.title,p.description,p.image_url,p.category_id,p.brand,p.model,p.gtin,p.specifications,
      c.name AS category,s.display_name AS seller_name,s.id AS seller_id,l.price_minor,l.currency,
      GREATEST(0,i.on_hand-i.reserved) AS available
      FROM seller_listings l JOIN products p ON p.id=l.product_id JOIN sellers s ON s.id=l.seller_id
      JOIN inventory_stock i ON i.listing_id=l.id LEFT JOIN categories c ON c.id=p.category_id
      WHERE l.seller_id=$1 AND l.status='PUBLISHED' AND s.status='APPROVED'
      ORDER BY l.created_at DESC LIMIT 24`,
      [id],
    );
    return { ...seller, items };
  }
}
@Controller("api/v1")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get("products") list(
    @Query() q: { q?: string; category?: string; sort?: string; page?: string },
  ) {
    return this.catalog.list(q);
  }
  @Get("products/:id") detail(@Param("id") id: string) {
    return this.catalog.detail(parseUuid(id));
  }
  @Get("categories") categories() {
    return this.catalog.categories();
  }
  @Get("search") search(
    @Query() q: { q?: string; category?: string; sort?: string; page?: string },
  ) {
    return this.catalog.list(q);
  }
  @Get("sellers/:id/profile") async profile(@Param("id") id: string) {
    const s = await this.catalog.sellerPublic(parseUuid(id));
    if (!s) throw new NotFoundException();
    return s;
  }
}
