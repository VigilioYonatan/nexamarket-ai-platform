import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { api, money, type Product, signIn, toError } from "../lib/api";
import {
  actualDark,
  authLoaded,
  cartCount,
  categoriesList,
  claimsModalOpen,
  cycleColorMode,
  darkMode,
  navigate,
  notify,
  routePath,
  routeSearch,
  session,
  setColorMode,
  theme,
  unreadCount,
} from "../lib/store";

export function resolveBrandIconUrl(logoUrl?: string): string {
  if (logoUrl && logoUrl !== "/logo.svg" && !logoUrl.startsWith("/logo-")) {
    return logoUrl;
  }
  return actualDark.value ? "/logo-dark.png" : "/logo-light.png";
}

export function resolveBrandWordmarkUrl(): string {
  return actualDark.value ? "/logo-wordmark-dark.png" : "/logo-wordmark-light.png";
}

export function Icon({
  name,
  size = 20,
  class: className,
}: {
  name: string;
  size?: number;
  class?: string;
}) {
  const paths: Record<string, string> = {
    cart: "M3 3h2l2 12h12l2-9H6M10 21a1 1 0 1 0 0-2a1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2a1 1 0 0 0 0 2Z",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
    user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
    heart:
      "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
    moon: "M20.8 15.2A9 9 0 0 1 8.8 3.2 9 9 0 1 0 20.8 15.2Z",
    sun: "M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
    lock: "M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z",
    package:
      "M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12",
    tag: "M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Zm-5 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z",
    truck:
      "M3 6h11v11H3zM14 10h4l3 4v3h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    menu: "M4 7h16M4 12h16M4 17h16",
    check: "M5 12l5 5L20 7",
    close: "M18 6L6 18M6 6l12 12",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    filter: "M4 6h16M7 12h10M10 18h4",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    store: "M3 9l2-5h14l2 5M5 9v11h14V9M9 20v-6h6v6",
    rotate: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5",
    refresh: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5",
    help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6v.01M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4",
    home: "M3 10.5L12 3l9 7.5V21h-6v-6H9v6H3v-10.5Z",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3m10-10h-3M5 12H2m17-7-2 2M7 17l-2 2m14 0-2-2M7 7 5 5",
    logout: "M10 17l5-5-5-5m5 5H3m9-9h7v18h-7",
    spark: "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z",
    book: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z M6 6h10 M6 10h10",
    card: "M2 5h20v14H2z M2 10h20 M6 15h4",
    chevron: "M6 9l6 6 6-6",
  };
  return (
    <svg
      class={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.arrow} />
    </svg>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
}: {
  children: ComponentChildren;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} disabled={disabled} class={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function Status({ children }: { children: ComponentChildren }) {
  const raw = String(children ?? "").toUpperCase();
  let tone = "neutral";
  if (
    /PAID|APPROVED|PUBLISHED|DELIVERED|CONNECTED|RESOLVED|ACCEPTED|OK|LEÍDO|VERIFICAD/.test(raw) &&
    !raw.includes("PARTIALLY")
  ) {
    tone = "success";
  } else if (
    /AWAITING|PENDING|SUBMITTED|APPLIED|OPEN|UNDER_REVIEW|INVESTIGATING|PREPARING|SHIPPED|PARTIALLY|DRAFT/.test(
      raw,
    )
  ) {
    tone = "warning";
  } else if (/REJECTED|CANCELLED|SUSPENDED|DISCONNECTED|ERROR|FAILED|INVESTIGAR/.test(raw)) {
    tone = "danger";
  }
  return <span class={`status status-${tone}`}>{children}</span>;
}

export function Empty({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ComponentChildren;
}) {
  return (
    <div class="empty">
      <div class="empty-icon" aria-hidden="true">
        ◎
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  radius = "8px",
}: {
  width?: string;
  height?: string;
  radius?: string;
}) {
  return (
    <div class="skeleton-box" style={{ width, height, borderRadius: radius }} aria-hidden="true" />
  );
}

export function Loading() {
  return (
    <div class="loading" role="status" aria-live="polite">
      <div class="skeleton-stack" aria-hidden="true">
        <Skeleton width="38%" height="18px" />
        <Skeleton width="100%" height="64px" radius="12px" />
        <Skeleton width="82%" height="16px" />
      </div>
      <span class="sr-only">Cargando contenido…</span>
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div class="product-card skeleton-card" aria-hidden="true">
      <Skeleton height="190px" radius="12px" />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <Skeleton width="40%" height="12px" />
        <Skeleton width="85%" height="16px" />
        <Skeleton width="50%" height="22px" />
        <Skeleton width="100%" height="38px" radius="8px" />
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div class="detail-layout" role="status" aria-label="Cargando detalle">
      <Skeleton height="420px" radius="16px" />
      <div class="panel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <Skeleton width="35%" height="14px" />
        <Skeleton width="85%" height="34px" />
        <Skeleton width="45%" height="32px" />
        <Skeleton width="100%" height="72px" />
        <Skeleton width="100%" height="44px" radius="10px" />
      </div>
    </div>
  );
}

export function SkeletonCart() {
  return (
    <div class="cart-layout" role="status" aria-label="Cargando carrito">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Skeleton height="118px" radius="14px" />
        <Skeleton height="118px" radius="14px" />
      </div>
      <Skeleton height="280px" radius="16px" />
    </div>
  );
}

export function SkeletonOrderList() {
  return (
    <div class="orders-list" role="status" aria-label="Cargando historial">
      <Skeleton height="84px" radius="14px" />
      <Skeleton height="84px" radius="14px" />
      <Skeleton height="84px" radius="14px" />
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div
      class="panel"
      role="status"
      aria-label="Cargando registros"
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <Skeleton width="32%" height="22px" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width="100%" height="44px" radius="10px" />
      ))}
    </div>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const target = cardRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button:not(.modal-close-btn)",
      );
      (target ?? cardRef.current)?.focus();
    }, 10);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && cardRef.current) {
        const focusables = Array.from(
          cardRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (!focusables.length) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCloseRef.current();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div class="modal-card" ref={cardRef} tabIndex={-1}>
        <div class="modal-header">
          <h3 id="modal-title">{title}</h3>
          <button
            type="button"
            class="icon-button modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div class="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function PromptModal({
  open,
  title,
  message,
  placeholder = "Escribe una justificación...",
  minLength = 10,
  confirmLabel = "Confirmar",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  minLength?: number;
  confirmLabel?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form
        class="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          if (val.trim().length < minLength) return;
          setBusy(true);
          try {
            await onConfirm(val.trim());
            setVal("");
            onClose();
          } finally {
            setBusy(false);
          }
        }}
      >
        {message && <p>{message}</p>}
        <label>
          Justificación (mínimo {minLength} caracteres)
          <textarea
            required
            minLength={minLength}
            rows={3}
            placeholder={placeholder}
            value={val}
            onInput={(e) => setVal((e.currentTarget as HTMLTextAreaElement).value)}
          />
        </label>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy || val.trim().length < minLength}>
            {busy ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "primary",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "primary" | "danger";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p>{message}</p>
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
        <Button variant="outline" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant={variant}
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Procesando…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function ProductArt({ product }: { product: Pick<Product, "title" | "image_url"> }) {
  const [imgError, setImgError] = useState(false);
  if (product.image_url && !imgError) {
    return (
      <div class="product-art">
        <img
          src={product.image_url}
          alt={product.title}
          loading="lazy"
          class="product-art-img"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }
  return (
    <div class="product-art">
      <div class="product-art-symbol">
        <Icon name="spark" size={48} />
        <span>NEXA</span>
      </div>
    </div>
  );
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const add = async () => {
    if (!session.value.authenticated) {
      signIn(`/products/${product.listing_id}`);
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ lines: { quantity: number }[] }>("/api/v1/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: product.listing_id, quantity: 1 }),
      });
      cartCount.value = result.lines.reduce((a, l) => a + l.quantity, 0);
      notify("Producto añadido al carrito");
    } catch (e) {
      notify(e instanceof Error ? e.message : "No fue posible agregar el producto");
    } finally {
      setBusy(false);
    }
  };
  const toggleFavorite = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session.value.authenticated) {
      signIn(location.pathname);
      return;
    }
    try {
      if (isFav) {
        await api(`/api/v1/me/favorites/${product.listing_id}`, { method: "DELETE" });
        setIsFav(false);
        notify("Eliminado de favoritos");
      } else {
        await api(`/api/v1/me/favorites/${product.listing_id}`, { method: "POST" });
        setIsFav(true);
        notify("Guardado en favoritos");
      }
    } catch (err) {
      notify(toError(err));
    }
  };

  const compareAt =
    typeof product.specifications?.compare_at_minor === "number"
      ? (product.specifications.compare_at_minor as number)
      : null;
  const hasDiscount = Boolean(compareAt && compareAt > product.price_minor);
  const discountPct =
    hasDiscount && compareAt ? Math.round((1 - product.price_minor / compareAt) * 100) : 0;

  return (
    <article class="product-card">
      <div class="product-card-top">
        <a
          href={`/products/${product.listing_id}`}
          class="product-photo"
          aria-label={`Ver detalle de ${product.title}`}
        >
          <ProductArt product={product} />
        </a>
        <button
          type="button"
          class={`card-fav-btn ${isFav ? "active" : ""}`}
          aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
          onClick={toggleFavorite}
        >
          <Icon name="heart" size={16} />
        </button>
      </div>
      <div class="product-info">
        <div class="product-meta-row">
          {product.brand ? (
            <span class="product-brand-tag">{product.brand}</span>
          ) : (
            product.category && <span class="product-brand-tag">{product.category}</span>
          )}
          {product.available <= 0 ? (
            <span class="product-stock-tag out-of-stock">Agotado</span>
          ) : product.available <= 5 ? (
            <span class="product-stock-tag urgency">¡Últimas {product.available} un.!</span>
          ) : (
            <span class="product-stock-tag in-stock">Stock ({product.available})</span>
          )}
        </div>
        <a href={`/products/${product.listing_id}`} class="product-name">
          {product.title}
        </a>
        <div class="product-price-row">
          <div class="product-price-stack">
            {hasDiscount && compareAt ? (
              <div class="product-compare-row">
                <span class="compare-price">{money(compareAt)}</span>
                <span class="discount-badge">-{discountPct}% OFF</span>
              </div>
            ) : null}
            <strong class="price">{money(product.price_minor)}</strong>
          </div>
          {product.seller_id ? (
            <a
              href={`/sellers/${product.seller_id}`}
              class="product-seller"
              title="Vendedor verificado"
            >
              <Icon name="shield" size={12} /> {product.seller_name}
            </a>
          ) : (
            <span class="product-seller">{product.seller_name}</span>
          )}
        </div>
        <div class="product-perks-row">
          <span class="free-shipping">
            <Icon name="truck" size={13} /> Envío coordinado
          </span>
          <span class="mp-badge-micro">
            <Icon name="spark" size={11} /> Mercado Pago
          </span>
        </div>
        {compact ? (
          <a class="btn btn-outline" href={`/products/${product.listing_id}`}>
            Ver producto
          </a>
        ) : (
          <Button disabled={busy || product.available <= 0} onClick={add}>
            {busy ? "Agregando…" : product.available > 0 ? "Agregar al carrito" : "Sin stock"}
          </Button>
        )}
      </div>
    </article>
  );
}

