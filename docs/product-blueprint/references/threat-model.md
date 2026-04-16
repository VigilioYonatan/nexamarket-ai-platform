# Threat model NexaMarket — STRIDE, abusos y mitigaciones

## Activos prioritarios

Saldo/ledger/pagos MP, tokens OAuth de vendedores, identidad y sesiones, pedidos/direcciones/PII, inventario, configuraciones globales, secretos, capacidad de IA, IP de modelos, logs y archivos subidos.

## Fronteras de confianza

`browser ↔ Caddy/BFF ↔ commerce API ↔ PostgreSQL`; `Keycloak ↔ BFF`; `NestJS ↔ Mercado Pago`; `PSP webhook ↔ inbox`; `seller uploads ↔ media pipeline`; `catalog content ↔ LLM tools`; `admin settings ↔ theme renderer`. Cada frontera requiere validación, autenticación o verificación de integridad contextual.

## Amenazas específicas y controles

| ID | Amenaza | Control de diseño | Test negativo |
|---|---|---|---|
| T-01 | Buyer B accede orden A (BOLA/IDOR) | SQL owner filter + policy servidor | ID ajeno devuelve respuesta anti-enumeración y 0 filas |
| T-02 | Seller B cambia precio/stock seller A | seller ownership en transacción | PATCH por ID ajeno sin writes |
| T-03 | User manipula precio/cupón en browser | quote desde DB y snapshot server-side | body amount inventado ignorado/rechazado |
| T-04 | Doble click, replay PSP | idempotency unique + PSP idempotency | 1 pago, 1 ledger |
| T-05 | Webhook falso o duplicado | HMAC/timestamp/dedup + fetch PSP | invalid signature 401; duplicate no changes |
| T-06 | Race última unidad | update atómico/CAS + check | 1 reserva para stock 1 |
| T-07 | Social login account takeover | state/nonce/issuer/audience, linking verificado | mismatch identity blocked |
| T-08 | OTP brute force o reuse | intents/TTL/attempt limits/recovery | reuse/expired rejected |
| T-09 | Session fixation/CSRF | BFF cookies, rotation, CSRF | cross-site mutation blocked |
| T-10 | Password/token filtrado | Keycloak, secrets vault, redacted logs | scans/snapshot redactados |
| T-11 | SVG/media XSS | MIME sniffing, sanitization, object isolation, CSP | SVG payload not executed |
| T-12 | Seller inyecta prompt en catálogo | untrusted data/tool allowlist + authZ | LLM no usa instrucciones del anuncio |
| T-13 | Admin modifica brand para suplantar checkout | allowlist tokens + audit + optional approval | HTML/JS/CSS injection blocked |
| T-14 | Exfiltración por AI copilot | bounded SQL views, seller filter, data classification | seller B metrics denied |
| T-15 | Refund malicioso/chargeback fraud | step-up + 4-eyes + refund limits | exceeded amount rejected |
| T-16 | SSRF por imagen/URL producto | URLs allowlist, downloader aislado, egress policy | localhost/metadata IP denied |
| T-17 | Dependencia o imagen comprometida | lock SHA, SBOM/CVE, signature verify, restricted runners | unsigned image deployment blocked |
| T-18 | Ransomware/error humano | backups offsite + PITR restore drill | full restore timed |
| T-19 | DoS búsqueda/IA y costos | rate quotas by account/IP, budget, timeout, caching | high load degrades gracefully |
| T-20 | Exposición por endpoints internos | private networks/mTLS if needed/firewall | metrics/admin DB not public |

## Seguridad por capas

- Edge: TLS, CSP/HSTS acorde entorno, size limits, origin rules, protections de brute-force, WAF opcional por evaluación, no confundir CORS con auth.
- API: authN, object-level authZ, Zod, no mass assignment, límites de payload, idempotency, CSRF, security headers, problemas HTTP seguros, auditoría.
- Data: least privilege DB, FK/constraints, backups cifrados, secrets rotation, WAL protegido, SQL parameterized.
- Admin: RBAC especializado, MFA, re-auth, 4-eyes financiero, registros inmutables, sesiones cortas, no permisos superuser a operarios.
- IA: dataset provenance, ACL retrieval, tools restrictivas, rate/cost budget, prompt injection red-teaming.
- Infra: rootless/non-root, read-only, cap-drop, network isolation, signed digest verified, scanning continuo, patch cadence, SSH restringido.

## Compliance y jurisdicción (pendiente de validación legal)

Privacidad/consentimiento y derechos del titular de datos, política de cookies, términos de seller/buyer, protección de consumidor, tributación y comprobantes en Perú, requisitos de Mercado Pago/KYB, PCI según método de integración, políticas de productos prohibidos, incident response y retención. **No declarar cumplimiento legal/PCI certificado por haber añadido controles técnicos.**

## Threat modeling por feature

Preguntar: actor, confianza de input, ownership, data sensitivity, flujo de dinero, concurrency, side effects, external callbacks, abuse cases, rollback. Para cambio P0 (auth/pago/stock/refund) actualizar tabla de amenazas + pruebas antes de aprobar.
