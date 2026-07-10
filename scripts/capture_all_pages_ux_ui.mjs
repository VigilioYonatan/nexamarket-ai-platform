import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5175';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ddbb1c9d-c954-4432-9bff-38b6f3bc1329/screenshots';

if (!existsSync(ARTIFACT_DIR)) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
}

console.log(`[CAPTURE] Initializing Playwright Screenshot Pipeline on ${BASE_URL}...`);
console.log(`[CAPTURE] Output directory: ${ARTIFACT_DIR}`);

const browser = await chromium.launch();

// Helper to configure role route
async function setupContext(role = 'ANON') {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Route auth/session based on role
  await page.route('**/auth/session', async (route) => {
    if (role === 'BUYER') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            user_id: '00000000-0000-4000-8000-000000000001',
            email: 'comprador.demo@nexamarket.pe',
            display_name: 'Carlos Comprador',
            role: 'BUYER',
            seller_id: null,
          },
        }),
      });
    }
    if (role === 'SELLER') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            user_id: '00000000-0000-4000-8000-000000000002',
            email: 'vendedor.demo@nexamarket.pe',
            display_name: 'TechStore Perú Oficial',
            role: 'BUYER',
            seller_id: '00000000-0000-4000-8000-000000000010',
          },
        }),
      });
    }
    if (role === 'ADMIN') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            user_id: '00000000-0000-4000-8000-000000000099',
            email: 'admin.seguridad@nexamarket.pe',
            display_name: 'Super Administrador',
            role: 'ADMIN',
            seller_id: null,
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    });
  });

  // Intercept seller routes
  await page.route('**/api/v1/seller/**', (r) => {
    const url = r.request().url();
    if (url.includes('application')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'app-1', status: 'APPROVED', display_name: 'Nexa Demo Tech Oficial' }),
      });
    }
    if (url.includes('commercial-policy')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ commission_bps: 1000 }),
      });
    }
    if (url.includes('analytics/summary')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: 8,
          orders: 14,
          gross_sales_minor: 4895000,
        }),
      });
    }
    if (url.includes('orders')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'so-1',
            order_id: '00000000-0000-4000-8000-000000000050',
            status: 'PAID',
            subtotal_minor: 529900,
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ]),
      });
    }
    if (url.includes('listings')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'l-1',
            title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD Space Black',
            price_minor: 529900,
            status: 'PUBLISHED',
            on_hand: 8,
            reserved: 1,
            version: 1,
          },
          {
            id: 'l-2',
            title: 'CalDigit TS4 Thunderbolt 4 Dock 18 Puertos 98W Power Delivery',
            price_minor: 159900,
            status: 'PUBLISHED',
            on_hand: 15,
            reserved: 0,
            version: 1,
          },
        ]),
      });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  // Intercept admin routes
  await page.route('**/api/v1/admin/**', (r) => {
    const url = r.request().url();
    if (url.includes('commissions/history')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'c-1', version: 1, commission_bps: 1000, status: 'PUBLISHED' }]),
      });
    }
    if (url.includes('commissions')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ commission_bps: 1000 }),
      });
    }
    if (url.includes('drafts')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'v-2',
            version: 2,
            status: 'PUBLISHED',
            tokens: {
              primary: '#2563EB',
              background: '#FAFAFA',
              surface: '#FFFFFF',
              text: '#09090B',
              radius: 12,
              font: 'Inter',
              brand_name: 'NexaMarket',
              hero_title: 'Tu próxima gran compra empieza aquí',
              hero_subtitle: 'Marketplace centralizado con pagos protegidos.',
            },
            created_at: '2024-03-01T12:00:00Z',
          },
        ]),
      });
    }
    if (url.includes('applications')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'app-1',
            user_id: 'u-1',
            display_name: 'AudioPro Digital Perú SAC',
            status: 'APPLIED',
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
        ]),
      });
    }
    if (url.includes('sellers')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '00000000-0000-4000-8000-000000000010',
            display_name: 'Nexa Demo Tech',
            status: 'APPROVED',
            created_at: '2024-01-15T10:00:00Z',
          },
        ]),
      });
    }
    if (url.includes('orders')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'ord-1', buyer_id: 'b-1', status: 'PAID', total_minor: 529900, created_at: new Date().toISOString() }]),
      });
    }
    if (url.includes('audit-events')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'aud-1', action: 'COMMISSION_UPDATED', resource_id: 'c-1', created_at: new Date().toISOString() }]),
      });
    }
    if (url.includes('trust/cases')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'case-1',
            subject_type: 'ORDER',
            subject_id: 'ord-100',
            reason: 'Discrepancia en reporte de entrega',
            status: 'OPEN',
            opened_by: 'admin',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    }
    if (url.includes('features')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { key: 'ai_shopping', enabled: true, description: 'Asistente de compras conversacional con IA' },
          { key: 'reviews', enabled: true, description: 'Reseñas y calificaciones de compras verificadas' },
          { key: 'support', enabled: true, description: 'Tickets y soporte al cliente' },
        ]),
      });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  // Mock addresses if buyer
  await page.route('**/api/v1/me/addresses', (r) => {
    if (r.request().method() === 'GET') {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'addr-1',
            label: 'Casa San Isidro',
            recipient: 'Carlos Comprador',
            phone: '+51 987 654 321',
            line1: 'Av. Los Conquistadores 450, Dpto 502',
            line2: 'Torre Residencial',
            city: 'Lima',
            state: 'Lima',
            postal_code: '15073',
            is_default: true,
          },
        ]),
      });
    }
    return r.continue();
  });

  // Mock return requests
  await page.route('**/api/v1/me/return-requests', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'ret-101',
          order_id: '00000000-0000-4000-8000-000000000050',
          seller_order_id: 'so-1',
          status: 'UNDER_REVIEW',
          reason: 'Caja con golpes visibles al momento de entrega',
          resolution_note: null,
          created_at: new Date().toISOString(),
        },
      ]),
    }),
  );

  // Mock favorites
  await page.route('**/api/v1/me/favorites', async (r) => {
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          listing_id: 'b1111111-1111-4111-8111-000000000001',
          product_id: 'p1',
          title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD Space Black',
          description: 'Rendimiento profesional extremo con GPU de 40 núcleos.',
          price_minor: 529900,
          currency: 'PEN',
          available: 8,
          brand: 'Apple',
          category: 'Laptops & Computadoras',
          seller_name: 'Nexa Demo Tech',
          seller_id: '00000000-0000-4000-8000-000000000010',
          image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
        },
      ]),
    });
  });

  // Mock notifications
  await page.route('**/api/v1/me/notifications', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'notif-1',
          title: 'Pago Confirmado',
          message: 'Tu pago para la orden #ORD-9842 ha sido procesado por Mercado Pago.',
          read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          title: 'Guía de Despacho Generada',
          message: 'AudioPro Digital Perú generó el número de seguimiento TRACK-99214.',
          read: true,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ]),
    }),
  );

  // Mock seller profile
  await page.route('**/api/v1/sellers/*/profile', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000010',
        display_name: 'Nexa Demo Tech',
        created_at: '2024-01-15T10:00:00Z',
        items: [
          {
            listing_id: 'b1111111-1111-4111-8111-000000000001',
            title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD',
            price_minor: 529900,
            currency: 'PEN',
            available: 8,
            brand: 'Apple',
            image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
          },
          {
            listing_id: 'b1111111-1111-4111-8111-000000000007',
            title: 'CalDigit TS4 Thunderbolt 4 Dock 18 Puertos 98W',
            price_minor: 159900,
            currency: 'PEN',
            available: 15,
            brand: 'CalDigit',
            image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      }),
    }),
  );

  return { context, page };
}

