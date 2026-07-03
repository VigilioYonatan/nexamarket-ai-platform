import { useEffect, useState } from "preact/hooks";
import {
  Button,
  ConfirmModal,
  Empty,
  Icon,
  Modal,
  ProductArt,
  ProductCard,
  Protected,
  SkeletonCart,
  SkeletonDetail,
  SkeletonOrderList,
  SkeletonProductCard,
  SkeletonTable,
  Status,
} from "../components/ui";
import {
  api,
  type Cart,
  type CartLine,
  type Checkout,
  json,
  money,
  newKey,
  type Product,
  signIn,
  toError,
} from "../lib/api";
import {
  cartCount,
  categoriesList,
  navigate,
  notify,
  routeSearch,
  session,
  theme,
} from "../lib/store";
import { ProductReviews } from "./community";
import { SimilarProducts, TrendingProducts } from "./discover";

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
  ultrabooks:
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
  "gaming-laptops":
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
  "noise-cancelling":
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
  speakers:
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
  keyboards:
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80",
  mice: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80",
  mirrorless:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
  docks:
    "https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=1200&q=80",
  "stream-gear":
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80",
};

const demoCats = [
  ["laptops", "Laptops"],
  ["audio", "Audio"],
  ["accesorios", "Accesorios"],
  ["monitores", "Monitores"],
  ["fotografia", "Fotografía"],
  ["gaming", "Gaming"],
];

