import { render } from "preact";
import { useEffect } from "preact/hooks";
import {
  DashboardFooter,
  DashboardHeader,
  DashboardSidebar,
} from "./components/dashboard-layout";
import { Footer, Header, Icon, MobileBottomNav } from "./components/ui";
import { api, type Cart, type Category, type Session, type Theme } from "./lib/api";
import {
  alertSeverity,
  alertText,
  applyTheme,
  authLoaded,
  cartCount,
  categoriesList,
  navigate,
  prefersDark,
  refreshUnreadNotifications,
  routePath,
  session,
  syncLocationSignals,
  theme,
} from "./lib/store";
import { AdminPage } from "./pages/admin";
import { AiPage } from "./pages/ai";
import { CartPage, Home, OrderDetail, OrdersPage, ProductDetail, Search } from "./pages/buyer";
import { CheckoutPage, CheckoutResultPage } from "./pages/checkout";
import { NotificationsPage, SupportPage } from "./pages/community";
import {
  CategoriesPage,
  DealsPage,
  HelpCenterPage,
  LegalPage,
  SellerProfilePage,
} from "./pages/discover";
import {
  AccountPage,
  FavoritesPage,
  LoginPage,
  MyReturnsPage,
  RegisterPage,
} from "./pages/identity";
import { SellerPage } from "./pages/seller";
import "./styles.css";

const SERVER_PREFIXES = [
  "/auth/",
  "/integrations/",
  "/media/",
  "/api/",
  "/health/",
  "/internal/",
  "/reference",
  "/openapi.json",
];

function pageTitleFor(path: string, brand: string): string {
  if (path === "/") return `${brand} — Marketplace inteligente`;
  if (path === "/search") return `Catálogo — ${brand}`;
  if (path.startsWith("/categories")) return `Categorías — ${brand}`;
  if (path === "/deals") return `Tendencias y ofertas — ${brand}`;
  if (path.startsWith("/products/")) return `Detalle de producto — ${brand}`;
  if (path.startsWith("/sellers/")) return `Perfil de vendedor — ${brand}`;
  if (path === "/cart") return `Mi carrito — ${brand}`;
  if (path.startsWith("/checkout/")) return `Checkout seguro — ${brand}`;
  if (path.startsWith("/orders")) return `Mis compras — ${brand}`;
  if (path === "/account/returns" || path === "/returns") return `Mis devoluciones — ${brand}`;
  if (path === "/account") return `Mi cuenta — ${brand}`;
  if (path === "/favorites") return `Favoritos — ${brand}`;
  if (path === "/notifications") return `Notificaciones — ${brand}`;
  if (path.startsWith("/support")) return `Soporte al cliente — ${brand}`;
  if (path === "/help") return `Centro de ayuda — ${brand}`;
  if (path === "/terms") return `Términos y condiciones — ${brand}`;
  if (path === "/privacy") return `Política de privacidad — ${brand}`;
  if (path === "/ai") return `Nexa AI — ${brand}`;
  if (path.startsWith("/seller")) return `Seller Center — ${brand}`;
  if (path.startsWith("/admin")) return `Administración — ${brand}`;
  if (path.startsWith("/dashboard")) return `Dashboard Back-Office — ${brand}`;
  if (path === "/login") return `Iniciar sesión — ${brand}`;
  if (path === "/register") return `Crear cuenta — ${brand}`;
  return `Página no encontrada — ${brand}`;
}

function NotFoundPage() {
  return (
    <main class="container page">
      <div class="panel not-found-card">
        <span class="eyebrow">ERROR 404</span>
        <h1>404 — Página no encontrada</h1>
        <p>Es posible que este enlace haya cambiado o que la publicación ya no esté activa.</p>
        <div class="action-row" style={{ justifyContent: "center", marginTop: "16px" }}>
          <a class="btn btn-primary" href="/">
            Volver al inicio
          </a>
          <a class="btn btn-outline" href="/search">
            Explorar catálogo
          </a>
          <a class="btn btn-outline" href="/help">
            Centro de ayuda
          </a>
        </div>
      </div>
    </main>
  );
}

