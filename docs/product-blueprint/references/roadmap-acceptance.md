# Roadmap de NexaMarket AI — slices verticales y Definition of Ready/Done

## Principios

Ordenar por riesgo y dependencia, no por cantidad de pantallas; cada incremento debe poder demostrarse en ambiente `prod-local` con datos de prueba y rollback. No habilitar dinero real antes de validar split MP, seguridad, soporte operativo y cumplimiento local. Entregar OpenSpec, ADR solo donde aporta y test/evidencia proporcional al caso.

## Etapa 0 — Descubrimiento y decisiones vinculantes

**Entregables:** bounded contexts, contrato de plataforma única, jurisdicción inicial Perú, seller/buyer policies, modelo checkout 1:1, máquina de estados, selección SSR vs Vite, threat model, UX flows, ADR auth, MP, dinero, reserva, consentimiento y backup; baseline tecnología desde lockfile.

**Aceptación:** actores, casos, estados, contratos de dinero/MP y riesgos sin contradicción; decisión comercial de MP explícitamente `OPEN` si no hay respuesta.

## Etapa 1 — Foundation y autenticación

**Backend:** NestJS skeleton DDD, DB migrations, identity profile, policies, error model, OTel; Keycloak realm clients, email/password, social Google/Facebook, MFA admin, TOTP, cookies BFF/CSRF, recovery.

**Frontend:** design tokens, componentes/fields, login, register, verify email, logout, recover, responsive light/dark; layout web, seller/admin shells.

**QA:** auth valid/invalid, social callback negatives, CSRF, session revocation, MFA, accessibility y visual regression.

**Gate:** login seguro sin tokens en navegador, seller no es admin, tests reales.

## Etapa 2 — Catálogo y seller

**Backend:** product/variant/listings, categories/attributes, media upload secure, seller onboarding, moderation, seller inventory, catalog APIs, OpenAPI.

**Frontend:** Home, búsqueda, PDP, categorías, seller center upload/edit/stock; estados UX.

**QA:** ownership seller, validación media, canonical matching, catalog indexes, SEO.

**Gate:** seller publica oferta autorizada que aparece en catálogo sin privilegios cruzados.

## Etapa 3 — Cart, Order, Inventory

**Backend:** cart and merge, pricing, coupons, inventory reservations/expiry, quote, checkout session, order/seller order, transactional outbox, concurrency.

**Frontend:** carrito, dirección, shipping selection, checkout pre-payment y confirmación.

**QA:** concurrencia última unidad, quote drift, coupons race, duplicate requests y BDD.

**Gate:** sin over-reservation, cálculos consistentes, snapshots inmutables.

## Etapa 4 — Mercado Pago y contabilidad

**Backend:** seller OAuth MP, payment attempts 1:1, `application_fee` según MP, firmado webhook/inbox, reconcilers, ledger, refunds, chargebacks, monitor y runbooks.

**Frontend:** MP integration segura, múltiples pasos de pago si aplica, estado parcial, pago y retorno, seller settlement view, finance dashboard.

**QA:** pruebas locales deterministas + sandbox MP autorizado + casos de refund/duplicate/replay/reconciliation/partial payment, security review.

**Gate:** *release comercial bloqueado* hasta validar contrato/cuenta MP, compliance/KYB y capacidad de conciliar cargos/fees.

## Etapa 5 — Settings globales, contenido y SEO

**Backend:** global settings drafts/version/publish/rollback, asset checks, feature flags, auditoría y roles separados.

**Frontend:** Appearance panel, logo/fonts/colors/light/dark/auto, header/home/footer, preview, Keycloak theme integration, email templates, sitemaps.

**QA:** a11y/contrast, XSS/SVG adversarial, visual regression, rollback/cache, seller denied.

**Gate:** admin publica tema sin afectar identidad, dinero ni seller isolation.

## Etapa 6 — Logística, postventa, confianza

**Backend:** shipping/tracking, RMA/return/refund, disputes, tickets, verified reviews, moderation/risk and notification jobs.

**Frontend:** order tracking, returns/support, seller shipment/admin claims.

**QA:** idempotencia courier, flows seller, refund partial, actor policies.

**Gate:** compra completa desde publicación hasta entrega/devolución en staging.

## Etapa 7 — IA local y datos

**Backend/IA:** local serving, extract/matching, search FTS+vector, recommendation baseline, shopping assistant safe tools, eval sets, Langfuse/OpenTelemetry, budgets.

**Frontend:** smart search, optional AI comparison, buyer assistant, seller assisted listing.

**QA:** security prompt injection, retrieval ACL, non-hallucination, no direct financial actions, quality benchmark y kill switch.

**Gate:** IA degradable y con métricas, comercio no depende de disponibilidad LLM.

## Etapa 8 — Production engineering

Hardening, Caddy/Compose rootless, signing/SBOM, GitOps opcional on-prem, backups/restore/DR, capacity, SLO/alerts, perf/load/chaos proporcional, incident runbooks, on-call, manual release approval.

**Gate:** ensayo go/no-go con pruebas reales, incident tabletop, smoke y rollback; no salir a producción si faltan controles de dinero/auth y restauración.

## Definition of Ready

Owner de caso de uso, usuario/valor, criterios de aceptación, permisos, errores/estados, contrato preliminar, impacto en datos/eventos, fixtures y test estrategia, dependencias MP/externos conocidos, riesgos y rollback si necesario.

## Definition of Done

Código/contratos/migrations, tests por riesgo, revisão separada, documentación apropiada, observabilidad, cambios de infraestructura/versiones reproducibles, informes PASS/FAIL/BLOCKED/NOT_RUN, criterios de UX y accesibilidad, plan de despliegue. No llamar *DONE* a un PR con BDD faltante o falla de autorización crítica.

## KPIs de éxito (no resultados actuales)

Conversión búsqueda→PDP→carrito→pago aprobado, tiempo publicación seller, tasa aprobación seller, stockouts, cumplimiento de envíos, return/refund rate, error ratio y p95, integridad ledger, zero double charges/oversells, tiempo de restore, éxito evaluaciones AI. Valores objetivos deben provenir de negocio y baseline, no inventarlos.
