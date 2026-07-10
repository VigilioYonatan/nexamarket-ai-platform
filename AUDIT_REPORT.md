# Auditoría de entrega — NexaMarket AI v0.2.0

**Decisión:** ENTREGA PARCIAL / NO APROBADA PARA PRODUCCIÓN.

La revisión se realizó sobre el árbol de fuentes disponible el 9 de noviembre de 2026. Se aplicó el proceso `INVENTARIO → REQUISITOS → INSPECCIÓN → CORRECCIÓN → PRUEBAS DISPONIBLES → EMPAQUETADO → REEXTRACCIÓN`. La etiqueta `PASS` solo describe las comprobaciones ejecutadas, no la totalidad del producto.

## Matriz de alcance

Fuente: `docs/REQUIREMENTS_MATRIX.csv` y `docs/requirements-matrix.md`.

| Métrica | Resultado |
|---|---:|
| Capacidades catalogadas | 47 |
| Código identificado sin integración comprobada | 12 |
| Implementación parcial | 28 |
| Dependencia de configuración externa | 3 |
| No implementadas | 4 |
| Aprobadas E2E en infraestructura real | 0 |

**No implementadas según la matriz:** passkeys/WebAuthn, búsqueda híbrida semántica, cupones/promociones y enriquecimiento de productos con evidencia. Otras funciones parciales incluyen reembolsos financieros reales, conciliación completa, facturación/KYB, operador logístico, email transaccional, IA de forecasting y el pulido de SSR/SEO.

## Pruebas y validaciones EJECUTADAS

| Control | Estado | Evidencia |
|---|---|---|
| `npm run test:domain` / Node `--experimental-test-coverage` | **PASS** | 27 de 27 tests, cinco suites; `packages/domain/src/index.ts`: líneas 100 %, ramas 87,84 %, funciones 100 %. Es la cobertura del dominio puro, NO la de toda la aplicación. |
| `(cd apps/ai && python3 -m pytest -q)` | **PASS** | 5 tests Python. Modelo Ollama real no invocado. |
| `python3 -m compileall -q apps/ai/app` | **PASS** | Compilación sintáctica Python sin fallos. |
| `node scripts/check_typescript_syntax.cjs` | **PASS** | 59 fuentes/tests TypeScript y TSX parseados; 0 errores de sintaxis. No comprueba resolución de tipos/imports externos. |
| `node scripts/generate_contracts.cjs --check` | **PASS** | Índice generado de 95 operaciones HTTP; shape OpenAPI genérico, DTOs no todos generados semánticamente. |
| `python3 scripts/audit_source.py --syntax-only` | **PASS_WITH_WARNINGS** | Archivos obligatorios/imports locales y contratos: sin errores; warning de lockfile ausente. |
| `npm ping --fetch-retries=0 --fetch-timeout=8000` | **BLOCKED** | `EAI_AGAIN` al resolver registry.npmjs.org; sin resolución externa. |

## Pruebas NO ejecutadas / bloqueos

| Control | Estado y causa |
|---|---|
| `npm ci`, `npm run build`, `npm run typecheck` | **BLOCKED** por ausencia de lockfile y dependencias descargadas; no inventar lockfile. |
| Vitest API/web y coverage backend | **NOT_RUN**; definición de suites y configuración, pero dependencias npm no disponibles. |
| Cucumber BDD y Playwright E2E | **NOT_RUN**; servicios/browser/paquetes no levantados. |
| PostgreSQL real (integración y concurrencia) | **NOT_RUN**; no existe servicio de base de datos de pruebas disponible. |
| Keycloak real, Google/Facebook, TOTP, passkeys | **NOT_RUN** / passkeys aún no implementadas; IdP externos necesitan configuración propia. |
| Mercado Pago Checkout API, OAuth, webhooks y refunds reales | **NOT_RUN**; requiere entorno sandbox, credenciales y callbacks HTTPS. Reembolsos PSP NO implementados. |
| Docker Compose/Caddy, Forgejo runners, SAST/SCA/SBOM/firma | **NOT_RUN**; falta entorno Docker/herramientas y lockfile. |
| Restores PITR, failover, carga/SLO, WCAG y aceptación fiscal/legal | **NOT_RUN**; requieren infraestructura y revisión especializada. |

## Correcciones implementadas y revisión de código

- Reseñas verificadas, moderación humana, tickets privados, notificaciones y flags administrables están integrados en rutas y UI. Se agregaron pruebas, pero no se anuncia ejecución de Vitest.
- Checkout elimina el carrito **en la misma transacción** que inserta las reservas. Si la operación falla, la transacción revierte también el borrado.
- Reclamación de intento de pago adquiere lock de la orden padre antes del subpedido; las rutas de cancelación/expiración comparten ese orden, y el expirador revalida intentos ambiguos antes de liberar inventario.
- Mercado Pago: rechazo temprano de ID de pago malformado; la reconciliación administrativa consulta al PSP pero NO repite el cobro.
- Devoluciones guardan resolución y operador en migración `0008_return_decisions.sql`. Aceptarlas no llama al proveedor ni afirma dinero devuelto.
- Seguimiento de envíos y confirmación por dueño de pedido, con agregación del estado padre solo cuando todas las subórdenes están en estado válido. Nuevos tests de aplicación e integración PostgreSQL están escritos, NO ejecutados.
- Eventos postventa y moderación proyectados al inbox interno mediante outbox idempotente.
- Setup de Vitest con variables locales sintéticas; prohíbe test en NODE_ENV=production.

## Hallazgos y riesgos

**P0 de liberación:** npm build reproducible y lockfile ausentes; pagos/identidad sin sandbox ni E2E; backups/restore sin evidencia; funciones financieras y fiscales requeridas no completas. **No habilitar tráfico público con dinero real.**

**P1:** búsqueda híbrida, cupones, passkeys, PDF/OCR con extracción, transportistas y soporte de disputas/chargebacks requieren desarrollo, además de pruebas de integración.

## Evidencia de empaquetado

El ZIP se verificará independientemente luego de crearlo: `zipfile.testzip()`, lista de rutas, extracción a directorio limpio, chequeo de checksum por archivo y repetición de pruebas disponibles desde la copia extraída. Resultado y SHA256 final estarán en el archivo de validación externo junto al ZIP. Este informe no reemplaza pruebas en el servidor objetivo.

## Procedimiento reproducible

1. Copiar `.env.example` a `.env` en un entorno controlado, nunca commitear secretos.
2. Desde un registro de npm aprobado: ejecutar `npm install --package-lock-only --ignore-scripts` y verificar el lockfile, luego `npm ci`.
3. Ejecutar `npm run typecheck`, `npm run build`, `npm run test:domain`, `npm run test:bdd`, `npm run test:unit`, `npm run test:coverage`.
4. Levantar Compose de prueba; aplicar todas las migraciones y ejecutar `npm run test:integration` y `npm run test:e2e`.
5. Verificar OAuth de Keycloak, MFA y Mercado Pago en sandbox; revisar riesgo de múltiples vendedores y reconciliación.
6. Configurar observabilidad, ejecutar scans y test de restauración; documentar SLO/rollback y obtener aprobación independiente antes de producción.
