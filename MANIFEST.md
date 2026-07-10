# Manifiesto de entrega — NexaMarket AI v0.2.0

Producto: marketplace único NexaMarket, no constructor de tiendas. **Solo Mercado Pago**, infraestructura self-hosted, sin AWS.

## Árbol propietario

| Carpeta/archivo | Contenido real |
|---|---|
| `apps/web/` | Storefront, login y registro, cuenta comprador, catálogo, checkout, vendedor, administrador, postventa y dark/light/auto (Preact). |
| `apps/api/` | NestJS controladores, servicios, guards, DTO Zod, PostgreSQL, migraciones 0001–0008, worker/outbox y pruebas. |
| `packages/domain/` | Reglas puras de stock, pagos, ledger, GTIN, moderación y tema; tests Node. |
| `apps/ai/` | FastAPI, gateway acotado a Ollama local y tests Python. |
| `compose/` | Compose de desarrollo, release y pruebas PostgreSQL aisladas. |
| `infra/` | Keycloak, Caddy, Dockerfiles, Postgres init, observabilidad y configuración de entrega. |
| `ops/` | Scripts de preflight, arranque, smoke, backup/restore y operaciones. |
| `.forgejo/workflows/` | CI y release con runners self-hosted y gates de supply-chain. |
| `tests/` | BDD Gherkin, pasos, navegador Playwright, carga k6. |
| `contracts/` | Índice de 95 rutas NestJS y especificación OpenAPI genérica de rutas. |
| `docs/product-blueprint/` | Superskill y fuentes del producto; docs Vigilio externas no se copian completas. |
| `docs/REQUIREMENTS_MATRIX.csv` | Matriz de 47 capacidades y estado comprobable. |
| `README.md`, `AGENTS.md`, `AUDIT_REPORT.md` | Instalación, normas del agente, hallazgos y limitaciones. |

## Exclusiones intencionales

No se envían `node_modules`, imágenes Docker, archivos `.env` secretos, tokens OAuth, datos reales, `.pytest_cache`, `__pycache__`, `coverage`, logs, `dist` ni bases de datos. Deben regenerarse en el entorno de destino según la documentación.

**Punto de bloqueo explícito:** el paquete **no trae `package-lock.json`** porque no se pudo contactar al registro npm. `npm ci` en producción seguirá bloqueado; generar y revisar lockfile antes de construir imágenes.

## Condición de auditoría

Revisar `AUDIT_REPORT.md` para saber qué pruebas pasaron. La integridad del ZIP no es evidencia de ejecución end-to-end ni de conformidad para producción.
