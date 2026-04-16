# Contrato de producto y exclusiones

## Visión

NexaMarket AI es un **marketplace centralizado B2C/C2C según política** en que múltiples vendedores ofrecen productos sobre un catálogo único. Inspiración funcional en marketplaces generalistas, identidad propia. Inicialmente electrónica y tecnología; las categorías pueden crecer sin cambios de arquitectura conceptual.

## Actores

- **Invitado:** explorar, buscar, revisar productos y políticas; carrito anónimo opcional y consentido.
- **Comprador:** identidad verificada, compra, favoritos, direcciones, pedidos, reseñas, devoluciones, soporte y privacidad.
- **Solicitante seller:** completar onboarding comercial y conexión Mercado Pago; no vender hasta aprobación.
- **Seller aprobado:** gestionar ofertas, stock, precios, pedidos propios, logística y analíticas autorizadas.
- **Soporte/moderación:** intervenir casos asignados con privilegio mínimo y auditoría.
- **Finanzas/operaciones:** conciliación, comisiones, devoluciones y disputas bajo doble control cuando aplique.
- **Administrador de plataforma:** settings globales, catálogos, vendedores, políticas, permisos, promoción y emergencias; MFA obligatorio.
- **Workers/agentes:** identidades de servicio con scopes explícitos, sin privilegios universales.

## Unidad de marca

- Un solo dominio público principal y **un checkout central**.
- Una sola navegación, buscador global, catálogo, diseño/tema y cuenta de comprador.
- Perfil público del vendedor **dentro** de NexaMarket (`/vendedores/:slug`) como ficha comercial y productos; nunca micrositio con temas propios ni dominio custom de vendedor.
- Solo el Admin/Brand Manager autorizado cambia branding global; seller edita logo/avatar de **perfil de vendedor** si la política lo admite, no el tema global.
- Puede haber configuración por país/idioma/campaña y experimento, pero sin motor white-label multi-tienda.

## Funcionalidades de negocio objetivo

Descubrimiento, catálogo canónico/variantes/ofertas, reseñas confiables, sellers, precios, carrito, cupones, checkout, Mercado Pago, historial, envíos, entregas, facturación conforme a jurisdicción, garantías, devoluciones, cancelaciones, reembolsos, disputas, soporte, moderación, fraudes, campañas, notificaciones, paneles, métricas y IA gradual.

## Restricciones

1. Única pasarela de pago Mercado Pago. Métodos de pago exactamente aquellos habilitados por MP para la cuenta y territorio; no prometer métodos no contratados.
2. Google/Facebook son **proveedores de identidad social** y externos; email, TOTP y passkeys pueden ser gestionados con Keycloak local.
3. No almacenar PAN/CVV, no ejecutar JS arbitrario en plantillas de diseño, no permitir que bots tomen decisiones económicas definitivas.
4. Backend y DB self-hosted; servicios externos necesarios se tratan como adaptadores acotados, con compensaciones y fallbacks.
5. No usar servicios administrados de proveedor cloud. La conectividad a internet, dominios y certificados sí son imprescindibles.
6. Perú como jurisdicción de ejemplo: impuestos, KYC/KYB, privacidad, comprobantes, consumidores y split requieren asesoría/validación legal y contractual antes de producción.

## No-goals explícitos

- Creador tipo Shopify, páginas y dominios independientes por vendedor.
- Marketplace de apps/plugin runtime no confiables.
- Criptomonedas/pasarelas secundarias.
- Autonomía de agentes para cobrar, reembolsar o modificar saldos sin políticas y confirmaciones.
- Clonar recursos/identidad visual registrados de terceros.
- Kubernetes, Kafka, OpenSearch, event sourcing o microservicios **obligatorios** el primer día.

## Criterios de éxito

Comprador descubre y compra; vendedor vende sin acceso a otro vendedor; administrador controla operación y diseño; pagos verificables e inventario correcto ante concurrencia; auditoría y recuperación del sistema; calidad/seguridad evidenciadas por gates.
