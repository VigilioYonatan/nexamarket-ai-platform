# DDD pragmático — modelo de datos, reglas y transacciones

## Bounded contexts y agregados

| Contexto | Owner de agregados | Regla innegociable |
|---|---|---|
| Identity Profile | `UserProfile`, `Address`, `Consent` | ID externo IdP ≠ permiso de dominio |
| Seller | `Seller`, `SellerVerification`, `SellerPspConnection` | seller aprobado y MP autorizado antes de operar |
| Catalog | `Product`, `Variant`, `Category`, `Attribute`, `ProductEvidence` | atributos fuente/normalizados; duplicados revisables |
| Listings | `SellerListing`, `ListingOffer`, `ListingMedia` | precio/estado independientes por vendedor |
| Inventory | `InventoryStock`, `StockMovement`, `StockReservation` | disponible ≥ 0; reservas atómicas |
| Cart | `Cart`, `CartLine` | no garantía de stock/precio al añadir |
| Pricing | `Promotion`, `Coupon`, `PricingRule` | servidor cotiza; no confiar en subtotal cliente |
| Checkout | `CheckoutSession`, `CheckoutGroup` | agrupación por seller, quote versionado |
| Orders | `Order`, `SellerOrder`, `OrderLine`, `OrderStatusHistory` | snapshots, transiciones permitidas, comprador propietario |
| Payments | `PaymentIntent`, `PaymentAttempt`, `PspWebhookInbox`, `Refund` | idempotencia, estados confirmados por PSP |
| Ledger | `LedgerAccount`, `LedgerEntry`, `Settlement` | asientos balanceados, append-only |
| Fulfillment | `Shipment`, `ShipmentTrackingEvent`, `DeliveryQuote` | no asumir entrega hasta carrier verificado |
| Returns | `ReturnRequest`, `Dispute`, `RmaLine`, `RefundDecision` | condiciones y aprobaciones verificadas |
| Trust | `Review`, `RiskCase`, `ModerationDecision` | no sanciones automáticas solo por LLM |
| Design | `GlobalSettingsVersion`, `BrandAsset`, `FeatureFlag`, `AuditEvent` | solo GLOBAL, versionado, rollback |
| Async | `OutboxEvent`, `ProcessedEvent`, `JobStatus` | at-least-once, consumidor idempotente |

## Relación esencial

`Product (canónico)` 1:N `Variant` 1:N `SellerListing` (seller/sku/price) 1:1/N `InventoryStock`; `Cart` N líneas referencian `SellerListing`; `Order` contiene `SellerOrder` por vendedor; `SellerOrder` contiene `OrderLine` con **snapshots** de título, variante, moneda, precio unitario, impuestos, descuentos y seller.

No fusionar productos automáticamente solo por similitud; GTIN/atributos/modelo/evidencia y revisión humana. `ProductEvidence` versiona fuente y verificaciones de IA.

## SQL y precisión monetaria

- Moneda como ISO 4217 (`PEN` inicial); registrar cantidades como unidades menores enteras (`amount_minor`) o `numeric` de escala exacta conforme reglas. Nunca `float` para importes. Configurar redondeo/tributación y snapshots.
- FKs reales (incluidas referencias entre seller/listing/orden), uniques por claves de negocio, check constraints de stock/cantidades, monotonic version para CAS, índices por owner/estado/fecha.
- `inventory_stock`: `on_hand`, `reserved`, `version`, CHECK `on_hand >= 0`, `reserved >= 0`, `on_hand >= reserved`, si el diseño lo exige. `available = on_hand-reserved` derivado en la transacción.
- `stock_reservation`: unique `(checkout_id,listing_id)`, estados `HELD|CONSUMED|EXPIRED|RELEASED`; TTL y worker de limpieza transaccional.
- `payment_attempt`: unique de `idempotency_key`, `(provider, provider_payment_id)` si disponible; `psp_webhook_inbox` dedup por identidad de evento; PSP notification no se procesa dos veces financieramente.
- `ledger_journal` + `ledger_postings`: suma por moneda y journal = 0, `created_at`, `source_type/source_id`, `reversal_of` en vez de `DELETE`.
- `global_settings_versions`: único `PUBLISHED` para scope global por entorno (transaction/partial unique).
- `outbox_events` siempre dentro de la misma transacción del cambio; consumidor escribe `processed_events` antes de confirmar éxito idempotente.

