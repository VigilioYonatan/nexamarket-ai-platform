# Seller Center, logística, devoluciones, reclamos y operaciones

## Onboarding seller

Solicitud → perfil comercial y contacto → aceptación de términos/versiones → verificación documental/KYB/KYC (reglas locales) → revisión humana → OAuth Mercado Pago → chequeo de políticas y permisos → aprobación/publicación. Seller nunca recibe permisos por autoasignación de `role` en body o Keycloak; el backend los concede al completar workflow.

Seller puede editar nombre comercial, avatar, descripción, datos logísticos y datos de atención dentro de límites; **no edita identidad ni tema global**. Moderación guarda motivo, autor, evidencia y apelación.

## Publicación

1. Elegir producto canónico o solicitar nuevo producto verificado.
2. Variantes/SKU, GTIN opcional, atributos, fotos, condición, política de garantía, precio por minor units, stock, plazo de preparación.
3. Reglas de catálogo (categorías, prohibiciones, mínimos de imagen, licencias de contenidos, atributos obligatorios).
4. Draft → submit → moderation si aplica → published/paused/archived; razones y correcciones auditable.
5. AI Enrichment opcional: sugerencias siempre con fuentes y aprobación humana.

## Logística / envíos

- Dirección entregable validada y zona; carrier(s) operados por adaptadores fuera de infra, o logística propia con tarifas, cobertura, tiempos y evidencia reales.
- Cotización se calcula en checkout y se versiona con seller/order; no prometer fechas ni inventar costos.
- Por seller-order: packaging, peso/volumen, pickup, etiqueta, carrier, tracking, pruebas de entrega y excepciones. Un pedido con sellers distintos puede implicar varios envíos.
- Estados propuestos `READY_TO_FULFILL → PACKING → DISPATCHED → IN_TRANSIT → DELIVERED`, con incidentes `DELIVERY_FAILED/LOST/RETURN_TO_SENDER`; transición autorizada.
- Idempotencia de callbacks de courier; no permitir que seller marque arbitrariamente como entregado sin política/evidencia.

## Postventa

- `ReturnRequest` con RMA por línea, motivo permitido, ventana válida, estado de envío, condiciones y evidencia.
- Aprobación/rechazo motivado según políticas y legislación, auditoría, escalamiento de disputa, seller notificado.
- Reembolso se solicita por flujo autorizado a MP y confirma por PSP; ledger reversal/fees separados y stock solo se reintegra tras inspección real cuando aplica.
- Cancelación: antes de pago liberar reserva; después de pago controlar fase logística y devolución de dinero. Evitar cancelación unilateral fuera de política.
- Chargeback: caso financiero y riesgo con estado, evidencia, plazos, avisos y roles; no sanción irrebatible por IA.

## Comunicación buyer↔seller

- Bandeja mediada por plataforma con permisos por pedido/publicación, rate limits, adjuntos verificados y retención.
- No exponer teléfono/email privado salvo necesidad y consentimiento; bloquear phishing, enlaces maliciosos, pagos externos y contenido prohibido.
- Soporte humano con tickets, asignación, SLA, historial y escalamiento; macros/LLM solo apoyo, decisiones financieras protegidas.

## Seller Analytics

KPIs: impresiones, clics, conversión, ventas cobradas, devoluciones, fulfillment on-time, stockouts, cancelaciones, satisfacción, fees, liquidaciones y saldos según fuente financiera. Reportes seller-scoped; no mostrar datos de competidores o buyer PII innecesaria.

## Pruebas clave

- Seller suspendido no publica ni cobra; seller sin MP conectado no participa en checkout.
- Seller A no lee ni modifica listing, inventario, order, refund o dashboard seller B.
- Tracking con ID inventado no cambia estado sin fuente autorizada.
- Devolución de línea pagada parcialmente respeta límites de captura; idempotencia de reembolso.
- Content moderation respeta apelaciones, revisiones manuales y logs.
