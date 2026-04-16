# Carrito, cotización, inventario y orden multi-vendedor

## Experiencia del comprador

1. Añade listings de sellers diferentes a un **único carrito**.
2. Autenticación cuando corresponda; fusionar carrito anónimo con el persistente con reconciliación de SKUs, límites y duplicados.
3. Se elige dirección, método de entrega disponible y se muestra desglose (subtotal por seller, descuentos, envío, impuestos, fees/total).
4. Backend devuelve `checkout_quote` **con expiración y versión**, disponibilidad real y pricing server-side.
5. Confirmación obtiene reservas de inventario, crea orden principal y `SellerOrder` por seller, y prepara intents/attempts MP por seller (modelo 1:1 donde esté permitido).
6. La UI anuncia **si se requieren múltiples cobros**. Orden principal puede quedar `PARTIALLY_PAID` y reembolsos/compensaciones son workflows explícitos. No presentar un cargo único ficticio.
7. Se verifica cada pago por webhook + consulta PSP; pedido vendedor solo avanza cuando su propio cobro está aprobado y reserva consumida.
8. Después de pago: recibo, estado, tracking, notificaciones e incidencias.

## Invariantes de concurrencia

- Cálculo de disponibilidad siempre en DB. Reservar atómicamente. Agregar al carrito no reserva.
- Reserva idempotente por `(checkout_id,listing_id)`; reintento no incrementa `reserved` dos veces.
- Consumo de reserva una sola vez; si pago aprobado tardío llega tras expiración, ejecutar workflow compensatorio, nunca inventar stock.
- Orden de locks estable para reducir deadlocks; transacciones cortas; sin llamada PSP con lock DB abierto.
- Quote total/moneda e identidad seller debe concordar con intent MP; datos `price`, `quantity`, `seller_id` del browser no son fuente de verdad.
- Cada payment attempt tiene idempotency key; no crear duplicado por refresh/doble click.
- La orden principal refleja combinación de resultados de sellers; partial success se comunica claramente y se decide tratamiento de productos no pagados.

## Estados y compensaciones

`Cart OPEN|ABANDONED|CHECKED_OUT`; `CheckoutSession QUOTED|RESERVED|PAYMENT_PENDING|COMPLETED|PARTIAL|FAILED|EXPIRED`; `Reservation HELD|CONSUMED|RELEASED|EXPIRED`; `SellerOrder AWAITING_PAYMENT|PAID|PREPARING|SHIPPED|DELIVERED|CANCELLED|REFUND_PENDING|REFUNDED`.

Casos a decidir antes de producción: ¿se autoriza cobrar el seller A si el B falla? ¿Se revierte A automáticamente? ¿qué pasa con envío conjunto? ¿quién asume comisión si refund parcial? Estos son **requisitos de negocio abiertos** y **nunca** deben resolverse implícitamente mediante el frontend.

## Algoritmo de checkout inicial (alto nivel)

```text
POST /checkouts [Idempotency-Key]
  authenticate & verify buyer
  load server-side cart + snapshot listings
  recompute price, taxes, shipping and promotions
  validate seller status, stock and Mercado Pago connection
  SQL transaction:
    create unique checkout intent
    lock inventory in deterministic ordering
    insert reservations / increment reserved atomically
    create pending Order + SellerOrders + quote snapshot
    append CheckoutReserved outbox event
  COMMIT
  return checkout groups + payment steps (NO card data)

POST /checkouts/{id}/payment-attempts [Idempotency-Key]
  authorize buyer and checkout group
  create unique local attempt (pending)
  call Mercado Pago with seller OAuth token and proper application_fee
  persist provider response with provider_id and correlation
  return safe payment state / required client action

Webhook reconciliation:
  verify signature -> persist inbox dedupe -> ACK fast
  worker fetch verified payment state from Mercado Pago
  transition attempt atomically + write ledger + order status + outbox
  retry with backoff on network failures
```

## BDD bloqueantes

- Última unidad solicitada concurrentemente: solo un checkout gana.
- Doble click/replay en `payment-attempts`: mismo intento sin doble cobro.
- Callback `success` browser falso: orden NO cambia.
- Webhook duplicado/fuera de orden: no duplica ledger ni stock.
- Stock expirado pero pago tardío: caso compensado y auditado.
- Seller B no visualiza buyer/orden del seller A por ID.
- Cambio de precio tras quote: se bloquea o se requiere consentimiento explícito nuevo.
- Pago aprobado A, rechazado B: UI y DB mantienen partial correct.

## Facturación y descuentos

- En cada línea conservar `unit_price_minor`, `quantity`, `discount_minor`, `tax_minor`, moneda, `seller_id`, reglas de redondeo y versión de oferta.
- El monto MP debe reconciliar con el intent seller; fees del marketplace y comisiones MP por contrato.
- Cupones calculados en servidor con redención atómica, límite por usuario/campaña, reversos al cancelar/reembolsar.
- Impuestos y comprobantes electrónicos: **dependen de país/modelo de contribuyente**; no inventar tratamiento fiscal en código base.
