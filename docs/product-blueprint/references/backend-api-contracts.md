# Backend NestJS — controladores, DTOs, rutas, políticas y contracts

## Regla estructural de Vigilio

`presentation/http/controller → application/services → domain schemas/invariants → application/ports → infrastructure/drizzle`. Controller pequeño con `@Controller`, guards, pipes Zod, OpenAPI; application no importa HTTP/Drizzle; domain independiente. Casos de uso semánticos (`registerSeller`, `reserveStock`, `confirmPayment`, `publishGlobalTheme`), no `index/show/store/destroy`. Constructor DI `private readonly orderService` en camelCase, IDs de parámetros según convención Vigilio. `schema.ts` de dominio no contiene DTOs HTTP. DTO Zod y tipo derivado en **mismo `*.dto.ts`**; `*.doc.ts` solo si requiere integración Swagger.

## Inventario de controladores y endpoints v1 (propuesta)

**Públicos / identidad, usuario**

| Controller | Method / ruta | Caso de uso y política |
|---|---|---|
| `AuthSessionController` (BFF) | `GET /auth/login`; `GET /auth/callback`; `POST /auth/logout`; `GET /auth/session` | OIDC Keycloak, CSRF/state, sesión; NO password propio |
| `AccountController` | `GET/PATCH /api/v1/me`; `GET /api/v1/me/sessions`; `DELETE /api/v1/me/sessions/:id` | identidad propia, step-up sensible |
| `AddressController` | `GET/POST /api/v1/me/addresses`; `PATCH/DELETE /api/v1/me/addresses/:address_id` | owner buyer, no IDOR |
| `CatalogController` | `GET /api/v1/products`; `GET /api/v1/products/:product_id`; `GET /api/v1/categories` | público, filtros tipados, paginación estable |
| `SearchController` | `GET /api/v1/search`; `GET /api/v1/search/suggest` | query sanitizada, rate limits |
| `SellerPublicController` | `GET /api/v1/sellers/:seller_id/profile`; `GET /api/v1/sellers/:seller_id/listings` | perfil público filtrado |
| `ReviewController` | `GET /api/v1/products/:product_id/reviews`; `POST /api/v1/orders/:order_id/reviews` | escritura comprador con compra elegible |

**Comprador / órdenes**

| Controller | Method / ruta | Regla principal |
|---|---|---|
| `CartController` | `GET /api/v1/cart`; `POST /api/v1/cart/items`; `PATCH/DELETE /api/v1/cart/items/:line_id` | propiedad, stock/precio no confiados en client |
| `FavoriteController` | `GET /api/v1/me/favorites`; `POST/DELETE /api/v1/me/favorites/:listing_id` | ownership |
| `CheckoutController` | `POST /api/v1/checkouts`; `GET /api/v1/checkouts/:checkout_id`; `POST /api/v1/checkouts/:id/confirm` | quote y stock, `Idempotency-Key`, antifraude |
| `PaymentController` | `POST /api/v1/checkouts/:id/payment-attempts`; `GET /api/v1/payment-attempts/:id` | MP único, dueño comprador, token PSP transitorio |
| `OrderController` | `GET /api/v1/me/orders`; `GET /api/v1/me/orders/:order_id`; `POST /api/v1/me/orders/:id/cancel` | transitions, BOLA |
| `ReturnController` | `POST /api/v1/me/orders/:id/return-requests`; `GET /api/v1/me/return-requests` | elegibilidad, evidencia |
| `SupportController` | `POST /api/v1/me/support-tickets`; `GET /api/v1/me/support-tickets` | acceso propio |
| `NotificationController` | `GET /api/v1/me/notifications`; `POST /api/v1/me/notifications/:id/ack` | ownership |

**Seller**

| Controller | Method / ruta | Policy |
|---|---|---|
| `SellerOnboardingController` | `POST /api/v1/seller/applications`; `GET /api/v1/seller/application` | solicitante propietario |
| `SellerPspController` | `POST /api/v1/seller/mercado-pago/authorize`; `GET /api/v1/seller/mercado-pago/callback`; `POST /api/v1/seller/mercado-pago/disconnect` | OAuth state PKCE donde aplica; token server-only |
| `SellerListingController` | `GET/POST /api/v1/seller/listings`; `PATCH /api/v1/seller/listings/:id`; `POST /api/v1/seller/listings/:id/publish|pause` | seller aprobado + ownership |
| `SellerInventoryController` | `GET /api/v1/seller/inventory`; `POST /api/v1/seller/inventory/:listing_id/adjustments` | movement journal, version/CAS |
| `SellerOrderController` | `GET /api/v1/seller/orders`; `GET /api/v1/seller/orders/:seller_order_id`; `POST /api/v1/seller/orders/:id/prepare|ship` | seller-order owner, state machine |
| `SellerAnalyticsController` | `GET /api/v1/seller/analytics/summary`; `GET /api/v1/seller/settlements` | seller-scoped aggregate |

**Administración**

