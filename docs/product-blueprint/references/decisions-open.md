# Registro de decisiones ADR, riesgos y dependencias bloqueantes

## Decisiones confirmadas por el solicitante

- Una sola web / marca marketplace; sellers independientes comercialmente, **no** website builder por seller.
- Apariencia central (login, register, home, tema, header, checkout surrounding UI) personalizable desde Admin Settings.
- Google/Facebook social login, OTP/MFA, carrito, buyer/seller/admin, visual light/dark.
- Solo Mercado Pago como pasarela; infra de aplicación self-hosted open source; no cloud administrado.
- Reutilizar Vigilio Docs/Skills, DDD pragmático, DevSecOps, BDD/E2E hasta producción.

## ADRs propuestos (algunos aún pendientes)

| ADR | Decisión / opción propuesta | Estado y condición |
|---|---|---|
| ADR-001 | Monolito modular NestJS + AI FastAPI | PROPOSED; revisar repo y carga |
| ADR-002 | Storefront SSR Astro+Preact | PROPOSED; benchmark vs baseline Preact/Vite Vigilio |
| ADR-003 | Keycloak + BFF cookie/session + CSRF | PROPOSED; impl OIDC, email/social MFA |
| ADR-004 | Seller Mercado Pago OAuth + split 1:1 | PROPOSED; **bloquea producción** validar contrato Perú |
| ADR-005 | Multi-seller checkout con pasos de pago por seller | PROPOSED; resolver UX/negocio y validación comercial MP |
| ADR-006 | PostgreSQL único + outbox + pgvector inicial | PROPOSED; escalar por SLO |
| ADR-007 | Inventory transactional reservation + TTL | PROPOSED; definir expiry, pago tardío |
| ADR-008 | Ledger doble entrada y refund workflows | PROPOSED; política contable/fiscal validada |
| ADR-009 | Theme global versionado + Keycloak adapter | PROPOSED; definir publishing/redeploy constraints |
| ADR-010 | Compose/Caddy + pgBackRest nivel 1 | PROPOSED; RPO/RTO y dominios de fallo definidos |
| ADR-011 | IA opcional local, tool-scoped | PROPOSED; evaluar licencia de modelo/hardware |
| ADR-012 | Shipping providers/op propia | OPEN: región, tarifas, cobertura, SLA |
| ADR-013 | Facturación tributaria y seller-of-record | OPEN: asesoría fiscal/jurídica |
| ADR-014 | Mensajería buyer-seller + trust policies | OPEN: privacidad, moderación y uso indebido |
| ADR-015 | OTP email/SMS adicional a TOTP | OPEN: proveedor, costos y amenazas |

## Riesgos bloqueantes por fase

- **MP checkout 1:N** no disponible universalmente: no prometer checkout único financiero para muchos sellers. Confirmar acceso comercial o adoptar cobros individualizados claramente informados.
- **Model merchant-of-record y facturación**: no inferir responsabilidades fiscales; adecuar términos y conciliación antes de aceptar dinero real.
- **Autenticación social** depende de apps/credenciales/validación de plataformas externas; no certificar antes de provisionarlas.
- **OTP por SMS/email** depende de canal externo/infra antiabuso; TOTP local no equivale a SMS.
- **Alta disponibilidad** no existe por tener dos contenedores en el mismo host; definir RTO/RPO, host/sitio real y restore drills.
- **Modelos IA** pueden tener licencias no-open-source; revisar cada peso y datasets antes de uso comercial.
- **Frontend Astro** es extensión propuesta, no baseline ya adoptado por Vigilio; ADR antes de convertirlo en norma.

## Política de decisiones

No bloquear la construcción del catálogo/auth por decisiones no relevantes al slice. **Sí** bloquear release de dinero real o IAM social productivo si faltan condiciones contractuales/operativas. En reporte separar decisión `OPEN` de componente `BLOCKED` y tarea no ejecutada `NOT_RUN`.
