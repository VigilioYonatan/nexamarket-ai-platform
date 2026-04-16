# SRE, observabilidad, FinOps on-prem e incident response

## Trazabilidad

Propagar `trace_id`, `request_id/correlation_id`, `checkout_id`, `seller_order_id` (pseudónimos) desde BFF a NestJS, worker y MP reconciler; **jamás** PAN/CVV, OAuth secrets, contraseñas, tokens, PII sin necesidad. Estandarizar logs Pino JSON con redaction y retención; OTel spans sin payload sensibles; Prometheus métricas de baja cardinalidad.

## SLIs y SLO candidatos (negociar baselines medidos)

| Área | SLI a instrumentar | Señal de alerta |
|---|---|---|
| Storefront | disponibilidad, LCP/INP/CLS, tasa 5xx, SSR p95 | caída UX/regresión release |
| Auth | login success/error por proveedor, OTP retries, IdP latency | bloqueo masivo / abuso |
| Catalog/Search | p95 queries, zero-result rate, index lag | relevancia/latencia |
| Inventory | over-reservation count (siempre 0), reservation expiry lag | inconsistencia |
| Checkout | tasa errores negocio vs PSP, idempotent duplicate count | fallos cobro/compra |
| Payments | PSP confirmation lag, mismatch monetary, webhook backlog, orphan payment | reconciliación rota |
| Orders | state transition failure, stuck seller-orders | errores de fulfillment |
| Ledger | daily imbalance count (0), unmatched PSP operations | discrepancia económica |
| Keycloak | availability, callback errors, auth DB | login caído |
| Backups | last success, WAL freshness, restore drill RTO/RPO | pérdida resiliencia |
| AI | p95, task success, hallucination, cross-seller attempts, token/GPU cost | fuga/deriva |

El objetivo de `0` doble cobro y no sobreventa es un **invariante de corrección**, no garantía estadística. SLO de disponibilidad/latencia requieren presupuesto y medición; no declarar valores arbitrarios como resultados.

## Tableros y alertas

Dashboard ejecutivo (conversion, GMV, ventas cobradas verificadas), seller (solo propios), seguridad (auth abuse/BOLA), dinero (MP reconciliation, intents, refunds, chargebacks), operaciones (inventory/shipments/returns), infraestructura (PG WAL disk, backups, queues, error budget), IA (quality/cost/latency). Distinguir evento `order_created` de `payment_approved` en ingresos. Alerts accionables con owner/escalation y runbook link.

## Runbooks iniciales

1. **Mercado Pago caído**: deshabilitar nuevas payment attempts con flag; mantener órdenes pending y reservas con política TTL, reintentar reconciliación, no marcar success por retorno UI; comunicar incidente.
2. **Webhook atascado**: inspeccionar DLQ/inbox/lag sin revelar datos; re-drive idempotente; comparar PSP, orden y ledger; doble control para correcciones.
3. **Stock inconsistente**: congelar ventas del SKU, snapshot/audit de movimientos, reconciliar reservas y pago sin escribir SQL destructivo sin aprobación.
4. **Keycloak no disponible**: proteger sesiones, reportar fallo, no activar bypass auth; recuperación del IdP y su base de datos.
5. **Base de datos dañada**: fail closed checkout, evaluar backups/WAL y PITR en infraestructura aislada, verificar orden/ledger con reconciliación.
6. **Tema roto en producción**: rollback atómico a versión anterior; no afectar módulos de seguridad ni pasarela.
7. **Prompt injection/IA**: kill switch AI, bloquear tool execution, investigar dataset/trazas redactadas y re-evaluar baseline.
8. **Disputa/chargeback masivo**: activar equipo finanzas+riesgo, congelar reembolsos por política si necesario, verificar MP.

## Operación diaria/semanal/mensual

Diario: health, colas, reconciliation MP, stuck payments/reservations, errores auth, backups y alertas; semanal: restores sandbox, revisión de CVEs, pruebas de sintéticos, seller risk; mensual: revisión SLO, capacity, security incidents, costos infraestructura, retención y cumplimiento; trimestral: GameDay multi-host y revisión DR cuando madurez lo amerite.

## FinOps sin nube administrada

Costo VPS/dedicado/on-prem, energía, GPU VRAM, almacenamiento duplicado, red/egress, copias offsite, bases, mantenimiento y horas operativas. Medir costo por orden procesada, costo por búsqueda, costo por 1000 tasks IA y capacidad ociosa. Limitar modelos/cachés/contexto y hardware antes de ampliar cluster.
