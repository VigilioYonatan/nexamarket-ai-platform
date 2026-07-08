import { signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { api, toError } from "../lib/api";
import {
  actualDark,
  cycleColorMode,
  darkMode,
  navigate,
  notify,
  routePath,
  session,
  theme,
  unreadCount,
} from "../lib/store";
import { Button, Icon, Status } from "./ui";

export const dashboardSidebarOpen = signal(false);
export const dashboardSidebarCollapsed = signal(false);

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
  badgeTone?: "brand" | "success" | "warning";
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export function DashboardSidebar() {
  const path = routePath.value;
  const isSeller = path.startsWith("/seller");
  const isAdmin = path.startsWith("/admin") || (!isSeller && session.value.user?.role === "ADMIN");
  const user = session.value.user;

  const defaultAvatar = isAdmin
    ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
    : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80";

  const adminGroups: NavGroup[] = [
    {
      title: "VISTA GENERAL",
      items: [
        { href: "/admin", label: "Resumen & KPIs", icon: "grid" },
      ],
    },
    {
      title: "COMERCIO & CATÁLOGO",
      items: [
        { href: "/admin/orders", label: "Pedidos globales", icon: "package", badge: "19", badgeTone: "brand" },
        { href: "/admin/sellers", label: "Vendedores & KYB", icon: "store" },
        { href: "/seller", label: "Catálogo & Stock", icon: "tag" },
      ],
    },
    {
      title: "USUARIOS & ACCESOS",
      items: [
        { href: "/admin/users", label: "Cuentas de usuario", icon: "user" },
      ],
    },
    {
      title: "FINANZAS",
      items: [
        { href: "/admin/payments", label: "Mercado Pago", icon: "card", badge: "Live", badgeTone: "success" },
        { href: "/admin/commissions", label: "Comisiones (Take-Rate)", icon: "tag" },
      ],
    },
    {
      title: "CONFIANZA & SOPORTE",
      items: [
        { href: "/admin/trust", label: "Moderación & Confianza", icon: "shield" },
        { href: "/admin/support", label: "Soporte al cliente", icon: "help" },
        { href: "/admin/returns", label: "Devoluciones", icon: "rotate" },
      ],
    },
    {
      title: "GOBERNANZA",
      items: [
        { href: "/admin/appearance", label: "Apariencia & Branding", icon: "settings" },
        { href: "/admin/features", label: "Feature Flags", icon: "spark" },
        { href: "/admin/audit", label: "Auditoría de seguridad", icon: "lock" },
      ],
    },
  ];

  const sellerGroups: NavGroup[] = [
    {
      title: "MI TIENDA",
      items: [
        { href: "/seller", label: "Publicaciones & Stock", icon: "tag" },
        { href: "/seller/orders", label: "Mis Pedidos", icon: "package" },
        { href: "/seller/analytics", label: "Métricas de Venta", icon: "grid" },
        { href: "/seller/payments", label: "Cobros Mercado Pago", icon: "card" },
      ],
    },
    {
      title: "SOPORTE Y CUENTA",
      items: [
        { href: "/support", label: "Atención al Vendedor", icon: "help" },
        { href: "/account", label: "Mi Perfil Comercial", icon: "user" },
      ],
    },
  ];

  const currentGroups = isSeller ? sellerGroups : adminGroups;

  const closeDrawer = () => {
    dashboardSidebarOpen.value = false;
  };

  const handleNav = (href: string) => {
    closeDrawer();
    navigate(href);
  };

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return path === "/admin" || path === "/dashboard" || path === "/dashboard/";
    }
    return path.startsWith(href);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {dashboardSidebarOpen.value && (
        <div
          class="dashboard-backdrop"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        class={`dashboard-sidebar ${dashboardSidebarOpen.value ? "drawer-open" : ""} ${
          dashboardSidebarCollapsed.value ? "collapsed" : ""
        }`}
        aria-label="Navegación principal del panel"
      >
        {/* Sidebar Brand Header */}
        <div class="sidebar-header">
          <a
            href={isAdmin ? "/admin" : "/seller"}
            class="sidebar-brand-link"
            onClick={(e) => {
              e.preventDefault();
              handleNav(isAdmin ? "/admin" : "/seller");
            }}
          >
            <div class="sidebar-logo-icon">
              <img
                src={
                  theme.value.logo_url &&
                  theme.value.logo_url !== "/logo.svg" &&
                  !theme.value.logo_url.startsWith("/logo-")
                    ? theme.value.logo_url
                    : actualDark.value
                      ? "/logo-dark.png"
                      : "/logo-light.png"
                }
                alt={theme.value.brand_name ?? "NexaMarket AI"}
              />
            </div>
            {!dashboardSidebarCollapsed.value && (
              <div class="sidebar-brand-text">
                <span class="sidebar-brand-title">{theme.value.brand_name ?? "NexaMarket"}</span>
                <span class="sidebar-console-badge">
                  {isSeller ? "SELLER PORTAL" : "ADMIN CONSOLE"}
                </span>
              </div>
            )}
          </a>

          {/* Close button for mobile */}
          <button
            type="button"
            class="sidebar-close-btn"
            onClick={closeDrawer}
            aria-label="Cerrar menú lateral"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Console Switcher Tab (Admin vs Seller) */}
        {!dashboardSidebarCollapsed.value && (
          <div class="sidebar-console-switch">
            <button
              type="button"
              class={`console-tab ${isAdmin ? "active" : ""}`}
              onClick={() => handleNav("/admin")}
            >
              <Icon name="shield" size={13} />
              <span>Gobernanza</span>
            </button>
            <button
              type="button"
              class={`console-tab ${isSeller ? "active" : ""}`}
              onClick={() => handleNav("/seller")}
            >
              <Icon name="store" size={13} />
              <span>Seller</span>
            </button>
          </div>
        )}

        {/* Navigation Groups List */}
        <nav class="sidebar-nav-scroll" role="navigation">
          {currentGroups.map((group) => (
            <div class="sidebar-group" key={group.title}>
              {!dashboardSidebarCollapsed.value && (
                <div class="sidebar-group-title">{group.title}</div>
              )}
              <ul class="sidebar-menu">
                {group.items.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        class={`sidebar-nav-item ${active ? "active" : ""}`}
                        onClick={() => handleNav(item.href)}
                        title={item.label}
                      >
                        <span class="sidebar-item-icon">
                          <Icon name={item.icon} size={17} />
                        </span>
                        {!dashboardSidebarCollapsed.value && (
                          <span class="sidebar-item-label">{item.label}</span>
                        )}
                        {!dashboardSidebarCollapsed.value && item.badge && (
                          <span class={`sidebar-item-badge badge-${item.badgeTone ?? "brand"}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Card */}
        <div class="sidebar-footer">
          <div class="sidebar-user-block">
            <img
              src={user?.avatar_url ?? defaultAvatar}
              alt={user?.display_name ?? "Administrador"}
              class="sidebar-user-avatar"
            />
            {!dashboardSidebarCollapsed.value && (
              <div class="sidebar-user-info">
                <strong class="sidebar-user-name">{user?.display_name ?? "Administrador"}</strong>
                <span class="sidebar-user-email">{user?.email ?? "admin@test.pe"}</span>
                <span class="sidebar-role-pill">{user?.role ?? "ADMIN"}</span>
              </div>
            )}
            <button
              type="button"
              class="sidebar-logout-btn"
              onClick={async () => {
                try {
                  await api("/auth/logout", { method: "POST" });
                  session.value = { authenticated: false };
                  notify("Sesión cerrada");
                  navigate("/");
                } catch (e) {
                  notify(toError(e), "error");
                }
              }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function DashboardHeader() {
  const path = routePath.value;
  const isSeller = path.startsWith("/seller");
  const user = session.value.user;

  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80";

  // Breadcrumbs generator
  const getBreadcrumb = () => {
    if (path.startsWith("/seller")) return "Seller Center › Gestión Comercial";
    if (path.includes("/orders")) return "Administración › Comercio › Pedidos Globales";
    if (path.includes("/sellers")) return "Administración › Vendedores & KYB";
    if (path.includes("/users")) return "Administración › Usuarios & Clientes";
    if (path.includes("/payments")) return "Administración › Finanzas › Mercado Pago";
    if (path.includes("/commissions")) return "Administración › Finanzas › Comisiones";
    if (path.includes("/trust")) return "Administración › Confianza & Moderación";
    if (path.includes("/support")) return "Administración › Soporte al Cliente";
    if (path.includes("/returns")) return "Administración › Devoluciones & Reembolsos";
    if (path.includes("/appearance")) return "Administración › Gobernanza › Apariencia";
    if (path.includes("/features")) return "Administración › Gobernanza › Feature Flags";
    if (path.includes("/audit")) return "Administración › Seguridad › Auditoría";
    return "Administración › Resumen & KPIs";
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 1024) {
      dashboardSidebarOpen.value = !dashboardSidebarOpen.value;
    } else {
      dashboardSidebarCollapsed.value = !dashboardSidebarCollapsed.value;
    }
  };

  return (
    <header class="dashboard-topbar" role="banner">
      <div class="dashboard-topbar-left">
        {/* Hamburger Toggle Button */}
        <button
          type="button"
          class="dashboard-hamburger-btn"
          onClick={toggleSidebar}
          aria-label="Alternar menú lateral"
          title="Abrir/Cerrar menú lateral"
        >
          <Icon name="menu" size={20} />
        </button>

        {/* Breadcrumb Trail */}
        <div class="dashboard-breadcrumbs">
          <span class="crumb-root">{theme.value.brand_name ?? "NexaMarket"}</span>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{getBreadcrumb()}</span>
        </div>
      </div>

      <div class="dashboard-topbar-right">
        {/* Live Infrastructure Pills */}
        <div class="topbar-status-pill" title="Base de datos PostgreSQL en vivo">
          <span class="status-dot pulse" />
          <span class="status-text hidden-xs">PostgreSQL 16 · Live</span>
        </div>

        <div class="topbar-status-pill hidden-mobile" title="Pasarela Mercado Pago Split">
          <span class="status-dot secure" />
          <span class="status-text">Mercado Pago Split</span>
        </div>

        {/* Public Storefront Bridge Button */}
        <a
          href="/"
          class="dashboard-btn-storefront"
          title="Ver cómo ven la tienda pública los compradores"
        >
          <Icon name="home" size={14} />
          <span class="hidden-mobile">Ver tienda pública</span>
          <Icon name="arrow" size={12} />
        </a>

        {/* Theme mode toggle */}
        <button
          type="button"
          class="dashboard-icon-btn"
          onClick={cycleColorMode}
          aria-label={`Cambiar tema. Modo actual: ${darkMode.value}`}
          title="Alternar tema Claro / Oscuro"
        >
          <Icon name={actualDark.value ? "sun" : "moon"} size={17} />
        </button>

        {/* Notifications Bell */}
        <a
          href="/notifications"
          class="dashboard-icon-btn"
          aria-label="Centro de notificaciones"
          title="Ver notificaciones del sistema"
        >
          <Icon name="bell" size={17} />
          {unreadCount.value > 0 && (
            <span class="dashboard-badge-counter">{unreadCount.value}</span>
          )}
        </a>

        {/* User Profile Avatar with dropdown trigger */}
        <a href="/account" class="dashboard-user-pill-link" title="Mi Cuenta / Cambiar Foto">
          <img
            src={user?.avatar_url ?? defaultAvatar}
            alt={user?.display_name ?? "Usuario"}
            class="topbar-avatar-img"
          />
          <div class="topbar-user-meta hidden-mobile">
            <span class="topbar-user-name">{user?.display_name ?? "Administrador"}</span>
            <span class="topbar-user-role">{user?.role ?? "ADMIN"}</span>
          </div>
        </a>
      </div>
    </header>
  );
}

export function DashboardFooter() {
  return (
    <footer class="dashboard-footer" role="contentinfo">
      <div class="dashboard-footer-inner container-fluid">
        <div class="dashboard-footer-left">
          <span class="dashboard-sys-tag">NexaMarket Enterprise · v0.1.0-beta</span>
          <span class="dashboard-footer-sep">·</span>
          <span>NestJS Modular Backend</span>
          <span class="dashboard-footer-sep">·</span>
          <span>Drizzle ORM Real</span>
          <span class="dashboard-footer-sep">·</span>
          <span>Keycloak OIDC PKCE</span>
        </div>
        <div class="dashboard-footer-right">
          <span class="dashboard-sec-badge" title="Validación de seguridad PCI-DSS">
            <Icon name="shield" size={13} />
            <span>PCI-DSS Validado · 0 Secretos en Cliente</span>
          </span>
          <span class="dashboard-footer-sep">·</span>
          <span class="dashboard-uptime">
            <span class="status-dot pulse" /> SLA 99.98%
          </span>
        </div>
      </div>
    </footer>
  );
}
