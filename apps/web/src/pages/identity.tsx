import { useEffect, useState } from "preact/hooks";
import {
  Button,
  ConfirmModal,
  Empty,
  Icon,
  ProductArt,
  Protected,
  SkeletonOrderList,
  SkeletonProductCard,
  Status,
} from "../components/ui";
import {
  api,
  type BuyerReturnRequest,
  type Cart,
  money,
  type SessionUser,
  signIn,
  toError,
} from "../lib/api";
import {
  actualDark,
  cartCount,
  darkMode,
  navigate,
  notify,
  refreshUnreadNotifications,
  session,
  setColorMode,
  theme,
} from "../lib/store";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="social-icon">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.16z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="#1877F2"
      aria-hidden="true"
      class="social-icon"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AuthHeader() {
  return (
    <header class="auth-topbar">
      <a href="/" class="auth-back-link">
        <Icon name="arrow" size={16} /> <span>Volver a la tienda</span>
      </a>
      <a href="/" class="auth-logo-badge">
        <img
          src={actualDark.value ? "/logo-wordmark-dark.png" : "/logo-wordmark-light.png"}
          alt={theme.value.brand_name ?? "NexaMarket AI"}
          style={{ height: "28px", width: "auto", objectFit: "contain" }}
        />
      </a>
      <button
        type="button"
        class="auth-mode-toggle"
        onClick={() => setColorMode(darkMode.value ? "light" : "dark")}
        title={darkMode.value ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        aria-label="Alternar tema"
      >
        <Icon name={darkMode.value ? "sun" : "moon"} size={16} />
        <span>{darkMode.value ? "Modo Claro" : "Modo Oscuro"}</span>
      </button>
    </header>
  );
}

export function LoginPage() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState("");

  const queryParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const isKeycloakOffline = queryParams.get("keycloak_offline") === "1";
  const returnTo = queryParams.get("return_to") ?? "/account";

  const handleDevLogin = async (role: "BUYER" | "SELLER" | "ADMIN", email?: string) => {
    setLoadingRole(role);
    try {
      const res = await api<{ authenticated: true; user: SessionUser; csrf: string }>(
        "/auth/dev-login",
        {
          method: "POST",
          body: JSON.stringify({ role, email: email || undefined }),
        },
      );
      session.value = { authenticated: true, user: res.user };
      notify(`Bienvenido, ${res.user.display_name ?? res.user.email}!`, "success");
      void refreshUnreadNotifications();
      const dest =
        returnTo !== "/account"
          ? returnTo
          : role === "ADMIN"
            ? "/admin"
            : role === "SELLER"
              ? "/seller"
              : "/account";
      navigate(dest);
    } catch (e) {
      notify(toError(e), "error");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <main class="auth-background">
      <AuthHeader />
      <div class="auth-wrapper">
        <div class="auth-feature">
          <div class="auth-feature-pill">
            <span class="auth-pulse-dot" /> SEGURIDAD BANCARIA & PRIVACIDAD
          </div>
          <span class="eyebrow">BIENVENIDO A {theme.value.brand_name ?? "NexaMarket"}</span>
          <h1 class="auth-hero-title">Tu portal seguro a la mejor tecnología verificada.</h1>
          <p class="auth-hero-desc">
            Accede a tu cuenta para gestionar pedidos, listas de deseos, garantías oficiales y
            soporte directo con sellers certificados.
          </p>
          <div class="auth-value-props">
            <div class="auth-prop-card">
              <div class="auth-prop-icon">
                <Icon name="shield" size={20} />
              </div>
              <div class="auth-prop-body">
                <b>Identidad Centralizada OIDC Keycloak</b>
                <p>
                  Tokens criptográficos PKCE, sesiones auditables y soporte para roles de Comprador,
                  Vendedor y Administrador.
                </p>
              </div>
            </div>
            <div class="auth-prop-card">
              <div class="auth-prop-icon">
                <Icon name="check" size={20} />
              </div>
              <div class="auth-prop-body">
                <b>Cero almacenamiento de tarjetas de crédito</b>
                <p>
                  Pagos procesados de forma segura con Mercado Pago bajo estándar PCI-DSS nivel 1.
                </p>
              </div>
            </div>
            <div class="auth-prop-card">
              <div class="auth-prop-icon">
                <Icon name="truck" size={20} />
              </div>
              <div class="auth-prop-body">
                <b>Vendedores 100% Verificados & GTIN GS1</b>
                <p>
                  Autenticidad comprobada de productos y trazabilidad en envíos a nivel nacional.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="auth-card">
          <div class="auth-card-badge">
            <Icon name="shield" size={14} /> CONTROL DE ACCESO
          </div>
          <span class="eyebrow">ACCESO RÁPIDO & SEGURO</span>
          <h2>Iniciar sesión</h2>
          <p class="auth-sub">Elige tu rol para ingresar con 1 clic o escribe tu correo.</p>

          {isKeycloakOffline && (
            <div class="auth-offline-notice" role="alert">
              <Icon name="shield" size={18} />
              <div>
                <strong>Keycloak SSO (puerto 8080) en reposo</strong>
                <p>
                  Para una prueba inmediata y sin fricciones, ingresa con 1 clic seleccionando
                  cualquiera de los perfiles de demostración abajo.
                </p>
              </div>
            </div>
          )}

          <div class="quick-role-section">
            <div class="quick-role-title">
              <span>Perfiles de demostración activos</span>
              <span>1-CLIC</span>
            </div>
            <div class="quick-role-grid">
              <button
                type="button"
                class="quick-role-btn"
                disabled={loadingRole !== null}
                onClick={() => handleDevLogin("BUYER")}
              >
                <div class="quick-role-lead">
                  <div class="quick-role-icon role-icon-buyer">
                    <Icon name="cart" size={18} />
                  </div>
                  <div class="quick-role-text">
                    <strong>Comprador Oficial</strong>
                    <small>buyer@test.pe • Carrito, favoritos y pedidos</small>
                  </div>
                </div>
                <span class="quick-role-pill">
                  {loadingRole === "BUYER" ? "Entrando..." : "Entrar →"}
                </span>
              </button>

              <button
                type="button"
                class="quick-role-btn"
                disabled={loadingRole !== null}
                onClick={() => handleDevLogin("SELLER")}
              >
                <div class="quick-role-lead">
                  <div class="quick-role-icon role-icon-seller">
                    <Icon name="package" size={18} />
                  </div>
                  <div class="quick-role-text">
                    <strong>Vendedor Oficial</strong>
                    <small>seller@test.pe • Seller Center, catálogo y ventas</small>
                  </div>
                </div>
                <span class="quick-role-pill">
                  {loadingRole === "SELLER" ? "Entrando..." : "Entrar →"}
                </span>
              </button>

              <button
                type="button"
                class="quick-role-btn"
                disabled={loadingRole !== null}
                onClick={() => handleDevLogin("ADMIN")}
              >
                <div class="quick-role-lead">
                  <div class="quick-role-icon role-icon-admin">
                    <Icon name="spark" size={18} />
                  </div>
                  <div class="quick-role-text">
                    <strong>Administrador</strong>
                    <small>admin@test.pe • Gobernanza, temas y auditoría</small>
                  </div>
                </div>
                <span class="quick-role-pill">
                  {loadingRole === "ADMIN" ? "Entrando..." : "Entrar →"}
                </span>
              </button>
            </div>
          </div>

          <div class="divider-word">o ingresar con correo personalizado</div>

          <form
            class="auth-direct-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (customEmail.trim()) {
                void handleDevLogin("BUYER", customEmail.trim());
              }
            }}
          >
            <div class="auth-direct-input-wrap">
              <input
                type="email"
                class="auth-direct-input"
                placeholder="tu-correo@ejemplo.pe"
                value={customEmail}
                onInput={(e) => setCustomEmail((e.target as HTMLInputElement).value)}
                required
              />
              <Button type="submit" disabled={loadingRole !== null || !customEmail.trim()}>
                Ingresar <Icon name="arrow" size={16} />
              </Button>
            </div>
          </form>

          <div class="divider-word">opciones federadas / OIDC</div>

          <div class="auth-social-stack">
            <button
              type="button"
              class="social-button"
              onClick={() => signIn(returnTo)}
              title="Iniciar sesión mediante Keycloak OIDC Realm en puerto 8080"
            >
              <Icon name="shield" size={18} />
              <span>Keycloak OIDC Central SSO</span>
            </button>
            <a
              class="social-button"
              href={`/auth/login?provider=google&return_to=${encodeURIComponent(returnTo)}`}
              aria-label="Continuar con Google"
            >
              <GoogleIcon />
              <span>Google</span>
            </a>
            <a
              class="social-button"
              href={`/auth/login?provider=facebook&return_to=${encodeURIComponent(returnTo)}`}
              aria-label="Continuar con Facebook"
            >
              <FacebookIcon />
              <span>Facebook</span>
            </a>
          </div>

          <p class="auth-signup">
            ¿Nuevo en {theme.value.brand_name ?? "NexaMarket"}? <a href="/register">Crear cuenta</a>
          </p>
          <p class="auth-small">
            La verificación OTP/TOTP y recuperación de contraseña se realizan en el flujo seguro de
            identidad OIDC.
          </p>
        </div>
      </div>
    </main>
  );
}

