import { useEffect, useState } from "preact/hooks";
import {
  Empty,
  Icon,
  ProductCard,
  SkeletonProductCard,
  SkeletonTable,
  Status,
} from "../components/ui";
import { api, type Category, type Product, type SellerPublicProfile, toError } from "../lib/api";
import { categoriesList, theme } from "../lib/store";

const categoryImageFallback: Record<string, string> = {
  laptops:
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
  audio:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
  fotografia:
    "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=1200&q=80",
  gaming:
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80",
  monitores:
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
  accesorios:
    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80",
  "smart-home":
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
};

const fallbackCats: Category[] = [
  {
    id: "c1",
    slug: "laptops",
    name: "Laptops & Computadoras",
    image_url: categoryImageFallback.laptops,
  },
  {
    id: "c2",
    slug: "audio",
    name: "Audio & Sonido Hi-Fi",
    image_url: categoryImageFallback.audio,
  },
  {
    id: "c3",
    slug: "fotografia",
    name: "Fotografía & Video Digital",
    image_url: categoryImageFallback.fotografia,
  },
  {
    id: "c4",
    slug: "gaming",
    name: "Gaming & Streaming Gear",
    image_url: categoryImageFallback.gaming,
  },
  {
    id: "c5",
    slug: "monitores",
    name: "Monitores & Pantallas Pro",
    image_url: categoryImageFallback.monitores,
  },
  {
    id: "c6",
    slug: "accesorios",
    name: "Periféricos & Accesorios",
    image_url: categoryImageFallback.accesorios,
  },
];

export function TrendingProducts() {
  const [items, setItems] = useState<Array<Product & { units_sold: number }>>([]);
  useEffect(() => {
    void api<{ items: Array<Product & { units_sold: number }> }>("/api/v1/recommendations/trending")
      .then((x) => setItems(x.items))
      .catch(() => setItems([]));
  }, []);
  const visibleItems = items.filter(
    (p) =>
      Boolean(p.image_url) &&
      !p.title.toLowerCase().includes("testing") &&
      !p.title.toLowerCase().includes("qa"),
  );
  if (!visibleItems.length) return null;
  return (
    <section class="section" aria-labelledby="trending-products-title">
      <div class="section-head">
        <div>
          <span class="eyebrow">SELECCIÓN DEL MARKETPLACE</span>
          <h2 id="trending-products-title">Tendencias y novedades</h2>
        </div>
        <a class="text-link" href="/deals">
          Ver todas las tendencias <Icon name="arrow" size={16} />
        </a>
      </div>
      <p class="help-text">
        Orden basado en unidades vendidas verificadas; los artículos recientes completan la
        selección.
      </p>
      <div class="products-grid">
        {visibleItems.map((p) => (
          <ProductCard key={p.listing_id} product={p} />
        ))}
      </div>
    </section>
  );
}

export function SimilarProducts({ listingId }: { listingId: string }) {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    void api<{ items: Product[] }>(
      `/api/v1/recommendations/similar/${encodeURIComponent(listingId)}`,
    )
      .then((res) => setItems(res.items ?? []))
      .catch(() => setItems([]));
  }, [listingId]);

  if (!items.length) return null;
  return (
    <section class="section" aria-labelledby="similar-products-title">
      <div class="section-head">
        <div>
          <span class="eyebrow">TAMBIÉN TE PUEDE INTERESAR</span>
          <h2 id="similar-products-title">Productos similares en esta categoría</h2>
        </div>
        <a class="text-link" href="/search">
          Ver catálogo <Icon name="arrow" size={16} />
        </a>
      </div>
      <div class="products-grid">
        {items.map((p) => (
          <ProductCard key={p.listing_id} product={p} compact={true} />
        ))}
      </div>
    </section>
  );
}