| Controller | Method / ruta | Policy |
|---|---|---|
| `AdminSellerController` | `GET /api/v1/admin/sellers`; `POST /api/v1/admin/sellers/:id/approve|reject|suspend` | review role, evidence audit |
| `AdminCatalogController` | `POST/PATCH /api/v1/admin/categories`; `POST /api/v1/admin/listings/:id/moderate` | permissions, reason |
| `AdminOrderController` | `GET /api/v1/admin/orders`; `GET /api/v1/admin/orders/:id` | support/case assignment |
| `AdminPaymentController` | `GET /api/v1/admin/payment-attempts`; `POST /api/v1/admin/refunds`; `GET /api/v1/admin/reconciliation` | finance, step-up, dual controls |
| `AdminSettingsController` | `GET /api/v1/admin/settings`; `POST /api/v1/admin/settings/drafts`; `POST /api/v1/admin/settings/:version/validate|publish|rollback` | brand_manager/admin, versioned |
| `AdminAssetsController` | `POST /api/v1/admin/brand-assets/upload-intents`; `POST /api/v1/admin/brand-assets/:id/verify` | uploads secured |
| `AdminRoleController` | `GET /api/v1/admin/roles`; `POST /api/v1/admin/roles/assignments` | security_admin, MFA |
| `AdminAuditController` | `GET /api/v1/admin/audit-events` | auditor/admin, PII minimizada |
| `AdminFeatureFlagController` | `GET/PATCH /api/v1/admin/feature-flags/:key` | safe rollout, audit |
| `AdminAiController` | `GET /api/v1/admin/ai/evaluations`; `PATCH /api/v1/admin/ai/policies/:key` | guarded settings |

**Integraciones y jobs**

| Controller | Method / ruta | Policy |
|---|---|---|
| `MercadoPagoWebhookController` | `POST /integrations/mercado-pago/webhooks` | validación firma raw/headers, sin sesión usuario, dedup/inbox |
| `JobController` | `GET /api/v1/jobs/:id` | propietario (seller/admin), progress |
| `HealthController` | `GET /health/live`; `GET /health/ready`; `GET /internal/metrics` | metric endpoint privado, no secretos |
| `AiShoppingController` | `POST /api/v1/ai/shopping/sessions`; `POST /api/v1/ai/shopping/sessions/:id/messages` | authZ tool-scoped, rate/budget |
| `AiProductController` | `POST /api/v1/seller/ai/product-analysis-jobs` | seller ownership + upload restrictions |

Los métodos con `:id/publish|pause` representan **rutas separadas**, no un path literal de pipe. En producción publicar operación exacta y operationId único en OpenAPI.

## HTTP response/errores

- GET público 200; creación 201 o job 202; idempotent retry devuelve resultado original; 204 para acciones sin body cuando contrato lo defina.
- `400/422` validación según contrato, `401` anónimo, `403/404` política anti-enumeración, `409` conflicto, `412` ETag stale, `429` rate; `502/503` dependencia PSP indisponible sin filtrar payload.
- Error shape seguro (ejemplo): `{ "code":"INSUFFICIENT_STOCK", "message":"Disponibilidad actualizada", "request_id":"..." }`; localización de message en UI; no stack traces/SQL/MP tokens.
- Search/pagination con `limit`, `cursor`/`offset` validado y `sort` allowlist con desempate estable.
- OpenAPI incluye auth, ejemplos, tipos, errores, idempotencia, paginación, rate limits y headers; API client generado desde contrato propietario y browser-safe.

## Ejemplo DTO Zod (orientativo)

```ts
// inventory/presentation/http/dto/adjust-stock.request.dto.ts
import { z } from 'zod';
export const adjustStockRequestDto = z.object({
  delta: z.number().int().min(-10000).max(10000).refine(v => v !== 0),
  reason: z.enum(['RECEIPT', 'CORRECTION', 'DAMAGE']),
  expected_version: z.number().int().nonnegative(),
});
export type AdjustStockRequestDto = z.output<typeof adjustStockRequestDto>;
```

El DTO se valida con pipe real del proyecto y **no** se pasa directamente a dominio sin mapear el comando (seller_id autenticado se inyecta desde policy, nunca de body).

## Ejemplo controller thin (ilustrativo, no compila aislado)

```ts
@Controller('api/v1/seller/inventory')
@UseGuards(SessionGuard, SellerPolicyGuard)
export class SellerInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post(':listing_id/adjustments')
  async adjustStock(
    @Param('listing_id', ParseUUIDPipe) listing_id: string,
    @Body(new ZodValidationPipe(adjustStockRequestDto)) request: AdjustStockRequestDto,
    @CurrentPrincipal() principal: Principal,
  ): Promise<StockAdjustmentResponseDto> {
    return this.inventoryService.adjustStock({
      listing_id,
      seller_id: principal.seller_id,
      delta: request.delta,
      reason: request.reason,
      expected_version: request.expected_version,
    });
  }
}
```

Este snippet requiere imports, decorators y adapters del **consumidor**. No asumir `ZodValidationPipe` exportado igual entre versiones. El service debe verificar seller ownership en DB transaccional; los guards de rol no bastan.

## Checklist por endpoint

Owner, intento, método correcto, authN, authZ objeto, DTO, tipo de salida, status/errores, OpenAPI + operationId, idempotencia, transacciones, query performance, rate limits, logs seguros, unit/contract/E2E apropiados, compatibilidad y evidencia.