export function RegisterPage() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");

  const queryParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const isKeycloakOffline = queryParams.get("keycloak_offline") === "1";
  const returnTo = queryParams.get("return_to") ?? "/account";

  const handleRegister = async () => {
    setLoadingRole(role);
    try {
      const res = await api<{ authenticated: true; user: SessionUser; csrf: string }>(
        "/auth/dev-login",
        {
          method: "POST",
          body: JSON.stringify({ role, email: email.trim() || undefined }),
        },
      );
      session.value = { authenticated: true, user: res.user };
      notify(
        `Cuenta creada con éxito! Bienvenido, ${res.user.display_name ?? res.user.email}`,
        "success",
      );
      void refreshUnreadNotifications();
      navigate(returnTo !== "/account" ? returnTo : role === "SELLER" ? "/seller" : "/account");
    } catch (e) {
      notify(toError(e), "error");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <main class="auth-background">
      <AuthHeader />
      <div class="auth-wrapper">
        <div class="auth-feature">
          <div class="auth-feature-pill">
            <span class="auth-pulse-dot" /> NUEVA CUENTA UNIVERSAL
          </div>
          <span class="eyebrow">ÚNETE A {theme.value.brand_name ?? "NexaMarket"}</span>
          <h1 class="auth-hero-title">Descubre grandes oportunidades.</h1>
          <p class="auth-hero-desc">
            Una sola cuenta universal para comprar con las comisiones más bajas de la región,
            guardar tus favoritos y solicitar onboarding como seller verificado.
          </p>
          <div class="auth-value-props">
            <div class="auth-prop-card">
              <div class="auth-prop-icon">
                <Icon name="shield" size={20} />
              </div>
              <div class="auth-prop-body">
                <b>Flujo de Registro Blindado</b>
                <p>
                  Verificación de correo y políticas robustas de contraseñas bajo directrices NIST.
                </p>
              </div>
            </div>
            <div class="auth-prop-card">
              <div class="auth-prop-icon">
                <Icon name="check" size={20} />
              </div>
              <div class="auth-prop-body">
                <b>Privacidad por diseño</b>
                <p>Tus datos personales y direcciones permanecen confidenciales y cifrados.</p>
              </div>
            </div>
            <div class="auth-prop-card">
              <div class="auth-prop-icon">
                <Icon name="truck" size={20} />
              </div>
              <div class="auth-prop-body">
                <b>Checkout Multi-Seller Transparente</b>
                <p>Agrupa compras de múltiples vendedores en un único flujo de pago auditable.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="auth-card">
          <div class="auth-card-badge">
            <Icon name="user" size={14} /> REGISTRO RÁPIDO
          </div>
          <span class="eyebrow">CREA TU CUENTA</span>
          <h2>Únete hoy a la plataforma</h2>
          <p class="auth-sub">Regístrate en 1 clic como Comprador o Vendedor.</p>

          {isKeycloakOffline && (
            <div class="auth-offline-notice" role="alert">
              <Icon name="shield" size={18} />
              <div>
                <strong>Keycloak SSO (puerto 8080) en reposo</strong>
                <p>Puedes crear tu cuenta directamente seleccionando tu rol preferido abajo.</p>
              </div>
            </div>
          )}

          <div class="quick-role-section">
            <div class="quick-role-grid">
              <button
                type="button"
                class="quick-role-btn"
                disabled={loadingRole !== null}
                onClick={() => handleRegister()}
              >
                <div class="quick-role-lead">
                  <div class="quick-role-icon role-icon-buyer">
                    <Icon name="cart" size={18} />
                  </div>
                  <div class="quick-role-text">
                    <strong>Crear cuenta de Comprador</strong>
                    <small>Acceso a ofertas, compras seguras y seguimiento</small>
                  </div>
                </div>
                <span class="quick-role-pill">
                  {loadingRole === "BUYER" ? "Creando..." : "Crear →"}
                </span>
              </button>

              <button
                type="button"
                class="quick-role-btn"
                disabled={loadingRole !== null}
                onClick={() => {
                  setRole("SELLER");
                  void handleRegister();
                }}
              >
                <div class="quick-role-lead">
                  <div class="quick-role-icon role-icon-seller">
                    <Icon name="package" size={18} />
                  </div>
                  <div class="quick-role-text">
                    <strong>Crear cuenta de Vendedor</strong>
                    <small>Onboarding comercial, publicaciones e inventario</small>
                  </div>
                </div>
                <span class="quick-role-pill">
                  {loadingRole === "SELLER" ? "Creando..." : "Crear →"}
                </span>
              </button>
            </div>
          </div>

          <div class="divider-word">o registrar con correo específico</div>

          <form
            class="auth-direct-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleRegister();
            }}
          >
            <div class="auth-direct-input-wrap">
              <input
                type="email"
                class="auth-direct-input"
                placeholder="nuevo-usuario@ejemplo.pe"
                value={email}
                onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
              />
              <Button type="submit" disabled={loadingRole !== null || !email.trim()}>
                Registrar <Icon name="arrow" size={16} />
              </Button>
            </div>
          </form>

          <p class="auth-signup">
            ¿Ya tienes una cuenta? <a href="/login">Inicia sesión aquí</a>
          </p>
          <p class="auth-small">
            Al registrarte aceptas nuestros{" "}
            <a class="text-link" href="/terms">
              Términos
            </a>{" "}
            y{" "}
            <a class="text-link" href="/privacy">
              Política de Privacidad
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

