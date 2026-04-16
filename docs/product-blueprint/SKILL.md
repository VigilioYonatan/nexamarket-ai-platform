---
name: nexamarket-marketplace-senior
description: >-
  Superskill de diseño, implementación, revisión y entrega de NexaMarket AI: marketplace
  único de múltiples vendedores estilo Mercado Libre (no Shopify), con storefront,
  autenticación Keycloak/Google/Facebook/OTP, carrito, Mercado Pago exclusivamente,
  administración global personalizable, IA local, NestJS/Preact, contratos, BDD,
  E2E, DevSecOps y producción self-hosted sin proveedores de nube administrados.
owner: nexamarket-engineering
lifecycle: proposed
introduced_in: 0.1.0
routing_ecosystems: "node, nestjs, typescript, preact, python, self-hosted"
routing_keywords: "nexamarket, marketplace, comercio, mercado pago, sellers, checkout, carrito, login, register, otp, dark mode, themes, devsecops, bdd, e2e, self-hosted"
routing_files: "package.json, pnpm-lock.yaml, compose/compose.yaml, Caddyfile, AGENTS.md"
routing_capabilities: "product-spec, solution-architecture, multi-seller-commerce, security, end-to-end-quality, delivery"
requires: [vigilio-auto-senior]
optional: [node-nest-build-feature, node-nest-testing, web-mfe-testing, ui-design-system, platform-compose-vps-delivery, ai-rag-llmops-finops]
conflicts: []
supersedes: []
---

# NexaMarket AI — Superskill Senior/Staff para marketplace self-hosted

> **Estado:** especificación y guía de ejecución, NO software desplegado. Artefacto construido a partir de los ZIP `skills(6).zip`, `vigilio-docs(5).zip` y el brief NexaMarket. No afirmar tests de producto ni infra en `PASS` sin ejecutarlos en el repositorio consumidor.

## 0. Producto y restricciones inmutables

- **Marketplace central único**: compradores y vendedores operan dentro del **mismo sitio, misma marca, mismo checkout, catálogo compartido y cuentas centralizadas**. NO Shopify/SaaS de creación de tiendas; NO tiendas independientes personalizables por seller.
- **Un administrador central** gobierna marca, logo, fuentes, colores, light/dark/auto, login/register visual, home, cards, header, footer, emails, flags y reglas comerciales configurables (según permisos). Seller solo configura su perfil y publicaciones.
- **Única pasarela financiera: Mercado Pago**. No implementar proveedores alternativos. Las tarjetas nunca se almacenan en NexaMarket; usar componentes seguros del PSP. Merchant OAuth protegido.
- **100% self-hosted donde se pueda**: infraestructura, código, datos, logs, base de datos, inferencia IA, colas, secretos, CI runners y observabilidad; **excepciones externas inevitables**: Mercado Pago, Google/Facebook federados, correo/SMS y operadores de envío si se eligen. No introducir infraestructura de nube administrada.
- **Licencias**: verificar licencias de código, plugins y pesos de cada modelo en la versión instalada; no inferir “open source” del hecho de poder autohospedar.
- **Calidad**: reglas Vigilio, OpenSpec/ADR por riesgo, DDD pragmático, tokens semánticos, no inventar implementación ni controles que no corrieron.
- **No copiar identidad, logotipos, código, assets ni UX protegida de Mercado Libre**; replicar capacidades del modelo comercial con identidad NexaMarket original.

## 1. Política de autoridad y fuentes

1. Inspeccionar repositorio consumidor (`AGENTS.md`, código, tests, lockfile, OpenSpec, CI y configuración) antes de modificar; la realidad ejecutable prevalece sobre propuestas.
2. `vigilio-auto-senior` y sus referencias `routing`, `decisions`, `evidence-review`, `preflight` gobiernan el enrutamiento y la evidencia; usar `vigilio-architecture-guide` para ownership.
3. `vigilio-docs` `foundations/` y `standards/` son normas canónicas; `stacks/` las implementan; `technology/versions.md` informa baseline **documental**, no reemplaza lockfile del consumidor.
4. Leer **completos** los archivos de `references/` pertinentes a la tarea. Para alta sensibilidad leer siempre `architecture.md`, `domain-and-data.md`, `security-identity.md`, `mercado-pago.md`, `testing.md`, `devsecops-production.md` y `traceability.md`, más fuentes Vigilio apuntadas en `references/source-map.md`.
5. No invocar skills cloud específicas aunque existan en el inventario Vigilio. Ruta de entrega: `platform-compose-vps-delivery` y, bajo ADR, on-prem Kubernetes.
6. Si hay conflicto entre este blueprint y la política Vigilio/código ejecutable, identificarlo y proponer ADR/compatibilidad; no sobrescribir normas silenciosamente.

## 2. Índice operativo de referencias

