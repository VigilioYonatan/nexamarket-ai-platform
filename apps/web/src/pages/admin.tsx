import { useEffect, useState } from "preact/hooks";
import {
  OrderStatusDonutChart,
  SalesOverviewChart,
  UserGrowthChart,
} from "../components/dashboard-charts";
import { Button, ConfirmModal, Empty, Icon, PromptModal, Status } from "../components/ui";
import { api, type Category, money, type Theme, toError } from "../lib/api";
import { applyTheme, categoriesList, navigate, notify, session, theme } from "../lib/store";
import {
  FlagsAdminPanel,
  PaymentsAdminPanel,
  ReturnsAdminPanel,
  SellersAdminPanel,
  SupportAdminPanel,
  TrustAdminPanel,
  UsersAdminPanel,
} from "./admin-operations";

export type AdminSection =
  | "overview"
  | "appearance"
  | "sellers"
  | "orders"
  | "users"
  | "audit"
  | "commissions"
  | "trust"
  | "support"
  | "returns"
  | "features"
  | "payments";

const VALID_ADMIN_TABS = new Set<AdminSection>([
  "overview",
  "appearance",
  "sellers",
  "orders",
  "users",
  "audit",
  "commissions",
  "trust",
  "support",
  "returns",
  "features",
  "payments",
]);

type Draft = { id: string; version: number; status: string; tokens: Theme; created_at: string };
type Application = { id: string; display_name: string; status: string; created_at: string };