const screenshots = [];

async function capture(page, name, filename, fullPage = true) {
  const filePath = join(ARTIFACT_DIR, filename);
  await page.waitForTimeout(400); // settle UI animations
  await page.screenshot({ path: filePath, fullPage });
  console.log(`  ✓ [SAVED] ${name} -> ${filename}`);
  screenshots.push({ name, filename, path: filePath });
}

// -------------------------------------------------------------
// 1. PUBLIC STOREFRONT PAGES (ANON)
// -------------------------------------------------------------
console.log('\n--- [1/5] Capturing Public Storefront & Discovery Pages ---');
{
  const { context, page } = await setupContext('ANON');

  // 01 Home
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await capture(page, 'Storefront Home Page', '01_home_storefront.png');

  // 02 Home Dark Mode
  await page.evaluate(() => localStorage.setItem('nexa_color_mode', 'dark'));
  await page.reload({ waitUntil: 'networkidle' });
  await capture(page, 'Storefront Home Page (Dark Mode)', '02_home_dark_mode.png');
  await page.evaluate(() => localStorage.setItem('nexa_color_mode', 'light'));

  // 03 Search / Catalog
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await capture(page, 'Catalog & Search Page', '03_catalog_search.png');

  // 04 Search with text query
  await page.goto(`${BASE_URL}/search?q=laptop&sort=price_asc`, { waitUntil: 'networkidle' });
  await capture(page, 'Search Results (Query "laptop", Price ASC)', '04_search_filtered.png');

  // 05 Categories Directory
  await page.goto(`${BASE_URL}/categories`, { waitUntil: 'networkidle' });
  await capture(page, 'Categories Directory', '05_categories_directory.png');

  // 06 Category View (Audio)
  await page.goto(`${BASE_URL}/categories/audio`, { waitUntil: 'networkidle' });
  await capture(page, 'Category Filter View (Audio & Sonido)', '06_category_audio_view.png');

  // 07 Deals & Trending
  await page.goto(`${BASE_URL}/deals`, { waitUntil: 'networkidle' });
  await capture(page, 'Deals & Trending Showcase', '07_deals_trending.png');

  // 08 Product Detail PDP
  await page.goto(`${BASE_URL}/products/b1111111-1111-4111-8111-000000000009`, { waitUntil: 'networkidle' });
  await capture(page, 'Product Detail Page (PDP)', '08_product_detail_pdp.png');

  // 09 Public Seller Profile
  await page.goto(`${BASE_URL}/sellers/00000000-0000-4000-8000-000000000010`, { waitUntil: 'networkidle' });
  await capture(page, 'Public Standardized Seller Profile', '09_public_seller_profile.png');

  // 10 Login Page
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await capture(page, 'Authentication Login (OIDC + Social)', '10_login_oidc.png');

  // 11 Register Page
  await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
  await capture(page, 'Secure Registration Flow', '11_register_flow.png');

  // 12 Help Center
  await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle' });
  await capture(page, 'Public Help Center FAQs', '12_help_center.png');

  // 13 Legal Terms
  await page.goto(`${BASE_URL}/terms`, { waitUntil: 'networkidle' });
  await capture(page, 'Terms & Single Marketplace Compliance', '13_terms_page.png');

  // 13b Privacy
  await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'networkidle' });
  await capture(page, 'Privacy Policy & Zero Card Storage', '13b_privacy_page.png');

  // 13c Libro de Reclamaciones Modal
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const claimsBtn = page.locator('.claims-book-btn');
  if (await claimsBtn.isVisible()) {
    await claimsBtn.click();
    await page.waitForSelector('.modal-card', { state: 'visible' });
    await capture(page, 'Libro de Reclamaciones Virtual Modal', '13c_claims_book_modal.png', false);
    const closeBtn = page.locator('.modal-close-btn');
    if (await closeBtn.isVisible()) await closeBtn.click();
  }

  await context.close();
}