export function Protected({ children }: { children: ComponentChildren }) {
  if (!authLoaded.value) return <Loading />;
  if (!session.value.authenticated)
    return (
      <div class="auth-gate">
        <Icon name="shield" size={45} />
        <h2>Inicia sesión para continuar</h2>
        <p>Protegemos tus compras, pedidos y datos personales.</p>
        <Button onClick={() => signIn()}>Iniciar sesión</Button>
      </div>
    );
  return <>{children}</>;
}

const fallbackHeaderCats: Array<{ slug: string; name: string; item_count?: number }> = [
  { slug: "laptops", name: "Laptops", item_count: 5 },
  { slug: "accesorios", name: "Accesorios", item_count: 4 },
  { slug: "audio", name: "Audio", item_count: 5 },
];

export function Header() {
  const [q, setQ] = useState(new URLSearchParams(routeSearch.value).get("q") ?? "");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [openSuggest, setOpenSuggest] = useState(false);

  useEffect(() => {
    setQ(new URLSearchParams(routeSearch.value).get("q") ?? "");
    setOpenSuggest(false);
  }, [routePath.value, routeSearch.value]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void api<{ items: Product[] }>(`/api/v1/search?q=${encodeURIComponent(term)}`)
        .then((res) => setSuggestions((res.items ?? []).slice(0, 5)))
        .catch(() => setSuggestions([]));
    }, 240);
    return () => window.clearTimeout(timer);
  }, [q]);

  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Filter only top-level root categories and clean out QA noise
  const rootCategories = categoriesList.value.filter(
    (c) => !c.parent_id && !c.name.toLowerCase().startsWith("qa") && !c.slug.startsWith("qa-"),
  );
  const displayRootCats = rootCategories.length > 0 ? rootCategories : fallbackHeaderCats;
  const topNavCats = displayRootCats.slice(0, 5);

  return (
    <>
      <a href="#main-content" class="skip-link">
        Saltar al contenido principal
      </a>
      <div class="announcement">
        <span>✨ Marketplace oficial verificado · Pagos 100% protegidos con Mercado Pago</span>
      </div>
      <header class="site-header">
        <div class="header-top container">
          <a class="brand" href="/" aria-label="Ir a la página de inicio">
            <img
              src={resolveBrandIconUrl(theme.value.logo_url)}
              alt={theme.value.brand_name ?? "NexaMarket AI"}
            />
            <div class="brand-text">
              <span class="brand-name">{theme.value.brand_name ?? "NexaMarket AI"}</span>
              <small class="brand-sub">Marketplace inteligente</small>
            </div>
          </a>
          <search class="search-box">
            <form
              action="/search"
              onSubmit={(e) => {
                e.preventDefault();
                setOpenSuggest(false);
                navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
              }}
            >
              <Icon name="search" size={17} />
              <input
                aria-label="Buscar productos"
                name="q"
                autocomplete="off"
                placeholder="Buscar laptops, accesorios, audio..."
                value={q}
                onFocus={() => setOpenSuggest(true)}
                onBlur={() => window.setTimeout(() => setOpenSuggest(false), 200)}
                onInput={(e) => {
                  setQ((e.currentTarget as HTMLInputElement).value);
                  setOpenSuggest(true);
                }}
              />
              <button type="submit" aria-label="Buscar" class="search-submit-btn">
                <Icon name="arrow" size={16} />
              </button>
            </form>
            {openSuggest && suggestions.length > 0 && (
              <div class="search-suggest" role="listbox" aria-label="Sugerencias de búsqueda">
                {suggestions.map((item) => (
                  <a
                    key={item.listing_id}
                    href={`/products/${item.listing_id}`}
                    class="search-suggest-item"
                    onClick={() => setOpenSuggest(false)}
                  >
                    <span>{item.title}</span>
                    <strong class="tnum">{money(item.price_minor)}</strong>
                  </a>
                ))}
                <a
                  href={`/search?q=${encodeURIComponent(q.trim())}`}
                  class="search-suggest-all"
                  onClick={() => setOpenSuggest(false)}
                >
                  Ver todos los resultados para “{q.trim()}” →
                </a>
              </div>
            )}
          </search>
          <nav class="header-actions" aria-label="Accesos rápidos">
            <button
              type="button"
              class="icon-button"
              aria-label={`Modo de color actual: ${darkMode.value}. Cambiar modo.`}
              title={`Modo actual: ${darkMode.value}`}
              onClick={cycleColorMode}
            >
              <Icon name={darkMode.value === "dark" ? "sun" : "moon"} size={19} />
            </button>
            {session.value.authenticated && (
              <a
                class="icon-button cart-icon"
                href="/notifications"
                aria-label={`Notificaciones, ${unreadCount.value} sin leer`}
              >
                <Icon name="bell" size={19} />
                {unreadCount.value > 0 && <i>{unreadCount.value}</i>}
              </a>
            )}
            <a class="icon-button" href="/favorites" aria-label="Mis favoritos">
              <Icon name="heart" size={19} />
            </a>
            <a
              class="icon-button cart-icon"
              href="/cart"
              aria-label={`Carrito de compras, ${cartCount.value} artículos`}
            >
              <Icon name="cart" size={19} />
              {cartCount.value > 0 && <i>{cartCount.value}</i>}
            </a>
            <a class="account-link" href={session.value.authenticated ? "/account" : "/login"}>
              <Icon name="user" size={18} />
              <span>
                {session.value.authenticated
                  ? (session.value.user?.display_name?.split(" ")[0] ?? "Mi cuenta")
                  : "Ingresar"}
              </span>
            </a>
          </nav>
        </div>

        <div class="header-sub container">
          <nav class="category-nav" aria-label="Secciones">
            <div class="header-cat-dropdown-wrap">
              <button
                type="button"
                class={`nav-cat-trigger ${categoriesOpen ? "open" : ""} ${routePath.value === "/categories" ? "nav-active" : ""}`}
                aria-expanded={categoriesOpen}
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                onMouseEnter={() => setCategoriesOpen(true)}
              >
                <Icon name="grid" size={14} />
                <span>Categorías</span>
                <Icon name="chevron" size={11} />
              </button>
              {categoriesOpen && (
                <div
                  class="header-cat-popover"
                  role="menu"
                  onMouseLeave={() => setCategoriesOpen(false)}
                >
                  <div class="cat-popover-head">
                    <span>EXPLORAR POR DEPARTAMENTO</span>
                    <a href="/categories" onClick={() => setCategoriesOpen(false)}>
                      Ver todas →
                    </a>
                  </div>
                  <div class="cat-popover-grid">
                    {displayRootCats.map((cat) => (
                      <a
                        key={cat.slug}
                        href={`/categories/${cat.slug}`}
                        class="cat-popover-item"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        <span class="cat-popover-icon">
                          <Icon name="tag" size={13} />
                        </span>
                        <div class="cat-popover-info">
                          <strong>{cat.name}</strong>
                          {cat.item_count ? <small>{cat.item_count} artículos</small> : null}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="/deals" class={`nav-link ${routePath.value === "/deals" ? "nav-active" : ""}`}>
              <Icon name="tag" size={13} />
              <span>Ofertas</span>
            </a>

            <a
              href="/search"
              class={`nav-link ${routePath.value === "/search" && !routeSearch.value ? "nav-active" : ""}`}
            >
              Todos los productos
            </a>

            {topNavCats.map((c) => {
              const shortName = c.name.split(" & ")[0] ?? c.name;
              return (
                <a
                  key={c.slug}
                  href={`/categories/${c.slug}`}
                  class={`nav-link ${routePath.value === `/categories/${c.slug}` ? "nav-active" : ""}`}
                >
                  {shortName}
                </a>
              );
            })}
          </nav>

          <div class="header-sub-right">
            <a
              href="/seller"
              class={`nav-sub-item ${routePath.value.startsWith("/seller") ? "nav-active" : ""}`}
            >
              <Icon name="store" size={14} />
              <span>Vender</span>
            </a>
            <a href="/ai" class={`nav-ai-pill ${routePath.value === "/ai" ? "active" : ""}`}>
              <Icon name="spark" size={13} />
              <span>Nexa AI</span>
            </a>
            <span class="secure-badge">
              <Icon name="shield" size={14} />
              <span>Compra segura</span>
            </span>
          </div>
        </div>
      </header>
    </>
  );
}

export function MobileBottomNav() {
  const path = routePath.value;
  return (
    <nav class="mobile-bottom-nav" aria-label="Navegación móvil principal">
      <a href="/" class={path === "/" ? "active" : ""}>
        <Icon name="home" size={19} />
        <span>Inicio</span>
      </a>
      <a
        href="/search"
        class={path === "/search" || path.startsWith("/categories") ? "active" : ""}
      >
        <Icon name="grid" size={19} />
        <span>Catálogo</span>
      </a>
      <a href="/ai" class={path === "/ai" ? "active" : ""}>
        <Icon name="spark" size={19} />
        <span>Nexa AI</span>
      </a>
      <a href="/cart" class={path === "/cart" ? "active" : ""}>
        <span class="mobile-badge-wrap">
          <Icon name="cart" size={19} />
          {cartCount.value > 0 && <i>{cartCount.value}</i>}
        </span>
        <span>Carrito</span>
      </a>
      <a
        href={session.value.authenticated ? "/account" : "/login"}
        class={path.startsWith("/account") || path === "/login" ? "active" : ""}
      >
        <Icon name="user" size={19} />
        <span>{session.value.authenticated ? "Cuenta" : "Ingresar"}</span>
      </a>
    </nav>
  );
}

export function Footer() {
  const rootCats = categoriesList.value
    .filter(
      (c) => !c.parent_id && !c.name.toLowerCase().startsWith("qa") && !c.slug.startsWith("qa-"),
    )
    .slice(0, 6);
  const isAdmin = session.value.authenticated && session.value.user.role === "ADMIN";
  return (
    <footer class="footer">
      <div class="footer-trust-strip">
        <div class="container footer-trust-grid">
          <div class="footer-trust-item">
            <div class="footer-trust-icon">
              <Icon name="shield" size={22} />
            </div>
            <div>
              <strong>Pago protegido Mercado Pago</strong>
              <p>1 pago por vendedor. Cero almacenamiento de tarjetas ni datos bancarios.</p>
            </div>
          </div>
          <div class="footer-trust-item">
            <div class="footer-trust-icon">
              <Icon name="spark" size={22} />
            </div>
            <div>
              <strong>Inventario en tiempo real</strong>
              <p>Stock reservado con confirmación inmediata en PostgreSQL.</p>
            </div>
          </div>
          <div class="footer-trust-item">
            <div class="footer-trust-icon">
              <Icon name="truck" size={22} />
            </div>
            <div>
              <strong>Envíos y devoluciones trazables</strong>
              <p>Seguimiento de pedidos y gestión auditada de casos y reembolsos.</p>
            </div>
          </div>
          <div class="footer-trust-item">
            <div class="footer-trust-icon">
              <Icon name="lock" size={22} />
            </div>
            <div>
              <strong>Seguridad e identidad OIDC</strong>
              <p>Sesiones protegidas con Keycloak, cookies HttpOnly y control CSRF.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="container footer-main">
        <div class="footer-grid">
          <div class="footer-brand-col">
            <a href="/" class="footer-logo">
              <img
                src={resolveBrandWordmarkUrl()}
                alt={theme.value.brand_name ?? "NexaMarket AI"}
                style={{ height: "34px", width: "auto", objectFit: "contain" }}
              />
            </a>
            <p>
              {theme.value.hero_subtitle ??
                "Marketplace centralizado para compras de tecnología y componentes con pagos verificados."}
            </p>
            <div class="footer-theme-toggle">
              <span class="footer-theme-label">Tema:</span>
              <button
                type="button"
                class={`theme-btn ${darkMode.value === "light" ? "active" : ""}`}
                onClick={() => setColorMode("light")}
              >
                Claro
              </button>
              <button
                type="button"
                class={`theme-btn ${darkMode.value === "dark" ? "active" : ""}`}
                onClick={() => setColorMode("dark")}
              >
                Oscuro
              </button>
              <button
                type="button"
                class={`theme-btn ${darkMode.value === "auto" ? "active" : ""}`}
                onClick={() => setColorMode("auto")}
              >
                Auto
              </button>
            </div>
          </div>
          <div>
            <h4>Categorías</h4>
            {rootCats.map((c) => (
              <a key={c.id} href={`/categories/${c.slug}`}>
                {c.name}
              </a>
            ))}
            <a href="/categories" class="footer-more-link">
              Ver todas →
            </a>
          </div>
          <div>
            <h4>Comprar</h4>
            <a href="/search">Catálogo completo</a>
            <a href="/deals">Tendencias y ofertas</a>
            <a href="/search?sort=price_asc">Mejores precios</a>
            <a href="/orders">Rastreo de envíos</a>
            <a href="/ai">Asistente Nexa AI</a>
          </div>
          <div>
            <h4>Vender</h4>
            <a href="/seller">Vender en NexaMarket</a>
            <a href="/seller/center">Portal Seller Center</a>
            <a href="/help">Tarifas y comisiones</a>
            <a href="/terms">Políticas de publicación</a>
            {isAdmin && <a href="/admin">Panel Administrador</a>}
          </div>
          <div>
            <h4>Confianza y soporte</h4>
            <a href="/help">Centro de ayuda</a>
            <a href="/support">Soporte y mediación</a>
            <a href="/terms">Términos y condiciones</a>
            <a href="/privacy">Política de privacidad</a>
            <button
              type="button"
              class="claims-book-btn"
              onClick={() => {
                claimsModalOpen.value = true;
              }}
            >
              <Icon name="book" size={15} /> Libro de Reclamaciones
            </button>
            <p class="footer-mp-note">
              Operación en Soles (PEN). Pagos procesados exclusivamente por Mercado Pago.
            </p>
          </div>
        </div>

        <div class="footer-payment-strip">
          <div class="footer-payment-label">
            <Icon name="card" size={17} />
            <span>Medios de pago oficiales aceptados en checkout:</span>
          </div>
          <div class="footer-payment-badges">
            <span class="payment-badge mp-official">
              <Icon name="spark" size={13} /> Mercado Pago
            </span>
            <span class="payment-badge">Visa</span>
            <span class="payment-badge">Mastercard</span>
            <span class="payment-badge">American Express</span>
            <span class="payment-badge">Diners Club</span>
            <span class="payment-badge">PagoEfectivo</span>
            <span class="payment-badge">Yape</span>
            <span class="payment-badge ssl-badge">
              <Icon name="lock" size={12} /> SSL 256-bit Seguro
            </span>
          </div>
        </div>

        <div class="footer-bottom">
          <div>
            <p>
              © {new Date().getFullYear()} {theme.value.brand_name ?? "NexaMarket"} Perú S.A.C. ·
              RUC: 20609876543. Todos los derechos reservados.
            </p>
            <small class="footer-subtext">
              Av. República de Panamá 3418, San Isidro, Lima · Marketplace único verificado.
            </small>
          </div>
          <div class="footer-bottom-badges">
            <span>Arquitectura self-hosted sobre PostgreSQL y Keycloak</span>
            <span>1 pago por vendedor · Garantía protegida</span>
          </div>
        </div>
      </div>
      <ClaimsBookModal />
    </footer>
  );
}

export function ClaimsBookModal() {
  const [submitted, setSubmitted] = useState(false);
  const [claimType, setClaimType] = useState<"RECLAMO" | "QUEJA">("RECLAMO");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [docType, setDocType] = useState("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [details, setDetails] = useState("");
  const [solution, setSolution] = useState("");

  if (!claimsModalOpen.value) return null;

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const generatedCode = `REC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    setCode(generatedCode);
    setSubmitted(true);
    notify("Hoja de reclamación registrada exitosamente");
  };

  const handleClose = () => {
    claimsModalOpen.value = false;
    setSubmitted(false);
  };

  return (
    <Modal
      title="Libro de Reclamaciones Virtual"
      open={claimsModalOpen.value}
      onClose={handleClose}
    >
      <div class="claims-modal-content">
        <div class="claims-legal-header">
          <div class="claims-badge-header">
            <Icon name="book" size={24} />
            <div>
              <strong>HOJA DE RECLAMACIÓN VIRTUAL</strong>
              <small>
                Conforme a la Ley N° 29571 · Código de Protección y Defensa del Consumidor
              </small>
            </div>
          </div>
          <div class="claims-company-info">
            <span>
              <b>Razón Social:</b> NexaMarket Perú S.A.C.
            </span>
            <span>
              <b>RUC:</b> 20609876543
            </span>
            <span>
              <b>Dirección:</b> Av. República de Panamá 3418, San Isidro, Lima, Perú
            </span>
          </div>
        </div>

        {submitted ? (
          <div class="claims-success-state">
            <div class="claims-success-icon">
              <Icon name="check" size={32} />
            </div>
            <h3>¡Reclamación Registrada!</h3>
            <p>
              Tu número de registro oficial es: <strong>{code}</strong>
            </p>
            <p class="claims-legal-notice">
              De conformidad con la normativa peruana vigente, NEXAMARKET PERÚ S.A.C. brindará
              respuesta a tu solicitud en un plazo no mayor a quince (15) días hábiles
              improrrogables a través del correo electrónico consignado.
            </p>
            <Button onClick={handleClose}>Entendido y cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} class="claims-form">
            <div class="claims-type-selector">
              <label class={`claims-type-chip ${claimType === "RECLAMO" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="claimType"
                  value="RECLAMO"
                  checked={claimType === "RECLAMO"}
                  onChange={() => setClaimType("RECLAMO")}
                />
                <div>
                  <strong>Reclamo</strong>
                  <small>Disconformidad relacionada a los productos o servicios adquiridos.</small>
                </div>
              </label>
              <label class={`claims-type-chip ${claimType === "QUEJA" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="claimType"
                  value="QUEJA"
                  checked={claimType === "QUEJA"}
                  onChange={() => setClaimType("QUEJA")}
                />
                <div>
                  <strong>Queja</strong>
                  <small>Malestar o descontento respecto a la atención al público recibida.</small>
                </div>
              </label>
            </div>

            <div class="form-grid">
              <label>
                Nombre y Apellidos
                <input
                  required
                  placeholder="Ej. Juan Pérez Quispe"
                  value={fullName}
                  onInput={(e) => setFullName(e.currentTarget.value)}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                <label>
                  Tipo Doc.
                  <select value={docType} onChange={(e) => setDocType(e.currentTarget.value)}>
                    <option value="DNI">DNI</option>
                    <option value="CE">Carné Ext.</option>
                    <option value="RUC">RUC</option>
                    <option value="PASSPORT">Pasaporte</option>
                  </select>
                </label>
                <label>
                  Nro. Documento
                  <input
                    required
                    placeholder="8 dígitos"
                    value={docNumber}
                    onInput={(e) => setDocNumber(e.currentTarget.value)}
                  />
                </label>
              </div>
              <label>
                Correo electrónico
                <input
                  type="email"
                  required
                  placeholder="tucorreo@dominio.com"
                  value={email}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                />
              </label>
              <label>
                Teléfono de contacto
                <input
                  type="tel"
                  required
                  placeholder="+51 987 654 321"
                  value={phone}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Nro. de Pedido o Transacción (Opcional)
                <input
                  placeholder="Ej. 00000000-0000-4000-8000-..."
                  value={orderId}
                  onInput={(e) => setOrderId(e.currentTarget.value)}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Detalle del {claimType === "RECLAMO" ? "Reclamo" : "Queja"}
                <textarea
                  required
                  rows={3}
                  placeholder="Describe de forma clara los hechos y fechas de lo ocurrido..."
                  value={details}
                  onInput={(e) => setDetails(e.currentTarget.value)}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Pedido concreto del consumidor
                <textarea
                  required
                  rows={2}
                  placeholder="¿Cuál es la solución esperada (devolución, cambio, disculpa formal, etc.)?"
                  value={solution}
                  onInput={(e) => setSolution(e.currentTarget.value)}
                />
              </label>
            </div>

            <div class="modal-actions" style={{ marginTop: "16px" }}>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit">Enviar Hoja de Reclamación</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
