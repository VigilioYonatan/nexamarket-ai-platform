# Test Strategy Senior — unit, integration, contract, BDD, E2E, security, load

## Canónico Vigilio

Respetar `standards/testing/{strategy,contract-and-bdd,e2e-quality-gates,environment-preflight-and-e2e,semantic-ddd-contract-gates}.md`, `node-nest-testing` y `web-mfe-testing`. **56 controles E2E de la matriz son controles adaptables, NO 56 tests obligatorios separados**. Reportar `PASS | FAIL | BLOCKED | NOT_RUN`. BDD describe reglas de negocio; E2E valida un recorrido observable, no duplicar cada regla en todas las capas.

## Pirámide/matriz por capa

| Capa | Herramientas sugeridas | Verificación |
|---|---|---|
| Typecheck/static | TypeScript, Biome/ESLint, Zod schema lint | tipado, imports/cycles, calidad |
| Unit domain | Vitest | invariantes, redondeo, transitions, policies puras |
| Integration adapters | Vitest + PostgreSQL/Valkey reales en contenedores aislados | FK, unique, locking, reservations, migrations, cache |
| Contract API | OpenAPI + cliente browser-safe, schema diff | request/response/status/auth/errors, backward compatibility |
| BDD negocio | Cucumber/Gherkin + steps integrados | Given/When/Then conducta: stock, pagos, login, refunds |
| E2E API | Playwright API / supertest según consumidor | authZ real, HTTP, error, session, jobs |
| E2E navegador | Playwright Chromium/Firefox/WebKit y móvil | login, catálogo, carrito, checkout, seller, admin |
| Accesibilidad | axe-core + manual keyboard/screen reader | WCAG 2.2 AA objetivo |
| Visual regression | Playwright screenshots revisados | light/dark, 320/768/desktop, login/checkouts |
| Seguridad | Semgrep/Gitleaks/Trivy/ZAP + tests negativos | SAST/SCA/DAST, BOLA, CSRF, XSS, SSRF |
| Rendimiento | k6 o herramienta equivalente | carga, latencia/error rate, DB saturation |
| Resiliencia/DR | fault injection + restore drills | MP timeout, worker crash, PG restore, WAL PITR |
| IA | datasets offline + eval runner + adversarial | permission leak, prompt injection, factuality |

## Antes de E2E

1. Validar dependencias instaladas y lockfile; levantar **PostgreSQL real**, Valkey, Keycloak test y stub confiable de MP para determinismo; aislar bases por run, seed limpio/fixtures, reset sin compartir mutable state.
2. Preflight SQL **autenticado** con `PGDATABASE` y migraciones comprobadas; `pg_isready` solo verifica escucha, no SQL, schema ni datos. Si falta servicio `BLOCKED`, no `PASS`.
3. Probar contra MP **sandbox real** en suite separada con credenciales de prueba; no hacer que PR dependa de proveedor externo inestable. Webhooks firmados simulados son integración local, **no** certificación de sandbox.
4. Ejecutar tests, contar casos realmente descubiertos, guardar versiones/comandos/reportes. `skipped` ≠ `PASS`; no permitir tests vacíos.
5. Capturar trazas y screenshots **redactados**; no almacenar tokens/PAN/PII. Flakiness target orientativo Vigilio <0.5% semanal, cuarentena con owner/ticket y expiración.

## Casos bloqueantes por dominio

### Identidad

- Registro válido/inválido, email duplicado sin enumerar, verificación expirada, inicio sesión, recuperación; rate limiting.
- Google/Facebook: success, user declines, state mismatch, token wrong issuer/audience, missing email, account linking takeover.
- OTP/TOTP: válido, inválido, expirado, intentos límite, reuse, recovery; MFA exigida a administrador; revocación de sesión, CSRF/cookies.

### Buyer/catalog

- Búsqueda por texto/filtro, agotado, seller suspendido, resultados cero, orden/paginación estables, PDP accesible, variantes, imágenes inválidas.
- Carrito anónimo/identificado, merge, doble click, promo inválida, stock actualizado, diferencia de precios, shipping calculation.