| Solicitud / subsistema | Referencia obligatoria |
|---|---|
| Alcance y módulos | [product-scope.md](references/product-scope.md), [features-and-roles.md](references/features-and-roles.md) |
| Páginas y UX/UI | [frontend-ux-ui.md](references/frontend-ux-ui.md), [design-settings.md](references/design-settings.md) |
| Login/register, social, OTP | [security-identity.md](references/security-identity.md) |
| Arquitectura y repositorios | [architecture.md](references/architecture.md) |
| Modelado, integridad, SQL | [domain-and-data.md](references/domain-and-data.md) |
| Controllers, DTOs, APIs | [backend-api-contracts.md](references/backend-api-contracts.md) |
| Carrito, stock, órdenes | [orders-inventory-checkout.md](references/orders-inventory-checkout.md) |
| Mercado Pago único | [mercado-pago.md](references/mercado-pago.md) |
| Vendedores, envío, devoluciones | [seller-logistics-ops.md](references/seller-logistics-ops.md) |
| Notificaciones, búsqueda, SEO | [catalog-search-notifications.md](references/catalog-search-notifications.md) |
| AI/ML/agents locales | [ai-platform.md](references/ai-platform.md) |
| Calidad, unit, BDD, E2E | [testing.md](references/testing.md), [test-inventory.md](references/test-inventory.md) |
| Amenazas y privacidad | [threat-model.md](references/threat-model.md) |
| CI/CD, supply chain, despliegue y DR | [devsecops-production.md](references/devsecops-production.md) |
| Observabilidad, SLO y soporte | [operations-sre.md](references/operations-sre.md) |
| Roadmap, milestones, DoD | [roadmap-acceptance.md](references/roadmap-acceptance.md) |
| Matriz Vigilio y fuentes verificadas | [source-map.md](references/source-map.md), [traceability.md](references/traceability.md) |
| Límites, riesgos, ADRs abiertos | [decisions-open.md](references/decisions-open.md) |

## 3. Protocolo de ejecución al recibir cualquier tarea

**DISCOVER → READ → SPEC → DESIGN → PLAN → IMPLEMENT → VERIFY → REVIEW → REPORT**.

1. **DISCOVER:** identificar intención (`question | architecture | feature | bug | refactor | test | security | release`), actor, módulo propietario, producto afectado, estado del repositorio y archivos impactados. No afirmar carga de skills por solo enumerarlas.
2. **READ:** leer SKILL.md y refs de skills Vigilio aplicables: NestJS (build-feature/security/persistence/testing), Web (web-mfe-*/ui-*/ux-*), backend payments, LLMOps, supply chain, CI/CD, Compose, observabilidad. Registrar rutas leídas.
3. **SPEC:** formular casos de uso por intención, actores, permisos, invariantes, estados, precondiciones, errores, criterios BDD, datos, pagos, eventos y riesgos. OpenSpec para cambios significativos.
4. **DESIGN:** ADR si afecta dinero, autorización, integridad, autenticación social, infraestructura, data migration o compatibilidad externa. Trazar API→UI→SQL→tests→observabilidad.
5. **PLAN:** entregar plan por slices verticales y dependencias reales; PRs pequeños, migración expand-contract, capacidad de rollback, owners.
6. **IMPLEMENT:** controller delgado → application service con nombres de negocio → domain invariants → ports → adaptador Drizzle; Zod en HTTP, proyección allowlist, OpenAPI; web con services + TanStack Query y componentes semánticos. Reutilizar módulos existentes.
7. **VERIFY:** ejecutar preflight real, unit, integration PostgreSQL real, BDD, E2E API/browser, contrato, authZ, concurrencia, scans, pruebas de MP sandbox cuando aplica. Preflight nunca equivale a E2E.
8. **REVIEW:** revisión independiente de solo lectura; corregir hallazgos en fase FIX y revisar otra vez; nunca autoproclamar revisión que no ocurrió.
9. **REPORT:** changed_files, skill_loaded, sources_read, contratos, riesgos, pruebas con `PASS|FAIL|BLOCKED|NOT_RUN`, comandos y artefactos, rollback, nota/criterio de completitud. Sin evidencia → `NOT_RUN`.

## 4. Definición de terminado (gates)

Una feature es **DONE** solo con: aceptación validada; authN/authZ, BOLA/IDOR; Zod + OpenAPI diff; invariantes en dominio y DB; unit/integration; BDD para reglas significativas; E2E para ruta crítica; accesibilidad/UX y errores; observabilidad; impacto en consumidores; threat model proporcional; release/rollback cuando aplica. Ningún gate se aprueba por intención documental.

**Gates no negociables:** no sobreventa; no cobros/reembolsos duplicados; sin cross-seller; no confiar en callback del navegador como verdad de pago; no secretos en cliente/logs; seguridad del flujo Keycloak/OAuth; tema global accesible sin ejecutar código no confiable; backups/restore verificables para producción.

## 5. Artefactos al diseñar una capacidad

Crear, según riesgo, OpenSpec + ADR + ficha de caso de uso + contrato DTO/OpenAPI + migración + tests + tablero de evaluación/observabilidad + runbook. No producir 10 archivos vacíos para un CRUD trivial. En ausencia de repositorio, entregar **plan y contrato ejemplo**, no fingir software ejecutable.

## 6. Matrices de uso rápido

- **Login/registro/social/OTP:** `security-identity.md` + `frontend-ux-ui.md` + `testing.md` + skills `node-nest-security`, `web-mfe-testing`.
- **Producto/publicación:** `domain-and-data.md` + `catalog-search-notifications.md` + `backend-api-contracts.md`.
- **Carrito/checkout/pago:** `orders-inventory-checkout.md` + `mercado-pago.md` + `threat-model.md` + BDD/E2E de dinero.
- **Settings/dark mode:** `design-settings.md` + `frontend-ux-ui.md` + `ui-design-system`, visual regression.
- **Release:** `devsecops-production.md` + `operations-sre.md` + `platform-compose-vps-delivery`, `platform-validation-evidence`.

## 7. Regla de evidencia honesta

Este paquete es una **superskill de producto/arquitectura**: su existencia no despliega Keycloak, Mercado Pago, NestJS, ni ejecuta tests. Si no existe código consumidor, declarar `PRODUCT_TESTS: NOT_RUN`, `DEPLOY: NOT_RUN`, `MERCADO_PAGO_SANDBOX: NOT_RUN`.
