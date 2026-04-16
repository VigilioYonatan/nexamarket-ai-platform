# Trazabilidad negocio→arquitectura→API→datos→test→operación

## Modelo canónico de una capacidad

```yaml
capability: reserveCheckoutInventory
owner: inventory
actors: [buyer]
preconditions: [authenticated, checkout-eligible, listing-active, stock-available]
invariants:
  - no-negative-available-stock
  - idempotency-per-checkout-listing
  - reservation-expiry-monotonic
http:
  operation_id: createCheckout
  method: POST
  path: /api/v1/checkouts
persistence: [inventory_stock, stock_reservations, checkouts]
events: [CheckoutReserved]
security: [buyer-own-cart, seller-listing-authorized]
tests: [unit, postgres-concurrent, bdd-last-stock, e2e-api, security-negative]
observability: [reservation_conflicts_total, checkout_duration_seconds]
rollback: terminate-new-checkout-via-feature-flag-and-drain-existing-intents
```

Estos identificadores son propuesta de **intención**, no un recurso ya desplegado.

## Cadena de ownership

| Producto | Contrato/API | Persistencia | Tests | Skill Vigilio |
|---|---|---|---|---|
| Google/Facebook+OTP | OIDC callbacks, session APIs | Keycloak/session references | auth social, CSRF, MFA | `node-nest-security`, `web-mfe-security-delivery` |
| Seller listings | `SellerListingController` | seller_listings, variants, media | seller ownership, publish | `node-nest-build-feature`, `node-nest-testing` |
| Stock+cart | `CartController`, `CheckoutController` | cart, inventory_stock, reservations | last-unit race, retry | `node-nest-persistence`, `node-nest-testing` |
| Mercado Pago | `PaymentController`, webhook | intents, attempts, inbox, ledger | signature, PSP sandbox, reconcile | `node-nest-security`, `node-nest-async-workers` |
| Global branding | `AdminSettingsController` | settings_versions, assets | contrast, publish, rollback | `ui-design-system`, `web-mfe-testing` |
| AI shopping | `AiShoppingController` | sessions, tool calls, evaluations | prompt injection, authZ | `ai-rag-llmops-finops` |
| Self-hosted release | CI + Compose + Caddy | persistent volumes/backups | smoke, signed digest, restore | `platform-compose-vps-delivery`, `software-supply-chain-security` |

## Matriz de evidencia por caso

```text
change_id:
intent:
owner:
files_changed:
skills_loaded:              # únicamente skills efectivamente leídas
canonical_sources_read:    # rutas exactas, no solo títulos
contracts_diffed:
affected_consumers:
checks:
  unit: NOT_RUN
  postgres_integration: NOT_RUN
  bdd: NOT_RUN
  openapi_diff: NOT_RUN
  browser_e2e: NOT_RUN
  security: NOT_RUN
  build: NOT_RUN
  deploy: NOT_RUN
review_verdict: NOT_RUN
rollback:
risks:
```

**Evidencia `PASS` solo con comando y salida exitosa identificables**. E2E requiere app/servicios/fixtures/runner reales. Una auditoría estática del superskill no equivale a ejecución de producto.

## Release readiness

Conciliar `OpenSpec → ADR → código → pruebas → artefacto firmado → digest en staging/prod → telemetry → runbooks`. Si falla money/auth/stock/tenant isolation, release bloqueado. Configurar branch protection real: un Markdown no impone required checks.
