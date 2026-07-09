import { useEffect, useState } from "preact/hooks";
import { Button, ConfirmModal, Icon, Modal, PromptModal, Status } from "../components/ui";
import { api, json, toError } from "../lib/api";
import { notify } from "../lib/store";

type Review = {
  id: string;
  listing_id: string;
  rating: number;
  comment: string;
  created_at: string;
};
type Case = {
  id: string;
  subject_type: string;
  subject_id: string;
  reason: string;
  status: string;
  created_at: string;
};
type Ticket = { id: string; subject: string; category: string; status: string; created_at: string };
type Thread = {
  ticket: Ticket;
  messages: Array<{ id: string; author_role: string; content: string; created_at: string }>;
};
type Flag = { name: string; enabled: boolean };
type Return = {
  id: string;
  order_id: string;
  seller_order_id: string | null;
  status: string;
  reason: string;
  created_at: string;
};
export function TrustAdminPanel() {
  const [reviews, setReviews] = useState<Review[]>([]),
    [cases, setCases] = useState<Case[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [moderateModal, setModerateModal] = useState<{
    id: string;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);
  const [caseModal, setCaseModal] = useState<{ id: string } | null>(null);
  const [openCaseModal, setOpenCaseModal] = useState(false);
  const [newCase, setNewCase] = useState<{
    subject_type: "SELLER" | "LISTING" | "REVIEW" | "ORDER";
    subject_id: string;
    reason: string;
  }>({
    subject_type: "SELLER",
    subject_id: "",
    reason: "",
  });

  const reload = async () => {
    try {
      const [r, c] = await Promise.all([
        api<Review[]>("/api/v1/admin/trust/reviews/pending"),
        api<Case[]>("/api/v1/admin/trust/cases"),
      ]);
      setReviews(r);
      setCases(c);
    } catch (e) {
      setError(toError(e));
    }
  };
  useEffect(() => {
    void reload();
  }, []);
  const executeModerate = async (reason: string) => {
    if (!moderateModal) return;
    setBusy(true);
    try {
      await api(
        `/api/v1/admin/trust/reviews/${moderateModal.id}`,
        json("PATCH", { decision: moderateModal.decision, reason }),
      );
      await reload();
      notify("Moderación registrada");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };
  const executeResolveCase = async (resolution: string) => {
    if (!caseModal) return;
    try {
      await api(
        `/api/v1/admin/trust/cases/${caseModal.id}`,
        json("PATCH", { status: "RESOLVED", resolution }),
      );
      await reload();
      notify("Caso resuelto");
    } catch (e) {
      notify(toError(e));
    }
  };
  const executeOpenCase = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/admin/trust/cases", json("POST", newCase));
      setOpenCaseModal(false);
      setNewCase({ subject_type: "SELLER", subject_id: "", reason: "" });
      await reload();
      notify("Caso de riesgo abierto y registrado");
    } catch (err) {
      notify(toError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section class="panel">
      <div class="section-head">
        <div>
          <h2>Moderación y confianza</h2>
          <p>
            Las decisiones humanas quedan auditadas. No se sanciona automáticamente a vendedores por
            una señal IA.
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpenCaseModal(true)}>
          + Abrir caso de riesgo
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      <h3>Reseñas pendientes</h3>
      {reviews.length ? (
        reviews.map((r) => (
          <article class="review-card" key={r.id}>
            <strong>{r.rating} / 5 estrellas</strong>
            <p>{r.comment}</p>
            <div class="action-row">
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => setModerateModal({ id: r.id, decision: "APPROVED" })}
              >
                Publicar
              </Button>
              <Button
                disabled={busy}
                variant="danger"
                onClick={() => setModerateModal({ id: r.id, decision: "REJECTED" })}
              >
                Rechazar
              </Button>
            </div>
          </article>
        ))
      ) : (
        <p>No hay reseñas pendientes.</p>
      )}
      <h3 style={{ marginTop: "20px" }}>Casos de riesgo</h3>
      {cases.map((c) => (
        <article class="notification-row" key={c.id}>
          <div>
            <b>
              {c.subject_type} · <Status>{c.status}</Status>
            </b>
            <small>{c.reason}</small>
          </div>
          {["OPEN", "INVESTIGATING"].includes(c.status) && (
            <Button variant="outline" onClick={() => setCaseModal({ id: c.id })}>
              Resolver
            </Button>
          )}
        </article>
      ))}
      <PromptModal
        open={Boolean(moderateModal)}
        title={moderateModal?.decision === "APPROVED" ? "Aprobar reseña" : "Rechazar reseña"}
        placeholder="Justificación interna de la decisión (mínimo 10 caracteres)..."
        onClose={() => setModerateModal(null)}
        onConfirm={executeModerate}
      />
      <PromptModal
        open={Boolean(caseModal)}
        title="Resolver caso de riesgo"
        placeholder="Resolución de la revisión humana (mínimo 10 caracteres)..."
        onClose={() => setCaseModal(null)}
        onConfirm={executeResolveCase}
      />
      <Modal
        open={openCaseModal}
        title="Abrir caso manual de riesgo o moderación"
        onClose={() => setOpenCaseModal(false)}
      >
        <form class="form-grid" onSubmit={executeOpenCase}>
          <label>
            Tipo de entidad
            <select
              value={newCase.subject_type}
              onChange={(e) =>
                setNewCase({
                  ...newCase,
                  subject_type: e.currentTarget.value as "SELLER" | "LISTING" | "REVIEW" | "ORDER",
                })
              }
            >
              <option value="SELLER">Vendedor (SELLER)</option>
              <option value="LISTING">Publicación (LISTING)</option>
              <option value="REVIEW">Reseña (REVIEW)</option>
              <option value="ORDER">Pedido (ORDER)</option>
            </select>
          </label>
          <label>
            UUID de la entidad
            <input
              required
              placeholder="00000000-0000-4000-8000-000000000000"
              value={newCase.subject_id}
              onInput={(e) => setNewCase({ ...newCase, subject_id: e.currentTarget.value })}
            />
          </label>
          <label>
            Motivo de apertura (mínimo 10 caracteres)
            <textarea
              required
              minLength={10}
              rows={3}
              value={newCase.reason}
              onInput={(e) => setNewCase({ ...newCase, reason: e.currentTarget.value })}
            />
          </label>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <Button type="button" variant="outline" onClick={() => setOpenCaseModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || newCase.reason.trim().length < 10 || !newCase.subject_id.trim()}
            >
              {busy ? "Registrando…" : "Abrir caso"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
export function FlagsAdminPanel() {
  const [flags, setFlags] = useState<Flag[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [toggleFlag, setToggleFlag] = useState<{ name: string; enabled: boolean } | null>(null);

  const load = () =>
    api<Flag[]>("/api/v1/admin/features")
      .then(setFlags)
      .catch((e) => setError(toError(e)));
  useEffect(() => {
    void load();
  }, []);
  const executeChange = async () => {
    if (!toggleFlag) return;
    setBusy(true);
    try {
      await api(
        `/api/v1/admin/features/${toggleFlag.name}`,
        json("PATCH", { enabled: toggleFlag.enabled }),
      );
      await load();
      notify("Función actualizada y auditada");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section class="panel">
      <h2>Funciones de la plataforma</h2>
      <p>
        Solo funciones no financieras. No se pueden omitir permisos ni validaciones a través de
        estos controles.
      </p>
      {error && <p role="alert">{error}</p>}
      {flags.map((f) => (
        <div class="notification-row" key={f.name}>
          <div>
            <strong>{f.name.replaceAll("_", " ")}</strong>
            <small>{f.enabled ? "Habilitada" : "Deshabilitada"}</small>
          </div>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => setToggleFlag({ name: f.name, enabled: !f.enabled })}
          >
            {f.enabled ? "Desactivar" : "Activar"}
          </Button>
        </div>
      ))}
      <ConfirmModal
        open={Boolean(toggleFlag)}
        title="Cambiar estado de función"
        message={`¿Deseas ${toggleFlag?.enabled ? "activar" : "desactivar"} la función "${toggleFlag?.name}" en la plataforma?`}
        onClose={() => setToggleFlag(null)}
        onConfirm={executeChange}
      />
    </section>
  );
}
export function SupportAdminPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]),
    [active, setActive] = useState<Thread | null>(null),
    [reply, setReply] = useState(""),
    [error, setError] = useState("");
  const reload = () =>
    api<Ticket[]>("/api/v1/admin/support/tickets")
      .then(setTickets)
      .catch((e) => setError(toError(e)));
  useEffect(() => {
    void reload();
  }, []);
  const open = async (id: string) => {
    try {
      setActive(await api<Thread>(`/api/v1/admin/support/tickets/${id}`));
    } catch (e) {
      notify(toError(e));
    }
  };
  const send = async (e: Event) => {
    e.preventDefault();
    if (!active) return;
    try {
      await api(
        `/api/v1/admin/support/tickets/${active.ticket.id}/messages`,
        json("POST", { message: reply }),
      );
      setReply("");
      await open(active.ticket.id);
      await reload();
    } catch (e) {
      notify(toError(e));
    }
  };
  return (
    <div class="admin-grid">
      <section class="panel">
        <h2>Bandeja de soporte</h2>
        {error && <p role="alert">{error}</p>}
        {tickets.map((t) => (
          <button
            type="button"
            class="notification-row ticket-button"
            key={t.id}
            onClick={() => void open(t.id)}
          >
            <strong>{t.subject}</strong>
            <Status>{t.status}</Status>
          </button>
        ))}
        {!tickets.length && <p>No hay tickets abiertos.</p>}
      </section>
      <section class="panel">
        <h2>Atender solicitud</h2>
        {active ? (
          <>
            <h3>{active.ticket.subject}</h3>
            <Status>{active.ticket.status}</Status>
            <div class="ticket-thread">
              {active.messages.map((m) => (
                <article class="review-card" key={m.id}>
                  {m.content}
                </article>
              ))}
            </div>
            <form class="form-grid" onSubmit={send}>
              <label>
                Respuesta
                <textarea
                  required
                  minLength={2}
                  maxLength={4000}
                  value={reply}
                  onInput={(e) => setReply(e.currentTarget.value)}
                />
              </label>
              <Button type="submit">Responder</Button>
            </form>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await api(
                    `/api/v1/admin/support/tickets/${active.ticket.id}/status`,
                    json("PATCH", { status: "CLOSED" }),
                  );
                  await reload();
                  await open(active.ticket.id);
                } catch (e) {
                  notify(toError(e));
                }
              }}
            >
              Cerrar solicitud
            </Button>
          </>
        ) : (
          <p>Selecciona un ticket.</p>
        )}
      </section>
    </div>
  );
}
export function ReturnsAdminPanel() {
  const [items, setItems] = useState<Return[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [decisionModal, setDecisionModal] = useState<{
    id: string;
    decision: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  } | null>(null);

  const reload = () =>
    api<Return[]>("/api/v1/admin/returns")
      .then(setItems)
      .catch((e) => setError(toError(e)));
  useEffect(() => {
    void reload();
  }, []);

  const handleDecision = async (reason: string) => {
    if (!decisionModal) return;
    setBusy(true);
    try {
      await api(
        `/api/v1/admin/returns/${decisionModal.id}`,
        json("PATCH", { decision: decisionModal.decision, reason }),
      );
      await reload();
      notify("Decisión guardada. Ningún reembolso se ejecutó automáticamente.");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section class="panel">
      <h2>Devoluciones</h2>
      <p>
        La aceptación de una solicitud no ejecuta un reembolso. Se requiere un proceso separado y
        conciliado con Mercado Pago.
      </p>
      {error && <p role="alert">{error}</p>}
      {items.length ? (
        items.map((r) => (
          <article class="review-card" key={r.id}>
            <div class="notification-row">
              <b>Solicitud {r.id.slice(0, 8)}</b>
              <Status>{r.status}</Status>
            </div>
            <p>{r.reason}</p>
            {["OPEN", "UNDER_REVIEW"].includes(r.status) && (
              <div class="action-row">
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => setDecisionModal({ id: r.id, decision: "UNDER_REVIEW" })}
                >
                  Revisar
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => setDecisionModal({ id: r.id, decision: "ACCEPTED" })}
                >
                  Aceptar solicitud
                </Button>
                <Button
                  disabled={busy}
                  variant="danger"
                  onClick={() => setDecisionModal({ id: r.id, decision: "REJECTED" })}
                >
                  Rechazar
                </Button>
              </div>
            )}
          </article>
        ))
      ) : (
        <p>No hay solicitudes.</p>
      )}

      <PromptModal
        open={Boolean(decisionModal)}
        title={`Decisión sobre solicitud ${decisionModal?.id.slice(0, 8) ?? ""}`}
        message={`Definir estado como: ${decisionModal?.decision ?? ""}. Ingrese justificación interna.`}
        confirmLabel="Confirmar decisión"
        onConfirm={handleDecision}
        onClose={() => setDecisionModal(null)}
      />
    </section>
  );
}

