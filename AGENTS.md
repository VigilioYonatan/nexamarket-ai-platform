# Guía de agentes — NexaMarket AI

Primero leer `docs/product-blueprint/SKILL.md` y referencias pertinentes. Aplicar las normas Vigilio de los archivos proporcionados por el propietario si están disponibles; este repositorio conserva una copia del blueprint NexaMarket, no copia íntegra de Vigilio. La base ejecutable manda sobre documentación aspiracional.

## Límites inmutables
- Marketplace único, no Shopify ni editor web por seller. Solo administrador configura branding, diseño y comportamiento global permitido.
- Solo Mercado Pago; 1 pago por vendedor en checkout multi-seller hasta soporte contractual explícito de split 1:N.
- No AWS ni infraestructura cloud administrada. Keycloak, PostgreSQL, Caddy, SeaweedFS, Grafana, Compose self-hosted.
- No guardar tarjetas, contraseñas de PSP, tokens en cliente, ni divulgar secretos en logs.
- No promover a producción sin pruebas de dinero, identidad, permisos, restores, escáneres y gate de seguridad.

## Arquitectura obligatoria
Controladores NestJS delgados; DTO Zod en frontera HTTP; servicios de aplicación; invariantes del dominio; PostgreSQL real como fuente de verdad; consultas parametrizadas; transacciones e idempotencia; guardas de autorización por recursos. Web Preact con Signals; interfaz accesible y responsive, estados vacíos/errores, tema global publicado y preferencias light/dark/auto. IA no tiene permisos de checkout ni datos de tarjeta.

## Ruta de cambios
DISCOVER → READ → SPEC → DESIGN → IMPLEMENT → VERIFY → REVIEW → REPORT. Para cambios de dinero, auth, permisos, infra o datos, crear ADR y casos adversariales. Tests de integración sobre PostgreSQL real, BDD para reglas, E2E para journeys; inspeccionar y corregir, volver a ejecutar. Reportar `PASS | FAIL | BLOCKED | NOT_RUN` con evidencia real. No falsificar cobertura ni resultados.

## Fuentes internas
`docs/product-blueprint/references/architecture.md`, `domain-and-data.md`, `security-identity.md`, `mercado-pago.md`, `testing.md`, `devsecops-production.md`, `traceability.md` y `docs/REQUIREMENTS_MATRIX.csv`.
