# Catálogo, búsqueda, SEO, promociones y comunicación

## Catálogo y ranking

Separar `Product` (identidad canónica), `Variant` (configuración) y `SellerListing` (precio, condición, seller, inventario, promociones). Los filtros exactos se calculan sobre atributos validados y vistas públicas autorizadas; ranker no ignora precio máximo, stock o categoría.

### Búsqueda fase 1

- PostgreSQL Full-Text Search, índices adecuados, trigram si aplica, pgvector para embeddings; combinación lexical+semántica con reglas de negocio y re-ranking medible.
- Sinónimos, autocorrección controlada, sugerencias con debounce, filtros técnicos, búsqueda por fabricante/GTIN, paginación stable, relevancia, ranking documentado, protección de términos ofensivos.
- Indexación actualizada por transacciones/outbox, estado de reindex y caída del motor con fallback. Medir `zero-result rate`, latencia p95, CTR con impresiones, precisión y stock-staleness.
- OpenSearch sólo tras evidencia de necesidad. Evitar un vector DB extra sin benchmark de tamaño/latencia.

### Contenido de ficha

Fotos con malware/media scanning, alt text seguro, título sin claims inventados, atributos y procedencia, stock seller, precio/comisiones públicos requeridos, calificación, envío, políticas, preguntas moderadas, similares y comparador.

## Promociones y campañas

`Promotion` con estado, horario y timezone, scope/categoría/listing/seller, presupuesto, mínimos, reglas de stack/exclusión; `CouponRedemption` única/atómica por usuario+campaña. Checkout revalida descuentos, cuotas y precio bajo concurrencia. Precios anteriores/históricos deben atender reglas de transparencia comercial aplicables. Evitar dark patterns.

## SEO e indexación

SSR para páginas públicas de categorías/PDP, metadatos/OG por producto revisado, sitemaps segmentados, canonical para facetas y variantes, robots/noindex en login, carrito, cuenta, admin y URLs privadas, `Product/Offer` structured data solo con valores reales, imágenes opt-in, hreflang si internacionalización. Redirecciones de slugs con 301 autorizadas, evitar duplicaciones, CLS y LCP monitorizados.

## Email y notificaciones

Plantillas versionadas y previsualizables con escapes HTML, variables allowlist y modo light/dark apropiado. Eventos: registro, verificación, aprobación seller, publicación, cambio stock, orden, payment confirmation, envío, entrega, devolución, disputa, cambio de seguridad. Separar transaccionales de marketing (consentimiento, opt-out). SMTP self-hosted o tercero opcional: **entregabilidad real** demanda DNS SPF/DKIM/DMARC, monitoreo, tasas de rebote y seguridad. Un SMS/WhatsApp gateway sería externo opcional, no prometer autosuficiencia.

## Auditoría y privacidad

No enviar PII a proveedores analíticos por defecto. IDs internos pseudónimos, consentimiento por propósito, timestamps, retención y export/borrado; eventos de recomendación (`product_impression`, `product_view`, `cart_add`, `checkout_started`, `purchase_confirmed`) sin tokens/secretos. Protecciones contra scraping excesivo y abuso sin bloquear accesibilidad legítima.

## Test matrix

Search with typo, exact filters, stock 0 exclusion, injection payload, wrong seller state, pagination stable, index delay, expired promotion, double coupon redemption, noindex private, structured data exactness, email template XSS, delivery retry, unsubscribe policy, privacy export.
