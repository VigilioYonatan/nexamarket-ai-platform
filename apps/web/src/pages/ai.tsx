import { useState } from "preact/hooks";
import { Button, Icon, ProductCard, Protected, SkeletonProductCard } from "../components/ui";
import { api, type Product, toError } from "../lib/api";

const quickPrompts = [
  "Necesito una laptop potente para trabajar y programar",
  "Busco audífonos con buena batería para estudio",
  "Accesorios ergonómicos y monitores para oficina",
];

export function AiPage() {
  const [question, setQuestion] = useState("Necesito una laptop para trabajar y estudiar"),
    [answer, setAnswer] = useState(""),
    [products, setProducts] = useState<Product[]>([]),
    [busy, setBusy] = useState(false);
  async function ask(e: Event) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api<{
        mode: string;
        notice?: string;
        answer?: string;
        products: Product[];
      }>("/api/v1/ai/shopping/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setAnswer(data.answer ?? data.notice ?? "");
      setProducts(data.products);
    } catch (e) {
      setAnswer(toError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main class="container page">
      <div class="page-title">
        <span class="eyebrow">✦ NEXA AI</span>
        <h1>Tu asistente de compras</h1>
        <p>
          Describe lo que necesitas; exploramos productos reales del catálogo sin inventar stock ni
          precios, y sin acceso a pagos ni tarjetas.
        </p>
      </div>
      <Protected>
        <section class="ai-layout">
          <div class="panel">
            <div class="ai-greeting">
              <Icon name="spark" size={31} />
              <h2>¿Qué estás buscando?</h2>
              <p>Compara opciones sin perder de vista precio y disponibilidad verificados.</p>
            </div>
            <div class="filter-pills" style={{ marginBottom: "12px" }}>
              {quickPrompts.map((prompt) => (
                <button key={prompt} type="button" class="chip" onClick={() => setQuestion(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={ask} class="ai-form">
              <textarea
                aria-label="Pregunta a Nexa AI"
                minLength={5}
                maxLength={500}
                required
                value={question}
                onInput={(e) => setQuestion(e.currentTarget.value)}
                rows={4}
              />
              <Button disabled={busy} type="submit">
                {busy ? "Buscando…" : "Explorar con IA"} <Icon name="arrow" size={17} />
              </Button>
            </form>
          </div>
          <div class="panel">
            <h2>Resultados</h2>
            {busy ? (
              <div class="products-grid">
                <SkeletonProductCard />
                <SkeletonProductCard />
              </div>
            ) : (
              <>
                {answer ? (
                  <div class="ai-answer-card">
                    <div class="ai-answer-header">
                      <Icon name="spark" size={18} />
                      <strong>Respuesta Nexa AI</strong>
                    </div>
                    <p>{answer}</p>
                  </div>
                ) : (
                  <div class="ai-empty-prompt-state">
                    <div class="ai-spark-orb">
                      <Icon name="spark" size={32} />
                    </div>
                    <h3>Tu Asistente Inteligente de Compras</h3>
                    <p>
                      Consulta en lenguaje natural sobre compatibilidad, marcas y mejores opciones
                      en catálogo.
                    </p>
                    <div class="ai-trust-pillars">
                      <div class="ai-trust-pillar">
                        <Icon name="shield" size={18} />
                        <strong>Inventario Real</strong>
                        <small>Stock y precios de PostgreSQL</small>
                      </div>
                      <div class="ai-trust-pillar">
                        <Icon name="spark" size={18} />
                        <strong>Cero Alucinaciones</strong>
                        <small>Sin invención de ofertas falsas</small>
                      </div>
                      <div class="ai-trust-pillar">
                        <Icon name="tag" size={18} />
                        <strong>Seguridad Total</strong>
                        <small>Aislado de tokens bancarios</small>
                      </div>
                    </div>
                  </div>
                )}
                {products.length > 0 && (
                  <div class="products-grid">
                    {products.map((p) => (
                      <ProductCard key={p.listing_id} product={p} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </Protected>
    </main>
  );
}
