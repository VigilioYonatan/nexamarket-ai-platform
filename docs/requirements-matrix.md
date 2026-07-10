# Matriz completa de requisitos NexaMarket 0.2.0

Cada fila enlaza requisito con estado de implementación según inspección de código. `IMPLEMENTED_UNVERIFIED` significa código presente, no evidencia de un flujo E2E. `PARTIAL` no es DONE. Estados y huecos de la versión de referencia; validar contra código y skills Vigilio antes del release.

| ID | Capacidad | Estado | Ruta | Evidencia / pendiente |
|---|---|---|---|---|
| AUTH-01 | email_registration_and_verification | PARTIAL | infra/keycloak/realm/nexamarket-realm.json | No se probó verificación de email end-to-end |
| AUTH-02 | login_and_session_management | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/auth.ts | Sesiones + OIDC con DB; sin E2E |
| AUTH-03 | google_social_login | CONFIG_REQUIRED | apps/web/src/pages/identity.tsx | Requiere configurar proveedor Google en Keycloak |
| AUTH-04 | facebook_social_login | CONFIG_REQUIRED | apps/web/src/pages/identity.tsx | Requiere configurar proveedor Facebook en Keycloak |
| AUTH-05 | totp_and_mfa | CONFIG_REQUIRED | infra/keycloak/realm/nexamarket-realm.json | Requiere validar TOTP/MFA contra Keycloak real |
| AUTH-06 | password_recovery_and_session_revocation | PARTIAL | apps/api/src/modules/auth.ts | Logout sí; recuperación en Keycloak sin validación externa |
| AUTH-07 | passkeys_webAuthn | NOT_IMPLEMENTED |  | WebAuthn/passkeys no integrado |
| UI-01 | storefront_home_and_categories | IMPLEMENTED_UNVERIFIED | apps/web/src/pages/buyer.tsx | UI pública, sin prueba de navegador |
| UI-02 | responsive_design_and_wCAG | PARTIAL | apps/web/src/styles.css | Falta auditoría real WCAG y cross-browser |
| UI-03 | global_theme_light_dark_auto | IMPLEMENTED_UNVERIFIED | apps/web/src/lib/store.ts | Theme signals: sin E2E visual |
| UI-04 | global_branding_logo_fonts_tokens | PARTIAL | apps/api/src/modules/admin.ts | Tokens globales; no edición total de logo/fuentes de auth |
| UI-05 | theme_preview_publish_rollback | PARTIAL | apps/api/src/modules/admin.ts | Draft/publish/rollback; preview no verificada |
| UI-06 | login_registration_branding | PARTIAL | infra/keycloak/themes/nexamarket/login/resources/css/nexamarket.css | Tema estático, sync dinámico no implementado |
| CAT-01 | canonical_products_variants_listings | PARTIAL | apps/api/migrations/0001_core.sql | Modelo parcial frente a variantes canónicas |
| CAT-02 | categories_attributes_media | PARTIAL | apps/api/src/modules/catalog.ts | Catálogo/media sí; atributos extendidos pendientes |
| CAT-03 | search_filters_sort_pagination | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/catalog.ts | Listado, búsqueda; no E2E |
| CAT-04 | hybrid_retrieval | NOT_IMPLEMENTED |  | Search híbrido no integrado |
| BUY-01 | profile_addresses_favorites | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/account.ts | Direcciones/favoritos no validados E2E |
| BUY-02 | persisted_cart_and_merge | PARTIAL | apps/api/src/modules/cart.ts | Carrito ahora se consume transaccionalmente al crear checkout; fusión anónima pendiente, E2E NOT_RUN |
| BUY-03 | coupons_and_promotions | NOT_IMPLEMENTED |  | Cupones/promociones no integrados |
| ORD-01 | atomic_inventory_reservations | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/checkout.ts | Reserva atómica SQL; prueba de DB no ejecutada |
| ORD-02 | multi_seller_orders_and_snapshots | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/checkout.ts | Subórdenes, snapshots; no probadas en vivo |
| ORD-03 | server_quoted_checkout | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/checkout.ts | Precios servidor; proveedor sin pruebas |
| MP-01 | seller_oauth | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/payments.ts | OAuth implementado, sin sandbox |
| MP-02 | checkout_api_1_to_1 | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/payments.ts | Integración API escrita; sandbox NOT_RUN |
| MP-03 | signed_webhooks_idempotency_reconciliation | PARTIAL | apps/api/src/modules/payments.ts | Inbox verificado con firma, sincronización y cola de conciliación administrativa; sandbox NOT_RUN |
| MP-04 | double_entry_ledger | PARTIAL | apps/api/src/modules/payments.ts | Ledger contabilizado y salud de asientos en admin; conciliación bancaria y devoluciones financieras pendientes |
| MP-05 | partial_refund_chargeback_management | PARTIAL | apps/api/src/modules/orders.ts | Solicitudes por subpedido, aprobación humana y razón auditada; reembolso PSP/chargebacks pendientes |
| SEL-01 | onboarding_approval_suspension | PARTIAL | apps/api/src/modules/seller.ts | Aprobación, rechazo y suspensión auditable; verificación KYB externa pendiente |
| SEL-02 | listing_inventory_order_management | IMPLEMENTED_UNVERIFIED | apps/api/src/modules/seller.ts | Listings/stock/pedidos; E2E no ejecutada |
| SEL-03 | seller_analytics_settlements | PARTIAL | apps/api/src/modules/seller.ts | Dash básico; settlements completos pendientes |
| LOG-01 | shipping_quotes_tracking | PARTIAL | apps/api/src/modules/orders.ts | Tracking manual y confirmación de entrega por comprador; tarifas/transportistas reales pendientes |
| LOG-02 | returns_and_disputes | PARTIAL | apps/api/src/modules/orders.ts | Devoluciones por seller_order, decisión auditada y UI buyer/admin; disputas financieras pendientes |
| TRUST-01 | reviews_and_moderation | PARTIAL | apps/api/src/modules/trust.ts | Reseñas de compra verificada, moderación con audit/outbox, UI comprador y admin; tests PostgreSQL NOT_RUN |
| TRUST-02 | fraud_cases_human_review | PARTIAL | apps/api/src/modules/trust.ts | Casos de riesgo y revisión humana disponibles; scoring antifraude y apelaciones pendientes |
| COM-01 | email_notifications_and_tickets | PARTIAL | apps/api/src/modules/support.ts | Tickets privados, mensajes admin/buyer, notificaciones inbox y proyección outbox; entrega SMTP externa pendiente |
| ADM-01 | users_sellers_catalog_orders | PARTIAL | apps/api/src/modules/admin.ts | Gestión sellers/aplicaciones, suspensión, orders, reviews/support/trust; sin gestión completa de cuentas |
| ADM-02 | payments_refunds_audit_settings | PARTIAL | apps/api/src/modules/admin.ts | Panel de conciliación y salud ledger, themes, auditoría, decisiones devoluciones; PSP refund pendiente |
| ADM-03 | feature_flags_security_owners | PARTIAL | apps/api/src/modules/flags.ts | Feature flags auditados y UI admin, sin motor de aprobaciones/owners avanzado |
| AI-01 | product_enrichment_evidence | NOT_IMPLEMENTED |  | Extracción de producto con evidencia pendiente |
| AI-02 | shopping_agent_authorized_tools | PARTIAL | apps/ai/app/main.py | Respuestas acotadas, no agente con herramientas autorizadas |
| AI-03 | recommendations_and_forecasting | PARTIAL | apps/api/src/modules/recommendations.ts | Recomendaciones basadas en popularidad y categorías; forecasting y evaluación ML pendientes |
| OPS-01 | compose_caddy_tls_network_isolation | IMPLEMENTED_UNVERIFIED | compose/compose.yaml | Compose declarado; no se probó docker |
| OPS-02 | ci_security_sbom_cosign | PARTIAL | .forgejo/workflows/ci.yml | Gates declarados, lockfile/firmas de release pendientes |
| OPS-03 | pgbackrest_pitr_restore_drill | PARTIAL | ops/backup.sh | Backup cifrado, no PITR pgBackRest ni restore real |
| OPS-04 | observability_alerts_incident_runbooks | PARTIAL | infra/observability/prometheus.yml | Config base, SLO e incidentes reales no probados |
| OPS-05 | unit_integration_bdd_e2e_security_gates | PARTIAL | tests/bdd/steps.ts | Test suites declaradas; ejecución parcial solamente |

**Conteo:** 47 capacidades; CONFIG_REQUIRED: 3, IMPLEMENTED_UNVERIFIED: 12, NOT_IMPLEMENTED: 4, PARTIAL: 28. Ninguna capacidad marcada como E2E verificada.
