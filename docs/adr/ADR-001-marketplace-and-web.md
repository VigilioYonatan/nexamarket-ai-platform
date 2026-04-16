# ADR-001 — Un marketplace central, Preact/Vite y DDD pragmático

- Estado: aceptado provisionalmente para este repositorio v0.1.0.
- Contexto: plataforma tipo Mercado Libre, sin clon de marca ni creador de sitios por vendedor. Vigilio establece Preact/Vite como baseline web; la superskill propone Astro SSR en storefront como opción SEO.
- Decisión: una sola SPA Preact/Vite con Signals para Storefront, Seller y Admin, por facilidad de integración y ejecución; backend NestJS con módulos HTTP separados por contexto y servicios con SQL transaccional. Python/FastAPI IA aislada.
- Consecuencia: la SPA no ofrece SSR ni indexación enriquecida por producto. **SSR/SEO avanzado sigue pendiente de un ADR y trabajo de implementación**; no afirmar que está presente.
- Seguridad: Keycloak OIDC BFF, sesión en cookie HttpOnly, CSRF y authorization server-side. La UI no determina permisos.
- Evolución: separar web pública Astro SSR cuando existan necesidades demostradas de indexación; contratos HTTP compatibles.
