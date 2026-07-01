export type SessionUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: "BUYER" | "ADMIN" | "STAFF";
  seller_id: string | null;
  avatar_url?: string | null;
};
export type Session = { authenticated: false } | { authenticated: true; user: SessionUser };
export type Product = {
  listing_id: string;
  product_id: string;
  title: string;
  description: string;
  image_url: string | null;
  price_minor: number;
  currency: string;
  available: number;
  category?: string;
  seller_name: string;
  seller_id: string;
  brand?: string;
  model?: string;
  gtin?: string;
  specifications?: Record<string, unknown>;
};
export type CartLine = {
  id: string;
  listing_id: string;
  quantity: number;
  title: string;
  image_url: string | null;
  price_minor: number;
  currency: string;
  available: number;
  seller_name: string;
  seller_id: string;
};
export type Cart = { lines: CartLine[]; total_minor: number; currency: string };
export type SellerGroup = {
  seller_order_id: string;
  seller_id: string;
  seller_name: string;
  subtotal_minor: number;
  status: string;
};
export type Checkout = {
  order: { id: string; total_minor: number; status: string; expires_at: string };
  seller_groups: SellerGroup[];
  multi_seller: boolean;
  warning?: string;
};
export type Theme = {
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
export type Category = {
  id: string;
  slug: string;
  name: string;
  parent_id?: string | null;
  icon?: string | null;
  image_url?: string | null;
  item_count?: number;
};
export type SellerPublicProfile = {
  id: string;
  display_name: string;
  created_at: string;
  items?: Product[];
};
export type BuyerReturnRequest = {
  id: string;
  order_id: string;
  seller_order_id: string | null;
  status: string;
  reason: string;
  created_at: string;
};
export type PaymentAttemptDetail = {
  id: string;
  status: string;
  provider_payment_id: string | null;
  amount_minor: number;
};
export type ApiError = Error & { code?: string; status?: number };
function csrf() {
  return (
    document.cookie
      .split("; ")
      .find((x) => x.startsWith("nexa_csrf="))
      ?.split("=")[1] ?? ""
  );
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
  if (!["GET", "HEAD"].includes(method)) headers.set("x-csrf-token", csrf());
  const response = await fetch(path, { ...init, method, headers, credentials: "same-origin" });
  const type = response.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await response.json() : await response.text();
  if (!response.ok) {
    const e = new Error(
      typeof data?.message === "string" ? data.message : "No pudimos completar la solicitud",
    ) as ApiError;
    e.code = data?.code ?? `HTTP_${response.status}`;
    e.status = response.status;
    throw e;
  }
  return data as T;
}
export function json(
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
): RequestInit {
  return { method, body: JSON.stringify(body), headers };
}
export function money(minor: number | string) {
  const value = Number(minor) / 100;
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}
export function toError(e: unknown) {
  return e instanceof Error ? e.message : "Se produjo un error inesperado";
}
export function signIn(back = location.pathname) {
  window.location.href = `/auth/login?return_to=${encodeURIComponent(back)}`;
}
export function signUp(back = location.pathname) {
  window.location.href = `/auth/register?return_to=${encodeURIComponent(back)}`;
}
export function newKey() {
  return crypto.randomUUID().replaceAll("-", "");
}
