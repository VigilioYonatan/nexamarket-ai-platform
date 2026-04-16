# Integración Mercado Pago **única** — checkout, split y seguridad

## Decisión cerrada: solo Mercado Pago

No implementar Stripe, PayPal ni una interfaz runtime de selección de PSPs. Puede haber `MercadoPagoGateway` detrás de un port de dominio **para testability**, sin falsas capacidades multi-proveedor. Usar documentación MP de **país/versión/checkout** y pruebas de sandbox; no asumir equivalencia entre Checkout API Payments, Checkout API Orders, Bricks y Checkout Pro.

## Decisión clave para Perú (verificación pública noviembre 2026)

- Mercado Pago Perú documenta `Split de pagos 1:1` para un vendedor + marketplace, con OAuth del seller y, según el checkout, `application_fee` (Checkout API) o `marketplace_fee` (Checkout Pro). En Perú, `1:N` requiere acceso comercial especial de cartera asesorada.
- Un carrito con productos de diferentes sellers **NO implica** un único pago de tarjeta con split 1:N habilitado. Modelo inicial a diseñar: `Order` único de UX, `SellerOrder` por vendedor, `PaymentIntent/PaymentAttempt` por seller y flujo claro de cobros múltiples; requiere verificar viabilidad legal/UX/comercial y términos MP antes de lanzar.
- Si MP habilita contractualmente 1:N más adelante, emitir ADR, nuevas pruebas de conciliación y migración sin romper `Order`.

## Flujo seller onboarding MP

Seller solicita alta → revisión comercial/documental → autorización OAuth MP (login MP externo) con `state` CSRF y redirect URI exacta → callback servidor valida `state`, intercambio `code` por credenciales → almacenar token seller cifrado y con acceso restringido + expiración/refresh/rotation → seller queda `PAYMENTS_READY` cuando verificaciones contractuales cumplen. Desconexión y revocación deshabilitan nuevos checkouts con ese seller.

**Importante:** no confundir OAuth seller MP con Google/Facebook login de compradores. Nunca guardar secretos client-side ni exponer access tokens en logs.

## Checkout API y pago seguro

- Preferir Checkout API por UX integrada **si está habilitada** para país/cuenta/merchant; Checkout Pro como alternativa de **producto MP**, no segunda pasarela, solo mediante decisión de lanzamiento/ADR.
- Tokens de tarjeta provienen de SDK/campos seguros del proveedor; backend no recibe ni registra PAN/CVV; seguir obligaciones PCI aplicables al modelo real.
- Crear payment attempt idempotente, monto/moneda/fee desde snapshot del servidor y seller ownership verificado; correlacionar `order_id`, `seller_order_id`, `external_reference` según soporte MP.
- No bloquear pedido en base a return URL `success` o captura de pantalla. Estado confirmado solamente al consultar recurso MP + reglas de reconciliación.

## Webhooks

1. Endpoint público exclusivo `POST /integrations/mercado-pago/webhooks` bajo TLS y rate limits proporcional a entrega.
2. Verificar `x-signature`, `x-request-id`, timestamp y `data.id` conforme a la **documentación del producto MP específico**. Si se implementa manualmente, construir manifest exactamente según docs y comparación constant-time; preferir SDK oficial compatible cuando exista.
3. Validar formato/tamaño del payload, topic/evento permitidos y límites; **no** confiar en body para confirmar dinero.
4. Dedupe de notificación en `psp_webhook_inbox` con índice unique; responder pronto y delegar reconciliación a worker.
5. Worker consulta recurso MP autenticadamente; mapea estados MP→máquina local, verifica monto, moneda, seller y orden; actualiza `payment_attempt`, `seller_order`, `ledger` y outbox en una única transacción.
6. Reintento por timeouts, notificaciones duplicadas/desordenadas y reconciliación periódica para eventos perdidos; alertas por desajustes.

## Ledger, comisión y conciliación

- Ledger doble entrada para cuenta por seller, marketplace, por cobrar, fees, refunds, chargebacks y liabilities según diseño contable. Suma de postings 0 por diario/moneda; no modificar entradas históricas, solo reversos.
- `application_fee` y netos requieren reglas verificadas de Mercado Pago sobre prioridad de comisiones y liberación de fondos; no calcular saldo del vendedor por intuición.
- `PaymentApproved`, `PaymentRefunded`, `ChargebackOpened` alimentan ledger/orden de forma idempotente. Conciliación diaria (operación local ↔ reporte MP ↔ extracto financiero disponible) con casos manuales y audit.
- Reembolsos parciales y chargebacks siguen reglas PSP; gestión de saldo insuficiente seller, disputas, parcialidades, créditos y recobros documentados.

## Settings de Mercado Pago

En Admin: ambiente `sandbox|production`, `public key` publicable según SDK, webhook status, conexión de aplicación, moneda habilitada, tiempo de expiración configurado permitido y health. Secrets y seller OAuth tokens en vault/config cifrado **fuera del payload visual**; rotación y test connection no devuelven credenciales.

## Pruebas y fallos obligatorios

Prueba autorizada MP con test users/accounts: pago aceptado, rechazado, pendiente, expirado; webhook firma inválida, replay, duplicado, retrasado, fuera de orden; callback falso; red timeout; credenciales expiradas; merchant no conectado; `application_fee` incorrecta; devolución parcial; seller insuficiente; idempotencia del endpoint y PSP; diferencias de conciliación. No declarar sandbox `PASS` sin credenciales y operaciones reales de prueba.

## Documentación pública verificada (URLs exactas, consultar antes de implementación)

- https://www.mercadopago.com.pe/developers/es/docs/split-payments/split-1-1/prerequisites
- https://www.mercadopago.com.pe/developers/es/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace
- https://www.mercadopago.com.pe/developers/es/docs/split-payments/split-1-1/integration-configuration/create-configuration
- https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/notifications
- https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/optional-notifications

**Gate comercial:** confirmar por escrito elegibilidad del merchant y split en Perú, KYB, comisiones, Checkout API, reembolsos, financiación y dispersión. Sin ello, fase dinero real `BLOCKED`.
