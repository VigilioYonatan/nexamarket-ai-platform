# AI Commerce Platform local, agentes, RAG/ML y evaluaciones

## Regla base

El comercio **funciona sin IA**; la IA es asistiva y fail-closed para cambios sensibles. El modelo no decide precios efectivos, inventario, pagos, roles, devoluciones o sanciones. Modelos abiertos de inferencia local son una opción, con **licencia de pesos** comprobada para uso comercial y datos clasificados.

## Módulos y fases

| Función | Diseño | Gate |
|---|---|---|
| Product enrichment (V1) | imagen/PDF→parser/multimodal→atributos y evidencia→revisión humana | F1 por atributo, alucinación |
| Matching/deduplicación (V1) | GTIN/modelo/fuzzy/embeddings→candidatos→revisión humana | false merge rate |
| Hybrid search (V1) | BM25/FTS + embeddings + business hard filters + rerank | NDCG@K, zero results |
| Product comparison (V1) | comparar facts verificados + explicar divergencias | factuality |
| Shopping assistant (V1/V2) | LangGraph o FSM con tools typed y scope buyer | task success, authZ, prompt injection |
| Seller copilot (V2) | analytics authorization + summaries trazables | no cross seller; grounded |
| Recomendación (V2) | popularidad/cold start → LightGBM ranking con impresiones | Recall@K, CTR experimentos |
| Forecast (V2) | baseline, series temporales, censura stockout | WAPE/MASE, sesgo |
| Moderación y riesgo (V2) | reglas+modelo+human review/appeals | precision, FPR, fairness |
| Atención postventa (V2) | RAG políticas versionadas + order tools authZ | resolución, fidelidad, redaction |

## Infra AI self-hosted

FastAPI separado del NestJS transactional, serving local vLLM/Ollama dependiendo GPU/modelo, embeddings locales (dimensiones/versionadas), pgvector inicial, model registry/MLflow, Langfuse OSS o alternativa local, OpenTelemetry, dataset registry, object storage local, presupuestos hardware y inferencia.

No desplegar un modelo nuevo solo porque existe. Evaluar memoria de GPU, tokens/s, p95, concurrencia, seguridad, costo por 1000 tareas (energía, VPS, amortización), licencias, calidad en español y funcionamiento offline.

## Tools de shopping agent (allowlist)

```ts
interface ShoppingTools {
  searchProducts(input: SearchFilters): Promise<ProductSummary[]>;
  getProductDetails(productId: string): Promise<ProductDetails>;
  checkLiveStock(listingId: string): Promise<StockStatus>;
  compareVerifiedSpecs(productIds: string[]): Promise<Comparison>;
  getDeliveryQuote(input: DeliveryRequest): Promise<DeliveryQuote>;
  getOwnCart(): Promise<CartSummary>;
  addToOwnCart(input: AddToCartInput): Promise<CartSummary>;
  getOwnOrderStatus(orderId: string): Promise<OrderStatus>;
}
```

**No** `executeSQL`, `getAnySellerData`, `refundAnyPayment`, `payNow`, `changePrice`. Cualquier cambio en carrito pide contexto authenticated + policy + validación determinista y confirmación UX según riesgo. Tool backend revalida permisos; nunca confiar en `seller_id` del prompt.

## Protección LLM

Tratar descripciones, reviews, PDFs, URL y mensajes como datos no confiables (prompt injection). Etiquetado de procedencia, retrieval con ACL por vendedor/usuario, separación instrucciones/data, outputs Zod estructurados, tool calls validados, presupuestos/timeout/pasos limitados, ausencia de secretos en prompt/traces, kill switch, filtros sensibles y redacción PII.

RAG: chunking + metadata + permissions, FTS/vector hybrid, re-ranking, fuentes y vigencia; no indexar políticas antiguas para responder decisiones actuales. Mantener dataset adversarial de documentos maliciosos y falsos facts.

## MLOps / LLMOps

Prompt/model/version/schema/dataset/eval IDs por request. Offline eval baselines, tests adversariales, canary, métricas de latencia/costos/fidelidad y drift, rollback de prompt/model indexado. Fraude nunca se rechaza definitivamente solo por modelo: review humana y apelación.

## Evals bloqueantes

- Data leak cross-seller en prompts/retrieval.
- Tool injection en nombre de producto/PDF/review.
- Agente intenta checkout/pago sin confirmación: debe fallar.
- Producto con stock 0, precio actualizado, seller suspendido: no recomienda como disponible.
- Comparación con ficha inconsistente: responde incertidumbre y evidencia.
- Eval datasets separados de entrenamiento y sin PII.

## Dependencias reales Vigilio

`ai-rag-llmops-finops`, normas `standards/ai/` de selección, hybrid RAG, reranking, quality matrix y lifecycle; esta skill de producto no sustituye esos controles.