// -------------------------------------------------------------
// 2. BUYER AUTHENTICATED PAGES & MODALS (ROLE: BUYER)
// -------------------------------------------------------------
console.log('\n--- [2/5] Capturing Buyer Authenticated Pages & Modals ---');
{
  const { context, page } = await setupContext('BUYER');

  // 14 Cart with Multi-Seller items
  await page.route('**/api/v1/cart', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        lines: [
          {
            id: 'line-1',
            listing_id: 'b1111111-1111-4111-8111-000000000001',
            quantity: 1,
            title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD Space Black',
            image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
            price_minor: 529900,
            currency: 'PEN',
            available: 8,
            seller_name: 'Nexa Demo Tech',
            seller_id: '00000000-0000-4000-8000-000000000010',
          },
          {
            id: 'line-2',
            listing_id: 'b1111111-1111-4111-8111-000000000003',
            quantity: 2,
            title: 'Bose QuietComfort Ultra Headphones ANC Spatial Audio',
            image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
            price_minor: 169900,
            currency: 'PEN',
            available: 19,
            seller_name: 'AudioPro Digital Perú',
            seller_id: '00000000-0000-4000-8000-000000000011',
          },
        ],
        total_minor: 869700,
        currency: 'PEN',
      }),
    }),
  );

  await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });
  await capture(page, 'Shopping Cart (Multi-Seller Grouping)', '14_cart_page.png');

  // 15 Checkout & Mercado Pago Brick
  await page.route('**/api/v1/checkouts/*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        order: {
          id: '00000000-0000-4000-8000-000000000050',
          total_minor: 869700,
          status: 'PENDING',
          expires_at: new Date(Date.now() + 1800000).toISOString(),
        },
        seller_groups: [
          {
            seller_order_id: 'so-1',
            seller_id: '00000000-0000-4000-8000-000000000010',
            seller_name: 'Nexa Demo Tech',
            subtotal_minor: 529900,
            status: 'AWAITING_PAYMENT',
          },
          {
            seller_order_id: 'so-2',
            seller_id: '00000000-0000-4000-8000-000000000011',
            seller_name: 'AudioPro Digital Perú',
            subtotal_minor: 339800,
            status: 'AWAITING_PAYMENT',
          },
        ],
        multi_seller: true,
        warning: 'Recuerda que Mercado Pago procesa 1 pago independiente por vendedor.',
      }),
    }),
  );

  await page.goto(`${BASE_URL}/checkout/00000000-0000-4000-8000-000000000050`, { waitUntil: 'networkidle' });
  await capture(page, 'Checkout Session (Mercado Pago Multi-Seller)', '15_checkout_page.png');

  // 16 Buyer Account & Addresses
  await page.goto(`${BASE_URL}/account`, { waitUntil: 'networkidle' });
  await capture(page, 'Buyer Account Profile & Addresses', '16_buyer_account.png');

  // 17 Address Creation Form Modal
  const addAddrBtn = page.getByRole('button', { name: /Agregar dirección/i });
  if (await addAddrBtn.isVisible()) {
    await addAddrBtn.click();
    await capture(page, 'Buyer Address Form (Expanded)', '17_buyer_address_form.png');
  }

  // 18 Orders List
  await page.route('**/api/v1/me/orders', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-4000-8000-000000000050',
          status: 'PAID',
          total_minor: 529900,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          seller_orders: [
            {
              id: 'so-1',
              seller_id: '00000000-0000-4000-8000-000000000010',
              seller_name: 'Nexa Demo Tech',
              status: 'SHIPPED',
              subtotal_minor: 529900,
              items: [
                {
                  listing_id: 'b1111111-1111-4111-8111-000000000001',
                  title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD',
                  quantity: 1,
                  price_minor: 529900,
                  currency: 'PEN',
                },
              ],
            },
          ],
        },
      ]),
    }),
  );

  await page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle' });
  await capture(page, 'Buyer Orders History', '18_buyer_orders_list.png');

  // 19 Order Detail with Tracking
  await page.route('**/api/v1/orders/*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000050',
        status: 'PAID',
        total_minor: 529900,
        currency: 'PEN',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        seller_orders: [
          {
            id: 'so-1',
            seller_id: '00000000-0000-4000-8000-000000000010',
            seller_name: 'Nexa Demo Tech',
            status: 'SHIPPED',
            subtotal_minor: 529900,
            shipment: {
              tracking_number: 'NEXA-PE-884920',
              status: 'IN_TRANSIT',
              carrier: 'Nexa Logistics Express',
              shipped_at: new Date(Date.now() - 43200000).toISOString(),
            },
            items: [
              {
                listing_id: 'b1111111-1111-4111-8111-000000000001',
                title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD Space Black',
                quantity: 1,
                price_minor: 529900,
              },
            ],
          },
        ],
      }),
    }),
  );

  await page.goto(`${BASE_URL}/orders/00000000-0000-4000-8000-000000000050`, { waitUntil: 'networkidle' });
  await capture(page, 'Order Detail & Shipment Tracking', '19_order_detail.png');

  // 20 Return Request Modal Dialog
  const returnBtn = page.getByRole('button', { name: /Solicitar devolución/i });
  if (await returnBtn.isVisible()) {
    await returnBtn.click();
    await capture(page, 'Return Request Accessible Modal', '20_order_return_modal.png');
    await page.keyboard.press('Escape');
  }

  // 21 Buyer Favorites
  await page.goto(`${BASE_URL}/favorites`, { waitUntil: 'networkidle' });
  await capture(page, 'Buyer Saved Favorites', '21_buyer_favorites.png');

  // 22 Notifications Center
  await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle' });
  await capture(page, 'Notifications Center', '22_notifications_center.png');

  // 23 Customer Support Tickets & Consultation Form
  await page.route('**/api/v1/me/support/tickets', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'tick-1',
          subject: 'Consulta sobre compatibilidad de memorias RAM',
          status: 'ANSWERED',
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ]),
    }),
  );
  await page.goto(`${BASE_URL}/support`, { waitUntil: 'networkidle' });
  await capture(page, 'Customer Support Tickets & Form', '23_support_page.png');

  // 24 AI Shopping Assistant
  await page.goto(`${BASE_URL}/ai`, { waitUntil: 'networkidle' });
  await capture(page, 'Nexa AI Shopping Assistant', '24_ai_assistant.png');

  await context.close();
}