export function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>(categoriesList.value);
  const [loading, setLoading] = useState(!categoriesList.value.length);

  useEffect(() => {
    api<Category[]>("/api/v1/categories")
      .then((list) => {
        if (Array.isArray(list) && list.length) {
          categoriesList.value = list;
          setCats(list);
        } else {
          setCats(fallbackCats);
        }
      })
      .catch(() => setCats(fallbackCats))
      .finally(() => setLoading(false));
  }, []);

  const display = cats.length ? cats : fallbackCats;
  const topCategories = display.filter(
    (c) => !c.parent_id && !c.name.toLowerCase().startsWith("qa") && !c.slug.startsWith("qa-"),
  );
  const subcategoriesByParent = display.reduce<Record<string, Category[]>>((acc, c) => {
    if (c.parent_id && !c.name.toLowerCase().startsWith("qa") && !c.slug.startsWith("qa-")) {
      const list = acc[c.parent_id] ?? [];
      list.push(c);
      acc[c.parent_id] = list;
    }
    return acc;
  }, {});

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / Categorías
      </div>
      <div class="page-title">
        <span class="eyebrow">DIRECTORIO OFICIAL</span>
        <h1>Categorías del marketplace</h1>
        <p>
          Explora colecciones organizadas y subcategorías de vendedores verificados dentro de
          NexaMarket.
        </p>
      </div>
      {loading ? (
        <SkeletonTable rows={3} />
      ) : (
        <div class="category-grid category-showcase-grid">
          {(topCategories.length ? topCategories : display).map((c) => {
            const subs = subcategoriesByParent[c.id] || [];
            const cardImg =
              c.image_url ||
              (c.slug ? categoryImageFallback[c.slug] : undefined) ||
              categoryImageFallback.laptops;
            return (
              <div class="category-showcase-card category-card" key={c.slug}>
                <a
                  href={`/categories/${c.slug}`}
                  class="category-tile category-showcase-media"
                  aria-label={`Explorar categoría ${c.name}`}
                >
                  <img src={cardImg} alt={c.name} loading="lazy" class="category-showcase-img" />
                  <div class="category-showcase-overlay">
                    <span class="category-showcase-badge">
                      {c.item_count
                        ? `${c.item_count} ${c.item_count === 1 ? "artículo" : "artículos"}`
                        : "Explorar"}
                    </span>
                    <h3 class="category-showcase-title">{c.name}</h3>
                  </div>
                </a>
                <div class="category-showcase-body">
                  {subs.length > 0 && (
                    <div class="category-subchips">
                      {subs.map((sub) => (
                        <a key={sub.id} href={`/categories/${sub.slug}`} class="category-subchip">
                          {sub.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <div class="category-card-footer">
                    <a href={`/categories/${c.slug}`} class="text-link">
                      Ver colección <Icon name="arrow" size={14} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export function DealsPage() {
  const [trending, setTrending] = useState<Product[]>([]);
  const [bestPrice, setBestPrice] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ items: Product[] }>("/api/v1/recommendations/trending"),
      api<{ items: Product[] }>("/api/v1/products?sort=price_asc"),
    ])
      .then(([t, b]) => {
        const cleanTrending = (t.items ?? []).filter(
          (p) =>
            Boolean(p.image_url) &&
            !p.title.toLowerCase().includes("testing") &&
            !p.title.toLowerCase().includes("qa"),
        );
        const cleanBestPrice = (b.items ?? []).filter(
          (p) =>
            Boolean(p.image_url) &&
            !p.title.toLowerCase().includes("testing") &&
            !p.title.toLowerCase().includes("qa"),
        );
        setTrending(cleanTrending);
        setBestPrice(cleanBestPrice);
      })
      .catch((e) => setError(toError(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / Ofertas y tendencias
      </div>
      <div class="page-title">
        <span class="eyebrow">DESCUBRIMIENTO VERIFICADO</span>
        <h1>Tendencias y mejores precios</h1>
        <p>
          Selección transparente basada en compras reales conciliadas y ordenamiento directo por
          menor precio.
        </p>
      </div>

      {loading ? (
        <div class="products-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : error ? (
        <Empty title="No pudimos cargar las ofertas" message={error} />
      ) : (
        <>
          <section class="section" style={{ marginTop: 0 }}>
            <div class="section-head">
              <h2>Más vendidos verificados</h2>
              <Status>VENTAS CONCILIADAS</Status>
            </div>
            {trending.length ? (
              <div class="products-grid">
                {trending.map((p) => (
                  <ProductCard key={p.listing_id} product={p} />
                ))}
              </div>
            ) : (
              <Empty
                title="Aún sin ranking de tendencias"
                message="Explora nuestro catálogo general mientras se registran nuevas ventas."
              />
            )}
          </section>

          <section class="section">
            <div class="section-head">
              <h2>Mejores precios disponibles</h2>
              <a href="/search?sort=price_asc" class="text-link">
                Ver todos por menor precio <Icon name="arrow" size={16} />
              </a>
            </div>
            {bestPrice.length ? (
              <div class="products-grid">
                {bestPrice.slice(0, 8).map((p) => (
                  <ProductCard key={p.listing_id} product={p} />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}

export function SellerProfilePage({ id }: { id: string }) {
  const [seller, setSeller] = useState<SellerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api<SellerPublicProfile>(`/api/v1/sellers/${encodeURIComponent(id)}/profile`)
      .then((res) => {
        setSeller(res);
        setError("");
      })
      .catch((e) => setError(toError(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const cleanSellerItems = (seller?.items ?? []).filter(
    (p) =>
      Boolean(p.image_url) &&
      !p.title.toLowerCase().includes("testing") &&
      !p.title.toLowerCase().includes("qa"),
  );

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / <a href="/search">Catálogo</a> / Vendedor verificado
      </div>

      {loading ? (
        <div class="products-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : error || !seller ? (
        <Empty
          title="Vendedor no encontrado"
          message={error || "Este perfil comercial no está disponible o no se encuentra activo."}
          action={
            <a href="/search" class="btn btn-primary">
              Volver al catálogo
            </a>
          }
        />
      ) : (
        <>
          <section class="panel seller-public-banner">
            <div class="seller-public-identity">
              <div class="avatar">
                <Icon name="store" size={30} />
              </div>
              <div>
                <span class="eyebrow">VENDEDOR OFICIAL EN NEXAMARKET</span>
                <h1>{seller.display_name}</h1>
                <p class="help-text">
                  Activo desde{" "}
                  {new Date(seller.created_at).toLocaleDateString("es-PE", {
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · Opera bajo las reglas, identidad y protección centralizada de{" "}
                  {theme.value.brand_name ?? "NexaMarket"}.
                </p>
              </div>
            </div>
            <div class="seller-public-badges">
              <span class="seller-reputation-pill high">
                <Icon name="star" size={14} /> 4.9 · Calificación positiva
              </span>
              <span class="seller-reputation-pill dispatch">
                <Icon name="truck" size={14} /> Despacho &lt; 24h
              </span>
              <Status>VERIFICADO</Status>
              <span class="info-pill">
                <Icon name="shield" size={15} /> Pago protegido con Mercado Pago
              </span>
            </div>
          </section>

          <section class="section">
            <div class="section-head">
              <h2>Publicaciones activas de {seller.display_name}</h2>
              <span class="help-text tnum">{cleanSellerItems.length} productos</span>
            </div>
            {cleanSellerItems.length ? (
              <div class="products-grid">
                {cleanSellerItems.map((p) => (
                  <ProductCard key={p.listing_id} product={p} />
                ))}
              </div>
            ) : (
              <Empty
                title="Sin publicaciones activas"
                message="Este vendedor no tiene artículos disponibles en este momento."
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}

export function HelpCenterPage() {
  const faqs = [
    {
      q: "¿Cómo funcionan los pagos cuando compro a varios vendedores?",
      a: "NexaMarket utiliza exclusivamente Mercado Pago. Si tu carrito incluye artículos de distintos vendedores verificados, el checkout genera 1 pago independiente y protegido por cada vendedor, asegurando trazabilidad bancaria exacta.",
    },
    {
      q: "¿NexaMarket almacena los datos de mi tarjeta?",
      a: "Nunca. Toda captura de tarjeta o saldo se realiza dentro del componente cifrado oficial (Payment Brick) de Mercado Pago. NexaMarket jamás almacena PAN, CVV ni credenciales bancarias.",
    },
    {
      q: "¿Cómo solicito una devolución o confirmo la entrega?",
      a: "Desde 'Mis compras' (/orders), entra al detalle de tu pedido. Cuando el vendedor despacha con número de seguimiento podrás confirmar la recepción o abrir una solicitud de devolución revisada por nuestro equipo.",
    },
    {
      q: "¿Los vendedores pueden crear tiendas externas o cambiar el diseño?",
      a: "No. NexaMarket es un marketplace único centralizado: todos los vendedores verificados publican bajo las mismas reglas de calidad, catálogo compartido y políticas de seguridad.",
    },
  ];

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / Centro de ayuda
      </div>
      <div class="page-title">
        <span class="eyebrow">CENTRO DE AYUDA</span>
        <h1>Preguntas frecuentes y garantías</h1>
        <p>Todo lo que necesitas saber para comprar y vender con seguridad en NexaMarket.</p>
      </div>
      <div class="admin-grid">
        <section class="panel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <h2>Guía rápida para compradores y vendedores</h2>
          {faqs.map((f) => (
            <article class="review-card" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </article>
          ))}
        </section>
        <aside class="panel" style={{ height: "fit-content" }}>
          <Icon name="help" size={30} />
          <h2 style={{ marginTop: "10px" }}>¿Necesitas atención personalizada?</h2>
          <p>
            Abre un ticket vinculado a tu cuenta para seguimiento directo de pedidos, pagos o
            devoluciones.
          </p>
          <a href="/support" class="btn btn-primary" style={{ marginTop: "12px" }}>
            Ir a Soporte al cliente <Icon name="arrow" size={16} />
          </a>
        </aside>
      </div>
    </main>
  );
}

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const isTerms = kind === "terms";
  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / {isTerms ? "Términos y condiciones" : "Política de privacidad"}
      </div>
      <article class="panel legal-doc">
        <span class="eyebrow">DOCUMENTACIÓN LEGAL VIGENTE</span>
        <h1>{isTerms ? "Términos y condiciones de uso" : "Política de privacidad y datos"}</h1>
        {isTerms ? (
          <>
            <p>
              <strong>1. Marketplace central único:</strong>{" "}
              {theme.value.brand_name ?? "NexaMarket"} opera como plataforma única de intermediación
              comercial donde vendedores verificados ofrecen productos a compradores registrados
              bajo reglas de catálogo, auditoría y comisiones transparentes.
            </p>
            <p>
              <strong>2. Pagos exclusivos con Mercado Pago:</strong> Todo cobro se procesa mediante
              Mercado Pago. En compras con múltiples vendedores se ejecuta un cobro separado por
              cada subpedido de vendedor (`ONE_PAYMENT_PER_SELLER`). Un pago solo se considera
              confirmado tras la conciliación servidor-a-servidor con Mercado Pago.
            </p>
            <p>
              <strong>3. Inventario, envíos y devoluciones:</strong> Las reservas de stock tienen
              vigencia acotada durante el checkout. Las solicitudes de devolución pasan por revisión
              auditada antes de cualquier liquidación o reembolso.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>1. Identidad segura (Keycloak OIDC):</strong> La autenticación, federación
              social y factores OTP/TOTP se gestionan en nuestro servidor de identidad dedicado con
              cookies de sesión `HttpOnly` y protección anti-CSRF.
            </p>
            <p>
              <strong>2. Cero almacenamiento de tarjetas:</strong> NexaMarket no recopila ni guarda
              números de tarjeta ni códigos de seguridad. Los datos financieros son tratados
              directamente por Mercado Pago.
            </p>
            <p>
              <strong>3. Uso responsable de IA local:</strong> Las consultas en Nexa AI operan sobre
              datos públicos del catálogo sin permisos para ejecutar pagos ni acceder a medios de
              cobro.
            </p>
          </>
        )}
      </article>
    </main>
  );
}