export function Home() {
  const [products, setProducts] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ items: Product[] }>("/api/v1/products")
      .then((x) => setProducts(x.items))
      .catch((e) => setError(toError(e)))
      .finally(() => setLoading(false));
  }, []);

  const parentCategories = categoriesList.value.filter(
    (c) => !c.parent_id && !c.name.toLowerCase().startsWith("qa") && !c.slug.startsWith("qa-"),
  );
  const displayCats =
    parentCategories.length > 0
      ? parentCategories
      : demoCats.map(([slug, name]) => ({
          id: slug,
          slug,
          name,
          parent_id: null,
          icon: null,
          image_url: (slug && categoryImageFallback[slug]) || categoryImageFallback.laptops,
          item_count: 0,
        }));
  const brands = Array.from(
    new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b))),
  ).slice(0, 10);
  const verifiedSellers = Array.from(
    new Map(
      products
        .filter((p) => p.seller_id)
        .map((p) => [p.seller_id, { id: p.seller_id, name: p.seller_name }]),
    ).values(),
  ).slice(0, 4);

  return (
    <main>
      <section class="hero-wrap">
        <div class="container hero-grid">
          <div class="hero-content">
            <div class="hero-kicker">
              <Icon name="spark" size={16} /> MARKETPLACE ÚNICO VERIFICADO
            </div>
            <h1>{theme.value.hero_title ?? "Tu próxima gran compra empieza aquí"}</h1>
            <p>
              {theme.value.hero_subtitle ??
                "Descubre productos, compara opciones y compra con confianza."}
            </p>
            <div class="hero-ctas">
              <a href="/search" class="btn btn-primary">
                Explorar productos <Icon name="arrow" size={18} />
              </a>
              <a href="/seller" class="btn btn-hero-outline">
                Quiero vender
              </a>
            </div>
            <div class="hero-trust">
              <span>
                <Icon name="shield" size={18} /> Compra segura con Mercado Pago
              </span>
              <span>
                <Icon name="truck" size={18} /> Vendedores verificados
              </span>
            </div>
          </div>
          <div class="hero-graphic">
            <div class="hero-glow"></div>
            <div class="device laptop">
              <div class="device-screen">
                <span class="screen-orbit"></span>
                <span class="screen-nexa">
                  NEXA<span>MARKET</span>
                </span>
              </div>
              <div class="device-base"></div>
            </div>
            <div class="float-card float-a">
              ✦ <b>Encuentra lo que buscas</b>
            </div>
            <div class="float-card float-b">
              <span>●</span> Compra inteligente
            </div>
          </div>
        </div>
      </section>
      <div class="container main-sections">
        <section class="subhero-trust-bar" aria-label="Beneficios y confianza NexaMarket">
          <div class="subhero-trust-item">
            <div class="subhero-trust-icon">
              <Icon name="shield" size={22} />
            </div>
            <div class="subhero-trust-info">
              <strong>Hasta 12 cuotas con Mercado Pago</strong>
              <small>Tarjetas de crédito, débito, PagoEfectivo y Yape</small>
            </div>
          </div>
          <div class="subhero-trust-item">
            <div class="subhero-trust-icon">
              <Icon name="truck" size={22} />
            </div>
            <div class="subhero-trust-info">
              <strong>Envíos coordinados a nivel nacional</strong>
              <small>Seguimiento de pedidos con guía en tiempo real</small>
            </div>
          </div>
          <div class="subhero-trust-item">
            <div class="subhero-trust-icon">
              <Icon name="package" size={22} />
            </div>
            <div class="subhero-trust-info">
              <strong>Compra Protegida por 30 días</strong>
              <small>Garantía de devolución directa o reembolso</small>
            </div>
          </div>
          <div class="subhero-trust-item">
            <div class="subhero-trust-icon">
              <Icon name="spark" size={22} />
            </div>
            <div class="subhero-trust-info">
              <strong>Tiendas y Vendedores Verificados</strong>
              <small>Comercios auditados con RUC y factura electrónica</small>
            </div>
          </div>
        </section>

        <section class="home-quick-access" aria-label="Accesos directos">
          <a href="/orders" class="quick-access-card">
            <div class="quick-access-icon">
              <Icon name="package" size={20} />
            </div>
            <div class="quick-access-text">
              <strong>Mis compras</strong>
              <small>Rastreo de envíos</small>
            </div>
          </a>
          <a href="/cart" class="quick-access-card">
            <div class="quick-access-icon">
              <Icon name="cart" size={20} />
            </div>
            <div class="quick-access-text">
              <strong>Mi carrito {cartCount.value > 0 ? `(${cartCount.value})` : ""}</strong>
              <small>Artículos reservados</small>
            </div>
          </a>
          <a href="/favorites" class="quick-access-card">
            <div class="quick-access-icon">
              <Icon name="heart" size={20} />
            </div>
            <div class="quick-access-text">
              <strong>Mis favoritos</strong>
              <small>Productos guardados</small>
            </div>
          </a>
          <a href="/search?sort=price_asc" class="quick-access-card">
            <div class="quick-access-icon">
              <Icon name="tag" size={20} />
            </div>
            <div class="quick-access-text">
              <strong>Menor precio</strong>
              <small>Ofertas verificadas</small>
            </div>
          </a>
          <a href="/ai" class="quick-access-card">
            <div class="quick-access-icon">
              <Icon name="spark" size={20} />
            </div>
            <div class="quick-access-text">
              <strong>Asistente Nexa AI</strong>
              <small>Búsqueda asistida</small>
            </div>
          </a>
        </section>

        <TrendingProducts />

        <section class="home-promo-banner" aria-label="Campaña promocional">
          <div class="promo-banner-content">
            <span class="promo-banner-pill">
              <Icon name="tag" size={14} /> CAMPAÑA EXCLUSIVA MERCADO PAGO
            </span>
            <h2 class="promo-banner-title">
              Hasta <b>40% OFF</b> + 12 cuotas sin interés
            </h2>
            <p class="promo-banner-desc">
              Descubre lo último en tecnología de alta gama con envíos a todo el Perú y compra
              protegida por 30 días.
            </p>
            <div class="promo-banner-actions">
              <a href="/deals" class="btn btn-primary">
                Ver ofertas de la semana <Icon name="arrow" size={16} />
              </a>
              <span class="promo-banner-guarantee">
                <Icon name="shield" size={16} /> 100% Garantía Oficial
              </span>
            </div>
          </div>
          <div class="promo-banner-visual">
            <div class="promo-discount-badge">
              <span>HASTA</span>
              <strong>-40%</strong>
              <small>OFF</small>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">EXPLORA A TU MANERA</span>
              <h2>Encuentra tu categoría</h2>
            </div>
            <a href="/categories" class="text-link">
              Ver todas <Icon name="arrow" size={16} />
            </a>
          </div>
          <div class="category-grid category-showcase-grid">
            {displayCats.slice(0, 6).map((cat) => {
              const subcats = categoriesList.value
                .filter(
                  (c) =>
                    c.parent_id === cat.id &&
                    !c.name.toLowerCase().startsWith("qa") &&
                    !c.slug.startsWith("qa-"),
                )
                .slice(0, 3);
              const cardImg =
                cat.image_url ||
                (cat.slug ? categoryImageFallback[cat.slug] : undefined) ||
                categoryImageFallback.laptops;
              return (
                <div class="category-card category-showcase-card" key={cat.id}>
                  <a
                    href={`/categories/${cat.slug}`}
                    class="category-showcase-media"
                    aria-label={`Explorar categoría ${cat.name}`}
                  >
                    <img
                      src={cardImg}
                      alt={cat.name}
                      loading="lazy"
                      class="category-showcase-img"
                    />
                    <div class="category-showcase-overlay">
                      <span class="category-showcase-badge">
                        {cat.item_count
                          ? `${cat.item_count} ${cat.item_count === 1 ? "artículo" : "artículos"}`
                          : "Explorar"}
                      </span>
                      <h3 class="category-showcase-title">{cat.name}</h3>
                    </div>
                  </a>
                  <div class="category-showcase-body">
                    {subcats.length > 0 && (
                      <div class="category-subchips">
                        {subcats.map((sub) => (
                          <a key={sub.id} href={`/categories/${sub.slug}`} class="category-subchip">
                            {sub.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <div class="category-card-footer">
                      <a href={`/categories/${cat.slug}`} class="text-link">
                        Ver colección <Icon name="arrow" size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">PARA TI</span>
              <h2>Productos destacados</h2>
              <p>Explora las publicaciones más recientes de nuestros vendedores.</p>
            </div>
            <a href="/search" class="text-link">
              Ver catálogo <Icon name="arrow" size={16} />
            </a>
          </div>
          {loading ? (
            <div class="products-grid">
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          ) : error ? (
            <Empty title="El catálogo no está disponible" message={error} />
          ) : products.length ? (
            <div class="products-grid">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.listing_id} product={p} />
              ))}
            </div>
          ) : (
            <Empty
              title="Pronto habrá productos"
              message="Los vendedores están preparando sus primeras publicaciones."
            />
          )}
        </section>

        {brands.length > 0 && (
          <section class="section">
            <div class="section-head">
              <div>
                <span class="eyebrow">FABRICANTES Y MARCAS</span>
                <h2>Explora por marca</h2>
                <p>Equipos y accesorios de los fabricantes oficiales de la plataforma.</p>
              </div>
              <a href="/search" class="text-link">
                Ver marcas <Icon name="arrow" size={16} />
              </a>
            </div>
            <div class="brands-strip">
              {brands.map((b) => (
                <a key={b} href={`/search?q=${encodeURIComponent(b)}`} class="brand-pill">
                  <Icon name="tag" size={14} />
                  <span>{b}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {verifiedSellers.length > 0 && (
          <section class="section">
            <div class="section-head">
              <div>
                <span class="eyebrow">COMUNIDAD VERIFICADA</span>
                <h2>Vendedores autorizados</h2>
                <p>Tiendas y distribuidores que operan bajo los estándares de NexaMarket.</p>
              </div>
              <a href="/search" class="text-link">
                Todos los productos <Icon name="arrow" size={16} />
              </a>
            </div>
            <div class="sellers-strip">
              {verifiedSellers.map((s) => (
                <a key={s.id} href={`/sellers/${s.id}`} class="seller-badge-card">
                  <div class="seller-badge-avatar">{s.name.slice(0, 2).toUpperCase()}</div>
                  <div class="seller-badge-info">
                    <strong>{s.name}</strong>
                    <small>
                      <Icon name="shield" size={13} /> Vendedor aprobado
                    </small>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section class="sell-banner">
          <div>
            <span class="eyebrow">VENDE CON NOSOTROS</span>
            <h2>Haz crecer tu negocio en NexaMarket</h2>
            <p>Publica tus productos, gestiona inventario y lleva tus ventas al siguiente nivel.</p>
            <a class="btn btn-primary" href="/seller">
              Empieza a vender <Icon name="arrow" size={18} />
            </a>
          </div>
          <div class="sell-banner-visual">✦</div>
        </section>
      </div>
    </main>
  );
}

export function Search({ categorySlug }: { categorySlug?: string } = {}) {
  const params = new URLSearchParams(routeSearch.value),
    q = params.get("q") ?? "",
    category = categorySlug ?? params.get("category") ?? "",
    initialSort = params.get("sort") ?? "relevance";
  const [sort, setSort] = useState(initialSort),
    [items, setItems] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [mobileFiltersOpen, setMobileFiltersOpen] = useState(false),
    [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams({ q, category, sort, page: String(page) });
    api<{ items: Product[]; has_more: boolean }>(`/api/v1/products?${query}`)
      .then((x) => {
        const clean = (x.items || []).filter(
          (p) =>
            !p.title.toLowerCase().includes("testing") &&
            !p.title.toLowerCase().startsWith("qa") &&
            Boolean(p.image_url),
        );
        setItems(clean.length > 0 ? clean : x.items);
        setHasMore(x.has_more);
        setError("");
      })
      .catch((e) => setError(toError(e)))
      .finally(() => setLoading(false));
  }, [q, category, sort, page]);

  const cats = categoriesList.value.length
    ? categoriesList.value
        .filter(
          (c) =>
            !c.parent_id && !c.name.toLowerCase().startsWith("qa") && !c.slug.startsWith("qa-"),
        )
        .map((c) => [c.slug, c.name] as const)
    : demoCats;
  const activeCatName = cats.find(([slug]) => slug === category)?.[1] ?? category;

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / <a href="/categories">Categorías</a> /{" "}
        {category ? activeCatName : "Catálogo"}
      </div>
      <div class="catalog-heading">
        <div>
          <span class="eyebrow">DESCUBRE</span>
          <h1>
            {q
              ? `Resultados para “${q}”`
              : category
                ? `Categoría: ${activeCatName}`
                : "Todos los productos"}
          </h1>
          <p>Compara ofertas de vendedores verificados y encuentra la mejor opción.</p>
        </div>
        <div class="catalog-controls">
          <button
            type="button"
            class="btn btn-outline mobile-filter-trigger"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <Icon name="filter" size={16} /> Filtrar
          </button>
          <label class="sort-field">
            Ordenar por{" "}
            <select
              value={sort}
              onChange={(e) => {
                setSort((e.target as HTMLSelectElement).value);
                setPage(1);
              }}
            >
              <option value="relevance">Relevancia</option>
              <option value="newest">Más recientes</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
          </label>
        </div>
      </div>

      {/* Horizontal quick-chips for tablet & mobile */}
      <nav class="mobile-cat-chips" aria-label="Filtro rápido por categoría">
        <a class={!category ? "chip active" : "chip"} href="/search">
          Todos
        </a>
        {(categoriesList.value.length
          ? categoriesList.value.filter(
              (c) =>
                !c.parent_id && !c.name.toLowerCase().startsWith("qa") && !c.slug.startsWith("qa-"),
            )
          : demoCats.map(([slug, name]) => ({ slug, name }))
        ).map((c) => (
          <a
            key={c.slug}
            class={category === c.slug ? "chip active" : "chip"}
            href={`/categories/${c.slug}`}
          >
            {c.name}
          </a>
        ))}
      </nav>

      <div class="catalog-layout">
        <aside class="filters">
          <h3>Categorías</h3>
          <a class={!category ? "selected" : ""} href="/search">
            Todas las categorías
          </a>
          {categoriesList.value.length > 0
            ? categoriesList.value
                .filter(
                  (c) =>
                    !c.parent_id &&
                    !c.name.toLowerCase().startsWith("qa") &&
                    !c.slug.startsWith("qa-"),
                )
                .map((parent) => {
                  const isParent = category === parent.slug;
                  const children = categoriesList.value.filter(
                    (c) =>
                      c.parent_id === parent.id &&
                      !c.name.toLowerCase().startsWith("qa") &&
                      !c.slug.startsWith("qa-"),
                  );
                  return (
                    <div key={parent.id} style={{ marginBottom: "8px" }}>
                      <a
                        class={isParent ? "selected" : ""}
                        href={`/categories/${parent.slug}`}
                        style={{ fontWeight: 600 }}
                      >
                        {parent.name}
                        {parent.item_count ? ` (${parent.item_count})` : ""}
                      </a>
                      {children.length > 0 && (
                        <div
                          style={{ paddingLeft: "12px", display: "flex", flexDirection: "column" }}
                        >
                          {children.map((child) => (
                            <a
                              key={child.id}
                              class={category === child.slug ? "selected" : ""}
                              href={`/categories/${child.slug}`}
                              style={{ fontSize: "0.82rem", opacity: 0.88, margin: "2px 0" }}
                            >
                              └ {child.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
            : cats.map(([slug, name]) => (
                <a
                  key={slug}
                  class={category === slug ? "selected" : ""}
                  href={`/categories/${slug}`}
                >
                  {name}
                </a>
              ))}
          <div class="filters-note">
            <Icon name="shield" /> Ofertas revisadas por el marketplace
          </div>
        </aside>
        <div class="catalog-body">
          {loading ? (
            <div class="products-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          ) : error ? (
            <Empty title="No pudimos cargar productos" message={error} />
          ) : items.length ? (
            <div class="products-grid">
              {items.map((p) => (
                <ProductCard key={p.listing_id} product={p} />
              ))}
            </div>
          ) : (
            <Empty
              title="No encontramos productos"
              message="Prueba otra búsqueda o explora una categoría distinta."
              action={
                <a href="/search" class="btn btn-primary">
                  Ver todo
                </a>
              }
            />
          )}
          <div class="pagination">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((n) => Math.max(1, n - 1))}
            >
              Anterior
            </Button>
            <span class="tnum">Página {page}</span>
            <Button variant="outline" disabled={!hasMore} onClick={() => setPage((n) => n + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={mobileFiltersOpen}
        title="Filtrar por categoría"
        onClose={() => setMobileFiltersOpen(false)}
      >
        <div class="drawer-filter-list">
          <a
            class={!category ? "drawer-filter-item active" : "drawer-filter-item"}
            href="/search"
            onClick={() => setMobileFiltersOpen(false)}
          >
            Todos los productos
          </a>
          {cats.map(([slug, name]) => (
            <a
              key={slug}
              class={category === slug ? "drawer-filter-item active" : "drawer-filter-item"}
              href={`/categories/${slug}`}
              onClick={() => setMobileFiltersOpen(false)}
            >
              {name}
            </a>
          ))}
        </div>
      </Modal>
    </main>
  );
}

export function ProductGallery({ product }: { product: Product }) {
  const specs = (product.specifications || {}) as Record<string, unknown>;
  const rawGallery = Array.isArray(specs.gallery) ? (specs.gallery as string[]) : [];
  const allImages = Array.from(
    new Set([product.image_url, ...rawGallery].filter((x): x is string => Boolean(x))),
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const currentImg = allImages[activeIdx] || product.image_url || "";

  if (allImages.length <= 1) {
    return <ProductArt product={product} />;
  }

  return (
    <div class="pdp-gallery-wrap">
      <div class="pdp-thumbs-col" role="tablist" aria-label="Fotos del producto">
        {allImages.map((img, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            class={`pdp-thumb-btn ${idx === activeIdx ? "active" : ""}`}
            onClick={() => setActiveIdx(idx)}
            onMouseEnter={() => setActiveIdx(idx)}
            aria-label={`Ver vista ${idx + 1} de ${allImages.length}`}
            aria-selected={idx === activeIdx}
          >
            <img src={img} alt={`Miniatura ${idx + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      <div class="pdp-stage-col">
        {specs.badge ? <span class="pdp-badge-pill">{String(specs.badge)}</span> : null}
        <span class="pdp-counter-pill">
          {activeIdx + 1} / {allImages.length}
        </span>
        <div class="pdp-main-image-wrap">
          <img src={currentImg || undefined} alt={product.title} class="pdp-main-image" />
        </div>
      </div>
    </div>
  );
}

export function ProductDetail({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null),
    [loading, setLoading] = useState(true),
    [qty, setQty] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    api<Product>(`/api/v1/products/${encodeURIComponent(id)}`)
      .then((res) => {
        setProduct(res);
        setError("");
      })
      .catch((e) => setError(toError(e)))
      .finally(() => setLoading(false));
  }, [id]);
  const add = async () => {
    if (!product) return;
    if (!session.value.authenticated) return signIn(location.pathname);
    setBusy(true);
    try {
      const x = await api<Cart>("/api/v1/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: product.listing_id, quantity: qty }),
      });
      cartCount.value = x.lines.reduce((a, l) => a + l.quantity, 0);
      notify("Producto añadido al carrito");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };
  const buyNow = async () => {
    if (!product) return;
    if (!session.value.authenticated) return signIn(location.pathname);
    setBusy(true);
    try {
      const x = await api<Cart>("/api/v1/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: product.listing_id, quantity: qty }),
      });
      cartCount.value = x.lines.reduce((a, l) => a + l.quantity, 0);
      navigate("/cart");
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / <a href="/search">Productos</a> / {product?.title ?? "Detalle"}
      </div>
      {loading ? (
        <SkeletonDetail />
      ) : error ? (
        <Empty title="No encontramos el producto" message={error} />
      ) : (
        product && (
          <>
            <div class="detail-layout">
              <div class="detail-photo">
                <ProductGallery product={product} />
              </div>
              <div class="detail-content">
                <a href={`/sellers/${product.seller_id}`} class="eyebrow seller-eyebrow-link">
                  PUBLICADO POR {product.seller_name.toUpperCase()} →
                </a>
                <h1>{product.title}</h1>
                <div class="rating">
                  <Status>✓ Compra verificada</Status>
                  {product.gtin && (
                    <small class="tnum" style={{ marginLeft: "10px" }}>
                      GTIN: {product.gtin}
                    </small>
                  )}
                </div>
                {(() => {
                  const comparePrice = Number(
                    (product.specifications as Record<string, unknown> | undefined)
                      ?.compare_at_minor || 0,
                  );
                  const hasDiscount = comparePrice > product.price_minor;
                  const discountPct = hasDiscount
                    ? Math.round(((comparePrice - product.price_minor) / comparePrice) * 100)
                    : 0;
                  return (
                    <div class="detail-price-box">
                      {hasDiscount && (
                        <div class="detail-discount-row">
                          <span class="detail-strikethrough tnum">{money(comparePrice)}</span>
                          <span class="detail-discount-pill">-{discountPct}% OFF</span>
                        </div>
                      )}
                      <h2 class="detail-price tnum">{money(product.price_minor)}</h2>
                      <div class="installment-badge">
                        <Icon name="tag" size={14} />
                        <span>
                          Hasta <b>12 cuotas de {money(Math.round(product.price_minor / 12))}</b>{" "}
                          sin interés con <b>Mercado Pago</b>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div class="pdp-perks-box">
                  <div class="pdp-perk-item">
                    <Icon name="truck" size={17} class="pdp-perk-icon-green" />
                    <div>
                      <strong>Envío gratis a todo el Perú</strong>
                      <small>Llega entre 24 a 48 horas en compras protegidas</small>
                    </div>
                  </div>
                  <div class="pdp-perk-item">
                    <Icon name="refresh" size={17} class="pdp-perk-icon-blue" />
                    <div>
                      <strong>Devolución gratis</strong>
                      <small>Tienes 30 días corridos desde que recibes tu compra</small>
                    </div>
                  </div>
                  <div class="pdp-perk-item">
                    <Icon name="shield" size={17} class="pdp-perk-icon-blue" />
                    <div>
                      <strong>Compra Protegida con Mercado Pago</strong>
                      <small>Recibe el producto que esperabas o te devolvemos el dinero</small>
                    </div>
                  </div>
                </div>

                <div class="stock-info">
                  <span class={product.available > 0 ? "stock-yes" : "stock-no"}>
                    ●{" "}
                    {product.available > 0
                      ? `${product.available} disponibles para envío inmediato`
                      : "Agotado"}
                  </span>
                </div>
                <p>{product.description}</p>
                {(product.brand || product.model) && (
                  <div
                    style={{ display: "flex", gap: "16px", margin: "12px 0", fontSize: "0.85rem" }}
                  >
                    {product.brand && (
                      <span>
                        <b>Marca:</b> {product.brand}
                      </span>
                    )}
                    {product.model && (
                      <span>
                        <b>Modelo:</b> {product.model}
                      </span>
                    )}
                  </div>
                )}
                {Array.isArray(product.specifications?.variants) &&
                  product.specifications.variants.length > 0 && (
                    <div class="variants-picker">
                      <span class="variants-title">Opciones & Variantes disponibles:</span>
                      <div class="variant-chips">
                        {(
                          product.specifications.variants as Array<{
                            name: string;
                            listing_id: string;
                            price_minor: number;
                            current?: boolean;
                            image?: string;
                          }>
                        ).map((v) => {
                          const isCurrent = v.listing_id === product.listing_id;
                          return (
                            <a
                              key={v.listing_id}
                              href={`/products/${v.listing_id}`}
                              class={`variant-chip ${isCurrent ? "variant-chip-active" : ""}`}
                              aria-current={isCurrent ? "true" : undefined}
                            >
                              {v.image && (
                                <img src={v.image} alt={v.name} class="variant-chip-thumb" />
                              )}
                              <span class="variant-chip-name">{v.name}</span>
                              <span class="variant-chip-price">{money(v.price_minor)}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                {product.specifications &&
                  Object.keys(product.specifications).filter(
                    (k) =>
                      k !== "variants" &&
                      k !== "compare_at_minor" &&
                      k !== "original_price_minor" &&
                      k !== "gallery" &&
                      k !== "badge",
                  ).length > 0 && (
                    <div class="specs-preview">
                      <span class="specs-heading">Especificaciones del producto:</span>
                      <div class="specs-pill-grid">
                        {Object.entries(product.specifications)
                          .filter(
                            ([k]) =>
                              k !== "variants" &&
                              k !== "compare_at_minor" &&
                              k !== "original_price_minor" &&
                              k !== "gallery" &&
                              k !== "badge",
                          )
                          .map(([k, val]) => (
                            <div key={k} class="specs-pill">
                              <span class="spec-k">
                                {k === "ram"
                                  ? "RAM"
                                  : k === "gpu"
                                    ? "GPU"
                                    : k.replace(/_/g, " ").charAt(0).toUpperCase() +
                                      k.replace(/_/g, " ").slice(1)}
                                :
                              </span>
                              <span class="spec-v">{String(val)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                <label class="qty-field">
                  Cantidad{" "}
                  <select
                    value={qty}
                    onChange={(e) => setQty(Number((e.currentTarget as HTMLSelectElement).value))}
                  >
                    {Array.from(
                      { length: Math.min(Math.max(1, product.available), 10) },
                      (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <div class="detail-actions">
                  <Button disabled={!product.available || busy} onClick={buyNow}>
                    {busy ? "Procesando…" : "Comprar ahora"}
                  </Button>
                  <Button variant="outline" disabled={!product.available || busy} onClick={add}>
                    {busy ? "Agregando…" : "Añadir al carrito"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!session.value.authenticated) return signIn(location.pathname);
                      try {
                        await api(`/api/v1/me/favorites/${product.listing_id}`, { method: "POST" });
                        notify("Guardado en favoritos");
                      } catch (e) {
                        notify(toError(e));
                      }
                    }}
                  >
                    <Icon name="heart" /> Favorito
                  </Button>
                </div>
                <div class="detail-protection">
                  <div class="detail-protection-header">
                    <Icon name="shield" size={22} />
                    <div>
                      <strong>Garantía y Seguridad NexaMarket</strong>
                      <small>Operación 100% protegida y trazable</small>
                    </div>
                  </div>
                  <ul class="detail-trust-checklist">
                    <li>
                      <Icon name="truck" size={15} />
                      <span>
                        <b>Envíos coordinados:</b> Despacho con guía y seguimiento a todo el Perú.
                      </span>
                    </li>
                    <li>
                      <Icon name="rotate" size={15} />
                      <span>
                        <b>Compra protegida:</b> 30 días para devolución directa o reembolso.
                      </span>
                    </li>
                    <li>
                      <Icon name="store" size={15} />
                      <span>
                        <b>Vendido por:</b>{" "}
                        <a class="text-link" href={`/sellers/${product.seller_id}`}>
                          {product.seller_name}
                        </a>{" "}
                        (Comercio verificado con RUC).
                      </span>
                    </li>
                    <li>
                      <Icon name="tag" size={15} />
                      <span>
                        <b>Pagos oficiales:</b> Procesado por Mercado Pago (1 pago por vendedor).
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="mobile-buy-bar">
              <div>
                <small>Precio unitario</small>
                <strong class="tnum">{money(product.price_minor)}</strong>
              </div>
              <Button disabled={!product.available || busy} onClick={add}>
                {busy ? "Agregando…" : "Comprar ahora"}
              </Button>
            </div>
          </>
        )
      )}
      {product && <SimilarProducts listingId={product.listing_id} />}
      {product && <ProductReviews listingId={product.listing_id} />}
    </main>
  );
}

export function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState<
    Array<{ id: string; label: string; recipient: string; line1: string; city: string }>
  >([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const refresh = () =>
    api<Cart>("/api/v1/cart")
      .then((c) => {
        setCart(c);
        cartCount.value = c.lines.reduce((n, l) => n + l.quantity, 0);
      })
      .catch((e) => setError(toError(e)));
  useEffect(() => {
    if (session.value.authenticated) {
      void refresh();
      api<typeof addresses>("/api/v1/me/addresses")
        .then((list) => {
          setAddresses(list);
          if (list.length > 0 && !selectedAddress) setSelectedAddress(list[0]!.id);
        })
        .catch(() => {});
    }
  }, [session.value.authenticated]);
  const update = async (id: string, qty: number) => {
    setBusy(true);
    try {
      await api(
        `/api/v1/cart/items/${id}`,
        qty < 1
          ? { method: "DELETE" }
          : {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ quantity: qty }),
            },
      );
      await refresh();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };
  const checkout = async () => {
    setBusy(true);
    try {
      const body = selectedAddress ? { address_id: selectedAddress } : {};
      const c = await api<Checkout>("/api/v1/checkouts", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": newKey() },
        body: JSON.stringify(body),
      });
      cartCount.value = 0;
      navigate(`/checkout/${c.order.id}`);
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(false);
    }
  };

  // Group cart lines by seller to preview Mercado Pago multi-seller split transparently
  const grouped = new Map<
    string,
    { seller_id: string; seller_name: string; subtotal: number; lines: CartLine[] }
  >();
  if (cart) {
    for (const line of cart.lines) {
      const key = line.seller_id || line.seller_name;
      const g = grouped.get(key) ?? {
        seller_id: line.seller_id,
        seller_name: line.seller_name,
        subtotal: 0,
        lines: [],
      };
      g.subtotal += line.price_minor * line.quantity;
      g.lines.push(line);
      grouped.set(key, g);
    }
  }
  const sellerGroups = [...grouped.values()];

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/">Inicio</a> / Carrito
      </div>
      <div class="page-title">
        <h1>Mi carrito</h1>
        <p>Revisa los productos agrupados por vendedor antes de pasar al pago seguro.</p>
      </div>
      <Protected>
        {error ? (
          <Empty title="No pudimos obtener tu carrito" message={error} />
        ) : !cart ? (
          <SkeletonCart />
        ) : cart.lines.length === 0 ? (
          <Empty
            title="Tu carrito está vacío"
            message="Encuentra productos increíbles para empezar."
            action={
              <a class="btn btn-primary" href="/search">
                Explorar productos
              </a>
            }
          />
        ) : (
          <div class="cart-layout">
            <div class="cart-lines">
              {sellerGroups.length > 1 && (
                <div class="info-note">
                  <Icon name="shield" size={18} />
                  <span>
                    Tu carrito incluye <strong>{sellerGroups.length} vendedores</strong>. Realizarás{" "}
                    <strong>1 pago protegido con Mercado Pago por cada vendedor</strong>.
                  </span>
                </div>
              )}
              {sellerGroups.map((group) => (
                <section class="cart-seller-group" key={group.seller_id || group.seller_name}>
                  <header class="cart-seller-header">
                    <div class="cart-seller-title">
                      <Icon name="store" size={16} />
                      {group.seller_id ? (
                        <a href={`/sellers/${group.seller_id}`} class="product-seller">
                          {group.seller_name}
                        </a>
                      ) : (
                        <span class="product-seller">{group.seller_name}</span>
                      )}
                    </div>
                    <span class="cart-seller-subtotal tnum">
                      Subtotal vendedor: <b>{money(group.subtotal)}</b>
                    </span>
                  </header>
                  {group.lines.map((l) => (
                    <article class="cart-line" key={l.id}>
                      <div class="cart-line-art">
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.title} class="cart-img" />
                        ) : (
                          <Icon name="spark" size={30} />
                        )}
                      </div>
                      <div class="cart-line-info">
                        <span class="product-seller">{l.seller_name}</span>
                        <a class="product-name" href={`/products/${l.listing_id}`}>
                          {l.title}
                        </a>
                        <strong class="tnum">{money(l.price_minor)}</strong>
                        <span class={l.available >= l.quantity ? "stock-yes" : "stock-no"}>
                          {l.available >= l.quantity
                            ? "Disponible"
                            : "Stock actualizado; reduce la cantidad"}
                        </span>
                        <div class="qty-control qty-stepper-wrap">
                          <div class="qty-stepper">
                            <button
                              type="button"
                              class="qty-btn"
                              disabled={busy}
                              aria-label="Quitar una unidad"
                              onClick={() => update(l.id, l.quantity - 1)}
                            >
                              −
                            </button>
                            <span class="qty-val tnum">{l.quantity}</span>
                            <button
                              type="button"
                              class="qty-btn"
                              disabled={busy}
                              aria-label="Agregar una unidad"
                              onClick={() => update(l.id, l.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            class="btn-cart-remove"
                            disabled={busy}
                            onClick={() => update(l.id, 0)}
                          >
                            <Icon name="trash" size={14} /> Eliminar
                          </button>
                        </div>
                      </div>
                      <strong class="line-price tnum">{money(l.price_minor * l.quantity)}</strong>
                    </article>
                  ))}
                </section>
              ))}
            </div>
            <div class="summary-card">
              <h3>Resumen de compra</h3>
              <div class="address-selector">
                <h4>Dirección de entrega</h4>
                {addresses.length === 0 ? (
                  <p>
                    <small>
                      No tienes direcciones guardadas.{" "}
                      <a href="/account" class="text-link">
                        Agregar dirección
                      </a>
                    </small>
                  </p>
                ) : (
                  <select
                    value={selectedAddress}
                    onChange={(e) =>
                      setSelectedAddress((e.currentTarget as HTMLSelectElement).value)
                    }
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} — {a.recipient}, {a.line1} ({a.city})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div class="summary-row">
                <span>Vendedores</span>
                <b class="tnum">{sellerGroups.length}</b>
              </div>
              <div class="summary-row">
                <span>Productos ({cart.lines.reduce((n, l) => n + l.quantity, 0)})</span>
                <b class="tnum">{money(cart.total_minor)}</b>
              </div>
              <div class="summary-row">
                <span>Envío</span>
                <span>A coordinar con vendedor</span>
              </div>
              <hr />
              <div class="summary-row summary-total">
                <b>Total de productos</b>
                <strong class="tnum">{money(cart.total_minor)}</strong>
              </div>
              <Button
                disabled={busy || cart.lines.some((l) => l.quantity > l.available)}
                onClick={checkout}
              >
                {busy ? "Preparando compra…" : "Continuar compra"} <Icon name="arrow" size={18} />
              </Button>
              <p>
                Si compras a diferentes vendedores, realizarás un pago independiente por cada uno.
              </p>
              <div class="checkout-safe">
                <Icon name="shield" /> Pago protegido con Mercado Pago
              </div>
              <div class="summary-payment-badges">
                <span class="summary-badge">Mercado Pago</span>
                <span class="summary-badge">Visa</span>
                <span class="summary-badge">Mastercard</span>
                <span class="summary-badge">Yape</span>
                <span class="summary-badge">PagoEfectivo</span>
                <span class="summary-badge">SSL 256-bit</span>
              </div>
            </div>
          </div>
        )}
      </Protected>
    </main>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<
      Array<{ id: string; status: string; total_minor: number; created_at: string }>
    >([]),
    [filter, setFilter] = useState<"ALL" | "PENDING" | "ACTIVE" | "CANCELLED">("ALL"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (session.value.authenticated)
      api<typeof orders>("/api/v1/me/orders")
        .then(setOrders)
        .catch((e) => setError(toError(e)))
        .finally(() => setLoading(false));
  }, [session.value.authenticated]);

  const filtered = orders.filter((o) => {
    if (filter === "PENDING") return o.status === "AWAITING_PAYMENT";
    if (filter === "ACTIVE")
      return ["PAID", "PARTIALLY_PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(o.status);
    if (filter === "CANCELLED") return o.status === "CANCELLED";
    return true;
  });

  return (
    <main class="container page">
      <div class="section-head">
        <div class="page-title" style={{ marginBottom: "14px" }}>
          <h1>Mis compras</h1>
          <p>Sigue tus pedidos, gestiona entregas y consulta tu historial.</p>
        </div>
        <a href="/account/returns" class="btn btn-outline">
          <Icon name="rotate" size={16} /> Mis devoluciones
        </a>
      </div>
      <Protected>
        {loading ? (
          <SkeletonOrderList />
        ) : error ? (
          <Empty title="Error" message={error} />
        ) : orders.length === 0 ? (
          <Empty
            title="Todavía no tienes compras"
            message="Tus pedidos aparecerán aquí cuando realices una compra."
            action={
              <a href="/search" class="btn btn-primary">
                Comprar ahora
              </a>
            }
          />
        ) : (
          <>
            <fieldset class="filter-pills" aria-label="Filtrar estado de pedidos">
              {(
                [
                  ["ALL", "Todos"],
                  ["PENDING", "Por pagar"],
                  ["ACTIVE", "En curso y entregados"],
                  ["CANCELLED", "Cancelados"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  class={filter === key ? "chip active" : "chip"}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </fieldset>
            <div class="orders-list">
              {filtered.map((o) => (
                <a key={o.id} href={`/orders/${o.id}`} class="order-card-senior">
                  <div class="order-card-main">
                    <div class="order-card-meta">
                      <span class="order-code-badge">ORD-{o.id.slice(0, 8).toUpperCase()}</span>
                      <time class="order-date">
                        {new Date(o.created_at).toLocaleDateString("es-PE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <h3 class="order-card-title">Pedido de marketplace</h3>
                    <div class="order-card-trust">
                      <Icon name="shield" size={13} /> Pago protegido por Mercado Pago
                    </div>
                  </div>
                  <div class="order-card-side">
                    <Status>{o.status}</Status>
                    <strong class="order-card-amount tnum">{money(o.total_minor)}</strong>
                    <span class="order-card-link">
                      Ver detalle <Icon name="arrow" size={14} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </Protected>
    </main>
  );
}

type BuyerOrderDetail = {
  id: string;
  status: string;
  total_minor: number;
  lines: Array<{
    listing_id: string;
    title_snapshot: string;
    price_minor: number;
    quantity: number;
  }>;
  sellers: Array<{
    id: string;
    seller_id?: string;
    status: string;
    subtotal_minor: number;
    tracking_number: string | null;
    shipment_status: string | null;
  }>;
};

export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [returnGroupId, setReturnGroupId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [confirmDeliveryGroupId, setConfirmDeliveryGroupId] = useState<string | null>(null);
  const [cancelOrderOpen, setCancelOrderOpen] = useState(false);

  const reload = async () => {
    try {
      setOrder(await api<BuyerOrderDetail>(`/api/v1/me/orders/${encodeURIComponent(id)}`));
      setError("");
    } catch (e) {
      setError(toError(e));
    }
  };
  useEffect(() => {
    void reload();
  }, [id]);

  const submitReturn = async (e: Event) => {
    e.preventDefault();
    if (!returnGroupId || returnReason.trim().length < 10) return;
    setBusy(returnGroupId);
    try {
      await api(
        `/api/v1/me/orders/${encodeURIComponent(id)}/return-requests`,
        json("POST", { seller_order_id: returnGroupId, reason: returnReason.trim() }),
      );
      notify("Solicitud registrada para revisión. No es un reembolso automático.");
      setReturnGroupId(null);
      setReturnReason("");
      await reload();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(null);
    }
  };

  const executeConfirmDelivery = async () => {
    if (!confirmDeliveryGroupId) return;
    setBusy(confirmDeliveryGroupId);
    try {
      await api(
        `/api/v1/me/orders/${encodeURIComponent(id)}/seller-orders/${encodeURIComponent(confirmDeliveryGroupId)}/confirm-delivery`,
        { method: "POST" },
      );
      notify("Entrega confirmada con éxito");
      setConfirmDeliveryGroupId(null);
      await reload();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(null);
    }
  };

  const executeCancelOrder = async () => {
    setBusy("cancel");
    try {
      await api(`/api/v1/me/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      notify("Pedido cancelado y reserva de stock liberada");
      await reload();
    } catch (e) {
      notify(toError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main class="container page">
      <div class="breadcrumbs">
        <a href="/orders">Mis compras</a> / Pedido {id.slice(0, 8).toUpperCase()}
      </div>
      <Protected>
        {error ? (
          <Empty title="Pedido no disponible" message={error} />
        ) : !order ? (
          <SkeletonTable rows={4} />
        ) : (
          <div class="order-detail">
            <div class="section-head">
              <div>
                <h1>Detalle de tu compra</h1>
                <Status>{order.status}</Status>
              </div>
              <div class="action-row">
                {order.status === "AWAITING_PAYMENT" && (
                  <>
                    <a href={`/checkout/${order.id}`} class="btn btn-primary">
                      Completar pago en Mercado Pago
                    </a>
                    <Button
                      variant="danger"
                      disabled={busy !== null}
                      onClick={() => setCancelOrderOpen(true)}
                    >
                      Cancelar pedido
                    </Button>
                  </>
                )}
                <a href="/account/returns" class="btn btn-outline">
                  Ver devoluciones
                </a>
              </div>
            </div>
            <h2>Productos</h2>
            {order.lines.map((l) => (
              <div class="summary-row" key={l.listing_id}>
                <span>
                  <b class="tnum">{l.quantity}×</b> {l.title_snapshot}{" "}
                  <a class="text-link" href={`/products/${l.listing_id}?review_order_id=${id}`}>
                    Valorar
                  </a>
                </span>
                <b class="tnum">{money(l.price_minor * l.quantity)}</b>
              </div>
            ))}
            <hr />
            <div class="summary-row summary-total">
              <b>Total</b>
              <b class="tnum">{money(order.total_minor)}</b>
            </div>
            <h2>Envíos y pagos por vendedor</h2>
            {order.sellers.map((s) => (
              <section class="review-card" key={s.id} aria-label={`Subpedido ${s.id}`}>
                <div class="summary-row">
                  <Status>{s.status}</Status>
                  <strong class="tnum">{money(s.subtotal_minor)}</strong>
                </div>
                {s.tracking_number && (
                  <p>
                    <strong>Seguimiento:</strong> <code>{s.tracking_number}</code> ·{" "}
                    <Status>{s.shipment_status ?? s.status}</Status>
                  </p>
                )}
                <div class="action-row">
                  {s.status === "SHIPPED" && (
                    <Button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setConfirmDeliveryGroupId(s.id)}
                    >
                      Confirmar entrega
                    </Button>
                  )}
                  {["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(s.status) && (
                    <Button
                      type="button"
                      disabled={busy !== null}
                      variant="outline"
                      onClick={() => {
                        setReturnGroupId(s.id);
                        setReturnReason("");
                      }}
                    >
                      Solicitar devolución
                    </Button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
        <Modal
          open={Boolean(returnGroupId)}
          title="Solicitud de devolución"
          onClose={() => {
            setReturnGroupId(null);
            setReturnReason("");
          }}
        >
          <form class="form-grid" onSubmit={submitReturn}>
            <label>
              Motivo de la solicitud (mínimo 10 caracteres)
              <textarea
                required
                minLength={10}
                rows={4}
                placeholder="Describe detalladamente el motivo o defecto..."
                value={returnReason}
                onInput={(e) => setReturnReason((e.currentTarget as HTMLTextAreaElement).value)}
              />
            </label>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setReturnGroupId(null);
                  setReturnReason("");
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy !== null || returnReason.trim().length < 10}>
                {busy ? "Enviando…" : "Enviar solicitud"}
              </Button>
            </div>
          </form>
        </Modal>
        <Modal
          open={Boolean(confirmDeliveryGroupId)}
          title="Confirmar recepción"
          onClose={() => setConfirmDeliveryGroupId(null)}
        >
          <p>¿Confirmas que has recibido todos los productos de este vendedor en buen estado?</p>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}
          >
            <Button variant="outline" type="button" onClick={() => setConfirmDeliveryGroupId(null)}>
              Volver
            </Button>
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => void executeConfirmDelivery()}
            >
              {busy ? "Confirmando…" : "Confirmar entrega"}
            </Button>
          </div>
        </Modal>
        <ConfirmModal
          open={cancelOrderOpen}
          title="Cancelar pedido pendiente de pago"
          message="¿Deseas cancelar este pedido? Se liberará inmediatamente la reserva de inventario y no se realizará ningún cargo."
          confirmLabel="Sí, cancelar pedido"
          variant="danger"
          onConfirm={executeCancelOrder}
          onClose={() => setCancelOrderOpen(false)}
        />
      </Protected>
    </main>
  );
}
