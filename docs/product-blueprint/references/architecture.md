# Arquitectura de software, integración y fronteras

## ADR provisional: topología inicial

**Módulo principal:** monolito modular NestJS/TypeScript con bounded contexts independientes de transporte y DB; **módulo separado opcional:** Python/FastAPI para IA de cargas GPU. Arquitectura hexagonal pragmática/DDD, sin entidades ceremoniales. La estructura concreta depende del repositorio consumidor.

```text
Navegador / SSR / Seller Center / Admin Center
  → Caddy (TLS, límites de entrada, seguridad edge)
  → BFF (cookie de sesión y CSRF) / API NestJS
      ↔ Keycloak (OIDC social/MFA) [servicio de identidad]
      → Commerce Core (bounded contexts y puertos)
          → PostgreSQL (transacciones, ledger, outbox)
          → Valkey (caché efímera; NO autoridad monetaria)
          → almacenamiento compatible con S3 autohospedado
          → workers Outbox/Inbox, tareas y notificaciones
          → adaptador Mercado Pago (único PSP externo)
          → API IA local (FastAPI; inferencia self-hosted)
      → OTel Collector → Prometheus/Grafana/Loki/Tempo
```

## Stack candidato (no afirmar versiones instaladas)

- Storefront: **Astro SSR + Preact + TypeScript** como **propuesta nueva** para SEO/catálogo; comprobar compatibilidad con `web-mfe-technologies` (el baseline Vigilio es Preact/Vite) y registrar ADR si se usa Astro. Alternativa conservadora: Preact/Vite con SSR/BFF propio.
- Seller/Admin: Preact + Vite + TS, TanStack Query, Zod, Tailwind, componentes de design system propio. React si una librería lo exige solo mediante ADR.
- Backend: Node, NestJS, Zod/nestjs-zod, Drizzle, PostgreSQL, Pino, OpenAPI + Scalar.
- Identity: Keycloak, OIDC Authorization Code + PKCE (públicos), BFF confidencial cuando aplique; sesión web por cookie HTTP-only.
- Datos/infra: PostgreSQL, Valkey, pgvector, almacenamiento abierto compatible con S3, Caddy, Compose, pgBackRest, OpenBao opcional evaluado.
- Servicios AI: FastAPI, vLLM u Ollama, modelos con licencia comercial verificada; MLflow/Langfuse OSS según necesidad.
- Operaciones: OpenTelemetry + Prometheus + Grafana + Loki + Tempo; scripts de mantenimiento y reportes.
- Descubrimiento progresivo: PostgreSQL FTS+pgvector al inicio; OpenSearch, RabbitMQ, PgBouncer o Kubernetes solo después de medir y documentar.

## Fronteras del monolito modular

`identity-profile`, `seller-onboarding`, `catalog`, `listing`, `pricing-promotions`, `inventory`, `cart`, `checkout`, `orders`, `payments`, `ledger-settlements`, `fulfillment`, `returns-disputes`, `ratings`, `moderation-trust`, `messaging-notifications`, `admin-settings`, `analytics`, `search`, `ai-adapter`.

Cada bounded context es **owner de sus tablas, contratos, invariantes y eventos**. Otros módulos usan servicios, puertos, read models o eventos, no hacen writes cruzados arbitrarios. La misma DB física no implica acoplamiento ilimitado.

## Repositorios y estructura (alinear con plataforma Vigilio real)

Preferencia acorde con Vigilio Compose: repositorios `nexamarket-impl`, `nexamarket-web` (storefront+panels según topología elegida), `nexamarket-deploy` (un Compose parametrizado), `platform-ops` (Ansible), `prod-local` (simulación); CI reusable en plataforma, specs canónicos con dueño. **No crear `contracts/` global solo porque sí** ni `package.json` en un workspace raíz cuando se adopta el patrón de cinco repositorios de Vigilio. Un monorepo modular existente válido no se parte por dogma.

Ejemplo backend:

```text
src/
  catalog/
    domain/schemas/  (entities/ SOLO con invariantes)
    application/ports/ application/services/
    infrastructure/persistence/drizzle/
    presentation/http/controllers/ presentation/http/dto/
    catalog.module.ts
  orders/ inventory/ payments/ ...
  shared/http/ shared/security/ shared/observability/
  app.module.ts
```

Ejemplo web:

```text
apps/storefront/ (SSR/SEO, comprador)
apps/seller-center/ (panel seller)
apps/admin-center/ (panel administración)
packages/ui-tokens/ (según packaging y owners reales)
```

## Patrón de comunicación

- REST OpenAPI versionado para acciones/catálogos; SSE para progreso de jobs cuando aporta valor.
- Transacciones locales PostgreSQL para invariantes, `outbox_events` al publicar efectos asíncronos, `inbox/processed_events` por consumidor, `FOR UPDATE SKIP LOCKED` en workers si aplica.
- Retries con backoff/jitter, DLQ o parking table, replay idempotente, correlación, timeouts y circuit breaker acotado.
- Nunca una transacción SQL abierta durante una llamada HTTP a Mercado Pago.
- BFF protege sesión e impide que el SPA almacene credenciales/tokens en localStorage.

## Migraciones y compatibilidad

Expand→backfill→dual-read/write temporal si procede→contract; observar lectores y workers, rollback practicable, contract diff OpenAPI, schemas/event versions. No aplicar DDL en startup de cada réplica.

## Arquitectura de despliegue nivel 1

Al principio uno a tres servidores separados por presupuesto/fallos medidos: Caddy edge público, backend/workers y datos en redes privadas, logs/metrics, backups externos independientes. RKE2/K3s/cluster on-prem solo si ADR técnico demuestra necesidad. Servidores y discos no son HA por simplemente ejecutar Compose en un host.