## Estados de dominio (ejemplo, validar con negocio)

`Order`: DRAFT → AWAITING_PAYMENT → PARTIALLY_PAID | PAID → FULFILLING → SHIPPED → DELIVERED; CANCELLED/REFUND_PENDING/PARTIALLY_REFUNDED/REFUNDED según precondiciones. Subpedido y orden principal **no** comparten necesariamente estado. `PaymentAttempt`: CREATED → SUBMITTED → PENDING → APPROVED|REJECTED|EXPIRED|REFUNDED. `Seller`: APPLIED → REVIEWING → APPROVED|REJECTED|SUSPENDED.

Estados, invariantes y transiciones deben ser máquina de estados explícita, no `status = request.status` sin validación.

## Transacción de reserva (algoritmo orientativo)

```sql
BEGIN;
UPDATE inventory_stock
SET reserved = reserved + :qty,
    version = version + 1
WHERE listing_id = :listing_id
  AND on_hand - reserved >= :qty;
-- exigir exactamente 1 fila; de lo contrario 409 agotado
INSERT INTO stock_reservations
  (reservation_id, checkout_id, listing_id, quantity, status, expires_at)
VALUES (:id, :checkout, :listing, :qty, 'HELD', :expires)
ON CONFLICT (checkout_id, listing_id) DO NOTHING;
-- La idempotencia debe resolverse ANTES y respetarse también en UPDATE;
-- no aplicar UPDATE si INSERT ya existía para esa intención.
COMMIT;
```

Este fragmento **NO es código transaccional listo para copiar**: muestra la necesidad de atomicidad; implementar con idempotencia real, lock order estable y tests de concurrencia en PostgreSQL. El orden correcto en código puede ser `INSERT intent unique → lock/UPDATE → COMMIT`, con reintento seguro de serialización.

## Eventos de negocio (schema versionado)

`SellerApproved`, `ListingPublished`, `InventoryReserved`, `InventoryReservationReleased`, `CheckoutCreated`, `PaymentApproved`, `PaymentRejected`, `OrderPaid`, `SellerOrderReadyForShipping`, `ShipmentDelivered`, `RefundConfirmed`, `ThemePublished`, `ReviewApproved`, `AiProductAnalysisCompleted`. Envelope: `event_id`, `schema_version`, `occurred_at`, `aggregate_id`, `correlation_id`, `payload` minimizado, no tokens/PII innecesaria.

## Gobierno de datos y migraciones

- PostgreSQL es la fuente para stock, dinero y órdenes; Valkey solo caché/ephemeral.
- Mantener PII separados de logs/analytics, retención explícita, encryption at rest según amenaza, backups de acceso restringido, política de eliminación/exportación.
- Migrar expand/contract; no DDL en startup; forward/backfill/compatibility/rollback rehearsal y evitar migrations con lock largo sobre tablas calientes.
- Backup `pgBackRest` + WAL y **restore drill** real; los snapshots sin prueba no equivalen a RPO/RTO.
- `EXPLAIN ANALYZE` con datos representativos; índices de filtros/top sort; paginación stable keyset para listas grandes.

## Data dictionary mínimo

`users_profile`, `user_addresses`, `sellers`, `seller_verifications`, `seller_psp_connections` (secrets encrypted), `products`, `product_variants`, `product_attributes`, `product_evidence`, `categories`, `seller_listings`, `listing_media`, `inventory_stock`, `stock_movements`, `stock_reservations`, `carts`, `cart_lines`, `coupons`, `promotion_rules`, `checkout_sessions`, `orders`, `seller_orders`, `order_lines`, `order_status_history`, `payment_intents`, `payment_attempts`, `psp_webhook_inbox`, `refunds`, `ledger_journals`, `ledger_postings`, `shipments`, `shipment_events`, `return_requests`, `disputes`, `reviews`, `moderation_cases`, `notifications`, `global_settings_versions`, `brand_assets`, `audit_events`, `outbox_events`, `processed_events`, `ai_eval_runs`.

Todos los nombres son **propuestas**; migraciones concretas dependen de DB/orm real, sin fingir esquema ejecutado.
