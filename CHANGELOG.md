# Changelog — NexaMarket AI Platform

Todos los cambios relevantes de **NexaMarket AI** se documentan en este archivo siguiendo [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Versionado Semántico](https://semver.org/lang/es/).

---

## [0.1.0-beta] - 2026-07-10

### Nuevas Capacidades Principales
- **Tienda Oficial Multi-Vendedor (Storefront):** Catálogo verificado con 111+ publicaciones activas en Tecnología, Moda y Deportes, galería interactiva de imágenes de alta resolución, filtros avanzados por rango de precio/categoría y buscador en tiempo real.
- **Identidad Visual Adaptable (Modo Oscuro & Modo Claro):** Nuevo sistema de marca oficial **NexaMarket AI** con logotipos e iconos vectoriales adaptables automáticamente según el tema elegido por el usuario (`Dark`, `Light` o `Sistema`).
- **Checkout Multi-Vendedor con Mercado Pago Split (`1:1` por Vendedor):** Orquestación segura de órdenes divididas por comercio con conciliación firmada por webhooks HMAC, reservas de inventario en tiempo real sobre PostgreSQL 16 y cero almacenamiento de tarjetas (`PCI-DSS`).
- **Consola Ejecutiva Back-Office (`/admin` & `/dashboard`):**
  - Barra lateral colapsable (`<aside>`) con navegación jerárquica y botón Hamburguesa (`☰`).
  - Gráficos interactivos de ingresos brutos (`GMV`), comisiones `Take-Rate`, estado de pedidos (Donut Chart) y adquisición mensual de compradores y tiendas (Bar Chart).
  - Directorio completo de **Cuentas de Usuario** (`/admin/users`) con fotografías de perfil reales, roles (`ADMIN`, `SELLER`, `BUYER`) y conteo de órdenes.
  - Gobernanza centralizada de apariencia (colores, tipografía, radio de bordes, imágenes de categorías), comisiones versionadas, moderación de catálogo, tickets de soporte, devoluciones y registro inmutable de auditoría.
- **Experiencia de Reseñas Verificadas (`ProductReviews`):** Tarjeta de resumen con puntuación global `4.9★`, histograma interactivo por estrellas, insignias de *Compra Verificada*, variantes adquiridas y contador de utilidad en tiempo real.
- **Asistente Inteligente Nexa AI (`/ai`):** Recomendador conversacional conectado al catálogo público con aislamiento estricto de seguridad (sin acceso a tarjetas ni ejecución de cobros).

### Cómo Descargar e Iniciar `v0.1.0-beta`
```bash
git clone --branch v0.1.0-beta https://github.com/VigilioYonatan/nexamarket-ai-platform.git
cd nexamarket-ai-platform
```
