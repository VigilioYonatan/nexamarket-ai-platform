# Inventario extendido de pruebas: casos identificables, fallas y evidencias

Este catálogo es **plan**, no casos ya programados. Agrupar por riesgo y evitar duplicación artificial. Para cada caso indicar capas necesarias, fixtures, steps/asserters reales, CI job, owner y reporte. Reutilizar `node-nest-testing`, `web-mfe-testing`, `standards/testing/e2e-quality-gates.md` y `semantic-ddd-contract-gates.md`.

## Identity/Auth (14 casos)

| ID | Escenario | Aserción crítica |
|---|---|---|
| A01 | Registro email válido | identity creada sin privilegios seller/admin |
| A02 | Registro duplicado | no enumeración indebida de cuentas |
| A03 | Email de verificación expirado | no activa identidad; safe retry |
| A04 | Password errónea repetida | lockout/rate limiting aplicable |
| A05 | Google OAuth válido | state/nonce/audience, sesión segura |
| A06 | Google OAuth state incorrecto | no sesión; audit |
| A07 | Facebook login sin email | no vincular a cuenta arbitraria |
| A08 | Account linking malicioso | no takeover |
| A09 | TOTP correcto | éxito con intentos limitados |
| A10 | TOTP incorrecto/reutilizado | no step-up ni acceso |
| A11 | Recovery | un solo uso, revoca sesiones según contrato |
| A12 | Admin sin MFA | deny admin routes |
| A13 | Sesión revocada | 401/redirect sin PII |
| A14 | CSRF cross-site | mutación rechazada |

## Catalog/Seller/Admin (14 casos)

| ID | Escenario | Aserción crítica |
|---|---|---|
| C01 | Listing seller aprobado | aparece en catálogo central |
| C02 | Seller suspendido | no publica ni recibe nuevos intents |
| C03 | Seller A edita listing B | denegado, DB unchanged |
| C04 | Seller B lista órdenes A | sin leakage |
| C05 | Media MIME falsificado | upload rechazado |
| C06 | SVG con onload/script | ejecución bloqueada |
| C07 | Lista con cursor manipulado | paginación segura/estable |
| C08 | Variantes/atributos obligatorios | DTO y DB constraints |
| C09 | Review sin compra elegible | no publicada |
| C10 | Moderación con apelación | historial y permiso correcto |
| C11 | Admin sin rol financiero | reembolso denegado |
| C12 | Seller forja `seller_id` | server owner overrides/denies |
| C13 | Promoción expirada | precio servidor sin descuento |
| C14 | Dos canjeos simultáneos cupón único | solo uno gana |

## Cart/Checkout/MP/Ledger (17 casos)

| ID | Escenario | Aserción crítica |
|---|---|---|
| P01 | Carrito anónimo merge login | no doble línea/cantidad inválida |
| P02 | Stock cambia desde PDP | quote actualizado |
| P03 | 2 compradores, 1 unidad | 1 reserva y no stock negativo |
| P04 | Retry checkout idempotente | misma orden y reserva |
| P05 | Dos sellers mismo carrito | dos seller-orders/flujo de pagos real |
| P06 | Fake callback approved | orden sigue pendiente |
| P07 | MP webhook inválido | 401, 0 asientos |
| P08 | MP webhook duplicado | exactamente un efecto DB |
| P09 | Webhook retrasado/desordenado | máquina de estados consistente |
| P10 | Timeout al crear pago | consulta/recuperación antes de reintentar |
| P11 | MP seller OAuth expirado | checkout bloqueado/acción de reconexión |
| P12 | MP partial A paid B rejected | estado parcial verdadero |
| P13 | Pago tardío tras expiry reserva | compensación auditada |
| P14 | Refund dos veces | no excede total cobrado |
| P15 | Refund parcial de línea | ledger balanceado |
| P16 | Comisión cambia post-pago | snapshot/ledger no se reescriben |
| P17 | Reconcile mismatch PSP/local | alerta y case, no autoajuste ciego |

## Appearance/UX (11 casos)

| ID | Escenario | Aserción crítica |
|---|---|---|
| U01 | Light/dark/auto | estados semánticos y preferencia persisten |
| U02 | Contraste texto/acciones | WCAG 2.2 objetivo verificable |
| U03 | 320px mobile | checkout/form sin overflow |
| U04 | Navegación solo teclado | foco visible y orden lógico |
| U05 | Errores de formulario | label, hint y announcer accesibles |
| U06 | Branding login Keycloak | logo y paleta versionados |
| U07 | Theme draft | no afecta usuarios públicos |
| U08 | Publish+rollback | versión y caché correctas |
| U09 | Seller cambia tema | 403/404 según política, sin write |
| U10 | CSS/JS inyectado en token | reject schema |
| U11 | Imagen faltante | fallback y CLS controlado |

## Shipping/Returns/AI/Platform (15 casos)

| ID | Escenario | Aserción crítica |
|---|---|---|
| O01 | Envío por dos sellers | shipments correctos por seller-order |
| O02 | Tracking falso | no entrega confirmada sin evidencia |
| O03 | RMA sin elegibilidad | denegado |
| O04 | Seller ajeno solicita refund | denegado |
| O05 | Mensaje seller con enlace malicioso | moderación/escape |
| O06 | Prompt injection anuncio | tool bypass impedido |
| O07 | AI consulta orden ajeno | policy aplicada |
| O08 | AI caída | comercio/checkout permanece |
| O09 | AI recomienda agotado | filtros duros prevalecen |
| O10 | IA/LLM trace PII | redaction comprobado |
| O11 | PostgreSQL restore PITR | datos y consistencia verificados |
| O12 | Digest sin firma | host rechaza deployment |
| O13 | Fallo worker tras PSP success | retry sin duplicar asiento |
| O14 | Instrumentación logs | no secrets/tokens/PII |
| O15 | Carga a p95 objetivo | sin corrupción/over-reservation |

## Evidencia de cada ejecución

```yaml
case_id: P03
run_id: NOT_RUN
scope: integration-postgresql-concurrency
commands: []
environment: NOT_DEFINED
fixtures: []
assertions: []
status: NOT_RUN
report_uri: null
owner: inventory
```

**Importante:** no afirmar que estos 71 escenarios están implementados. Son un *test catalog* para convertir en código según la ruta crítica y el estado real del repositorio. Mantener coherencia con los 56 controles transversales Vigilio, sin reemplazarlos.