### Dinero y stock (NO negociables)

- Última unidad 2 compradores concurrentes → uno reserva; stock nunca negativo.
- Checkout retries con mismo `Idempotency-Key` → mismo checkout/reservas.
- Pago MP `approved|pending|rejected|expired` y reintento sin doble cargo; callback browser falso no mueve dinero.
- Webhook firma inválida, replay, duplicado, reordenado, pérdida/delay; reconciliación usa PSP + idempotencia.
- Dos sellers A/B: cobro 1:1 por seller, estado parcial real, una orden central y dos seller-orders.
- Reembolso parcial + doble reembolso → total reembolsado ≤ total cobrado y ledger balanceado.
- Chargeback, seller OAuth expired y PSP outage → cola y estados coherentes.

### Seller/admin/settings

- Seller A no consulta/edita listings, stock, órdenes o métricas B. Product ID enumerado no filtra datos sensibles.
- Seller suspendido sin venta; aprobación y rechazo auditados; catálogo publicado con permisos.
- Cambio de tema global: draft, preview, validación contrast, publish, rollback y Keycloak theme sync (según mecanismo implementado).
- Editor/Brand Manager sin permiso de seguridad no puede desactivar MFA ni cambiar token de MP.
- Theme XSS por SVG/CSS/HTML rechazado, cambios no afectan formulario seguro del PSP.

### IA y resiliencia

- Prompt injection en título/descripcion: herramientas no expuestas, no pagos; seller B no ve datos seller A en RAG.
- Agente vs stock incorrecto o inventado; fallback sin IA, budgets y kill switch.
- Worker muere después de invocar PSP y antes de persistir → recuperación de estado sin doble cobro.
- Restore DB en servidor aislado y servicio básico operativo; tiempos registrados.

## Cucumber BDD: cuándo, dónde y cómo

`tests/bdd/*.feature` describe **lenguaje de negocio**, no detalles de CSS o SQL; steps llaman application/adapters o HTTP según nivel, fixtures idempotentes; ejemplos en `/examples/*.feature`. Aserciones: operación y efectos DB/outbox/ledger/stock. Cada escenario tiene dueño/caso de uso y ticket; la suite BDD debe fallar ante una implementación intencionalmente incorrecta.

## Matriz de trazabilidad P0

| Caso | Unit | Integration | Contract | BDD | E2E API | Browser | Security |
|---|---:|---:|---:|---:|---:|---:|---:|
| Login social/MFA | Sí | IdP test | Sí | Sí | Sí | Sí | Sí |
| Publicar listing | Sí | PG+storage | Sí | Según complejidad | Sí | Sí | Sí |
| Reservar última unidad | Sí | PG race | Sí | Sí | Sí | Checkout | Sí |
| Cobrar seller MP | Sí | DB+MP mock | Sí | Sí | Sí + sandbox por release | Sí | Sí |
| Conciliar y refund | Sí | PG+ledger | Sí | Sí | Sí | Admin | Sí |
| Publicar tema | Sí | PG/cache | Sí | Sí | Sí | Visual | Sí |
| Seller ownership | Sí | PG | Sí | Sí | Sí | Seller | Sí |
| AI tool policy | Sí | tools | Sí | adversarial | Sí | AI smoke | Sí |

## Comandos de consumidor (NOMBRES OBJETIVO, NO ejecutables aquí)

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:bdd
pnpm test:e2e:api
pnpm test:e2e:web
pnpm openapi:diff
pnpm test:accessibility
pnpm test:load
# controles de plataforma: trivy/syft/cosign/restore drill, definidos por pipeline consumidor
```

La skill **no impone** esos scripts si el consumidor usa otros; inspeccionar `package.json`, probar discovery y no fabricar salida.

## Baseline orientativo y decisión de calidad

Vigilio `node-nest-testing` sugiere 85% lines/statements/functions y 80% branches, **si el consumidor los adopta**; cobertura no sustituye invariantes ni mutación. 100% nominal con test inválido no aprueba dinero. Release P0 fail-closed ante fallas de auth, money, stock, privacy o migration; visual diff requiere revisión, no aprobación ciega.
