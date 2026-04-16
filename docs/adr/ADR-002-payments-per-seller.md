# ADR-002 — Único PSP Mercado Pago y pagos separados por vendedor

- Estado: aceptado para v0.1.0, condicionado a validación contractual/sandbox del PSP.
- Problema: Mercado Pago documenta split 1:1 de marketplace; split 1:N no debe asumirse disponible para Perú sin habilitación.
- Decisión: un carrito global crea un pedido padre y un subpedido por seller. Cada subpedido se cobra por separado a la cuenta conectada por OAuth del vendedor.
- Invariantes: merchant token cifrado en PostgreSQL; tarjeta se tokeniza por Brick; servidor guarda solo token efímero al enviar pago (nunca logs, BD ni respuestas); la UI no confirma pagos; webhook firmado y consulta API del PSP; deduplicación por intento+evento; ledger balanceado; stock reservado atómicamente.
- Tradeoff: el usuario completa varios pagos. Manejar estados `PARTIALLY_PAID` y pedidos no pagados expirados. La plataforma aún NO implementa una saga completa de compensación/reembolso automatizado por fallos múltiples.
- Gates: credenciales sandbox, pagos aprobados/rechazados/pendientes, conciliación, chargebacks, reembolso, verificación monto/owner, autenticación seller, operativa legal/comercial en Perú.
