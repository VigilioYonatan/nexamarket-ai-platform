import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { PgStore } from "./infrastructure/db.js";
import { CheckoutService } from "./modules/checkout.js";
import { MercadoPagoService } from "./modules/payments.js";

/** Exactly-once notification projection per user/event via unique DB key, at-least-once outbox processing.
 * The worker never emails personally identifiable data and never marks a PSP payment approved on its own. */
async function start() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  const checkout = app.get(CheckoutService),
    payments = app.get(MercadoPagoService),
    db = app.get(PgStore);
  let running = true;
  process.on("SIGTERM", () => {
    running = false;
  });
  process.on("SIGINT", () => {
    running = false;
  });
  while (running) {
    try {
      await checkout.expire();
      await payments.processInbox();
      await db.transaction(async (c) => {
        const events = await c.query<{
          id: string;
          event_type: string;
          aggregate_id: string;
          payload: {
            order_id?: string;
            ticket_id?: string;
            requester_id?: string;
            author_id?: string;
            buyer_id?: string;
            seller_id?: string;
            return_id?: string;
            status?: string;
          };
        }>(
          `SELECT id,event_type,aggregate_id,payload FROM outbox_events WHERE processed_at IS NULL ORDER BY created_at LIMIT 30 FOR UPDATE SKIP LOCKED`,
        );
        for (const event of events.rows) {
          const { event_type: type, payload, id } = event;
          if (
            [
              "CheckoutCreated",
              "CheckoutExpired",
              "PaymentApproved",
              "SellerOrderShipped",
              "SellerOrderDelivered",
              "ReturnRequested",
              "ReturnStatusChanged",
            ].includes(type) &&
            payload.order_id
          ) {
            const labels: Record<string, string> = {
              CheckoutCreated: "Checkout creado",
              CheckoutExpired: "Checkout expirado: revisa el estado de tu compra",
              PaymentApproved: "Pago confirmado",
              SellerOrderShipped: "Pedido enviado",
              SellerOrderDelivered: "Entrega confirmada",
              ReturnRequested: "Solicitud de devolución registrada",
              ReturnStatusChanged: "Actualización de devolución",
            };
            await c.query(
              `INSERT INTO notifications(user_id,type,subject,source_event_id)
         SELECT buyer_id,$2,$3,$4 FROM orders WHERE id=$1
         ON CONFLICT DO NOTHING`,
              [payload.order_id, type, labels[type], id],
            );
          }
          if (type === "ReviewModerated" && payload.buyer_id) {
            await c.query(
              `INSERT INTO notifications(user_id,type,subject,source_event_id)
         SELECT id,$2,$3,$4 FROM user_profiles WHERE id=$1 ON CONFLICT DO NOTHING`,
              [
                payload.buyer_id,
                type,
                payload.status === "APPROVED"
                  ? "Tu reseña fue publicada"
                  : "Tu reseña no fue aprobada",
                id,
              ],
            );
          }
          if (type === "SellerApproved" && payload.seller_id) {
            await c.query(
              `INSERT INTO notifications(user_id,type,subject,source_event_id)
         SELECT owner_user_id,$2,'Tu cuenta de vendedor fue aprobada',$3 FROM sellers WHERE id=$1 ON CONFLICT DO NOTHING`,
              [payload.seller_id, type, id],
            );
          }
          if (type === "SellerSuspended" && payload.seller_id) {
            await c.query(
              `INSERT INTO notifications(user_id,type,subject,source_event_id)
         SELECT owner_user_id,$2,'Tu cuenta de vendedor requiere revisión',$3 FROM sellers WHERE id=$1 ON CONFLICT DO NOTHING`,
              [payload.seller_id, type, id],
            );
          }
          if (type === "SupportTicketOpened" && payload.ticket_id) {
            await c.query(
              `INSERT INTO notifications(user_id,type,subject,source_event_id)
         SELECT id,$1,'Nuevo ticket de soporte',$2 FROM user_profiles WHERE role='ADMIN' ON CONFLICT DO NOTHING`,
              [type, id],
            );
          }
          if (type === "SupportTicketMessage" && payload.ticket_id && payload.requester_id) {
            if (payload.author_id !== payload.requester_id) {
              await c.query(
                `INSERT INTO notifications(user_id,type,subject,source_event_id)
           SELECT id,$2,'Nueva respuesta en tu solicitud',$3 FROM user_profiles WHERE id=$1 ON CONFLICT DO NOTHING`,
                [payload.requester_id, type, id],
              );
            } else {
              await c.query(
                `INSERT INTO notifications(user_id,type,subject,source_event_id)
           SELECT id,$1,'Cliente respondió una solicitud',$2 FROM user_profiles WHERE role='ADMIN' ON CONFLICT DO NOTHING`,
                [type, id],
              );
            }
          }
          await c.query("UPDATE outbox_events SET processed_at=now() WHERE id=$1", [id]);
        }
      });
    } catch (e) {
      console.error(
        JSON.stringify({
          level: "error",
          task: "worker",
          error: e instanceof Error ? e.message : "unknown",
        }),
      );
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  await app.close();
}
start().catch(() => process.exit(1));