export function AccountPage() {
  const [addresses, setAddresses] = useState<
      Array<{
        id: string;
        label: string;
        recipient?: string;
        line1: string;
        city: string;
        region: string;
      }>
    >([]),
    [profile, setProfile] = useState<SessionUser | null>(null),
    [deleteId, setDeleteId] = useState<string | null>(null),
    [form, setForm] = useState(false),
    [busy, setBusy] = useState(false);
  const [values, setValues] = useState({
    label: "Casa",
    recipient: "",
    line1: "",
    city: "",
    region: "",
    postal_code: "",
    phone: "",
  });

  const reload = () =>
    api<typeof addresses>("/api/v1/me/addresses")
      .then(setAddresses)
      .catch((e) => notify(toError(e)));

  useEffect(() => {
    if (session.value.authenticated) {
      void reload();
      void api<SessionUser>("/auth/me")
        .then((res) => {
          if (res && typeof res === "object" && typeof res.display_name === "string") {
            setProfile(res);
          }
        })
        .catch(() => {});
    }
  }, [session.value.authenticated]);

  const create = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/me/addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      setForm(false);
      await reload();
      notify("Dirección guardada");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };

  const activeUser = profile ?? (session.value.authenticated ? session.value.user : null);

  return (
    <main class="container page">
      <div class="page-title">
        <h1>Mi cuenta</h1>
        <p>Administra tus datos, preferencias de apariencia y direcciones de entrega.</p>
      </div>
      <Protected>
        <div class="account-grid">
          <div class="panel account-identity">
            <div class="avatar" style={{ overflow: "hidden", padding: 0 }}>
              <img
                src={
                  activeUser?.avatar_url ??
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
                }
                alt={activeUser?.display_name ?? "Usuario"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <h2>{activeUser?.display_name ?? "Comprador"}</h2>
            <p>{activeUser?.email ?? ""}</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              <Status>{activeUser?.role ?? "BUYER"}</Status>
              {activeUser?.seller_id && <Status>SELLER VERIFICADO</Status>}
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                marginBottom: "14px",
                flexWrap: "wrap",
              }}
            >
              {[
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
              ].map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  title={`Elegir avatar ${idx + 1}`}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    padding: 0,
                    overflow: "hidden",
                    border:
                      activeUser?.avatar_url === url
                        ? "2.5px solid var(--brand)"
                        : "1.5px solid var(--line)",
                    cursor: "pointer",
                    background: "transparent",
                  }}
                  onClick={async () => {
                    try {
                      await api("/api/v1/me/avatar", {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ avatar_url: url }),
                      });
                      if (session.value.authenticated) {
                        session.value = {
                          ...session.value,
                          user: { ...session.value.user, avatar_url: url },
                        };
                      }
                      await reload();
                      notify("Foto de perfil actualizada");
                    } catch (err) {
                      notify(toError(err), "error");
                    }
                  }}
                >
                  <img
                    src={url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>

            <fieldset class="theme-segmented" aria-label="Preferencia de tema">
              {(
                [
                  ["light", "Claro"],
                  ["dark", "Oscuro"],
                  ["auto", "Sistema"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  class={darkMode.value === mode ? "active" : ""}
                  onClick={() => setColorMode(mode)}
                >
                  {label}
                </button>
              ))}
            </fieldset>

            <div class="account-links">
              <a href="/orders">
                Mis compras <Icon name="arrow" />
              </a>
              <a href="/account/returns">
                Mis devoluciones <Icon name="arrow" />
              </a>
              <a href="/favorites">
                Mis favoritos <Icon name="arrow" />
              </a>
              <a href="/notifications">
                Notificaciones <Icon name="arrow" />
              </a>
              <a href="/support">
                Centro de ayuda <Icon name="arrow" />
              </a>
              <a href="/seller">
                Centro de ventas <Icon name="arrow" />
              </a>
              {session.value.authenticated && session.value.user.role === "ADMIN" && (
                <a href="/admin">
                  Administración <Icon name="arrow" />
                </a>
              )}
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await api("/auth/logout", { method: "POST" });
                  location.href = "/";
                } catch (e) {
                  notify(toError(e));
                }
              }}
            >
              Cerrar sesión <Icon name="logout" size={16} />
            </Button>
          </div>
          <div class="panel">
            <div class="section-head">
              <h2>Direcciones de entrega</h2>
              <Button variant="outline" onClick={() => setForm(!form)}>
                {form ? "Cancelar" : "+ Agregar"}
              </Button>
            </div>
            {form && (
              <form class="form-grid" onSubmit={create}>
                {(Object.keys(values) as Array<keyof typeof values>).map((k) => (
                  <label key={k}>
                    {
                      (
                        {
                          label: "Nombre",
                          recipient: "Destinatario",
                          line1: "Dirección",
                          city: "Ciudad",
                          region: "Departamento",
                          postal_code: "Código postal",
                          phone: "Teléfono",
                        } as Record<string, string>
                      )[k]
                    }
                    <input
                      required={k !== "postal_code"}
                      value={values[k]}
                      onInput={(e) =>
                        setValues({ ...values, [k]: (e.currentTarget as HTMLInputElement).value })
                      }
                    />
                  </label>
                ))}
                <Button type="submit" disabled={busy}>
                  Guardar dirección
                </Button>
              </form>
            )}
            {addresses.length ? (
              addresses.map((a) => (
                <div class="address-card" key={a.id}>
                  <div>
                    <b>{a.label}</b>
                    {a.recipient && <small> · {a.recipient}</small>}
                    <p>
                      {a.line1}, {a.city}, {a.region}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="text-link danger-link"
                    onClick={() => setDeleteId(a.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))
            ) : (
              <p>Aún no has registrado direcciones.</p>
            )}

            <div class="account-stats-row">
              <a href="/orders" class="account-stat-box">
                <div class="account-stat-icon">
                  <Icon name="package" size={22} />
                </div>
                <div class="account-stat-info">
                  <strong>Mis Compras</strong>
                  <small>Historial de pedidos</small>
                </div>
              </a>
              <a href="/favorites" class="account-stat-box">
                <div class="account-stat-icon">
                  <Icon name="heart" size={22} />
                </div>
                <div class="account-stat-info">
                  <strong>Favoritos</strong>
                  <small>Productos guardados</small>
                </div>
              </a>
              <a href="/notifications" class="account-stat-box">
                <div class="account-stat-icon">
                  <Icon name="bell" size={22} />
                </div>
                <div class="account-stat-info">
                  <strong>Notificaciones</strong>
                  <small>Centro de avisos</small>
                </div>
              </a>
            </div>

            <div class="account-security-card">
              <div class="account-security-head">
                <Icon name="shield" size={22} />
                <strong>Identidad y Seguridad NexaMarket</strong>
              </div>
              <p>
                Tu cuenta está respaldada por <b>Keycloak OIDC (RFC 6749)</b> con sesión
                criptográfica segura. Tus pagos se procesan directamente con{" "}
                <b>Mercado Pago bajo estándar PCI-DSS</b>. Ningún número ni código de tarjeta se
                almacena en nuestros servidores.
              </p>
            </div>
          </div>
        </div>

        <ConfirmModal
          open={Boolean(deleteId)}
          title="Eliminar dirección de entrega"
          message="¿Confirmas que deseas eliminar esta dirección de tu libreta? Tus pedidos anteriores no se verán afectados."
          confirmLabel="Eliminar dirección"
          variant="danger"
          onConfirm={async () => {
            if (!deleteId) return;
            await api(`/api/v1/me/addresses/${deleteId}`, { method: "DELETE" });
            await reload();
            notify("Dirección eliminada");
          }}
          onClose={() => setDeleteId(null)}
        />
      </Protected>
    </main>
  );
}

