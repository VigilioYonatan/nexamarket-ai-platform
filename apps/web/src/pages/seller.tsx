import { useEffect, useState } from "preact/hooks";
import {
  Button,
  ConfirmModal,
  Empty,
  Icon,
  Modal,
  PromptModal,
  Protected,
  SkeletonTable,
  Status,
} from "../components/ui";
import { api, money, toError } from "../lib/api";
import { navigate, notify, session } from "../lib/store";

type Listing = {
  id: string;
  title: string;
  price_minor: number;
  status: string;
  on_hand: number;
  reserved: number;
  version: number;
  image_url?: string | null;
};
type SellerOrder = {
  id: string;
  order_id: string;
  status: string;
  subtotal_minor: number;
  created_at: string;
};
type Category = { id: string; name: string; slug: string };

export function SellerPage({
  section = "listings",
  openNew = false,
}: {
  section?: "listings" | "orders" | "analytics" | "onboarding" | "payments";
  openNew?: boolean;
} = {}) {
  const initialTab: "listings" | "orders" | "analytics" =
    section === "orders" ? "orders" : section === "analytics" ? "analytics" : "listings";

  const [application, setApplication] = useState<{
      id: string;
      status: string;
      display_name: string;
    } | null>(null),
    [listings, setListings] = useState<Listing[]>([]),
    [orders, setOrders] = useState<SellerOrder[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [summary, setSummary] = useState<{
      listings: number;
      orders: number;
      gross_sales_minor: number;
    } | null>(null),
    [tab, setTab] = useState<"listings" | "orders" | "analytics">(initialTab),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [newListing, setNewListing] = useState(openNew),
    [disconnectMpModal, setDisconnectMpModal] = useState(false),
    [error, setError] = useState("");
  const [adjustStockModal, setAdjustStockModal] = useState<Listing | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(1);
  const [stockReason, setStockReason] = useState<"CORRECTION" | "RECEIPT" | "DAMAGE">("CORRECTION");
  const [shipOrderModal, setShipOrderModal] = useState<SellerOrder | null>(null);
  const [applicationForm, setApplicationForm] = useState({
    display_name: "",
    legal_name: "",
    tax_id: "",
  });
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    brand: "",
    model: "",
    gtin: "",
    category_id: "",
    image_url: "",
    price_minor: 0,
    quantity: 1,
  });
  const [commercial, setCommercial] = useState<{ commission_bps: number } | null>(null);

  useEffect(() => {
    setTab(section === "orders" ? "orders" : section === "analytics" ? "analytics" : "listings");
    setNewListing(openNew);
  }, [section, openNew]);

  const load = async () => {
    try {
      const app = await api<typeof application>("/api/v1/seller/application");
      setApplication(app);
      if (session.value.authenticated && session.value.user.seller_id) {
        const [a, b, c, d, f] = await Promise.all([
          api<Listing[]>("/api/v1/seller/listings"),
          api<SellerOrder[]>("/api/v1/seller/orders"),
          api<Category[]>("/api/v1/categories"),
          api<typeof summary>("/api/v1/seller/analytics/summary"),
          api<{ commission_bps: number }>("/api/v1/seller/commercial-policy"),
        ]);
        setListings(a);
        setOrders(b);
        setCategories(c);
        setSummary(d);
        setCommercial(f);
      }
    } catch (e) {
      setError(toError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (session.value.authenticated) void load();
  }, [session.value.authenticated]);

  const selectTab = (next: "listings" | "orders" | "analytics") => {
    setTab(next);
    navigate(next === "listings" ? "/seller/listings" : `/seller/${next}`);
  };

  const apply = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/seller/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(applicationForm),
      });
      notify("Solicitud enviada para revisión");
      await load();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/seller/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          price_minor: Math.round(productForm.price_minor * 100),
          image_url: productForm.image_url || undefined,
          brand: productForm.brand || undefined,
          model: productForm.model || undefined,
          gtin: productForm.gtin || undefined,
        }),
      });
      setNewListing(false);
      await load();
      notify("Publicación guardada en borrador");
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
      notify("Operación completada");
      await load();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };

  const sellerId = session.value.authenticated ? session.value.user.seller_id : null;

  return (
    <main class="container page">
      <div class="section-head">
        <div class="page-title" style={{ marginBottom: "14px" }}>
          <span class="eyebrow">SELLER CENTER</span>
          <h1>Haz crecer tu negocio</h1>
          <p>Publica productos, gestiona inventario y organiza tus ventas dentro de NexaMarket.</p>
        </div>
        {sellerId && (
          <div class="action-row">
            <a href={`/sellers/${sellerId}`} class="btn btn-outline">
              <Icon name="store" size={16} /> Ver perfil público
            </a>
            <a href="/seller/payments" class="btn btn-outline">
              <Icon name="shield" size={16} /> Pagos Mercado Pago
            </a>
          </div>
        )}
      </div>
      <Protected>
        {loading ? (
          <SkeletonTable rows={4} />
        ) : error ? (
          <Empty title="No se pudo cargar el centro de ventas" message={error} />
        ) : session.value.authenticated && !session.value.user.seller_id ? (
          <div class="seller-onboarding">
            <div class="panel">
              <h2>{application ? "Estado de tu solicitud" : "Comienza a vender"}</h2>
              {application ? (
                <div>
                  <p>
                    Tu solicitud <strong>{application.display_name}</strong> está en revisión.
                  </p>
                  <Status>{application.status}</Status>
                  <p class="help-text">
                    Un administrador verificará tus datos. Después podrás vincular tu cuenta de
                    Mercado Pago y publicar.
                  </p>
                </div>
              ) : (
                <form class="form-grid" onSubmit={apply}>
                  <label>
                    Nombre visible del vendedor
                    <input
                      required
                      minLength={3}
                      value={applicationForm.display_name}
                      onInput={(e) =>
                        setApplicationForm({
                          ...applicationForm,
                          display_name: e.currentTarget.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Nombre o razón social
                    <input
                      required
                      minLength={3}
                      value={applicationForm.legal_name}
                      onInput={(e) =>
                        setApplicationForm({
                          ...applicationForm,
                          legal_name: e.currentTarget.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Identificador fiscal
                    <input
                      required
                      minLength={6}
                      value={applicationForm.tax_id}
                      onInput={(e) =>
                        setApplicationForm({ ...applicationForm, tax_id: e.currentTarget.value })
                      }
                    />
                  </label>
                  <Button type="submit" disabled={busy}>
                    Enviar solicitud de vendedor
                  </Button>
                </form>
              )}
            </div>
            <div class="panel seller-tips">
              <Icon name="shield" size={38} />
              <h3>Una plataforma, muchas oportunidades</h3>
              <p>
                Todos los vendedores comparten el catálogo y la identidad de NexaMarket; no se crean
                tiendas web independientes.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div class="stats-row">
              <div class="stat-card">
                <span>Publicaciones</span>
                <strong class="tnum">{summary?.listings ?? 0}</strong>
                <small>Productos creados</small>
              </div>
              <div class="stat-card">
                <span>Pedidos</span>
                <strong class="tnum">{summary?.orders ?? 0}</strong>
                <small>Órdenes asignadas</small>
              </div>
              <div class="stat-card">
                <span>Ventas registradas</span>
                <strong class="tnum">{money(summary?.gross_sales_minor ?? 0)}</strong>
                <small>Importe bruto</small>
              </div>
            </div>
            <div class="seller-connect">
              <div>
                <h3>
                  <Icon name="shield" size={20} /> Mercado Pago para vendedores
                </h3>
                <p>
                  Conecta tu cuenta autorizada antes de recibir pagos. No compartas contraseñas ni
                  access tokens.
                </p>
                <p class="help-text tnum">
                  Comisión vigente del marketplace: {(commercial?.commission_bps ?? 0) / 100}% por
                  pago aprobado, más los costos del procesador según su contrato.
                </p>
              </div>
              <div class="action-row">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const out = await api<{ url: string }>(
                        "/api/v1/seller/mercado-pago/authorize",
                        { method: "POST" },
                      );
                      window.location.href = out.url;
                    } catch (e) {
                      notify(toError(e));
                    }
                  }}
                >
                  Conectar Mercado Pago
                </Button>
                <Button variant="ghost" onClick={() => setDisconnectMpModal(true)}>
                  Desvincular OAuth
                </Button>
              </div>
            </div>

            {section === "payments" && (
              <section class="panel" style={{ marginBottom: "22px" }}>
                <h2>Configuración financiera y liquidaciones Mercado Pago</h2>
                <p>
                  NexaMarket liquida cada subpedido directamente en tu cuenta autorizada de Mercado
                  Pago descontando la comisión vigente (
                  <b class="tnum">{(commercial?.commission_bps ?? 0) / 100}%</b>) mediante{" "}
                  <code>application_fee</code>. Si revocas la conexión OAuth, tus publicaciones no
                  podrán iniciar nuevos checkouts hasta reconectar.
                </p>
              </section>
            )}

            <div class="tabs">
              <button
                type="button"
                class={tab === "listings" ? "active" : ""}
                onClick={() => selectTab("listings")}
              >
                Publicaciones
              </button>
              <button
                type="button"
                class={tab === "orders" ? "active" : ""}
                onClick={() => selectTab("orders")}
              >
                Pedidos
              </button>
              <button
                type="button"
                class={tab === "analytics" ? "active" : ""}
                onClick={() => selectTab("analytics")}
              >
                Estadísticas
              </button>
            </div>
            {tab === "listings" && (
              <section class="panel">
                <div class="section-head">
                  <h2>Mis publicaciones</h2>
                  <Button
                    onClick={() => {
                      const next = !newListing;
                      setNewListing(next);
                      navigate(next ? "/seller/listings/new" : "/seller/listings");
                    }}
                  >
                    {newListing ? "Cancelar" : "+ Nuevo producto"}
                  </Button>
                </div>
                {newListing && (
                  <form class="form-grid" onSubmit={create}>
                    <label>
                      Título
                      <input
                        required
                        minLength={5}
                        value={productForm.title}
                        onInput={(e) =>
                          setProductForm({ ...productForm, title: e.currentTarget.value })
                        }
                      />
                    </label>
                    <label>
                      Marca (opcional)
                      <input
                        maxLength={100}
                        value={productForm.brand}
                        onInput={(e) =>
                          setProductForm({ ...productForm, brand: e.currentTarget.value })
                        }
                      />
                    </label>
                    <label>
                      Modelo (opcional)
                      <input
                        maxLength={120}
                        value={productForm.model}
                        onInput={(e) =>
                          setProductForm({ ...productForm, model: e.currentTarget.value })
                        }
                      />
                    </label>
                    <label>
                      GTIN / EAN / UPC (opcional, se valida check digit)
                      <input
                        inputMode="numeric"
                        pattern="[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14}"
                        maxLength={14}
                        value={productForm.gtin}
                        onInput={(e) =>
                          setProductForm({ ...productForm, gtin: e.currentTarget.value })
                        }
                      />
                    </label>
                    <label>
                      Descripción
                      <textarea
                        minLength={10}
                        required
                        value={productForm.description}
                        onInput={(e) =>
                          setProductForm({ ...productForm, description: e.currentTarget.value })
                        }
                      />
                    </label>
                    <label>
                      Categoría
                      <select
                        required
                        value={productForm.category_id}
                        onChange={(e) =>
                          setProductForm({ ...productForm, category_id: e.currentTarget.value })
                        }
                      >
                        <option value="">Seleccionar categoría</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Fotografía del producto (JPG, PNG o WebP hasta 2 MB)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={async (e) => {
                          const file = e.currentTarget.files?.[0];
                          if (!file) return;
                          const data = new FormData();
                          data.append("file", file);
                          try {
                            const saved = await api<{ url: string }>("/api/v1/seller/media", {
                              method: "POST",
                              body: data,
                            });
                            setProductForm((v) => ({ ...v, image_url: saved.url }));
                            notify("Imagen procesada y guardada");
                          } catch (e) {
                            notify(toError(e));
                          }
                        }}
                      />
                      {productForm.image_url && (
                        <small>Imagen guardada: {productForm.image_url}</small>
                      )}
                    </label>
                    <label>
                      Precio (S/)
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={productForm.price_minor}
                        onInput={(e) =>
                          setProductForm({
                            ...productForm,
                            price_minor: Number(e.currentTarget.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Stock
                      <input
                        type="number"
                        min="0"
                        required
                        value={productForm.quantity}
                        onInput={(e) =>
                          setProductForm({
                            ...productForm,
                            quantity: Number(e.currentTarget.value),
                          })
                        }
                      />
                    </label>
                    <Button type="submit" disabled={busy}>
                      Guardar borrador
                    </Button>
                  </form>
                )}
                <div class="responsive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Precio</th>
                        <th>Disponibles</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <div class="seller-table-prod">
                              {l.image_url ? (
                                <img src={l.image_url} alt={l.title} class="seller-table-thumb" />
                              ) : (
                                <div class="seller-table-thumb-fallback">
                                  <Icon name="package" size={18} />
                                </div>
                              )}
                              <span class="seller-table-title">{l.title}</span>
                            </div>
                          </td>
                          <td class="tnum">{money(l.price_minor)}</td>
                          <td class="tnum">{l.on_hand - l.reserved}</td>
                          <td>
                            <Status>{l.status}</Status>
                          </td>
                          <td>
                            <div class="action-row">
                              <Button
                                disabled={busy}
                                variant="outline"
                                onClick={() =>
                                  action(
                                    `/api/v1/seller/listings/${l.id}/${l.status === "PUBLISHED" ? "pause" : "publish"}`,
                                  )
                                }
                              >
                                {l.status === "PUBLISHED" ? "Pausar" : "Publicar"}
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={busy}
                                onClick={() => {
                                  setStockDelta(1);
                                  setStockReason("CORRECTION");
                                  setAdjustStockModal(l);
                                }}
                              >
                                Ajustar stock
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!listings.length && (
                  <Empty
                    title="Sin publicaciones"
                    message="Crea tu primer producto desde el botón superior."
                  />
                )}

                <Modal
                  open={Boolean(adjustStockModal)}
                  title={`Ajustar stock de ${adjustStockModal?.title ?? ""}`}
                  onClose={() => setAdjustStockModal(null)}
                >
                  <form
                    class="form-grid"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!adjustStockModal) return;
                      setBusy(true);
                      try {
                        await api(`/api/v1/seller/inventory/${adjustStockModal.id}/adjustments`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            delta: stockDelta,
                            expected_version: adjustStockModal.version,
                            reason: stockReason,
                          }),
                        });
                        await load();
                        setAdjustStockModal(null);
                        notify("Stock actualizado exitosamente");
                      } catch (err) {
                        notify(toError(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      Incremento de unidades (puede ser negativo para reducción)
                      <input
                        type="number"
                        required
                        step={1}
                        value={stockDelta}
                        onInput={(e) => setStockDelta(Number(e.currentTarget.value))}
                      />
                    </label>
                    <label>
                      Motivo contable del movimiento
                      <select
                        value={stockReason}
                        onChange={(e) =>
                          setStockReason(
                            e.currentTarget.value as "CORRECTION" | "RECEIPT" | "DAMAGE",
                          )
                        }
                      >
                        <option value="CORRECTION">Corrección de inventario</option>
                        <option value="RECEIPT">Ingreso de mercadería</option>
                        <option value="DAMAGE">Merma o daño</option>
                      </select>
                    </label>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAdjustStockModal(null)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={busy || stockDelta === 0}>
                        {busy ? "Guardando…" : "Aplicar ajuste"}
                      </Button>
                    </div>
                  </form>
                </Modal>
              </section>
            )}
            {tab === "orders" && (
              <section class="panel">
                <h2>Pedidos recibidos</h2>
                <div class="responsive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Subpedido</th>
                        <th>Importe</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Envío</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td class="tnum">{o.id.slice(0, 8)}</td>
                          <td class="tnum">{money(o.subtotal_minor)}</td>
                          <td>
                            <Status>{o.status}</Status>
                          </td>
                          <td>{new Date(o.created_at).toLocaleDateString("es-PE")}</td>
                          <td>
                            {["PAID", "PREPARING"].includes(o.status) && (
                              <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => setShipOrderModal(o)}
                              >
                                Marcar enviado
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <PromptModal
                  open={Boolean(shipOrderModal)}
                  title={`Despachar pedido ${shipOrderModal?.id.slice(0, 8) ?? ""}`}
                  message="Ingresa el código o número de guía de seguimiento del transportista:"
                  placeholder="Ej: TRK-982347102"
                  minLength={4}
                  confirmLabel="Confirmar despacho"
                  onConfirm={async (tracking) => {
                    if (!shipOrderModal) return;
                    setBusy(true);
                    try {
                      await api(`/api/v1/seller/orders/${shipOrderModal.id}/ship`, {
                        method: "POST",
                        body: JSON.stringify({ tracking_number: tracking }),
                      });
                      await load();
                      notify("Pedido marcado como enviado");
                    } catch (e) {
                      notify(toError(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  onClose={() => setShipOrderModal(null)}
                />
                {!orders.length && (
                  <Empty
                    title="No hay pedidos todavía"
                    message="Cuando un comprador confirme el pago, lo verás aquí."
                  />
                )}
              </section>
            )}
            {tab === "analytics" && (
              <section class="panel">
                <h2>Inteligencia de ventas</h2>
                <p>
                  Indicadores transaccionales verificados. Los modelos predictivos locales se
                  habilitarán cuando existan datos suficientes.
                </p>
                <div class="stats-row">
                  <div class="stat-card">
                    <span>Órdenes</span>
                    <strong class="tnum">{summary?.orders ?? 0}</strong>
                  </div>
                  <div class="stat-card">
                    <span>Publicaciones</span>
                    <strong class="tnum">{summary?.listings ?? 0}</strong>
                  </div>
                  <div class="stat-card">
                    <span>Ventas brutas</span>
                    <strong class="tnum">{money(summary?.gross_sales_minor ?? 0)}</strong>
                  </div>
                </div>
              </section>
            )}

            <ConfirmModal
              open={disconnectMpModal}
              title="Desvincular cuenta de Mercado Pago"
              message="¿Deseas desconectar tu autorización OAuth de Mercado Pago? Tus publicaciones no podrán recibir nuevos pagos hasta volver a autorizar."
              confirmLabel="Sí, desvincular"
              variant="danger"
              onConfirm={async () => {
                await api("/api/v1/seller/mercado-pago/disconnect", { method: "POST" });
                notify("Conexión de Mercado Pago desvinculada");
              }}
              onClose={() => setDisconnectMpModal(false)}
            />
          </>
        )}
      </Protected>
    </main>
  );
}