// -------------------------------------------------------------
// 3. SELLER CENTER (ROLE: SELLER)
// -------------------------------------------------------------
console.log('\n--- [3/5] Capturing Seller Center & Operations ---');
{
  const { context, page } = await setupContext('SELLER');

  await page.route('**/api/v1/seller/analytics/summary', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_revenue_minor: 4895000,
        active_listings: 12,
        pending_orders: 3,
        fulfilled_orders: 45,
        rating_avg: 4.9,
      }),
    }),
  );

  await page.route('**/api/v1/seller/listings', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'l-1',
          product_id: 'p-1',
          title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD',
          price_minor: 529900,
          currency: 'PEN',
          status: 'PUBLISHED',
          on_hand: 8,
          reserved: 1,
          available: 7,
          created_at: '2024-02-01T10:00:00Z',
        },
        {
          id: 'l-2',
          product_id: 'p-2',
          title: 'CalDigit TS4 Thunderbolt 4 Dock 18 Puertos',
          price_minor: 159900,
          currency: 'PEN',
          status: 'PUBLISHED',
          on_hand: 15,
          reserved: 0,
          available: 15,
          created_at: '2024-02-05T10:00:00Z',
        },
      ]),
    }),
  );

  await page.goto(`${BASE_URL}/seller`, { waitUntil: 'networkidle' });
  await capture(page, 'Seller Center (Catalog & Stats)', '25_seller_center_catalog.png');

  // 26 Stock Adjustment Modal
  const editStockBtn = page.getByRole('button', { name: /Ajustar stock/i }).first();
  if (await editStockBtn.isVisible()) {
    await editStockBtn.click();
    await capture(page, 'Seller Stock Adjustment Modal', '26_seller_stock_modal.png');
    await page.keyboard.press('Escape');
  }

  // 27 Seller Orders Tab
  await page.route('**/api/v1/seller/orders', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'so-1',
          order_id: '00000000-0000-4000-8000-000000000050',
          status: 'PAID',
          subtotal_minor: 529900,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          items: [
            {
              title: 'Apple MacBook Pro 16" M3 Max 64GB 2TB SSD',
              quantity: 1,
              price_minor: 529900,
            },
          ],
        },
      ]),
    }),
  );

  await page.goto(`${BASE_URL}/seller/orders`, { waitUntil: 'networkidle' });
  await capture(page, 'Seller Orders Queue', '27_seller_orders.png');

  // 28 Seller Analytics Tab
  await page.goto(`${BASE_URL}/seller/analytics`, { waitUntil: 'networkidle' });
  await capture(page, 'Seller Analytics & Performance', '28_seller_analytics.png');

  await context.close();
}

