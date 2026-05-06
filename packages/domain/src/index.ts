/** Pure domain invariants: no framework or persistence imports. */
export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";
export type PaymentStatus =
  | "CREATED"
  | "SUBMITTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "REFUNDED";
export type SellerStatus = "APPLIED" | "REVIEWING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "DomainError";
  }
}
export function assertPositiveQty(qty: number): number {
  if (!Number.isSafeInteger(qty) || qty <= 0 || qty > 1000)
    throw new DomainError("INVALID_QUANTITY", "Cantidad inválida");
  return qty;
}
export function assertMoneyMinor(v: number): number {
  if (!Number.isSafeInteger(v) || v < 0 || v > 999_999_999_999)
    throw new DomainError("INVALID_MONEY", "Importe inválido");
  return v;
}
export function lineTotal(unit_price_minor: number, qty: number): number {
  assertMoneyMinor(unit_price_minor);
  assertPositiveQty(qty);
  const n = unit_price_minor * qty;
  return assertMoneyMinor(n);
}
export function cartTotal(
  lines: readonly { unit_price_minor: number; quantity: number }[],
): number {
  return lines.reduce(
    (sum, l) => assertMoneyMinor(sum + lineTotal(l.unit_price_minor, l.quantity)),
    0,
  );
}
export function inventoryAvailable(on_hand: number, reserved: number): number {
  if (
    !Number.isSafeInteger(on_hand) ||
    !Number.isSafeInteger(reserved) ||
    on_hand < 0 ||
    reserved < 0 ||
    reserved > on_hand
  )
    throw new DomainError("INVALID_INVENTORY", "Inventario inconsistente");
  return on_hand - reserved;
}
export function assertCanReserve(on_hand: number, reserved: number, quantity: number): void {
  assertPositiveQty(quantity);
  if (inventoryAvailable(on_hand, reserved) < quantity)
    throw new DomainError("INSUFFICIENT_STOCK", "No hay existencias suficientes");
}
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  AWAITING_PAYMENT: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
  PARTIALLY_PAID: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "PARTIALLY_REFUNDED", "REFUNDED"],
  PREPARING: ["SHIPPED", "PARTIALLY_REFUNDED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "PARTIALLY_REFUNDED", "REFUNDED"],
  DELIVERED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  CANCELLED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
  REFUNDED: [],
};
export function advanceOrder(current: OrderStatus, next: OrderStatus): OrderStatus {
  if (!transitions[current].includes(next))
    throw new DomainError(
      "INVALID_ORDER_TRANSITION",
      `Transición ${current} → ${next} no permitida`,
    );
  return next;
}
export function assertRefundAllowed(
  paid_minor: number,
  refunded_minor: number,
  request_minor: number,
): void {
  assertMoneyMinor(paid_minor);
  assertMoneyMinor(refunded_minor);
  assertMoneyMinor(request_minor);
  if (request_minor === 0 || refunded_minor + request_minor > paid_minor)
    throw new DomainError("REFUND_EXCEEDS_PAYMENT", "Reembolso excede importe pagado");
}
export function validateJournal(
  postings: readonly { currency: string; amount_minor: number }[],
): void {
  if (postings.length < 2) throw new DomainError("UNBALANCED_JOURNAL", "Asiento incompleto");
  const sums = new Map<string, number>();
  for (const p of postings) {
    if (!Number.isSafeInteger(p.amount_minor))
      throw new DomainError("INVALID_MONEY", "Asiento inválido");
    sums.set(p.currency, (sums.get(p.currency) ?? 0) + p.amount_minor);
  }
  for (const n of sums.values())
    if (n !== 0) throw new DomainError("UNBALANCED_JOURNAL", "Asiento desbalanceado");
}
export type ThemeTokens = {
  primary: string;
  background: string;
  surface: string;
  text: string;
  radius: number;
  font: string;
  brand_name?: string;
  logo_url?: string;
  hero_title?: string;
  hero_subtitle?: string;
};
const color = /^#[0-9a-fA-F]{6}$/;
const allowedFonts = new Set([
  "Inter",
  "Plus Jakarta Sans",
  "Roboto",
  "Source Sans 3",
  "Nunito",
  "system-ui",
]);
function relativeLuminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrastRatio(a: string, b: string): number {
  if (!color.test(a) || !color.test(b)) throw new DomainError("INVALID_COLOR", "Color inválido");
  const x = relativeLuminance(a),
    y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function validateTheme(t: ThemeTokens): ThemeTokens {
  for (const k of ["primary", "background", "surface", "text"] as const)
    if (!color.test(t[k])) throw new DomainError("INVALID_COLOR", `Color ${k} inválido`);
  if (!allowedFonts.has(t.font) || !Number.isInteger(t.radius) || t.radius < 0 || t.radius > 24)
    throw new DomainError("INVALID_THEME", "Valores de tema no permitidos");
  if (
    contrastRatio(t.text, t.background) < 4.5 ||
    contrastRatio(t.text, t.surface) < 4.5 ||
    contrastRatio("#FFFFFF", t.primary) < 4.5
  )
    throw new DomainError("LOW_CONTRAST", "Contraste insuficiente");
  if (t.brand_name && (t.brand_name.length < 2 || t.brand_name.length > 60))
    throw new DomainError("INVALID_BRAND_NAME", "Nombre comercial inválido");
  if (t.logo_url && !/^\/(logo\.svg|media\/brand\/[0-9a-f-]{36}\.webp)$/i.test(t.logo_url))
    throw new DomainError("INVALID_BRAND_ASSET", "Logo debe ser asset interno");
  if ((t.hero_title?.length ?? 0) > 100 || (t.hero_subtitle?.length ?? 0) > 240)
    throw new DomainError("INVALID_COPY", "Texto demasiado largo");
  return { ...t };
}
export const defaultTheme: ThemeTokens = {
  primary: "#2563EB",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  radius: 12,
  font: "Plus Jakarta Sans",
  brand_name: "NexaMarket",
  logo_url: "/logo.svg",
  hero_title: "Tu próxima gran compra empieza aquí",
  hero_subtitle: "Explora tecnología y ofertas de vendedores verificados.",
};
export function uniqueSellerGroups<T extends { seller_id: string }>(
  items: readonly T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.seller_id) ?? [];
    list.push(item);
    groups.set(item.seller_id, list);
  }
  return groups;
}

/** GS1 GTIN-8/12/13/14 check digit. Without a valid GTIN the catalog must not merge seller products automatically. */
export function validGtin(gtin: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin)) return false;
  const digits = [...gtin].map(Number),
    check = digits.pop()!;
  let sum = 0;
  for (let i = digits.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3)
    sum += digits[i]! * weight;
  return (10 - (sum % 10)) % 10 === check;
}
export function assertCartBound(existing: number, increment: number, available: number): number {
  if (
    !Number.isSafeInteger(existing) ||
    existing < 0 ||
    !Number.isSafeInteger(increment) ||
    increment <= 0 ||
    !Number.isSafeInteger(available) ||
    available < 0
  )
    throw new DomainError("INVALID_CART_QUANTITY", "Cantidad inválida");
  const next = existing + increment;
  if (next > 100 || next > available)
    throw new DomainError("CART_QUANTITY_EXCEEDS_STOCK_OR_LIMIT", "Cantidad excedida");
  return next;
}
export type ReviewState = "PENDING" | "APPROVED" | "REJECTED";
export function moderateReview(
  current: ReviewState,
  decision: "APPROVED" | "REJECTED",
): ReviewState {
  if (current !== "PENDING")
    throw new DomainError("REVIEW_NOT_PENDING", "La reseña ya se ha moderado");
  return decision;
}