function Router() {
  const path = routePath.value;
  const parts = path.split("/").filter(Boolean);

  if (path === "/") return <Home />;
  if (path === "/search") return <Search />;
  if (path === "/categories") return <CategoriesPage />;
  if (parts[0] === "categories" && parts[1])
    return <Search categorySlug={decodeURIComponent(parts[1])} />;
  if (path === "/deals") return <DealsPage />;
  if (parts[0] === "products" && parts[1])
    return <ProductDetail id={decodeURIComponent(parts[1])} />;
  if (parts[0] === "sellers" && parts[1])
    return <SellerProfilePage id={decodeURIComponent(parts[1])} />;
  if (path === "/cart") return <CartPage />;
  if (parts[0] === "checkout" && parts[1] && parts[2] === "result")
    return <CheckoutResultPage id={decodeURIComponent(parts[1])} />;
  if (parts[0] === "checkout" && parts[1])
    return <CheckoutPage id={decodeURIComponent(parts[1])} />;
  if (path === "/orders") return <OrdersPage />;
  if (parts[0] === "orders" && parts[1]) return <OrderDetail id={decodeURIComponent(parts[1])} />;
  if (path === "/login") return <LoginPage />;
  if (path === "/register") return <RegisterPage />;
  if (path === "/account") return <AccountPage />;
  if (path === "/account/returns" || path === "/returns") return <MyReturnsPage />;
  if (path === "/favorites") return <FavoritesPage />;
  if (path === "/notifications") return <NotificationsPage />;
  if (path === "/support") return <SupportPage />;
  if (parts[0] === "support" && parts[1])
    return <SupportPage ticketId={decodeURIComponent(parts[1])} />;
  if (path === "/help") return <HelpCenterPage />;
  if (path === "/terms") return <LegalPage kind="terms" />;
  if (path === "/privacy") return <LegalPage kind="privacy" />;
  if (path === "/ai") return <AiPage />;

  if (path === "/seller" || path === "/seller/listings") return <SellerPage section="listings" />;
  if (path === "/seller/listings/new") return <SellerPage section="listings" openNew={true} />;
  if (path === "/seller/orders") return <SellerPage section="orders" />;
  if (path === "/seller/analytics") return <SellerPage section="analytics" />;
  if (path === "/seller/onboarding") return <SellerPage section="onboarding" />;
  if (path === "/seller/payments") return <SellerPage section="payments" />;

  if (path === "/admin") return <AdminPage section="overview" />;
  if (parts[0] === "admin" && parts[1]) return <AdminPage section={decodeURIComponent(parts[1])} />;

  if (path === "/dashboard" || path === "/dashboard/") {
    if (session.value.user?.role === "ADMIN") return <AdminPage section="overview" />;
    if (session.value.user?.seller_id) return <SellerPage section="listings" />;
    return <AdminPage section="overview" />;
  }
  if (parts[0] === "dashboard" && parts[1]) {
    const sec = decodeURIComponent(parts[1]);
    if (session.value.user?.seller_id && ["listings", "orders", "analytics", "onboarding", "payments"].includes(sec)) {
      return <SellerPage section={sec as any} />;
    }
    return <AdminPage section={sec} />;
  }

  return <NotFoundPage />;
}

function App() {
  useEffect(() => {
    applyTheme();
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      prefersDark.value = media.matches;
      applyTheme();
    };
    media.addEventListener("change", update);

    const onPopState = () => syncLocationSignals();
    window.addEventListener("popstate", onPopState);

    const onDocClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (SERVER_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;
      e.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", onDocClick);

    void api<{ tokens: Theme }>("/api/v1/settings/theme")
      .then((x) => {
        theme.value = { ...theme.value, ...x.tokens };
        applyTheme();
      })
      .catch(() => applyTheme());

    void api<Category[]>("/api/v1/categories")
      .then((cats) => {
        if (Array.isArray(cats) && cats.length) categoriesList.value = cats;
      })
      .catch(() => {});

    void api<Session>("/auth/session")
      .then(async (s) => {
        session.value = s;
        if (s.authenticated) {
          const [c] = await Promise.all([
            api<Cart>("/api/v1/cart").catch(() => ({ lines: [] as Cart["lines"] })),
            refreshUnreadNotifications(),
          ]);
          cartCount.value = c.lines.reduce((n, l) => n + l.quantity, 0);
        }
      })
      .catch(() => {})
      .finally(() => {
        authLoaded.value = true;
      });

    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  useEffect(() => {
    document.title = pageTitleFor(routePath.value, theme.value.brand_name ?? "NexaMarket");
  }, [routePath.value, theme.value.brand_name]);

  const auth = routePath.value === "/login" || routePath.value === "/register";
  const isDashboard =
    routePath.value.startsWith("/admin") ||
    routePath.value.startsWith("/dashboard") ||
    routePath.value.startsWith("/seller");

  if (auth) {
    return (
      <div class="auth-shell">
        <div id="main-content">
          <Router />
        </div>
        {alertText.value && (
          <div
            class={`toast toast-${alertSeverity.value}`}
            role={alertSeverity.value === "error" ? "alert" : "status"}
          >
            <Icon name={alertSeverity.value === "error" ? "shield" : "check"} size={17} />
            {alertText.value}
          </div>
        )}
      </div>
    );
  }

  if (isDashboard) {
    return (
      <div class="dashboard-shell">
        <DashboardSidebar />
        <div class="dashboard-body-col">
          <DashboardHeader />
          <div id="main-content" class="dashboard-main">
            <Router />
          </div>
          <DashboardFooter />
        </div>
        {alertText.value && (
          <div
            class={`toast toast-${alertSeverity.value}`}
            role={alertSeverity.value === "error" ? "alert" : "status"}
          >
            <Icon name={alertSeverity.value === "error" ? "shield" : "check"} size={17} />
            {alertText.value}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Header />
      <div id="main-content">
        <Router />
      </div>
      <Footer />
      <MobileBottomNav />
      {alertText.value && (
        <div
          class={`toast toast-${alertSeverity.value}`}
          role={alertSeverity.value === "error" ? "alert" : "status"}
        >
          <Icon name={alertSeverity.value === "error" ? "shield" : "check"} size={17} />
          {alertText.value}
        </div>
      )}
    </>
  );
}

render(<App />, document.getElementById("app")!);