// -------------------------------------------------------------
// 4. ADMIN CENTER & GOVERNANCE (ROLE: ADMIN)
// -------------------------------------------------------------
console.log('\n--- [4/5] Capturing Admin Center & Governance Tabs ---');
{
  const { context, page } = await setupContext('ADMIN');

  await page.route('**/api/v1/admin/settings/drafts', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'v-2',
          version: 2,
          status: 'PUBLISHED',
          tokens: {
            primary: '#2563EB',
            background: '#FAFAFA',
            surface: '#FFFFFF',
            text: '#09090B',
            radius: 12,
            font: 'Inter',
            brand_name: 'NexaMarket',
            hero_title: 'Tu próxima gran compra empieza aquí',
            hero_subtitle: 'Marketplace centralizado con pagos protegidos.',
          },
          created_at: '2024-03-01T12:00:00Z',
        },
      ]),
    }),
  );

  // 29 Admin Appearance & Category Image Manager
  await page.goto(`${BASE_URL}/admin/appearance`, { waitUntil: 'networkidle' });
  await capture(page, 'Admin Appearance & Category Manager', '29_admin_appearance.png');

  // 30 Admin Sellers & Applications
  await page.route('**/api/v1/admin/sellers/applications', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'app-1',
          user_id: 'u-1',
          display_name: 'AudioPro Digital Perú SAC',
          status: 'APPLIED',
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ]),
    }),
  );
  await page.route('**/api/v1/admin/sellers', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-4000-8000-000000000010',
          display_name: 'Nexa Demo Tech',
          status: 'APPROVED',
          created_at: '2024-01-15T10:00:00Z',
        },
      ]),
    }),
  );

  await page.goto(`${BASE_URL}/admin/sellers`, { waitUntil: 'networkidle' });
  await capture(page, 'Admin Sellers & KYB Applications', '30_admin_sellers.png');

  // 31 Admin Commissions with ConfirmModal
  await page.route('**/api/v1/admin/commissions', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ commission_bps: 1000 }),
    }),
  );
  await page.route('**/api/v1/admin/commissions/history', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'c-1', version: 1, commission_bps: 1000, status: 'PUBLISHED' },
      ]),
    }),
  );

  await page.goto(`${BASE_URL}/admin/commissions`, { waitUntil: 'networkidle' });
  const publishCommBtn = page.getByRole('button', { name: /Publicar nueva tasa/i });
  if (await publishCommBtn.isVisible()) {
    await publishCommBtn.click();
    await capture(page, 'Admin Commission ConfirmModal', '31_admin_commissions_modal.png');
    await page.keyboard.press('Escape');
  } else {
    await capture(page, 'Admin Commissions Policy', '31_admin_commissions.png');
  }

  // 32 Admin Trust & Safety
  await page.route('**/api/v1/admin/trust/cases', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'case-1',
          subject_type: 'ORDER',
          subject_id: 'ord-100',
          reason: 'Discrepancia en reporte de entrega',
          status: 'OPEN',
          opened_by: 'admin',
          created_at: new Date().toISOString(),
        },
      ]),
    }),
  );

  await page.goto(`${BASE_URL}/admin/trust`, { waitUntil: 'networkidle' });
  const newCaseBtn = page.getByRole('button', { name: /Abrir caso manual/i });
  if (await newCaseBtn.isVisible()) {
    await newCaseBtn.click();
    await capture(page, 'Admin Trust & Risk Case Creation Modal', '32_admin_trust_modal.png');
    await page.keyboard.press('Escape');
  } else {
    await capture(page, 'Admin Trust & Safety Cases', '32_admin_trust.png');
  }

  // 33 Admin Feature Flags
  await page.route('**/api/v1/admin/features', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { key: 'ai_shopping', enabled: true, description: 'Asistente de compras conversacional con IA' },
        { key: 'reviews', enabled: true, description: 'Reseñas y calificaciones de compras verificadas' },
        { key: 'support', enabled: true, description: 'Tickets y soporte al cliente' },
      ]),
    }),
  );

  await page.goto(`${BASE_URL}/admin/features`, { waitUntil: 'networkidle' });
  await capture(page, 'Admin Feature Flags Manager', '33_admin_features.png');

  await context.close();
}

