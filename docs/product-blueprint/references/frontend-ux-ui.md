# Frontend, mapa de pantallas, experiencia visual, responsive y accesibilidad

## Experiencia deseada

Marketplace propio con visual premium y confiable: búsqueda prominente, densidad comercial controlada, fichas claras, fotos bien recortadas, navegación de categorías efectiva, información de vendedores y entrega visible, checkout sin fricción. Estética original NexaMarket. Light, dark, auto y alto contraste: **tokens semánticos** por modo, no invertir toda la pantalla con filtro CSS.

## Arquitectura frontend

- Storefront SSR/SEO: Astro+Preact (propuesto, ADR por apartarse del baseline Preact/Vite) o Preact/Vite con solución SSR equivalente. Hidratación de islas para catálogo/carrito.
- Paneles seller/admin: Preact + Vite; rutas protegidas y code splitting. Navegación autoritativa backend; errores de permisos nunca muestran datos por flash.
- `features/<feature>/components`, `hooks`, `services`, `schemas`, `routes` por ownership real; `shared/ui` solo componentes reutilizables con contrato.
- API BFF/cliente central con AbortSignal, normalización de errores, correlation id, validación Zod de salida; TanStack Query como fuente de estado servidor; Signals para interacciones locales si aplica. Evitar caches redundantes en store global.
- Auth por cookie `HttpOnly`, `Secure`, `SameSite` apropiado, defensa CSRF, sesión silenciosa y errores 401; no guardar tokens en localStorage.
- Datos de money no recomputar como autoridad desde frontend; mostrar quote del servidor y revalidación final.
- Imágenes responsive WebP/AVIF y placeholders, lazyload apropiado, SSR metadata, loading skeleton que no salta layout.

## Rutas públicas

| Ruta propuesta | Pantalla | UX y estados |
|---|---|---|
| `/` | Home | campañas, categorías, destacados, skeleton, fallback |
| `/buscar?q=...` | Búsqueda | sugerencias, filtros, vacío, error, debounce |
| `/categorias/:slug` | Categoría | filtros por atributos, breadcrumbs, precio, sort |
| `/producto/:slug` | PDP | galería, variantes, disponibilidad, vendedor, shipping, reviews |
| `/vendedores/:slug` | Perfil seller | datos de vendedor, reputación, listings; **NO tienda independiente** |
| `/ofertas` | Ofertas | precios/snapshot, vigencia, exclusiones |
| `/carrito` | Carrito | anónimo/registrado, stock, cambio cantidad, subtotal real |
| `/checkout` | Checkout | steps, auth, dirección, confirmación, MP |
| `/checkout/resultado` | Estado de intento | visual informativo, NUNCA fuente autoritativa de pago |
| `/ayuda`, `/politicas`, `/privacidad`, `/terminos` | Soporte/legal | contenido versionado, SEO |

## Rutas identidad

`/ingresar`, `/registro`, `/verificar-correo`, `/recuperar`, `/restablecer`, `/mfa`, `/seguridad/sesiones`, `/perfil` (rutas visuales; la interacción real de credenciales sucede bajo flows seguros de Keycloak). Redirecciones a Google/Facebook deben mantener state/nonce; consentimiento de proveedor externo no personalizable.

## Rutas comprador protegido

`/cuenta`, `/cuenta/datos`, `/cuenta/direcciones`, `/cuenta/seguridad`, `/cuenta/favoritos`, `/cuenta/compras`, `/cuenta/compras/:id`, `/cuenta/devoluciones`, `/cuenta/notificaciones`, `/cuenta/privacidad`, `/mensajes`, `/soporte/tickets`.

## Seller Center

`/seller/solicitud`, `/seller/conectar-mercado-pago`, `/seller/dashboard`, `/seller/publicaciones`, `/seller/publicaciones/nueva`, `/seller/publicaciones/:id/editar`, `/seller/inventario`, `/seller/pedidos`, `/seller/pedidos/:id`, `/seller/envios`, `/seller/devoluciones`, `/seller/reputacion`, `/seller/estadisticas`, `/seller/pagos`, `/seller/ajustes-perfil`, `/seller/soporte`.

## Admin Center

`/admin/dashboard`, `/admin/usuarios`, `/admin/vendedores`, `/admin/catalogo`, `/admin/categorias`, `/admin/atributos`, `/admin/publicaciones`, `/admin/moderacion`, `/admin/ordenes`, `/admin/pagos`, `/admin/conciliacion`, `/admin/devoluciones`, `/admin/disputas`, `/admin/envios`, `/admin/promociones`, `/admin/cupones`, `/admin/comisiones`, `/admin/contenidos`, `/admin/notificaciones`, `/admin/analitica`, `/admin/ia`, `/admin/seguridad`, `/admin/roles`, `/admin/auditoria`, `/admin/jobs`, `/admin/settings/{general,branding,theme,navigation,home,auth,checkout,emails,seo,features}`.

## Contrato obligatorio por pantalla

1. Acceso: pública / auth / rol / policy object.
2. Datos: query/response propietarios y de dónde proceden; errores y revalidación.
3. Estados: `loading`, `empty`, `error`, `success`, `stale`, `offline` según riesgo.
4. Input: labels, ayudas, validación cliente/servidor, submit disabled y prevención de doble envío.
5. A11y: foco, navegación teclado, landmarks, announcers, contraste, hit targets, lectores de pantalla, reduced motion.
6. Responsive: 320–1920+ sin horizontal overflow, teclado móvil, touch targets, sticky checkout prudente, safe areas.
7. Seguridad: escapado contenido vendedor, sanitización, anti-clickjacking, CSRF, enlaces externos seguros, protección de PII.
8. Analítica: eventos semánticos con consentimiento y sin PII.
9. Tests: componentes unit/interaction, E2E crítico, screenshot regression ante layout sensible, axe automático + auditoría manual de lectores de pantalla.

## UX por proceso

- **Registro**: errores junto al input, botón social claro, password hints, verificación, avance sin perder contexto, errores de cuenta existente que no filtren datos sensibles.
- **Carrito**: cambios de precio/stock comunicados antes de confirmación; cupón válido/expirado, dirección/envío antes de pagar; no prechecks engañosos.
- **Pago**: indicador de proceso, no mostrar aprobado hasta confirmación verificada, enlace a orden; reintento seguro sin reusar token de tarjeta indebidamente.
- **Seller**: guías de publicación, drafts autosave, feedback de aprobación, estado de OAuth, métricas claras, exportación autorizada.
- **Admin**: filtros y auditoría, confirmación de acciones peligrosas, permisos por área, preview visual seguro.

## Métricas frontend

Medir Core Web Vitals en dispositivo real, errores JS, LCP, INP, CLS, accesibilidad, tiempo de búsqueda, funnel carrito→pago y tasa de errores de checkout. Objetivos concretos se basan en baseline medido, no números inventados. Validar SEO y structured data contra producto real y evitar indexing de rutas privadas.
