# Inventario funcional completo: módulos, roles y ownership

## Convenciones

- Priorización `MVP | V1 | V2`; P0 significa **obligatorio para lanzamiento que involucre esa operación**, no todos los módulos listados.
- Permission codes (`catalog:list`, `orders:read:own`) son propuestas de contrato, no strings ya instalados en Keycloak.
- Autorización real se verifica backend y objetos en DB. Visibilidad de botón frontend no es authZ.

## Matriz de capacidades por rol

| Dominio / permiso | Invitado | Comprador | Seller | Soporte | Finanzas | Moderador | Admin |
|---|---|---|---|---|---|---|---|
| Explorar/buscar productos públicos | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Gestión de carrito/compra | Anónimo opcional | Propio | Como comprador | No en nombre ajeno | No | No | No |
| Leer y editar perfil propio | No | Sí | Sí | Limitado justificado | No | No | Privilegio específico |
| Publicar ofertas/stock/precio | No | No | Solo propio | No | No | Moderar | Supervisar |
| Ver órdenes | No | Propias | Solo seller-orders propios | Casos asignados | Necesidad conciliación | Parcial | Autorización explícita |
| Gestionar reembolsos | No | Solicitar | Solicitar/aceptar según regla | Tramitar | Aprobar bajo límites | No | Según política y doble control |
| Editar diseño GLOBAL / auth branding | No | No | No | No | No | No | Brand/Admin autorizado |
| Configurar secretos MP | No | No | OAuth propia protegida | No | Rol restringido | No | Solo admin restringido |
| Consultar audit logs | No | Propio (eventos seleccionados) | Propio | Limitado | Relevante | Relevante | Auditado |

## Buyer / public storefront (MVP)

- Home: navegación, categorías, mega menú accesible, buscador autocompletar, campañas, promociones, carruseles sin bloquear lectura, zona de recomendaciones con fallback.
- Catalog: categorías anidadas, atributos, breadcrumbs, filtros combinables, precio, stock y ubicación, orden estable, paginación, zero-results, comparador V1, búsqueda por voz/imagen V2.
- PDP: galería optimizada, título verificado, variantes, precio real, disponibilidad, cuotas si MP realmente habilita, vendedor, reputación, políticas, envío estimado, reviews verificadas, preguntas al vendedor moderadas.
- Carrito: anónimo/registrado, fusión al login con conflictos seguros, cantidades, cupones, totales calculados por servidor, eliminación, guardado, costos de entrega por seller, carrito compartido entre dispositivos.
- Checkout: identidad/dirección/contacto, stock, costos/restricciones, resumen comercial, consentimiento, MP, estados pending/paid/failure, recibo y desglose por seller, reintento seguro.
- Cuenta: favoritos, historial, detalle y tracking, cancelaciones válidas, devolución/reembolso, reseñas postcompra, soporte, notificaciones, preferencias, privacidad y eliminación/descarga de datos cuando aplique.

## Identity / auth (MVP)

- Registro/verificación de email, login/password, social Google/Facebook, TOTP/OTP configurado, restablecimiento contraseña, MFA para roles sensibles, WebAuthn/passkeys por fases, recuperación de cuenta, cierre remoto sesiones, cambios email, bloqueo/ratelimit, avisos de riesgo.
- Estado de comprador/seller en una identidad central; creación de seller requiere revisión, no segundo login separado.

## Seller Center (MVP/V1)

- Solicitud seller con KYB/KYC según jurisdicción y MP; aprobación/suspensión y revisión de documentos.
- OAuth Mercado Pago: conectar, ver estado, reautorizar, revocar, token cifrado y rotado.
- Catálogo: match con producto canónico, alta listing, variantes SKU, atributos/evidencia, fotos, precios, disponibilidad, borradores, publicación, pausa, moderación, promociones propias autorizadas, catálogo masivo V1.
- Inventario: cantidades, reservas, movimientos, alertas, fulfillment/backorders según política, import/export seguro V1.
- Órdenes: lista seller-scoped, preparación, envío, incidencias, devoluciones, métricas propias, liquidaciones y comisiones.
- Mensajería compradores-vendedor mediada por plataforma, moderada y sin exposición innecesaria de datos sensibles.

## Admin Center (MVP/V1)

- Dashboard general y salud operativa; branding/tema global; layouts; páginas home; banners; CMS de políticas; auth policy permitida; categorías/atributos; seller onboarding; contenido; reviews; cupones, campañas; comisiones y límites; sellers/users; fraude y moderación; pagos/reconciliación; devoluciones; envíos; feature flags; SEO; plantillas; auditoría; jobs; IA/observabilidad.
- Configuración por permisos (Brand Manager vs Security Admin vs Payments Admin), aprobación dual en cambios de alto riesgo, no un superusuario sin auditoría.

## Comercio y operaciones de plataforma

- Integridad: catálogo canónico `Product`/`Variant` separado de `SellerListing`/`Inventory`, inventario y reservas, snapshots en compra, subpedidos, precios/moneda/tributos exactos, comisiones/ledger, idempotencia.
- Políticas de compras múltiples con seller-specific payment intents, estados parciales y reembolsos.
- Despacho: cotizaciones y promesas **no inventadas**, pickup/entrega según zonas, carriers externos opcionales, etiquetas, tracking, SLA, RMA y reclamos.
- Confianza: reviews verificadas postcompra, moderación, abuso de cupones, duplicados, score de riesgo, apelación, audit trails.
- SEO/marketing: slugs, hreflang/canonical cuando aplique, sitemap, structured data verificable, promociones, referidos V2 y emails con consentimiento.

## IA (fase gradual)

- Enrichment multimodal verificado y revisable, matching/deduplicación, búsqueda híbrida, comparación asistida, shopping agent read-mostly, soporte pedido con authZ, recomendaciones basadas en eventos reales, forecasting, moderación con revisión humana.
- No rankings inventados ni acceso libre SQL; no autosanción/reembolso por output del LLM.

## Reglas transversales

Inclusión WCAG 2.2 AA objetivo donde corresponda, privacidad, antifraude, seguridad de menores donde aplique, i18n/es-PE inicial, moneda PEN con minor units, timezone por contexto, consentimientos, DSAR, device/session audit, reportes, auditoría, exportaciones y políticas de retención.