// -------------------------------------------------------------
// 5. MOBILE RESPONSIVE VIEWS (390x844 iPhone 13)
// -------------------------------------------------------------
console.log('\n--- [5/5] Capturing Mobile Responsive Views (iPhone Viewport) ---');
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();

  // 34 Mobile Home
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await capture(page, 'Mobile Home Page (390px)', '34_mobile_home.png');

  // 35 Mobile PDP Sticky Bar
  await page.goto(`${BASE_URL}/products/b1111111-1111-4111-8111-000000000009`, { waitUntil: 'networkidle' });
  await capture(page, 'Mobile PDP Sticky Buy Bar (390px)', '35_mobile_pdp.png');

  // 36 Mobile Filter Drawer
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  const filterBtn = page.getByRole('button', { name: /Filtrar/i });
  if (await filterBtn.isVisible()) {
    await filterBtn.click();
    await capture(page, 'Mobile Filter Drawer Modal (390px)', '36_mobile_filter_drawer.png');
    await page.keyboard.press('Escape');
  }

  await context.close();
}

await browser.close();

console.log('\n=============================================================');
console.log(`[DONE] Captured ${screenshots.length} high-resolution screenshots successfully!`);
console.log(`[DONE] Artifacts directory: ${ARTIFACT_DIR}`);
console.log('=============================================================\n');
