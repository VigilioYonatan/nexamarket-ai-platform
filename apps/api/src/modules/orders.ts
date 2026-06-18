import {
  ConflictException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { PgStore } from "../infrastructure/db.js";
import { CurrentUser, type Principal, parseUuid, SessionGuard } from "../shared/http.js";
@Injectable()
export class OrdersService {
  constructor(private readonly db: PgStore) {}
  list(buyer_id: string) {
    return this.db.query(
      `SELECT id,status,total_minor,created_at FROM orders WHERE buyer_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [buyer_id],
    );
  }
  async detail(buyer_id: string, id: string) {
    const order = await this.db.one(
      "SELECT id,status,total_minor,created_at FROM orders WHERE buyer_id=$1 AND id=$2",
      [buyer_id, id],
    );
    if (!order) throw new NotFoundException({ code: "ORDER_NOT_FOUND" });
    const lines = await this.db.query(
      "SELECT listing_id,title_snapshot,quantity,price_minor,currency FROM order_lines WHERE order_id=$1",
      [id],
    );
    const sellers = await this.db.query(
      `SELECT so.id,so.seller_id,so.subtotal_minor,so.status,sh.tracking_number,sh.status AS shipment_status
      FROM seller_orders so LEFT JOIN shipments sh ON sh.seller_order_id=so.id WHERE so.order_id=$1`,
      [id],
    );
    return { ...order, lines, sellers };
  }
  /** Delivery is confirmed by the owner of the parent order, never by an arbitrary seller. */
  async confirmDelivery(buyer_id: string, order_id: string, seller_order_id: string) {
    return this.db.transaction(async (c) => {
      const group = await c.query<{ id: string }>(
        `UPDATE seller_orders so SET status='DELIVERED'
        FROM orders o, shipments sh
        WHERE so.id=$1 AND so.order_id=$2 AND o.id=so.order_id AND o.buyer_id=$3
          AND so.status='SHIPPED' AND sh.seller_order_id=so.id AND sh.status='SHIPPED'
        RETURNING so.id`,
        [seller_order_id, order_id, buyer_id],
      );
      if (!group.rows[0]) throw new ConflictException({ code: "DELIVERY_NOT_CONFIRMABLE" });
      await c.query("UPDATE shipments SET status='DELIVERED' WHERE seller_order_id=$1", [
        seller_order_id,
      ]);
      await c.query(
        `UPDATE orders o SET status='DELIVERED' WHERE o.id=$1 AND o.status IN ('SHIPPED','PAID','PREPARING')
        AND NOT EXISTS(SELECT 1 FROM seller_orders so WHERE so.order_id=o.id AND so.status!='DELIVERED')`,
        [order_id],
      );
      await c.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES('SellerOrderDelivered',$1,$2)`,
        [seller_order_id, JSON.stringify({ order_id, seller_order_id })],
      );
      return { seller_order_id, status: "DELIVERED" };
    });
  }
  async cancel(buyer_id: string, id: string) {
    return this.db.transaction(async (c) => {
      const r = await c.query<{ status: string }>(
        `SELECT status FROM orders WHERE id=$1 AND buyer_id=$2 FOR UPDATE`,
        [id, buyer_id],
      );
      if (!r.rowCount) throw new NotFoundException();
      if (r.rows[0]!.status !== "AWAITING_PAYMENT")
        throw new ConflictException({ code: "ORDER_CANNOT_CANCEL" });
      const attempts = await c.query(
        `SELECT id FROM payment_attempts WHERE order_id=$1 AND status IN ('SUBMITTED','PENDING','APPROVED')`,
        [id],
      );
      if (attempts.rowCount) throw new ConflictException({ code: "PAYMENT_IN_PROGRESS" });
      const reservations = await c.query<{ listing_id: string; quantity: number }>(
        `UPDATE stock_reservations SET status='RELEASED' WHERE order_id=$1 AND status='HELD' RETURNING listing_id,quantity`,
        [id],
      );
      for (const line of reservations.rows)
        await c.query(
          "UPDATE inventory_stock SET reserved=reserved-$2,version=version+1 WHERE listing_id=$1",
          [line.listing_id, line.quantity],
        );
      await c.query(`UPDATE seller_orders SET status='CANCELLED' WHERE order_id=$1`, [id]);
      await c.query(`UPDATE orders SET status='CANCELLED' WHERE id=$1`, [id]);
      return { status: "CANCELLED" };
    });
  }
}
@Controller("api/v1/me/orders")
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() list(@CurrentUser() p: Principal) {
    return this.orders.list(p.user_id);
  }
  @Get(":id") detail(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.orders.detail(p.user_id, parseUuid(id));
  }
  @Post(":id/seller-orders/:sellerOrderId/confirm-delivery") confirmDelivery(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Param("sellerOrderId") sellerOrderId: string,
  ) {
    return this.orders.confirmDelivery(p.user_id, parseUuid(id), parseUuid(sellerOrderId));
  }
  @Post(":id/cancel") cancel(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.orders.cancel(p.user_id, parseUuid(id));
  }
}