export function AdminPage({ section }: { section?: string } = {}) {
  const isAdmin = session.value.authenticated && session.value.user.role === "ADMIN";
  const resolvedSection: AdminSection =
    section && VALID_ADMIN_TABS.has(section as AdminSection)
      ? (section as AdminSection)
      : "overview";

  const [tab, setTab] = useState<AdminSection>(resolvedSection),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [apps, setApps] = useState<Application[]>([]),
    [orders, setOrders] = useState<Array<{ id: string; status: string; total_minor: number }>>([]),
    [audit, setAudit] = useState<Array<{ id: string; action: string; created_at: string }>>([]),
    [form, setForm] = useState<Theme>({ ...theme.value }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [commission, setCommission] = useState(0),
    [commissionHistory, setCommissionHistory] = useState<
      Array<{ id: string; version: number; commission_bps: number; status: string }>
    >([]);
  const [rejectAppModal, setRejectAppModal] = useState<Application | null>(null);
  const [confirmCommissionModal, setConfirmCommissionModal] = useState(false);

  useEffect(() => {
    setTab(resolvedSection);
  }, [resolvedSection]);

  const selectTab = (next: AdminSection) => {
    setTab(next);
    navigate(next === "overview" ? "/admin" : `/admin/${next}`);
  };

  const refresh = async () => {
    try {
      const [d, a, o, au] = await Promise.all([
        api<Draft[]>("/api/v1/admin/settings/drafts"),
        api<Application[]>("/api/v1/admin/sellers/applications"),
        api<typeof orders>("/api/v1/admin/orders"),
        api<typeof audit>("/api/v1/admin/audit-events"),
      ]);
      setDrafts(d);
      setApps(a);
      setOrders(o);
      setAudit(au);
    } catch (e) {
      setError(toError(e));
    }
  };
  useEffect(() => {
    if (isAdmin) {
      void refresh();
      void Promise.all([
        api<{ commission_bps: number }>("/api/v1/admin/commissions"),
        api<typeof commissionHistory>("/api/v1/admin/commissions/history"),
      ])
        .then(([policy, history]) => {
          setCommission(policy.commission_bps);
          setCommissionHistory(history);
        })
        .catch((e) => setError(toError(e)));
    }
  }, [isAdmin]);
  const save = async () => {
    setBusy(true);
    try {
      await api<{ id: string }>("/api/v1/admin/settings/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      notify("Borrador guardado. Publica cuando lo hayas revisado.");
      await refresh();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };
  const action = async (path: string) => {
    setBusy(true);
    try {
      await api(path, { method: "POST" });
      const t = await api<{ tokens: Theme }>("/api/v1/settings/theme");
      theme.value = t.tokens;
      setForm({ ...t.tokens });
      applyTheme();
      await refresh();
      notify("Cambio aplicado y auditado");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };
  if (!isAdmin)
    return (
      <main class="container page">
        <Empty
          title="Acceso reservado"
          message="Se requiere una sesión administrativa autorizada. El rol nunca se asigna desde el navegador."
        />
      </main>
    );
  return (
    <main class="container page">
      <div class="page-title">
        <span class="eyebrow">ADMINISTRATION CENTER</span>
        <h1>Control central de NexaMarket</h1>
        <p>Gestiona la identidad visual, vendedores, operaciones y auditoría de la plataforma.</p>
      </div>

      <div class="stats-row admin-kpi-row">
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Solicitudes KYB</span>
            <div class="stat-card-icon">
              <Icon name="store" size={18} />
            </div>
          </div>
          <strong class="tnum">{apps.filter((x) => x.status === "APPLIED").length}</strong>
          <small>Pendientes de revisión</small>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Órdenes globales</span>
            <div class="stat-card-icon">
              <Icon name="package" size={18} />
            </div>
          </div>
          <strong class="tnum">{orders.length}</strong>
          <small>Registradas en plataforma</small>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Comisión activa</span>
            <div class="stat-card-icon">
              <Icon name="tag" size={18} />
            </div>
          </div>
          <strong class="tnum">{(commission / 100).toFixed(2)}%</strong>
          <small>Nuevos subpedidos</small>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Eventos de auditoría</span>
            <div class="stat-card-icon">
              <Icon name="shield" size={18} />
            </div>
          </div>
          <strong class="tnum">{audit.length}</strong>
          <small>Decisiones trazables</small>
        </div>
      </div>

      <div class="admin-tabs">
        <button
          type="button"
          class={tab === "overview" ? "active" : ""}
          onClick={() => selectTab("overview")}
        >
          <Icon name="grid" size={17} /> Resumen & KPIs
        </button>
        <button
          type="button"
          class={tab === "orders" ? "active" : ""}
          onClick={() => selectTab("orders")}
        >
          <Icon name="package" size={17} /> Pedidos
        </button>
        <button
          type="button"
          class={tab === "sellers" ? "active" : ""}
          onClick={() => selectTab("sellers")}
        >
          <Icon name="store" size={17} /> Vendedores
        </button>
        <button
          type="button"
          class={tab === "users" ? "active" : ""}
          onClick={() => selectTab("users")}
        >
          <Icon name="user" size={17} /> Cuentas
        </button>
        <button
          type="button"
          class={tab === "payments" ? "active" : ""}
          onClick={() => selectTab("payments")}
        >
          <Icon name="card" size={17} /> Mercado Pago
        </button>
        <button
          type="button"
          class={tab === "commissions" ? "active" : ""}
          onClick={() => selectTab("commissions")}
        >
          <Icon name="tag" size={17} /> Comisiones
        </button>
        <button
          type="button"
          class={tab === "trust" ? "active" : ""}
          onClick={() => selectTab("trust")}
        >
          <Icon name="shield" size={17} /> Moderación
        </button>
        <button
          type="button"
          class={tab === "support" ? "active" : ""}
          onClick={() => selectTab("support")}
        >
          <Icon name="help" size={17} /> Soporte
        </button>
        <button
          type="button"
          class={tab === "returns" ? "active" : ""}
          onClick={() => selectTab("returns")}
        >
          <Icon name="rotate" size={17} /> Devoluciones
        </button>
        <button
          type="button"
          class={tab === "appearance" ? "active" : ""}
          onClick={() => selectTab("appearance")}
        >
          <Icon name="settings" size={17} /> Apariencia
        </button>
        <button
          type="button"
          class={tab === "features" ? "active" : ""}
          onClick={() => selectTab("features")}
        >
          <Icon name="spark" size={17} /> Funciones
        </button>
        <button
          type="button"
          class={tab === "audit" ? "active" : ""}
          onClick={() => selectTab("audit")}
        >
          <Icon name="lock" size={17} /> Auditoría
        </button>
      </div>
      {error && (
        <div role="alert" class="error-note">
          {error}
        </div>
      )}
      {tab === "overview" && (
        <div class="admin-overview-grid">
          {/* Main Interactive Sales Volume Chart */}
          <SalesOverviewChart />

          {/* Dual Row: Order Status Donut Breakdown + User Growth Bar Chart */}
          <div class="admin-charts-dual-row">
            <OrderStatusDonutChart />
            <UserGrowthChart />
          </div>

          {/* Recent Global Orders Quick Preview */}
          <div class="panel">
            <div class="panel-head-row">
              <div>
                <span class="eyebrow">MONITOREO TRANSACCIONAL EN VIVO</span>
                <h3>Últimos Pedidos del Marketplace</h3>
                <p class="help-text">
                  Transacciones procesadas en PostgreSQL vinculadas a vendedores y pagos de Mercado Pago.
                </p>
              </div>
              <button
                type="button"
                class="btn btn-outline"
                onClick={() => selectTab("orders")}
              >
                Ver todos los pedidos ({orders.length}) →
              </button>
            </div>
            <div class="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>ID de Pedido</th>
                    <th>Estado de Pago</th>
                    <th>Total Soles</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => (
                    <tr key={o.id}>
                      <td><code class="short-id">#{o.id.slice(0, 8)}</code></td>
                      <td><Status>{o.status}</Status></td>
                      <td><strong class="tnum">{money(o.total_minor)}</strong></td>
                      <td>
                        <a href={`/orders/${o.id}`} class="btn-link">Inspeccionar →</a>
                      </td>
                    </tr>
                  ))}
                  {!orders.length && (
                    <tr><td colSpan={4}>No hay pedidos registrados aún.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {tab === "users" && <UsersAdminPanel />}
      {tab === "appearance" && (
        <div class="admin-grid">
          <section class="panel">
            <h2>Personalización global</h2>
            <p class="help-text">
              La configuración afecta a todo el marketplace. Los vendedores no pueden editar estos
              ajustes.
            </p>
            <div class="form-grid">
              {(["primary", "background", "surface", "text"] as const).map((k) => (
                <label class="color-field" key={k}>
                  <span>
                    {
                      (
                        {
                          primary: "Color principal",
                          background: "Fondo claro",
                          surface: "Superficie",
                          text: "Color de texto",
                        } as Record<string, string>
                      )[k]
                    }
                  </span>
                  <div>
                    <input
                      type="color"
                      aria-label={k}
                      value={form[k]}
                      onInput={(e) => setForm({ ...form, [k]: e.currentTarget.value })}
                    />
                    <code>{form[k]}</code>
                  </div>
                </label>
              ))}
              <label>
                Marca
                <input
                  maxLength={60}
                  value={form.brand_name ?? "NexaMarket"}
                  onInput={(e) => setForm({ ...form, brand_name: e.currentTarget.value })}
                />
              </label>
              <label>
                Logo global (PNG, JPEG o WebP)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    const body = new FormData();
                    body.append("file", file);
                    try {
                      const saved = await api<{ url: string }>("/api/v1/admin/assets", {
                        method: "POST",
                        body,
                      });
                      setForm((v) => ({ ...v, logo_url: saved.url }));
                      notify("Logo subido. Guarda el borrador para publicarlo.");
                    } catch (e) {
                      notify(toError(e));
                    }
                  }}
                />
              </label>
              <label>
                Título del hero
                <input
                  maxLength={100}
                  value={form.hero_title ?? ""}
                  onInput={(e) => setForm({ ...form, hero_title: e.currentTarget.value })}
                />
              </label>
              <label>
                Descripción del hero
                <textarea
                  maxLength={240}
                  value={form.hero_subtitle ?? ""}
                  onInput={(e) => setForm({ ...form, hero_subtitle: e.currentTarget.value })}
                />
              </label>
              <label>
                Tipografía
                <select
                  value={form.font}
                  onChange={(e) => setForm({ ...form, font: e.currentTarget.value })}
                >
                  {["Inter", "Roboto", "Source Sans 3", "Nunito", "system-ui"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Radio de bordes ({form.radius}px)
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={form.radius}
                  onInput={(e) => setForm({ ...form, radius: Number(e.currentTarget.value) })}
                />
              </label>
            </div>
            <div class="action-row">
              <Button disabled={busy} onClick={save}>
                Guardar borrador
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  theme.value = form;
                  applyTheme();
                  notify("Vista previa local, aún no publicada");
                }}
              >
                Vista previa
              </Button>
            </div>
          </section>
          <div class="admin-side">
            <section class="panel">
              <h2>Vista previa de componentes</h2>
              <div
                class="preview-area"
                style={{ background: form.background, color: form.text, borderRadius: form.radius }}
              >
                <div class="preview-header">
                  <span style={{ color: form.primary }}>✦</span>
                  <strong>{form.brand_name}</strong>
                </div>
                <h3>{form.hero_title ?? "Tu próxima compra"}</h3>
                <p>{form.hero_subtitle}</p>
                <span class="preview-button" style={{ background: form.primary }}>
                  Explorar productos
                </span>
              </div>
            </section>
            <section class="panel">
              <h2>Versiones</h2>
              <p class="help-text">
                Publica versiones previamente validadas o recupera configuraciones anteriores.
              </p>
              {drafts.map((d) => (
                <div class="draft-row" key={d.id}>
                  <span>
                    Versión <b class="tnum">{d.version}</b> <Status>{d.status}</Status>
                  </span>
                  {d.status === "DRAFT" ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => action(`/api/v1/admin/settings/${d.id}/publish`)}
                    >
                      Publicar
                    </Button>
                  ) : d.status === "ARCHIVED" ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => action(`/api/v1/admin/settings/${d.id}/rollback`)}
                    >
                      Restaurar
                    </Button>
                  ) : null}
                </div>
              ))}
            </section>
          </div>
          <section class="panel" style={{ gridColumn: "1 / -1", marginTop: "24px" }}>
            <h2>Personalización de imágenes de categorías</h2>
            <p class="help-text">
              Sube imágenes exclusivas (WebP optimizado a 512x512 en SeaweedFS) para cada categoría.
              Si no defines una imagen personalizada, el sistema mostrará automáticamente la foto
              del producto más reciente de esa categoría.
            </p>
            <div class="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Jerarquía</th>
                    <th>Imagen en vivo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesList.value.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <strong>{cat.name}</strong>
                        <small
                          style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}
                        >
                          slug: {cat.slug}
                        </small>
                      </td>
                      <td>
                        <Status>{cat.parent_id ? "Subcategoría" : "Principal"}</Status>
                      </td>
                      <td>
                        {cat.image_url ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              style={{
                                width: "48px",
                                height: "48px",
                                objectFit: "cover",
                                borderRadius: "8px",
                                border: "1px solid var(--line)",
                              }}
                            />
                            <small
                              style={{
                                maxWidth: "220px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "var(--muted)",
                              }}
                            >
                              {cat.image_url}
                            </small>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                            Fallback de catálogo
                          </span>
                        )}
                      </td>
                      <td>
                        <label
                          class="btn btn-outline"
                          style={{
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.78rem",
                            padding: "6px 12px",
                          }}
                        >
                          <Icon name="spark" size={14} /> Subir nueva
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.currentTarget.files?.[0];
                              if (!file) return;
                              const body = new FormData();
                              body.append("file", file);
                              try {
                                const saved = await api<{ url: string }>("/api/v1/admin/assets", {
                                  method: "POST",
                                  body,
                                });
                                await api(`/api/v1/admin/categories/${cat.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ image_url: saved.url }),
                                });
                                const updatedCats = await api<Category[]>("/api/v1/categories");
                                categoriesList.value = updatedCats;
                                notify(`Imagen actualizada para “${cat.name}”`);
                              } catch (err) {
                                notify(toError(err));
                              }
                            }}
                          />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      {tab === "sellers" && (
        <section class="panel">
          <h2>Solicitudes de vendedores</h2>
          <p>
            Antes de aprobar, verifica documentación, identificación fiscal y políticas KYB fuera de
            este flujo automatizado.
          </p>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td>{a.display_name}</td>
                    <td>
                      <Status>{a.status}</Status>
                    </td>
                    <td>{new Date(a.created_at).toLocaleDateString("es-PE")}</td>
                    <td>
                      {a.status === "APPLIED" && (
                        <div class="action-row">
                          <Button
                            disabled={busy}
                            onClick={() =>
                              action(`/api/v1/admin/sellers/applications/${a.id}/approve`)
                            }
                          >
                            Aprobar
                          </Button>
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => setRejectAppModal(a)}
                          >
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SellersAdminPanel />

          <PromptModal
            open={Boolean(rejectAppModal)}
            title={`Rechazar solicitud de ${rejectAppModal?.display_name ?? ""}`}
            message={`Ingresa el motivo del rechazo para la solicitud de ${rejectAppModal?.display_name ?? ""}. Quedará registrado en la auditoría interna.`}
            placeholder="Motivo del rechazo (mínimo 10 caracteres)..."
            confirmLabel="Confirmar rechazo"
            onConfirm={async (reason) => {
              if (!rejectAppModal) return;
              setBusy(true);
              try {
                await api(`/api/v1/admin/sellers/applications/${rejectAppModal.id}/reject`, {
                  method: "POST",
                  body: JSON.stringify({ reason }),
                });
                notify("Solicitud rechazada y auditada");
                await refresh();
              } catch (e) {
                notify(toError(e));
              } finally {
                setBusy(false);
              }
            }}
            onClose={() => setRejectAppModal(null)}
          />
        </section>
      )}
      {tab === "commissions" && (
        <section class="panel">
          <h2>Comisión por venta</h2>
          <p>
            La política se aplica únicamente a nuevos subpedidos. Los pagos ya creados conservan su
            comisión original y no se modifican retroactivamente.
          </p>
          <label class="tnum">
            Comisión del marketplace ({(commission / 100).toFixed(2)}%)
            <input
              type="range"
              min="0"
              max="3000"
              step="25"
              value={commission}
              onInput={(e) => setCommission(Number(e.currentTarget.value))}
            />
          </label>
          <div class="action-row">
            <Button disabled={busy} onClick={() => setConfirmCommissionModal(true)}>
              Publicar comisión
            </Button>
          </div>

          <ConfirmModal
            open={confirmCommissionModal}
            title="Publicar comisión del marketplace"
            message={`¿Publicar una comisión de ${(commission / 100).toFixed(2)}% para nuevos pedidos? Esta política regirá los nuevos subpedidos.`}
            confirmLabel="Publicar ahora"
            onConfirm={async () => {
              setBusy(true);
              try {
                await api("/api/v1/admin/commissions", {
                  method: "POST",
                  body: JSON.stringify({ commission_bps: commission }),
                });
                setCommissionHistory(await api("/api/v1/admin/commissions/history"));
                notify("Comisión publicada con auditoría");
              } catch (e) {
                notify(toError(e));
              } finally {
                setBusy(false);
              }
            }}
            onClose={() => setConfirmCommissionModal(false)}
          />
          <h3>Historial de versiones</h3>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Versión</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {commissionHistory.map((c) => (
                  <tr key={c.id}>
                    <td class="tnum">{c.version}</td>
                    <td class="tnum">{(c.commission_bps / 100).toFixed(2)}%</td>
                    <td>
                      <Status>{c.status}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "orders" && (
        <section class="panel">
          <h2>Órdenes de la plataforma</h2>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td class="tnum">{o.id}</td>
                    <td>
                      <Status>{o.status}</Status>
                    </td>
                    <td class="tnum">{money(o.total_minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "trust" && <TrustAdminPanel />}
      {tab === "support" && <SupportAdminPanel />}
      {tab === "returns" && <ReturnsAdminPanel />}
      {tab === "features" && <FlagsAdminPanel />}
      {tab === "payments" && <PaymentsAdminPanel />}
      {tab === "audit" && (
        <section class="panel">
          <h2>Registro de decisiones administrativas</h2>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{a.action}</td>
                    <td>{new Date(a.created_at).toLocaleString("es-PE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