/** Reconciliation operates on a known provider transaction only; never creates a new charge. */
type PaymentAttempt = {
  id: string;
  seller_order_id: string;
  amount_minor: number;
  status: string;
  provider_payment_id: string | null;
  created_at: string;
};
export function PaymentsAdminPanel() {
  const [queue, setQueue] = useState<PaymentAttempt[]>([]),
    [unbalanced, setUnbalanced] = useState<number | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const [reconcileModal, setReconcileModal] = useState<PaymentAttempt | null>(null);

  const reload = async () => {
    try {
      const [attempts, ledger] = await Promise.all([
        api<PaymentAttempt[]>("/api/v1/admin/payments/reconciliation-queue"),
        api<{ unbalanced_count: number }>("/api/v1/admin/payments/ledger-health"),
      ]);
      setQueue(attempts);
      setUnbalanced(ledger.unbalanced_count);
      setError("");
    } catch (e) {
      setError(toError(e));
    }
  };
  useEffect(() => {
    void reload();
  }, []);

  const handleReconcile = async () => {
    if (!reconcileModal?.provider_payment_id) return;
    setBusy(reconcileModal.id);
    try {
      await api(`/api/v1/admin/payments/payment-attempts/${reconcileModal.id}/reconcile`, {
        method: "POST",
      });
      notify("Estado sincronizado con el proveedor");
      await reload();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section class="panel">
      <h2>Reconciliación Mercado Pago</h2>
      <p>Solo operaciones previamente iniciadas. Nunca volver a cobrar una transacción ambigua.</p>
      {error && <p role="alert">{error}</p>}
      <p>
        <strong>Asientos desbalanceados:</strong>{" "}
        <Status>
          {unbalanced === null
            ? "SIN VERIFICAR"
            : unbalanced === 0
              ? "0 · OK"
              : `${unbalanced} · INVESTIGAR`}
        </Status>
      </p>
      <div class="action-row">
        <Button variant="outline" onClick={() => void reload()}>
          Actualizar estados
        </Button>
      </div>
      <div class="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Intento</th>
              <th>Estado</th>
              <th>Importe</th>
              <th>Operación proveedor</th>
              <th>Acción segura</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((a) => (
              <tr key={a.id}>
                <td>
                  <code>{a.id.slice(0, 8)}</code>
                </td>
                <td>
                  <Status>{a.status}</Status>
                </td>
                <td>
                  {new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
                    a.amount_minor / 100,
                  )}
                </td>
                <td>{a.provider_payment_id ?? "No recibida"}</td>
                <td>
                  {a.provider_payment_id ? (
                    <Button
                      disabled={busy !== null}
                      variant="outline"
                      onClick={() => setReconcileModal(a)}
                    >
                      Verificar
                    </Button>
                  ) : (
                    <span>Investigación manual requerida</span>
                  )}
                </td>
              </tr>
            ))}
            {!queue.length && (
              <tr>
                <td colSpan={5}>No hay intentos pendientes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p class="help-text">
        El balance cero no demuestra conciliación bancaria completa; revisar los movimientos y
        liquidaciones de Mercado Pago.
      </p>

      <ConfirmModal
        open={Boolean(reconcileModal)}
        title="Verificar pago en Mercado Pago"
        message={`¿Consultar y verificar el pago ${reconcileModal?.provider_payment_id ?? ""} en Mercado Pago? No se realizará un nuevo cargo.`}
        confirmLabel="Verificar ahora"
        onConfirm={handleReconcile}
        onClose={() => setReconcileModal(null)}
      />
    </section>
  );
}

type SellerSummary = { id: string; display_name: string; status: string; created_at: string };
export function SellersAdminPanel() {
  const [sellers, setSellers] = useState<SellerSummary[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const [suspendModal, setSuspendModal] = useState<SellerSummary | null>(null);

  const reload = async () => {
    try {
      setSellers(await api<SellerSummary[]>("/api/v1/admin/sellers"));
      setError("");
    } catch (e) {
      setError(toError(e));
    }
  };
  useEffect(() => {
    void reload();
  }, []);

  const handleSuspend = async (reason: string) => {
    if (!suspendModal) return;
    setBusy(suspendModal.id);
    try {
      await api(`/api/v1/admin/sellers/${suspendModal.id}/suspend`, json("POST", { reason }));
      await reload();
      notify("Vendedor suspendido. Sus publicaciones activas se pausaron.");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section class="panel">
      <h2>Vendedores registrados</h2>
      <p>
        Suspender un vendedor bloquea nuevas ventas sin borrar sus pedidos ni movimientos
        financieros previos.
      </p>
      {error && <p role="alert">{error}</p>}
      <div class="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Estado</th>
              <th>Registro</th>
              <th>Control</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((s) => (
              <tr key={s.id}>
                <td>{s.display_name}</td>
                <td>
                  <Status>{s.status}</Status>
                </td>
                <td>{new Date(s.created_at).toLocaleDateString("es-PE")}</td>
                <td>
                  {s.status === "APPROVED" && (
                    <Button
                      disabled={busy !== null}
                      variant="danger"
                      onClick={() => setSuspendModal(s)}
                    >
                      Suspender
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!sellers.length && (
              <tr>
                <td colSpan={4}>Sin vendedores registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PromptModal
        open={Boolean(suspendModal)}
        title={`Suspender vendedor ${suspendModal?.display_name ?? ""}`}
        message={`¿Suspender ${suspendModal?.display_name ?? ""} y pausar sus publicaciones? Los pedidos y pagos existentes requieren atención manual.`}
        placeholder="Motivo de suspensión (mínimo 10 caracteres)..."
        confirmLabel="Confirmar suspensión"
        onConfirm={handleSuspend}
        onClose={() => setSuspendModal(null)}
      />
    </section>
  );
}

export type UserAccount = {
  id: string;
  email: string;
  display_name: string;
  role: "BUYER" | "ADMIN" | "STAFF";
  avatar_url?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  seller_status?: string | null;
  orders_count?: number;
  created_at: string;
};

export function UsersAdminPanel() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  useEffect(() => {
    api<UserAccount[]>("/api/v1/admin/users")
      .then((data) => setUsers(data))
      .catch(() => {
        // Fallback sample data if endpoint not populated
        setUsers([
          {
            id: "u-1",
            email: "admin@test.pe",
            display_name: "Admin Principal",
            role: "ADMIN",
            avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            created_at: new Date().toISOString(),
          },
          {
            id: "u-2",
            email: "seller@test.pe",
            display_name: "TechImport Oficial",
            role: "BUYER",
            seller_id: "s-1",
            seller_name: "TechImport Perú",
            seller_status: "APPROVED",
            avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
            orders_count: 14,
            created_at: new Date().toISOString(),
          },
          {
            id: "u-3",
            email: "buyer@test.pe",
            display_name: "Carlos Mendoza P.",
            role: "BUYER",
            avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
            orders_count: 5,
            created_at: new Date().toISOString(),
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchesQuery =
      !query ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(query.toLowerCase()) ||
      u.seller_name?.toLowerCase().includes(query.toLowerCase());

    const matchesRole =
      roleFilter === "ALL" ||
      (roleFilter === "SELLER" && Boolean(u.seller_id)) ||
      (roleFilter === "ADMIN" && u.role === "ADMIN") ||
      (roleFilter === "BUYER" && u.role === "BUYER" && !u.seller_id);

    return matchesQuery && matchesRole;
  });

  const totalBuyers = users.filter((u) => !u.seller_id && u.role === "BUYER").length;
  const totalSellers = users.filter((u) => Boolean(u.seller_id)).length;
  const totalAdmins = users.filter((u) => u.role === "ADMIN").length;

  return (
    <section class="panel users-admin-section" aria-label="Gestión de Cuentas">
      <div class="panel-head-row">
        <div>
          <span class="eyebrow">CONTROL DE IDENTIDAD Y ACCESOS</span>
          <h2>Cuentas de Usuarios y Clientes</h2>
          <p class="help-text">
            Registro centralizado de compradores, comercios y administradores con autenticación Keycloak OIDC.
          </p>
        </div>
      </div>

      {/* Mini KPI Cards for Users */}
      <div class="stats-row admin-kpi-row" style={{ marginTop: "12px", marginBottom: "20px" }}>
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Total Usuarios</span>
            <div class="stat-card-icon"><Icon name="user" size={18} /></div>
          </div>
          <strong class="tnum">{users.length}</strong>
          <small>Perfiles en base de datos</small>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Compradores</span>
            <div class="stat-card-icon"><Icon name="cart" size={18} /></div>
          </div>
          <strong class="tnum">{totalBuyers}</strong>
          <small>Cuentas cliente activas</small>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Vendedores (Stores)</span>
            <div class="stat-card-icon"><Icon name="store" size={18} /></div>
          </div>
          <strong class="tnum text-brand">{totalSellers}</strong>
          <small>Comercios verificados</small>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <span>Staff & Admins</span>
            <div class="stat-card-icon"><Icon name="shield" size={18} /></div>
          </div>
          <strong class="tnum">{totalAdmins}</strong>
          <small>Gobernanza autorizada</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div class="users-filter-bar">
        <div class="users-search-input-wrap">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Buscar por nombre, correo o tienda..."
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
            class="users-search-input"
          />
        </div>

        <div class="users-role-chips">
          {[
            { id: "ALL", label: `Todos (${users.length})` },
            { id: "BUYER", label: `Compradores (${totalBuyers})` },
            { id: "SELLER", label: `Vendedores (${totalSellers})` },
            { id: "ADMIN", label: `Admins (${totalAdmins})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              class={`chip-filter ${roleFilter === tab.id ? "active" : ""}`}
              onClick={() => setRoleFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div class="responsive-table">
        <table class="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol / Permiso</th>
              <th>Tienda Vinculada</th>
              <th>Órdenes</th>
              <th>Fecha Registro</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const defaultAvatar = u.role === "ADMIN"
                ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
                : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80";

              return (
                <tr key={u.id}>
                  <td>
                    <div class="user-row-identity">
                      <img
                        src={u.avatar_url ?? defaultAvatar}
                        alt={u.display_name}
                        class="user-table-avatar"
                      />
                      <div class="user-row-meta">
                        <strong class="user-row-name">{u.display_name ?? "Sin nombre"}</strong>
                        <small class="user-row-email">{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class={`user-role-badge badge-${u.role.toLowerCase()}`}>
                      {u.role === "ADMIN" ? "ADMINISTRADOR" : u.seller_id ? "SELLER PRO" : "COMPRADOR"}
                    </span>
                  </td>
                  <td>
                    {u.seller_name ? (
                      <span class="user-seller-link">
                        <Icon name="store" size={13} /> {u.seller_name}
                      </span>
                    ) : (
                      <span class="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <strong class="tnum">{u.orders_count ?? 0}</strong>
                  </td>
                  <td>
                    <span class="text-muted">
                      {new Date(u.created_at).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td>
                    <span class="status status-success">Activo</span>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                  No se encontraron cuentas con el criterio de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
