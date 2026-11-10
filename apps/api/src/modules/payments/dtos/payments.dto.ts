import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { assertMoneyMinor } from "@nexa/domain";
import { z } from "zod";

export const submitPaymentDto = z.object({
  seller_order_id: z.string().uuid(),
  token: z.string().min(10).max(200),
  payment_method_id: z.string().min(1).max(50),
  installments: z.number().int().min(1).max(36).default(1),
  issuer_id: z.string().max(50).optional(),
  identification_type: z.string().max(20).optional(),
  identification_number: z.string().max(30).optional(),
});

export type PayDto = z.infer<typeof submitPaymentDto>;

export interface SellerPsp {
  seller_id: string;
  access_token_enc: string;
  provider_user_id: string;
  status: string;
}

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
