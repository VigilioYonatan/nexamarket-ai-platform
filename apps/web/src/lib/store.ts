import { computed, signal } from "@preact/signals";
import { api, type Category, type Session, type Theme } from "./api";

export const session = signal<Session>({ authenticated: false });
export const authLoaded = signal(false);
export const cartCount = signal(0);
export const unreadCount = signal(0);
export const categoriesList = signal<Category[]>([]);
export const alertText = signal("");
export const alertSeverity = signal<"success" | "error" | "info">("success");
export const claimsModalOpen = signal(false);

export const routePath = signal<string>(typeof location !== "undefined" ? location.pathname : "/");
export const routeSearch = signal<string>(typeof location !== "undefined" ? location.search : "");

export function syncLocationSignals() {
  if (typeof location === "undefined") return;
  routePath.value = location.pathname;
  routeSearch.value = location.search;
}

export function navigate(href: string, replace = false) {
  if (typeof window === "undefined") return;
  const target = new URL(href, window.location.origin);
  if (target.origin !== window.location.origin) {
    window.location.href = href;
    return;
  }
  const next = `${target.pathname}${target.search}${target.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    if (replace) {
      window.history.replaceState({}, "", next);
    } else {
      window.history.pushState({}, "", next);
    }
  }
  routePath.value = target.pathname;
  routeSearch.value = target.search;
  if (!target.hash) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

export async function refreshUnreadNotifications() {
  if (!session.value.authenticated) {
    unreadCount.value = 0;
    return;
  }
  try {
    const res = await api<{ unread: number }>("/api/v1/me/notifications/unread");
    unreadCount.value = Number(res?.unread ?? 0);
  } catch {
    // Silent fallback when offline or unauthenticated
  }
}

export const theme = signal<Theme>({
  primary: "#2563EB",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  text: "#09090B",
  radius: 12,
  font: "Plus Jakarta Sans",
  brand_name: "NexaMarket",
  hero_title: "Tu próxima gran compra empieza aquí",
  hero_subtitle: "Encuentra tecnología, accesorios y ofertas de vendedores verificados.",
});

export const darkMode = signal<"light" | "dark" | "auto">(
  typeof localStorage !== "undefined"
    ? (localStorage.getItem("nexa_color_mode") as "light" | "dark" | "auto") || "auto"
    : "auto",
);
export const prefersDark = signal(
  typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches,
);
export const actualDark = computed(
  () => darkMode.value === "dark" || (darkMode.value === "auto" && prefersDark.value),
);

export function setColorMode(mode: "light" | "dark" | "auto") {
  darkMode.value = mode;
  localStorage.setItem("nexa_color_mode", mode);
  applyTheme();
}

export function cycleColorMode() {
  const next = darkMode.value === "auto" ? "dark" : darkMode.value === "dark" ? "light" : "auto";
  setColorMode(next);
}

function liftBrandForDark(hex: string): string {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum >= 0.42) return `#${clean}`;
  const mix = 0.36;
  const nr = Math.min(255, Math.round(r + (255 - r) * mix));
  const ng = Math.min(255, Math.round(g + (255 - g) * mix));
  const nb = Math.min(255, Math.round(b + (255 - b) * mix));
  return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function applyTheme() {
  if (typeof document === "undefined") return;
  const isDark = actualDark.value;
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  const t = theme.value;

  const brandColor = isDark ? liftBrandForDark(t.primary) : t.primary;
  document.documentElement.style.setProperty("--brand", brandColor);
  document.documentElement.style.setProperty("--radius-card", `${t.radius}px`);
  document.documentElement.style.setProperty(
    "--brand-font",
    `'${t.font}', 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  );

  if (!isDark) {
    document.documentElement.style.setProperty("--page", t.background);
    document.documentElement.style.setProperty("--surface", t.surface);
    document.documentElement.style.setProperty("--ink", t.text);
  } else {
    document.documentElement.style.removeProperty("--page");
    document.documentElement.style.removeProperty("--surface");
    document.documentElement.style.removeProperty("--ink");
  }
}

export function notify(message: string, severity?: "success" | "error" | "info") {
  alertText.value = message;
  const isErr = /error|fall|rechaz|inval|falla|bloquead|no pud|no encont/i.test(message);
  alertSeverity.value = severity ?? (isErr ? "error" : "success");
  setTimeout(() => {
    if (alertText.value === message) alertText.value = "";
  }, 4200);
}
