import { useEffect, useRef, useState } from "preact/hooks";
import {
  Button,
  Empty,
  Icon,
  Loading,
  Protected,
  SkeletonCart,
  SkeletonTable,
  Status,
} from "../components/ui";
import {
  api,
  type Checkout,
  money,
  newKey,
  type PaymentAttemptDetail,
  type SellerGroup,
  toError,
} from "../lib/api";
import { routeSearch } from "../lib/store";

declare global {
  interface Window {
    MercadoPago?: new (
      key: string,
      opts?: Record<string, unknown>,
    ) => {
      bricks(): {
        create(type: string, id: string, options: unknown): Promise<{ unmount(): Promise<void> }>;
      };
    };
  }
}

const paymentScript = "https://sdk.mercadopago.com/js/v2";
function loadMercadoPago(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) return resolve();
    const current = document.querySelector<HTMLScriptElement>("script[data-mp-bricks]");
    if (current) {
      current.addEventListener("load", () => resolve(), { once: true });
      current.addEventListener("error", () => reject(new Error("SDK no disponible")), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.dataset.mpBricks = "true";
    s.src = paymentScript;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No pudimos cargar Mercado Pago"));
    document.head.appendChild(s);
  });
}

function PaymentBrick({
  checkoutId,
  group,
  onPaid,
}: {
  checkoutId: string;
  group: SellerGroup;
  onPaid: () => void;
}) {
  const [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [attemptId, setAttemptId] = useState(""),
    [working, setWorking] = useState(false);
  const retries = useRef<Map<string, string>>(new Map());
  const containerId = `brick_${group.seller_order_id.replaceAll("-", "")}`;
  useEffect(() => {
    let alive = true;
    let brick: { unmount(): Promise<void> } | undefined;
    async function setup() {
      try {
        const config = await api<{ public_key: string }>("/api/v1/payments/public-config");
        await loadMercadoPago();
        if (!alive || !window.MercadoPago) return;
        const mp = new window.MercadoPago(config.public_key, { locale: "es-PE" });
        brick = await mp.bricks().create("payment", containerId, {
          initialization: { amount: group.subtotal_minor / 100, marketplace: true },
          customization: {
            paymentMethods: { creditCard: "all", debitCard: "all", mercadoPago: "all" },
          },
          callbacks: {
            onReady: () => setStatus("Formulario seguro listo"),
            onError: () => setError("Error del formulario de pago. Intenta nuevamente."),
            onSubmit: async (
              payload: { formData?: Record<string, unknown> } & Record<string, unknown>,
            ) => {
              const formData = (payload.formData ?? payload) as Record<string, unknown>;
              const token = String(formData.token ?? "");
              const isWallet =
                String(formData.payment_method_id ?? "")
                  .toLowerCase()
                  .includes("account_money") ||
                String(formData.payment_type_id ?? "")
                  .toLowerCase()
                  .includes("account_money");
              if (!token && !isWallet)
                throw new Error("Token de pago no generado por Mercado Pago");
              const key = retries.current.get(token || "wallet") ?? newKey();
              retries.current.set(token || "wallet", key);
              setWorking(true);
              setError("");
              try {
                const result = await api<{ attempt_id: string; status: string }>(
                  "/api/v1/payment-attempts",
                  {
                    method: "POST",
                    headers: { "content-type": "application/json", "idempotency-key": key },
                    body: JSON.stringify({
                      seller_order_id: group.seller_order_id,
                      token,
                      payment_method_id: String(formData.payment_method_id),
                      installments: Number(formData.installments ?? 1),
                      ...(formData.issuer_id ? { issuer_id: String(formData.issuer_id) } : {}),
                      ...(typeof formData.payer === "object" &&
                      formData.payer !== null &&
                      "identification" in formData.payer &&
                      (formData.payer as { identification?: { type?: string; number?: string } })
                        .identification
                        ? {
                            identification_type: (
                              formData.payer as { identification: { type: string } }
                            ).identification.type,
                            identification_number: (
                              formData.payer as { identification: { number: string } }
                            ).identification.number,
                          }
                        : {}),
                    }),
                  },
                );
                setAttemptId(result.attempt_id);
                setStatus(
                  result.status === "APPROVED"
                    ? "Pago aprobado"
                    : `Pago ${result.status.toLowerCase()}. Se verificará con Mercado Pago.`,
                );
                onPaid();
              } catch (e) {
                setError(toError(e));
                throw e;
              } finally {
                setWorking(false);
              }
            },
          },
        });
      } catch (e) {
        if (alive) setError(toError(e));
      }
    }
    void setup();
    return () => {
      alive = false;
      if (brick) void brick.unmount();
    };
  }, [group.seller_order_id]);
  return (
    <section class="payment-group">
      <div class="payment-head">
        <div>
          <span class="eyebrow">VENDEDOR</span>
          <h3>{group.seller_name}</h3>
        </div>
        <strong class="tnum">{money(group.subtotal_minor)}</strong>
      </div>
      <p>
        Estado: <Status>{group.status}</Status>
      </p>
      {group.status === "PAID" ? (
        <div class="success-note">
          <Icon name="check" /> Pago confirmado
        </div>
      ) : group.status !== "AWAITING_PAYMENT" ? (
        <div class="info-note">Esta orden no acepta nuevos pagos.</div>
      ) : (
        <>
          <p class="help-text">
            Los datos bancarios son capturados exclusivamente por Mercado Pago.
          </p>
          <section
            id={containerId}
            class="mp-brick"
            aria-label={`Pago seguro para ${group.seller_name}`}
          ></section>
          {working && <Loading />}
        </>
      )}
      {status && (
        <div class="info-note" role="status">
          <span>{status}</span>
          {attemptId && (
            <a
              class="text-link"
              href={`/checkout/${checkoutId}/result?attempt_id=${encodeURIComponent(attemptId)}`}
            >
              Ver constancia →
            </a>
          )}
        </div>
      )}
      {error && (
        <div class="error-note" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

export function CheckoutPage({ id }: { id: string }) {
  const [checkout, setCheckout] = useState<Checkout | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = () =>
    api<Checkout>(`/api/v1/checkouts/${encodeURIComponent(id)}`)
      .then(setCheckout)
      .catch((e) => setError(toError(e)))
      .finally(() => setLoading(false));
  useEffect(() => {
    void reload();
    if (checkout && ["PAID", "CANCELLED", "REFUNDED"].includes(checkout.order.status)) return;
    const timer = window.setInterval(() => {
      void reload();
    }, 10000);
    return () => clearInterval(timer);
  }, [id, checkout?.order.status]);
  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/cart">Carrito</a> / Pago seguro
      </div>
      <div class="page-title">
        <span class="eyebrow">ÚLTIMO PASO</span>
        <h1>Finaliza tu compra</h1>
        <p>Mercado Pago procesa el pago de cada vendedor en un entorno seguro.</p>
      </div>
      <Protected>
        {loading ? (
          <SkeletonCart />
        ) : error ? (
          <Empty title="No encontramos este checkout" message={error} />
        ) : (
          checkout && (
            <div class="cart-layout">
              <div class="payment-groups">
                {checkout.order.expires_at && checkout.order.status === "AWAITING_PAYMENT" && (
                  <div class="info-note">
                    <Icon name="spark" size={16} />
                    <span>
                      Reserva de stock asegurada hasta las{" "}
                      {new Date(checkout.order.expires_at).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {checkout.warning && (
                  <div class="info-note">
                    <Icon name="shield" /> {checkout.warning}
                  </div>
                )}
                {checkout.seller_groups.map((g) => (
                  <PaymentBrick key={g.seller_order_id} checkoutId={id} group={g} onPaid={reload} />
                ))}
              </div>
              <aside class="summary-card">
                <h3>Tu pedido</h3>
                <div class="summary-row">
                  <span>Vendedores</span>
                  <b class="tnum">{checkout.seller_groups.length}</b>
                </div>
                <div class="summary-row">
                  <span>Estado general</span>
                  <Status>{checkout.order.status}</Status>
                </div>
                <hr />
                <div class="summary-row summary-total">
                  <b>Total</b>
                  <strong class="tnum">{money(checkout.order.total_minor)}</strong>
                </div>
                <p>Confirmamos cada pago únicamente después de verificarlo con Mercado Pago.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <a class="btn btn-outline" href={`/checkout/${id}/result`}>
                    Estado de conciliación <Icon name="shield" size={16} />
                  </a>
                  <a class="btn btn-outline" href={`/orders/${id}`}>
                    Ver detalle del pedido <Icon name="arrow" size={16} />
                  </a>
                </div>
              </aside>
            </div>
          )
        )}
      </Protected>
    </main>
  );
}

export function CheckoutResultPage({ id }: { id: string }) {
  const attemptId = new URLSearchParams(routeSearch.value).get("attempt_id") ?? "";
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [attempt, setAttempt] = useState<PaymentAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const chk = await api<Checkout>(`/api/v1/checkouts/${encodeURIComponent(id)}`);
      setCheckout(chk);
      if (attemptId) {
        const att = await api<PaymentAttemptDetail>(
          `/api/v1/payment-attempts/${encodeURIComponent(attemptId)}`,
        ).catch(() => null);
        setAttempt(att);
      }
      setError("");
    } catch (e) {
      setError(toError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id, attemptId]);

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/orders">Mis compras</a> / <a href={`/checkout/${id}`}>Checkout</a> / Estado de
        pago
      </div>
      <div class="page-title">
        <span class="eyebrow">CONCILIACIÓN SERVIDOR A SERVIDOR</span>
        <h1>Estado de tu operación</h1>
        <p>
          La confirmación definitiva proviene siempre del registro verificado con Mercado Pago,
          nunca de parámetros de redirección del navegador.
        </p>
      </div>
      <Protected>
        {loading ? (
          <SkeletonTable rows={3} />
        ) : error || !checkout ? (
          <Empty title="No pudimos consultar el estado" message={error} />
        ) : (
          <div class="admin-grid">
            <section
              class="panel"
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div class="section-head">
                <h2>Resumen del pedido #{checkout.order.id.slice(0, 8).toUpperCase()}</h2>
                <Status>{checkout.order.status}</Status>
              </div>
              {attempt && (
                <div class="info-note">
                  <Icon name="shield" size={18} />
                  <div>
                    <strong>Intento #{attempt.id.slice(0, 8)}:</strong>{" "}
                    <Status>{attempt.status}</Status> · Importe{" "}
                    <b class="tnum">{money(attempt.amount_minor)}</b>
                    {attempt.provider_payment_id && (
                      <span> · Operación MP #{attempt.provider_payment_id}</span>
                    )}
                  </div>
                </div>
              )}
              <h3>Subpedidos por vendedor</h3>
              {checkout.seller_groups.map((g) => (
                <div class="notification-row" key={g.seller_order_id}>
                  <div>
                    <b>{g.seller_name}</b>
                    <small>Subpedido {g.seller_order_id.slice(0, 8)}</small>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <strong class="tnum">{money(g.subtotal_minor)}</strong>
                    <Status>{g.status}</Status>
                  </div>
                </div>
              ))}
              <div class="action-row">
                <Button variant="outline" onClick={() => void load()}>
                  Actualizar estado conciliado
                </Button>
                {checkout.seller_groups.some((g) => g.status === "AWAITING_PAYMENT") && (
                  <a href={`/checkout/${id}`} class="btn btn-primary">
                    Volver a pagar subpedidos pendientes
                  </a>
                )}
                <a href={`/orders/${id}`} class="btn btn-outline">
                  Ir al pedido <Icon name="arrow" size={16} />
                </a>
              </div>
            </section>
            <aside class="panel" style={{ height: "fit-content" }}>
              <h3>Garantía de no doble cobro</h3>
              <p>
                Cada intento de pago emplea una llave de idempotencia única en PostgreSQL antes de
                comunicarse con Mercado Pago. Si un pago figura como <code>PENDING</code> o{" "}
                <code>SUBMITTED</code>, nuestro motor de webhooks lo conciliará automáticamente.
              </p>
            </aside>
          </div>
        )}
      </Protected>
    </main>
  );
}
