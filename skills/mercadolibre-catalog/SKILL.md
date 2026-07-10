---
name: mercadolibre-catalog
description: Playwright scraper and super-seeder system for authentic Mercado Libre Perú products, categories, variants, and multi-image galleries. Use when populating or synchronizing real marketplace catalog data into PostgreSQL.
---

# Mercado Libre Catalog & Super-Seeder Skill

This skill provides an end-to-end framework to scrape, structure, and seed authentic Mercado Libre Perú catalog data into NexaMarket.

## 1. Architecture & Capabilities

1. **Category Hierarchy & Official Imagery**:
   - Uses Mercado Libre's public Categories API (`https://api.mercadolibre.com/categories/{id}`) to extract departments, subcategories, and CDN icons (`https://http2.mlstatic.com/storage/categories-api/images/...`).
   - Mapped to NexaMarket's PostgreSQL schema (`categories` table: `id, slug, name, parent_id, icon, image_url`).

2. **Playwright Stealth Scraper**:
   - Navigates Mercado Libre without triggering `account-verification` challenges.
   - Masks `navigator.webdriver`, configures authentic Chrome user agents, viewport, and `es-PE` locale.
   - Extracts product titles, PEN prices, original compare-at prices, discount percentages, sellers, and high-resolution webp image assets.

3. **Multi-Image Gallery & Variant Data Modeling**:
   - **Canonical GTIN-13**: GS1-compliant modulo-10 algorithm for authentic product barcodes (`products.gtin`).
   - **Multi-Image Gallery**: Stored in `products.specifications.gallery` (3 to 6 high-res photos per product).
   - **Selectable Variants**: Stored in `products.specifications.variants`. Each variant is materialized into a dedicated row in `seller_listings` and `inventory_stock`, allowing real-time switching, inventory tracking, and purchasing.

4. **Mercado Libre E-Commerce Trust Badges**:
   - "Hasta 12 cuotas sin interés con Mercado Pago"
   - "Envío gratis a todo el Perú (24-48h)"
   - "Devolución gratis por 30 días"
   - "Compra Protegida con Mercado Pago"

## 2. Super Seeder Command

To execute or re-seed the full catalog:

```powershell
$env:SEED_DEMO = "true"
npm run build --workspace=@nexa/api
npm run seed --workspace=@nexa/api
```

## 3. Scraper Script Reference

The Playwright scraper is located at `scripts/scrape_category_products.mjs` and `scripts/check_home.mjs`.

To run a live scrape:
```powershell
node scripts/check_home.mjs
```

## 4. Frontend Component Reference

- **`ProductGallery`** (`apps/web/src/pages/buyer.tsx`):
  - Left-hand thumbnail rail (on desktop) / horizontal swipeable rail (on mobile).
  - Main hero preview with zoom-on-hover effect.
  - Active index state and variant image reactivity.
- **`VariantPicker`** (`apps/web/src/pages/buyer.tsx`):
  - Renders variant chips with thumbnail preview, name, and live price.
