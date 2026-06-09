import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
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
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { assertMoneyMinor } from "@nexa/domain";
import type { Request } from "express";
import { cfg } from "../config.js";
import { PgStore } from "../infrastructure/db.js";
import { seal, unseal } from "../shared/crypto.js";
import { submitPaymentDto } from "../shared/dto.js";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  parseUuid,
  SellerGuard,
  SessionGuard,
  sha256Hex,
  ZodPipe,
} from "../shared/http.js";

const MP_API = "https://api.mercadopago.com";

/** External provider decimal amounts cross a trust boundary: convert only exact cents. */
export function providerMinor(value: unknown): number {
  const v = String(value);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(v))
    throw new BadRequestException({ code: "INVALID_PROVIDER_AMOUNT" });
  const [whole, fraction = ""] = v.split(".");
  return assertMoneyMinor(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}
export function verifyMpSignature(
  signature: string | undefined,
  requestId: string | undefined,
  dataId: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!signature || !requestId || !dataId || !secret) return false;
  const parts = Object.fromEntries(signature.split(",").map((x) => x.trim().split("=")));
  const ts = parts.ts,
    v1 = parts.v1;
  if (!ts || !v1 || !/^\d{10,13}$/.test(ts) || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const time = Number(ts) * (ts.length === 10 ? 1000 : 1);
  if (Math.abs(now - time) > 5 * 60_000) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const actual = Buffer.from(v1, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
interface SellerPsp {
  seller_id: string;
  access_token_enc: string;
  provider_user_id: string;
  status: string;
}
interface PayDto {
  seller_order_id: string;
  token: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: string;
  identification_type?: string;
  identification_number?: string;
}
@Injectable()
export class MercadoPagoService {
  constructor(private readonly db: PgStore) {}
  async call<T = Record<string, unknown>>(
    path: string,
    token: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${MP_API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      const err = new Error(`Mercado Pago HTTP ${response.status}`);
      (err as Error & { status: number }).status = response.status;
      throw err;
    }
    return (await response.json()) as T;
  }
  /** Refresh access tokens outside SQL transactions; never log or expose either credential. */
  async sellerAccessToken(seller_id: string): Promise<string> {
    const row = await this.db.one<{
      access_token_enc: string;
      refresh_token_enc: string;
      expires_at: Date;
      status: string;
    }>(
      `SELECT access_token_enc,refresh_token_enc,expires_at,status FROM seller_mp_connections WHERE seller_id=$1`,
      [seller_id],
    );
    if (row?.status !== "CONNECTED")
      throw new ServiceUnavailableException({ code: "MP_SELLER_DISCONNECTED" });
    if (new Date(row.expires_at).getTime() > Date.now() + 60000)
      return unseal(row.access_token_enc);
    const refreshToken = unseal(row.refresh_token_enc);
    const response = await fetch(`${MP_API}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: cfg.MP_CLIENT_ID,
        client_secret: cfg.MP_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new ServiceUnavailableException({ code: "MP_REFRESH_FAILED" });
    const token = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!token.access_token || !token.refresh_token)
      throw new ServiceUnavailableException({ code: "MP_REFRESH_MALFORMED" });
    await this.db.query(
      `UPDATE seller_mp_connections SET access_token_enc=$2,refresh_token_enc=$3,expires_at=now()+($4||' seconds')::interval WHERE seller_id=$1`,
      [
        seller_id,
        seal(token.access_token),
        seal(token.refresh_token),
        String(token.expires_in ?? 21600),
      ],
    );
    return token.access_token;
  }
  async sellerOauthUrl(seller_id: string) {
    const state = randomBytes(32).toString("base64url");
    await this.db.query(
      `INSERT INTO seller_oauth_flows(seller_id,state_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes')`,
      [seller_id, sha256Hex(state)],
    );
    const url = new URL("https://auth.mercadopago.com.pe/authorization");
    url.search = new URLSearchParams({
      client_id: cfg.MP_CLIENT_ID,
      response_type: "code",
      platform_id: "mp",
      redirect_uri: cfg.MP_REDIRECT_URI,
      state,
    }).toString();
    return { url: url.toString() };
  }
  async oauthCallback(code: string, state: string) {
    if (!code || !state) throw new BadRequestException({ code: "MISSING_OAUTH_CODE" });
    const flow = await this.db.one<{ seller_id: string }>(
      `DELETE FROM seller_oauth_flows WHERE state_hash=$1 AND expires_at>now() RETURNING seller_id`,
      [sha256Hex(state)],
    );
    if (!flow) throw new UnauthorizedException({ code: "INVALID_OAUTH_STATE" });
    const result = await fetch(`${MP_API}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: cfg.MP_CLIENT_ID,
        client_secret: cfg.MP_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: cfg.MP_REDIRECT_URI,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!result.ok) throw new ServiceUnavailableException({ code: "MP_OAUTH_FAILED" });
    const data = (await result.json()) as {
      access_token?: string;
      refresh_token?: string;
      user_id?: number | string;
      expires_in?: number;
    };
    if (!data.access_token || !data.refresh_token || !data.user_id)
      throw new ServiceUnavailableException({ code: "MP_OAUTH_INVALID_RESPONSE" });
    await this.db.query(
      `INSERT INTO seller_mp_connections(seller_id,provider_user_id,access_token_enc,refresh_token_enc,expires_at,status)
      VALUES($1,$2,$3,$4,now()+($5||' seconds')::interval,'CONNECTED') ON CONFLICT(seller_id) DO UPDATE SET
      provider_user_id=EXCLUDED.provider_user_id,access_token_enc=EXCLUDED.access_token_enc,refresh_token_enc=EXCLUDED.refresh_token_enc,
      expires_at=EXCLUDED.expires_at,status='CONNECTED'`,
      [
        flow.seller_id,
        String(data.user_id),
        seal(data.access_token),
        seal(data.refresh_token),
        String(data.expires_in ?? 21600),
      ],
    );
    return { connected: true };
  }
  async pay(buyer_id: string, input: PayDto, key: string) {
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key))
      throw new BadRequestException({ code: "IDEMPOTENCY_KEY_REQUIRED" });
    // Claim attempt in DB BEFORE calling MP. A crashed request must be reconciled, never submitted twice blindly.
    const attempt = await this.db.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,1))", [
        `${buyer_id}:${key}`,
      ]);
      const previous = await client.query(
        `SELECT id,status,provider_payment_id,seller_order_id FROM payment_attempts WHERE buyer_id=$1 AND idempotency_key=$2`,
        [buyer_id, key],
      );
      if (previous.rowCount) {
        if (previous.rows[0].seller_order_id !== input.seller_order_id)
          throw new ConflictException({ code: "IDEMPOTENCY_KEY_REUSED" });
        return { record: previous.rows[0], created: false };
      }
      // Serialize payments with order cancellation and checkout expiration.
      // Lock parent BEFORE seller order, matching the order cancellation path.
      const parent = await client.query<{ status: string }>(
        `SELECT o.status FROM orders o
        JOIN seller_orders so ON so.order_id=o.id
        WHERE so.id=$1 AND o.buyer_id=$2 FOR UPDATE OF o`,
        [input.seller_order_id, buyer_id],
      );
      if (!parent.rows[0]) throw new NotFoundException({ code: "SELLER_ORDER_NOT_FOUND" });
      if (!["AWAITING_PAYMENT", "PARTIALLY_PAID"].includes(parent.rows[0].status))
        throw new ConflictException({ code: "PARENT_ORDER_NOT_PAYABLE" });
      const r = await client.query<{
        id: string;
        order_id: string;
        seller_id: string;
        subtotal_minor: number;
        status: string;
        buyer_email: string;
      }>(
        `SELECT so.id,so.order_id,so.seller_id,so.subtotal_minor,so.status,p.email AS buyer_email
        FROM seller_orders so JOIN orders o ON o.id=so.order_id JOIN user_profiles p ON p.id=o.buyer_id
        JOIN checkout_sessions cs ON cs.order_id=o.id WHERE so.id=$1 AND o.buyer_id=$2 AND cs.expires_at>now() FOR UPDATE OF so`,
        [input.seller_order_id, buyer_id],
      );
      const group = r.rows[0];
      if (!group) throw new NotFoundException({ code: "CHECKOUT_EXPIRED_OR_UNKNOWN" });
      if (group.status !== "AWAITING_PAYMENT")
        throw new ConflictException({ code: "SELLER_ORDER_NOT_PAYABLE" });
      const pending = await client.query(
        `SELECT id FROM payment_attempts WHERE seller_order_id=$1 AND status IN ('SUBMITTED','PENDING','APPROVED')`,
        [group.id],
      );
      if (pending.rowCount) throw new ConflictException({ code: "PAYMENT_ALREADY_IN_PROGRESS" });
      const seller = await client.query(
        `SELECT mc.id FROM seller_mp_connections mc JOIN sellers s ON s.id=mc.seller_id AND s.status='APPROVED' WHERE mc.seller_id=$1 AND mc.status='CONNECTED'`,
        [group.seller_id],
      );
      if (!seller.rowCount) throw new ConflictException({ code: "SELLER_MP_DISCONNECTED" });
      const created = await client.query(
        `INSERT INTO payment_attempts(order_id,seller_order_id,buyer_id,seller_id,amount_minor,status,idempotency_key)
        VALUES($1,$2,$3,$4,$5,'SUBMITTED',$6) RETURNING id,status,provider_payment_id`,
        [group.order_id, group.id, buyer_id, group.seller_id, group.subtotal_minor, key],
      );
      return { record: created.rows[0], created: true };
    });
    const record = attempt.record as {
      id: string;
      status: string;
      provider_payment_id: string | null;
    };
    if (!attempt.created)
      return {
        attempt_id: record.id,
        status: record.status,
        provider_payment_id: record.provider_payment_id,
        notice: "Reintento idempotente; no se crea otro cobro.",
      };
    const detail = await this.db.one<{
      seller_id: string;
      amount_minor: number;
      application_fee_minor: number;
      email: string | null;
    }>(
      `SELECT pa.seller_id,pa.amount_minor,so.application_fee_minor,u.email
      FROM payment_attempts pa JOIN seller_orders so ON so.id=pa.seller_order_id JOIN user_profiles u ON u.id=pa.buyer_id
      WHERE pa.id=$1`,
      [record.id],
    );
    if (!detail) throw new ServiceUnavailableException({ code: "MP_CONNECTION_MISSING" });
    try {
      const payload: Record<string, unknown> = {
        transaction_amount: Number((detail.amount_minor / 100).toFixed(2)),
        token: input.token,
        description: `NexaMarket seller order ${input.seller_order_id}`,
        installments: input.installments,
        payment_method_id: input.payment_method_id,
        external_reference: record.id,
        application_fee: Number((detail.application_fee_minor / 100).toFixed(2)),
        payer: {
          email: detail.email,
          ...(input.identification_type && input.identification_number
            ? {
                identification: {
                  type: input.identification_type,
                  number: input.identification_number,
                },
              }
            : {}),
        },
      };
      if (input.issuer_id) payload.issuer_id = input.issuer_id;
      const payment = await this.call<{ id: number | string; status: string }>(
        `/v1/payments`,
        await this.sellerAccessToken(detail.seller_id),
        {
          method: "POST",
          headers: { "X-Idempotency-Key": record.id },
          body: JSON.stringify(payload),
        },
      );
      if (payment.id === undefined || payment.id === null || !/^[0-9]+$/.test(String(payment.id)))
        throw new ServiceUnavailableException({
          code: "MP_MALFORMED_RESPONSE_RECONCILIATION_REQUIRED",
        });
      await this.db.query(
        `UPDATE payment_attempts SET provider_payment_id=$2,status='PENDING',updated_at=now() WHERE id=$1 AND status='SUBMITTED'`,
        [record.id, String(payment.id)],
      );
      await this.synchronizePayment(String(payment.id), record.id);
      const updated = await this.db.one(
        "SELECT id AS attempt_id,status,provider_payment_id FROM payment_attempts WHERE id=$1",
        [record.id],
      );
      return updated;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 400 || status === 422) {
        await this.db.query(
          `UPDATE payment_attempts SET status='REJECTED',updated_at=now() WHERE id=$1 AND status='SUBMITTED'`,
          [record.id],
        );
        throw new BadRequestException({ code: "PAYMENT_REJECTED_BY_PROVIDER" });
      }
      // Do not re-send blindly after ambiguous timeout. Worker/operations must reconcile.
      return {
        attempt_id: record.id,
        status: "SUBMITTED",
        notice:
          "Respuesta del proveedor no confirmada. Consultar estado; no reintentar un nuevo cargo automáticamente.",
      };
    }
  }
  /** Read-only reconciliation queue; ambiguous attempts MUST NOT be charged twice. */
  reconciliationQueue() {
    return this.db.query(`SELECT id,seller_order_id,amount_minor,status,provider_payment_id,created_at,updated_at
    FROM payment_attempts WHERE status IN ('SUBMITTED','PENDING','REJECTED')
    ORDER BY created_at ASC LIMIT 100`);
  }
  async reconcileByAdmin(admin_id: string, attempt_id: string) {
    const attempt = await this.db.one<{
      id: string;
      status: string;
      provider_payment_id: string | null;
    }>("SELECT id,status,provider_payment_id FROM payment_attempts WHERE id=$1", [attempt_id]);
    if (!attempt) throw new NotFoundException({ code: "PAYMENT_ATTEMPT_NOT_FOUND" });
    if (!attempt.provider_payment_id)
      throw new ConflictException({ code: "PROVIDER_ID_UNKNOWN_MANUAL_INVESTIGATION_REQUIRED" });
    await this.synchronizePayment(attempt.provider_payment_id, attempt.id);
    await this.db.query(
      `INSERT INTO audit_events(actor_user_id,action,resource_id)
      VALUES($1,'PAYMENT_RECONCILED',$2)`,
      [admin_id, attempt_id],
    );
    return this.db.one(
      "SELECT id,status,provider_payment_id,updated_at FROM payment_attempts WHERE id=$1",
      [attempt_id],
    );
  }
  async ledgerHealth() {
    return this.db.one<{
      unbalanced_count: number;
    }>(`SELECT count(*)::int AS unbalanced_count FROM (
    SELECT j.id FROM ledger_journals j LEFT JOIN ledger_postings p ON p.journal_id=j.id
    GROUP BY j.id HAVING COALESCE(sum(p.amount_minor),0)<>0) unbalanced`);
  }
  async getAttempt(buyer_id: string, id: string) {
    const a = await this.db.one(
      "SELECT id,status,provider_payment_id,amount_minor FROM payment_attempts WHERE id=$1 AND buyer_id=$2",
      [id, buyer_id],
    );
    if (!a) throw new NotFoundException();
    return a;
  }
  async acceptWebhook(input: {
    signature?: string;
    requestId?: string;
    dataId?: string;
    body: {
      type?: string;
      action?: string;
      id?: string | number;
      user_id?: string | number;
      data?: { id?: string | number };
    };
  }) {
    if (!verifyMpSignature(input.signature, input.requestId, input.dataId, cfg.MP_WEBHOOK_SECRET))
      throw new UnauthorizedException({ code: "INVALID_MP_SIGNATURE" });
    if (input.body.type !== "payment" || !input.body.data?.id)
      return { accepted: true, ignored: true };
    const paymentId = String(input.body.data.id);
    if (paymentId !== input.dataId)
      throw new UnauthorizedException({ code: "WEBHOOK_BODY_QUERY_MISMATCH" });
    const eventId = `payment:${String(input.body.id ?? "none")}:${input.body.action ?? "unknown"}:${paymentId}`;
    await this.db.query(
      `INSERT INTO psp_webhook_inbox(event_key,provider_payment_id,provider_user_id) VALUES($1,$2,$3) ON CONFLICT(event_key) DO NOTHING`,
      [eventId, paymentId, String(input.body.user_id ?? "")],
    );
    return { accepted: true };
  }
  async synchronizePayment(
    provider_payment_id: string,
    knownAttemptId?: string,
    mpUserId?: string,
  ) {
    // The provider_user_id comes from the signed notification (when present) or from saved local attempt.
    const attempt = knownAttemptId
      ? await this.db.one<{ id: string; seller_id: string }>(
          `SELECT id,seller_id FROM payment_attempts WHERE id=$1`,
          [knownAttemptId],
        )
      : null;
    const knownProviderAttempt = !attempt
      ? await this.db.one<{ seller_id: string }>(
          `SELECT seller_id FROM payment_attempts WHERE provider_payment_id=$1`,
          [provider_payment_id],
        )
      : null;
    const connection =
      attempt || knownProviderAttempt
        ? await this.db.one<SellerPsp>(
            `SELECT * FROM seller_mp_connections WHERE seller_id=$1 AND status='CONNECTED'`,
            [(attempt ?? knownProviderAttempt)!.seller_id],
          )
        : await this.db.one<SellerPsp>(
            `SELECT * FROM seller_mp_connections WHERE provider_user_id=$1 AND status='CONNECTED'`,
            [mpUserId ?? ""],
          );
    if (!connection) throw new Error("Unknown seller for payment notification");
    const payment = await this.call<{
      id: number | string;
      status: string;
      transaction_amount: number | string;
      external_reference?: string;
      user_id?: string | number;
    }>(
      `/v1/payments/${encodeURIComponent(provider_payment_id)}`,
      await this.sellerAccessToken(connection.seller_id),
    );
    if (String(payment.id) !== provider_payment_id || !payment.external_reference)
      throw new Error("Provider payment correlation failed");
    const paid = providerMinor(payment.transaction_amount);
    await this.db.transaction(async (client) => {
      const row = await client.query<{
        id: string;
        order_id: string;
        seller_order_id: string;
        amount_minor: number;
        application_fee_minor: number;
        status: string;
        seller_id: string;
      }>(
        `SELECT pa.id,pa.order_id,pa.seller_order_id,pa.amount_minor,so.application_fee_minor,pa.status,pa.seller_id FROM payment_attempts pa JOIN seller_orders so ON so.id=pa.seller_order_id WHERE pa.id=$1 FOR UPDATE OF pa`,
        [payment.external_reference],
      );
      const a = row.rows[0];
      if (!a || a.seller_id !== connection.seller_id || a.amount_minor !== paid)
        throw new Error("Provider payment amount or owner mismatch");
      if (a.status === "APPROVED") return;
      if (payment.status === "approved") {
        if (!["PENDING", "SUBMITTED"].includes(a.status))
          throw new Error("Payment invalid transition");
        const orderQuery = await client.query<{ status: string }>(
          `SELECT status FROM orders WHERE id=$1`,
          [a.order_id],
        );
        const isCancelled = orderQuery.rows[0]?.status === "CANCELLED";
        await client.query(
          `UPDATE payment_attempts SET status='APPROVED',provider_payment_id=$2,updated_at=now() WHERE id=$1`,
          [a.id, provider_payment_id],
        );
        if (isCancelled) {
          const journal = await client.query<{ id: string }>(
            `INSERT INTO ledger_journals(source_type,source_id,currency) VALUES('PAYMENT',$1,'PEN') ON CONFLICT(source_type,source_id) DO NOTHING RETURNING id`,
            [a.id],
          );
          if (journal.rows[0])
            await client.query(
              `INSERT INTO ledger_postings(journal_id,account,amount_minor,currency) VALUES($1,'MP_RECEIVABLE',$2,'PEN'),($1,'LATE_PAYMENT_REFUND_DUE',-$2,'PEN')`,
              [journal.rows[0].id, paid],
            );
          await client.query(
            "INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,$2,$3)",
            [null, "LATE_PAYMENT_REQUIRES_REFUND", a.id],
          );
          await client.query(
            "INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES($1,$2,$3)",
            [
              "PaymentCompensationRequired",
              a.id,
              JSON.stringify({
                order_id: a.order_id,
                payment_attempt_id: a.id,
                amount_minor: paid,
                reason: "RESERVATION_EXPIRED",
              }),
            ],
          );
          return;
        }
        await client.query(
          `UPDATE seller_orders SET status='PAID' WHERE id=$1 AND status='AWAITING_PAYMENT'`,
          [a.seller_order_id],
        );
        const lines = await client.query<{ listing_id: string; quantity: number }>(
          `UPDATE stock_reservations SET status='CONSUMED' WHERE order_id=$1 AND status='HELD' AND listing_id IN
          (SELECT listing_id FROM order_lines WHERE seller_order_id=$2) RETURNING listing_id,quantity`,
          [a.order_id, a.seller_order_id],
        );
        for (const l of lines.rows) {
          const r = await client.query(
            `UPDATE inventory_stock SET reserved=reserved-$2,on_hand=on_hand-$2,version=version+1 WHERE listing_id=$1 AND reserved >= $2 RETURNING listing_id`,
            [l.listing_id, l.quantity],
          );
          if (!r.rowCount) throw new Error("Reservation invariant violated");
        }
        const journal = await client.query<{ id: string }>(
          `INSERT INTO ledger_journals(source_type,source_id,currency) VALUES('PAYMENT',$1,'PEN') ON CONFLICT(source_type,source_id) DO NOTHING RETURNING id`,
          [a.id],
        );
        if (journal.rows[0])
          await client.query(
            `INSERT INTO ledger_postings(journal_id,account,amount_minor,currency) VALUES($1,'MP_RECEIVABLE',$2,'PEN'),($1,'SELLER_PAYABLE',$3,'PEN'),($1,'PLATFORM_FEE_RECEIVABLE',$4,'PEN')`,
            [journal.rows[0].id, paid, -(paid - a.application_fee_minor), -a.application_fee_minor],
          );
        const remaining = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM seller_orders WHERE order_id=$1 AND status NOT IN ('PAID','PREPARING','SHIPPED','DELIVERED')`,
          [a.order_id],
        );
        await client.query("UPDATE orders SET status=$2 WHERE id=$1", [
          a.order_id,
          Number(remaining.rows[0]!.count) === 0 ? "PAID" : "PARTIALLY_PAID",
        ]);
        await client.query(
          "INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES($1,$2,$3)",
          [
            "PaymentApproved",
            a.id,
            JSON.stringify({ order_id: a.order_id, seller_order_id: a.seller_order_id }),
          ],
        );
      } else if (["rejected", "cancelled"].includes(payment.status)) {
        await client.query(
          `UPDATE payment_attempts SET status='REJECTED',provider_payment_id=$2,updated_at=now() WHERE id=$1 AND status IN ('SUBMITTED','PENDING')`,
          [a.id, provider_payment_id],
        );
      } else {
        await client.query(
          `UPDATE payment_attempts SET status='PENDING',provider_payment_id=$2,updated_at=now() WHERE id=$1 AND status IN ('SUBMITTED','PENDING')`,
          [a.id, provider_payment_id],
        );
      }
    });
  }
  async processInbox() {
    const events = await this.db.query<{
      id: string;
      provider_payment_id: string;
      provider_user_id: string | null;
    }>(
      `SELECT wi.id,wi.provider_payment_id,wi.provider_user_id FROM psp_webhook_inbox wi WHERE processed_at IS NULL AND attempts<12 ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED`,
    );
    for (const event of events) {
      try {
        await this.synchronizePayment(
          event.provider_payment_id,
          undefined,
          event.provider_user_id ?? undefined,
        );
        await this.db.query("UPDATE psp_webhook_inbox SET processed_at=now() WHERE id=$1", [
          event.id,
        ]);
      } catch (_e) {
        await this.db.query(
          `UPDATE psp_webhook_inbox SET attempts=attempts+1,last_error_code='SYNC_FAILED' WHERE id=$1`,
          [event.id],
        );
      }
    }
    return events.length;
  }
  async disconnectSeller(seller_id: string) {
    await this.db.query(
      `UPDATE seller_mp_connections SET status='DISCONNECTED' WHERE seller_id=$1`,
      [seller_id],
    );
    return { status: "DISCONNECTED" };
  }
}
@Controller("api/v1")
@UseGuards(SessionGuard)
export class PaymentController {
  constructor(private readonly payments: MercadoPagoService) {}
  @Post("payment-attempts") pay(
    @CurrentUser() p: Principal,
    @Headers("idempotency-key") key: string,
    @Body(new ZodPipe(submitPaymentDto)) d: PayDto,
  ) {
    return this.payments.pay(p.user_id, d, key);
  }
  @Get("payment-attempts/:id") get(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.payments.getAttempt(p.user_id, parseUuid(id));
  }
  @Get("payments/public-config") publicConfig() {
    return { public_key: cfg.MP_PUBLIC_KEY, provider: "MERCADO_PAGO", currency: "PEN" };
  }
}
@Controller("api/v1/seller/mercado-pago")
@UseGuards(SessionGuard, SellerGuard)
export class SellerMercadoPagoController {
  constructor(private readonly mp: MercadoPagoService) {}
  @Post("authorize") url(@CurrentUser() p: Principal) {
    return this.mp.sellerOauthUrl(p.seller_id!);
  }
  @Post("disconnect") disconnect(@CurrentUser() p: Principal) {
    return this.mp.disconnectSeller(p.seller_id!);
  }
}
@Controller("integrations/mercado-pago")
export class MercadoPagoCallbackController {
  constructor(private readonly mp: MercadoPagoService) {}
  @Get("oauth/callback") oauth(@Query("code") code: string, @Query("state") state: string) {
    return this.mp.oauthCallback(code, state);
  }
  @Post("webhooks") webhook(
    @Req() req: Request,
    @Headers("x-signature") signature: string,
    @Headers("x-request-id") requestId: string,
    @Query("data.id") dataId: string,
  ) {
    const body = req.body as {
      type?: string;
      id?: string | number;
      action?: string;
      user_id?: string | number;
      data?: { id?: string | number };
    };
    return this.mp.acceptWebhook({ signature, requestId, dataId, body });
  }
}

@Controller("api/v1/admin/payments")
@UseGuards(SessionGuard, AdminGuard)
export class AdminPaymentController {
  constructor(private readonly payments: MercadoPagoService) {}
  @Get("reconciliation-queue") list() {
    return this.payments.reconciliationQueue();
  }
  @Get("ledger-health") ledger() {
    return this.payments.ledgerHealth();
  }
  @Post("payment-attempts/:id/reconcile") reconcile(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
  ) {
    return this.payments.reconcileByAdmin(p.user_id, parseUuid(id));
  }
}