export function FavoritesPage() {
  const [items, setItems] = useState<
      Array<{ listing_id: string; title: string; image_url?: string | null; price_minor: number }>
    >([]),
    [busyId, setBusyId] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const reload = () =>
    api<typeof items>("/api/v1/me/favorites")
      .then(setItems)
      .catch((e) => notify(toError(e)))
      .finally(() => setLoading(false));
  useEffect(() => {
    if (session.value.authenticated) void reload();
  }, [session.value.authenticated]);

  const addToCart = async (listingId: string) => {
    setBusyId(listingId);
    try {
      const cart = await api<Cart>("/api/v1/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, quantity: 1 }),
      });
      cartCount.value = cart.lines.reduce((n, l) => n + l.quantity, 0);
      notify("Producto añadido al carrito");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main class="container page">
      <div class="page-title">
        <h1>Mis favoritos</h1>
        <p>Guarda los productos que más te interesan y agrégalos al carrito cuando quieras.</p>
      </div>
      <Protected>
        {loading ? (
          <div class="products-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonProductCard key={i} />
            ))}
          </div>
        ) : items.length ? (
          <div class="products-grid">
            {items.map((i) => (
              <article class="product-card" key={i.listing_id}>
                <a href={`/products/${i.listing_id}`} class="product-photo">
                  <ProductArt product={{ title: i.title, image_url: i.image_url ?? null }} />
                </a>
                <div class="product-info">
                  <a href={`/products/${i.listing_id}`} class="product-name">
                    {i.title}
                  </a>
                  <strong class="price tnum">{money(i.price_minor)}</strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Button
                      disabled={busyId === i.listing_id}
                      onClick={() => void addToCart(i.listing_id)}
                    >
                      {busyId === i.listing_id ? "Agregando…" : "Agregar al carrito"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busyId === i.listing_id}
                      onClick={async () => {
                        setBusyId(i.listing_id);
                        try {
                          await api(`/api/v1/me/favorites/${i.listing_id}`, { method: "DELETE" });
                          await reload();
                          notify("Eliminado de favoritos");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Quitar de favoritos
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="No tienes favoritos"
            message="Guarda productos para revisarlos después."
            action={
              <a class="btn btn-primary" href="/search">
                Explorar catálogo
              </a>
            }
          />
        )}
      </Protected>
    </main>
  );
}

export function MyReturnsPage() {
  const [items, setItems] = useState<BuyerReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session.value.authenticated) return;
    api<BuyerReturnRequest[]>("/api/v1/me/return-requests")
      .then((res) => {
        setItems(res);
        setError("");
      })
      .catch((e) => setError(toError(e)))
      .finally(() => setLoading(false));
  }, [session.value.authenticated]);

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/account">Mi cuenta</a> / <a href="/orders">Mis compras</a> / Devoluciones
      </div>
      <div class="page-title">
        <span class="eyebrow">POST-COMPRA Y GARANTÍA</span>
        <h1>Mis solicitudes de devolución</h1>
        <p>
          Consulta el estado de revisión de tus solicitudes. Los reembolsos aprobados se concilian
          de forma segura con Mercado Pago.
        </p>
      </div>
      <Protected>
        {loading ? (
          <SkeletonOrderList />
        ) : error ? (
          <Empty title="No pudimos cargar tus devoluciones" message={error} />
        ) : !items.length ? (
          <Empty
            title="No tienes solicitudes de devolución"
            message="Puedes iniciar una solicitud desde el detalle de cualquier pedido elegible."
            action={
              <a href="/orders" class="btn btn-primary">
                Ir a mis compras
              </a>
            }
          />
        ) : (
          <div class="panel">
            {items.map((r) => (
              <article class="notification-row" key={r.id}>
                <div>
                  <b>Solicitud #{r.id.slice(0, 8).toUpperCase()}</b>
                  <p style={{ margin: "4px 0" }}>{r.reason}</p>
                  <small>
                    Registrada el {new Date(r.created_at).toLocaleString("es-PE")} ·{" "}
                    <a class="text-link" href={`/orders/${r.order_id}`}>
                      Ver pedido #{r.order_id.slice(0, 8).toUpperCase()}
                    </a>
                  </small>
                </div>
                <Status>{r.status}</Status>
              </article>
            ))}
          </div>
        )}
      </Protected>
    </main>
  );
}
