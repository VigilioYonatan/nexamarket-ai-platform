import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { PgStore } from "../infrastructure/db.js";
import { type AddCartDto, addCartDto, editCartDto } from "../shared/dto.js";
import { CurrentUser, type Principal, parseUuid, SessionGuard, ZodPipe } from "../shared/http.js";
@Injectable()
export class CartService {
  constructor(private readonly db: PgStore) {}
  async get(buyer_id: string) {
    const lines = await this.db.query<{
      id: string;
      quantity: number;
      price_minor: number;
      available: number;
    }>(
      `SELECT cl.id,cl.listing_id,cl.quantity,l.price_minor,l.currency,p.title,p.image_url,s.display_name AS seller_name,s.id AS seller_id,
      CASE WHEN l.status='PUBLISHED' AND s.status='APPROVED' THEN GREATEST(i.on_hand-i.reserved,0) ELSE 0 END AS available
      FROM cart_lines cl JOIN seller_listings l ON l.id=cl.listing_id
      JOIN sellers s ON s.id=l.seller_id JOIN products p ON p.id=l.product_id JOIN inventory_stock i ON i.listing_id=l.id
      WHERE cl.buyer_id=$1 ORDER BY s.display_name,p.title`,
      [buyer_id],
    );
    return {
      lines,
      total_minor: lines.reduce((n, l) => n + l.price_minor * l.quantity, 0),
      currency: "PEN",
    };
  }
  /** Cart quantity is not a reservation, but it must never exceed the current saleable stock. */
  async add(buyer_id: string, dto: AddCartDto) {
    await this.db.transaction(async (client) => {
      const listing = await client.query<{ available: number }>(
        `SELECT (i.on_hand-i.reserved)::int AS available
        FROM seller_listings l JOIN sellers s ON s.id=l.seller_id
        JOIN inventory_stock i ON i.listing_id=l.id
        WHERE l.id=$1 AND l.status='PUBLISHED' AND s.status='APPROVED'
        FOR SHARE OF i`,
        [dto.listing_id],
      );
      if (!listing.rows[0]) throw new NotFoundException({ code: "LISTING_NOT_FOUND" });
      if (dto.quantity > listing.rows[0].available)
        throw new ConflictException({ code: "CART_QUANTITY_EXCEEDS_STOCK_OR_LIMIT" });
      const result = await client.query(
        `INSERT INTO cart_lines(buyer_id,listing_id,quantity) VALUES($1,$2,$3)
        ON CONFLICT(buyer_id,listing_id) DO UPDATE SET quantity=cart_lines.quantity+EXCLUDED.quantity
        WHERE cart_lines.quantity+EXCLUDED.quantity <= 100
          AND cart_lines.quantity+EXCLUDED.quantity <= $4
        RETURNING id`,
        [buyer_id, dto.listing_id, dto.quantity, listing.rows[0].available],
      );
      if (!result.rowCount)
        throw new ConflictException({ code: "CART_QUANTITY_EXCEEDS_STOCK_OR_LIMIT" });
    });
    return this.get(buyer_id);
  }
  async change(buyer_id: string, id: string, quantity: number) {
    const row = await this.db.one(
      `UPDATE cart_lines cl SET quantity=$3
      WHERE cl.id=$1 AND cl.buyer_id=$2
      AND $3 <= (SELECT i.on_hand-i.reserved FROM inventory_stock i
        JOIN seller_listings l ON l.id=i.listing_id JOIN sellers s ON s.id=l.seller_id
        WHERE l.id=cl.listing_id AND l.status='PUBLISHED' AND s.status='APPROVED')
      RETURNING cl.id`,
      [id, buyer_id, quantity],
    );
    if (!row) {
      const exists = await this.db.one("SELECT id FROM cart_lines WHERE id=$1 AND buyer_id=$2", [
        id,
        buyer_id,
      ]);
      if (!exists) throw new NotFoundException({ code: "CART_LINE_NOT_FOUND" });
      throw new ConflictException({ code: "INSUFFICIENT_STOCK" });
    }
    return this.get(buyer_id);
  }
  async remove(buyer_id: string, id: string) {
    await this.db.query("DELETE FROM cart_lines WHERE buyer_id=$1 AND id=$2", [buyer_id, id]);
    return this.get(buyer_id);
  }
}
@Controller("api/v1/cart")
@UseGuards(SessionGuard)
export class CartController {
  constructor(private readonly carts: CartService) {}
  @Get() get(@CurrentUser() p: Principal) {
    return this.carts.get(p.user_id);
  }
  @Post("items") add(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(addCartDto)) input: AddCartDto,
  ) {
    return this.carts.add(p.user_id, input);
  }
  @Patch("items/:id") change(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(editCartDto)) input: { quantity: number },
  ) {
    return this.carts.change(p.user_id, parseUuid(id), input.quantity);
  }
  @Delete("items/:id") remove(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.carts.remove(p.user_id, parseUuid(id));
  }
}
