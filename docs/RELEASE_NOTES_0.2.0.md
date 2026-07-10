# NexaMarket AI v0.2.0 — código fuente en desarrollo

**Clasificación:** evolución del repositorio de referencia; NO es un release certificado ni habilita cobros con dinero real.

## Cambios implementados desde el ZIP v0.1.0

- Reseñas solo para compras registradas y pagadas, cola de moderación, auditoría y notificación de decisión.
- Casos de confianza con revisión humana, rechazo/suspensión administrativa de vendedores y trazabilidad.
- Tickets y mensajes de soporte con comprobación de propiedad, bandejas buyer/admin y notificaciones internas.
- Flags funcionales con permisos administrativos, histórico básico mediante audit events y componentes UI.
- Devoluciones por subpedido con motivo y operador de decisión persistidos (`0008_return_decisions.sql`); aprobación NO ejecuta reembolso PSP.
- Consola admin para cola de intentos de pago y conciliación bajo control, sin crear cobros nuevos en esa acción.
- Envíos: seguimiento visible en detalle de compra y confirmación de entrega por dueño de pedido; estado global actualizado solo al completar los grupos correspondientes.
- Checkout consume el carrito dentro de la transacción que registra orden y reservas; no borra un carrito si la transacción falla.
- Rechequeo de expiración frente a pagos pendientes y bloqueo de la orden padre antes de reclamar un intento de pago, para serializar pagos/cancelaciones.
- Validación de identificadores de proveedor devueltos por Mercado Pago antes de persistirlos.
- Endpoint de recomendaciones de productos populares y similares basado en reglas SQL; NO es modelo ML entrenado.
- Contratos de rutas generados desde controladores; pruebas unitarias/integración adicionales; configuración de Vitest para variables de prueba sintéticas.

## Alcance verificable

El test de dominio con Node se ejecutó localmente; el servicio Python de IA también. Las pruebas de integración PostgreSQL, Vitest de API/web, BDD Cucumber, Playwright, Docker/Compose, Keycloak, Mercado Pago sandbox y restauración no están certificadas en este entorno. **No declarar completitud ni producción apta por la existencia de archivos.**

## Bloqueadores de producción

Falta un `package-lock.json` reproducible validado contra un registro de paquetes aprobado. No existe conectividad con npm aquí. Falta configurar y verificar IdP Google/Facebook, TOTP real, entrega de correo, credentials MP sandbox, conciliación financiera completa de reembolsos, pasarela multi-vendedor comercial en Perú, facturación, logística externa, controles de privacidad, backups PITR/restore, auditoría WCAG y pruebas integrales bajo cargas/fallos.

## Instrucciones

Consultar `README.md`, `AUDIT_REPORT.md`, `docs/REQUIREMENTS_MATRIX.csv`, `docs/product-blueprint/` y `AGENTS.md`. Las tecnologías backend, frontend y de infraestructura son self-hosted donde es posible; solo Mercado Pago como PSP. No se añade AWS ni se convierte el producto en un sistema de tiendas white-label por vendedor.
