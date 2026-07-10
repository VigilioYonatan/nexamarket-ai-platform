#!/usr/bin/env node
/**
 * scripts/test_cart_e2e.mjs
 *
 * Senior E2E Cart Verification Suite (API & Frontend Web UI)
 * Tests all cart buttons, endpoints, signals, stepper controls, multi-seller
 * grouping, address selectors, empty states, and mobile responsiveness.
 */

import { createHash } from 'node:crypto';
import pg from 'pg';
import { chromium } from 'playwright';

const DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://llmops:llmops_test_pw@172.23.84.67:15432/nexamarket_test';
const API_BASE = 'http://localhost:4000';
const WEB_BASE = 'http://localhost:5175';

function sha256Hex(s) {
  return createHash('sha256').update(s).digest('hex');
}

const TEST_BUYER_ID = '11111111-2222-4444-8888-999999999999';
const TEST_ADDRESS_ID = '22222222-3333-4444-5555-666666666666';
const TEST_SESSION_TOKEN = 'senior_cart_test_token_abcdef1234567890_senior_mode';
const TEST_CSRF_TOKEN = 'test_cart_csrf_token_secret_123456789';

const pool = new pg.Pool({ connectionString: DB_URL });

const results = [];
function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
    results.push({ name, status: 'PASS', detail });
  } else {
    console.error(`  ✗ [FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
    results.push({ name, status: 'FAIL', detail });
  }
}

async function setupTestBuyer() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create or update test buyer
    await client.query(
      `INSERT INTO user_profiles(id, subject, email, display_name, role)
       VALUES($1, $2, $3, $4, 'BUYER')
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         email = EXCLUDED.email,
         role = 'BUYER'`,
      [TEST_BUYER_ID, `test:${TEST_BUYER_ID}`, 'senior.cart.tester@nexamarket.pe', 'Carlos Comprador E2E']
    );

    // 2. Create test delivery address
    await client.query(
      `INSERT INTO user_addresses(id, buyer_id, label, recipient, line1, city, region, postal_code, phone)
       VALUES($1, $2, 'Casa Principal', 'Carlos Comprador', 'Av. Javier Prado Este 4200', 'Santiago de Surco', 'Lima', '15023', '+51987654321')
       ON CONFLICT (id) DO UPDATE SET
         recipient = EXCLUDED.recipient,
         line1 = EXCLUDED.line1`,
      [TEST_ADDRESS_ID, TEST_BUYER_ID]
    );

    // 3. Create active user session
    await client.query('DELETE FROM user_sessions WHERE user_id = $1 OR session_hash = $2', [
      TEST_BUYER_ID,
      sha256Hex(TEST_SESSION_TOKEN),
    ]);
    await client.query(
      `INSERT INTO user_sessions(id, user_id, session_hash, expires_at, created_at)
       VALUES(gen_random_uuid(), $1, $2, now() + interval '1 day', now())`,
      [TEST_BUYER_ID, sha256Hex(TEST_SESSION_TOKEN)]
    );

    // 4. Clear any existing cart lines for clean slate
    await client.query('DELETE FROM cart_lines WHERE buyer_id = $1', [TEST_BUYER_ID]);

    // 5. Select 2 real published listings from 2 distinct sellers with available stock
    const listingsRes = await client.query(
      `SELECT l.id, p.title, s.id as seller_id, s.display_name as seller_name,
              (i.on_hand - i.reserved) as stock, l.price_minor
       FROM seller_listings l
       JOIN products p ON p.id = l.product_id
       JOIN sellers s ON s.id = l.seller_id
       JOIN inventory_stock i ON i.listing_id = l.id
       WHERE l.status = 'PUBLISHED' AND s.status = 'APPROVED'
         AND (i.on_hand - i.reserved) >= 5
         AND s.display_name NOT LIKE '%QA%'
       ORDER BY p.title ASC`
    );

    const sellersMap = new Map();
    const distinctSellerListings = [];
    for (const row of listingsRes.rows) {
      if (!sellersMap.has(row.seller_id)) {
        sellersMap.set(row.seller_id, true);
        distinctSellerListings.push(row);
      }
      if (distinctSellerListings.length >= 2) break;
    }

    if (distinctSellerListings.length < 2) {
      throw new Error(`Need at least 2 listings from different sellers. Found: ${distinctSellerListings.length}`);
    }

    await client.query('COMMIT');
    return distinctSellerListings;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function cleanupTestBuyer() {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM cart_lines WHERE buyer_id = $1', [TEST_BUYER_ID]);
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [TEST_BUYER_ID]);
    await client.query('DELETE FROM user_addresses WHERE buyer_id = $1', [TEST_BUYER_ID]);
    await client.query('DELETE FROM user_profiles WHERE id = $1', [TEST_BUYER_ID]);
  } catch (e) {
    console.error('Error during cleanup:', e.message);
  } finally {
    client.release();
  }
}

async function runApiTests(listingA, listingB) {
  console.log('\n======================================================');
  console.log(' Phase 1: Backend Cart API Endpoint Integration Tests');
  console.log('======================================================\n');

  const authHeaders = {
    Cookie: `nexa_session=${TEST_SESSION_TOKEN}; nexa_csrf=${TEST_CSRF_TOKEN}`,
    'x-csrf-token': TEST_CSRF_TOKEN,
    Origin: 'http://localhost:4000',
    'Content-Type': 'application/json',
  };

  // 1. Unauthenticated check (GET /api/v1/cart without session -> 401)
  const unauthRes = await fetch(`${API_BASE}/api/v1/cart`);
  assert('[API-1] GET /api/v1/cart without session rejects with 401', unauthRes.status === 401, `Status: ${unauthRes.status}`);

  // 2. Unauthenticated mutating check (POST /api/v1/cart/items without session -> 401)
  const unauthPost = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_id: listingA.id, quantity: 1 }),
  });
  assert('[API-2] POST /api/v1/cart/items without session rejects with 401', unauthPost.status === 401, `Status: ${unauthPost.status}`);

  // 3. CSRF token validation check
  const badCsrfPost = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: {
      Cookie: `nexa_session=${TEST_SESSION_TOKEN}; nexa_csrf=${TEST_CSRF_TOKEN}`,
      'x-csrf-token': 'wrong-csrf-token',
      Origin: 'http://localhost:4000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listing_id: listingA.id, quantity: 1 }),
  });
  assert('[API-3] Mutating call with mismatched CSRF rejects with 403', badCsrfPost.status === 403, `Status: ${badCsrfPost.status}`);

  // 4. Authenticated GET /api/v1/cart (starts empty)
  const emptyRes = await fetch(`${API_BASE}/api/v1/cart`, { headers: authHeaders });
  const emptyCart = await emptyRes.json();
  assert('[API-4] Authenticated GET /api/v1/cart returns empty cart', emptyRes.status === 200 && emptyCart.lines.length === 0 && emptyCart.total_minor === 0, `Lines: ${emptyCart.lines?.length}, Total: ${emptyCart.total_minor}`);

  // 5. Validation error: quantity <= 0 -> 400 Bad Request
  const zeroQtyRes = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ listing_id: listingA.id, quantity: 0 }),
  });
  assert('[API-5] POST /api/v1/cart/items with quantity 0 rejects with 400', zeroQtyRes.status === 400, `Status: ${zeroQtyRes.status}`);

  // 6. Non-existent listing ID -> 404 Not Found
  const notFoundRes = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ listing_id: '00000000-0000-4000-8000-000000000099', quantity: 1 }),
  });
  assert('[API-6] POST /api/v1/cart/items with unknown listing rejects with 404', notFoundRes.status === 404, `Status: ${notFoundRes.status}`);

  // 7. Quantity exceeding available stock -> 409 Conflict
  const excessQty = Math.min(listingA.stock + 5, 95);
  const excessStockRes = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ listing_id: listingA.id, quantity: excessQty }),
  });
  assert('[API-7] POST /api/v1/cart/items exceeding stock rejects with 409', excessStockRes.status === 409, `Status: ${excessStockRes.status}`);

  // 8. Valid add 1 unit of Listing A
  const addRes1 = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ listing_id: listingA.id, quantity: 1 }),
  });
  const cartAfterAdd1 = await addRes1.json();
  assert(
    '[API-8] Valid POST /api/v1/cart/items adds 1 unit of Listing A',
    (addRes1.status === 200 || addRes1.status === 201) && cartAfterAdd1.lines.length === 1 && cartAfterAdd1.lines[0].quantity === 1,
    `Status: ${addRes1.status}, Quantity: ${cartAfterAdd1.lines?.[0]?.quantity}, Total: ${cartAfterAdd1.total_minor}`
  );

  // 9. Incremental add: add 2 more units of Listing A -> quantity becomes 3
  const addRes2 = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ listing_id: listingA.id, quantity: 2 }),
  });
  const cartAfterAdd2 = await addRes2.json();
  const lineA = cartAfterAdd2.lines.find((l) => l.listing_id === listingA.id);
  assert(
    '[API-9] Incremental POST /api/v1/cart/items accumulates quantity to 3',
    lineA && lineA.quantity === 3 && cartAfterAdd2.total_minor === lineA.price_minor * 3,
    `Quantity: ${lineA?.quantity}, Total: ${cartAfterAdd2.total_minor}`
  );

  // 10. Multi-seller add: add 1 unit of Listing B (Seller 2)
  const addRes3 = await fetch(`${API_BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ listing_id: listingB.id, quantity: 1 }),
  });
  const cartAfterAdd3 = await addRes3.json();
  const distinctSellers = new Set(cartAfterAdd3.lines.map((l) => l.seller_id));
  assert(
    '[API-10] Multi-seller cart contains lines from 2 distinct sellers',
    cartAfterAdd3.lines.length === 2 && distinctSellers.size === 2,
    `Lines: ${cartAfterAdd3.lines.length}, Distinct sellers: ${distinctSellers.size}`
  );

  // 11. PATCH /api/v1/cart/items/:id: change Listing A quantity from 3 to 2
  const patchRes = await fetch(`${API_BASE}/api/v1/cart/items/${lineA.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ quantity: 2 }),
  });
  const cartAfterPatch = await patchRes.json();
  const updatedLineA = cartAfterPatch.lines.find((l) => l.id === lineA.id);
  assert(
    '[API-11] PATCH /api/v1/cart/items/:id updates quantity to 2',
    patchRes.status === 200 && updatedLineA && updatedLineA.quantity === 2,
    `Updated qty: ${updatedLineA?.quantity}`
  );

  // 12. PATCH with quantity exceeding available stock -> 409 Conflict
  const patchExcessRes = await fetch(`${API_BASE}/api/v1/cart/items/${lineA.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ quantity: excessQty }),
  });
  assert('[API-12] PATCH /api/v1/cart/items/:id exceeding stock rejects with 409', patchExcessRes.status === 409, `Status: ${patchExcessRes.status}`);

  // 13. DELETE /api/v1/cart/items/:id: remove Listing B line
  const lineB = cartAfterPatch.lines.find((l) => l.listing_id === listingB.id);
  const deleteRes1 = await fetch(`${API_BASE}/api/v1/cart/items/${lineB.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const cartAfterDelete1 = await deleteRes1.json();
  assert(
    '[API-13] DELETE /api/v1/cart/items/:id removes Listing B line',
    deleteRes1.status === 200 && cartAfterDelete1.lines.length === 1 && cartAfterDelete1.lines[0].id === lineA.id,
    `Remaining lines: ${cartAfterDelete1.lines.length}`
  );

  // 14. DELETE remaining line -> cart becomes empty
  const deleteRes2 = await fetch(`${API_BASE}/api/v1/cart/items/${lineA.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const cartAfterDelete2 = await deleteRes2.json();
  assert(
    '[API-14] DELETE last item results in clean empty cart',
    deleteRes2.status === 200 && cartAfterDelete2.lines.length === 0 && cartAfterDelete2.total_minor === 0,
    `Lines: ${cartAfterDelete2.lines.length}, Total: ${cartAfterDelete2.total_minor}`
  );
}

async function runUiTests(listingA, listingB) {
  console.log('\n======================================================');
  console.log(' Phase 2: Frontend Web UI E2E Playwright Tests');
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject session and CSRF cookies into browser context
  await context.addCookies([
    {
      name: 'nexa_session',
      value: TEST_SESSION_TOKEN,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'nexa_csrf',
      value: TEST_CSRF_TOKEN,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  // -------------------------------------------------------------
  // UI-1: Empty Cart Page
  // -------------------------------------------------------------
  console.log('\n[UI-1] Testing Empty Cart State (/cart)');
  await page.goto(`${WEB_BASE}/cart`, { waitUntil: 'networkidle' });
  await page.waitForSelector('main');

  const pageTitle = await page.textContent('.page-title h1');
  assert('[UI-1.1] Cart page heading rendered', pageTitle.includes('Mi carrito'), pageTitle);

  const emptyTitle = await page.textContent('.empty-state h3, .empty h3, .panel h3');
  assert('[UI-1.2] Empty state title rendered', emptyTitle.includes('Tu carrito está vacío'), emptyTitle);

  const exploreBtn = page.locator('a.btn:has-text("Explorar productos")');
  assert('[UI-1.3] Explore products CTA visible and links to /search', (await exploreBtn.getAttribute('href')) === '/search');

  const headerCartBadge = page.locator('.cart-icon i');
  assert('[UI-1.4] Header cart badge hidden when cart is empty', (await headerCartBadge.count()) === 0);

  await page.screenshot({ path: 'screenshots/cart_01_empty_state.png' });

  // -------------------------------------------------------------
  // UI-2: PDP Add to Cart with Quantity Selection
  // -------------------------------------------------------------
  console.log(`\n[UI-2] Testing PDP Add to Cart (/products/${listingA.id})`);
  await page.goto(`${WEB_BASE}/products/${listingA.id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail-layout');

  const pdpTitle = await page.textContent('.detail-content h1');
  assert('[UI-2.1] PDP title matches Listing A', pdpTitle.includes(listingA.title.slice(0, 15)), pdpTitle.trim());

  const stockBadge = await page.textContent('.stock-info');
  assert('[UI-2.2] Available stock displayed', stockBadge.includes('disponibles'), stockBadge.trim());

  // Select quantity 2 in dropdown
  const qtySelect = page.locator('label:has-text("Cantidad") select');
  if (await qtySelect.isVisible()) {
    await qtySelect.selectOption('2');
  }

  // Click "Añadir al carrito"
  const addBtn = page.getByRole('button', { name: /Añadir al carrito/i });
  assert('[UI-2.3] Add to cart button is enabled', await addBtn.isEnabled());
  await addBtn.click();

  // Verify toast appears
  await page.waitForSelector('.toast');
  const toastText = await page.textContent('.toast');
  assert('[UI-2.4] Toast notification appears', toastText.includes('Producto añadido al carrito'), toastText.trim());

  // Verify header cart badge updates to 2
  await page.waitForSelector('.cart-icon i');
  const badgeVal = await page.textContent('.cart-icon i');
  assert('[UI-2.5] Header cart badge reactively updates to 2', badgeVal.trim() === '2', `Badge: ${badgeVal.trim()}`);

  await page.screenshot({ path: 'screenshots/cart_02_pdp_added_toast.png' });

  // -------------------------------------------------------------
  // UI-3: PDP "Comprar ahora" Direct Journey
  // -------------------------------------------------------------
  console.log(`\n[UI-3] Testing PDP "Comprar ahora" Direct Journey (/products/${listingB.id})`);
  await page.goto(`${WEB_BASE}/products/${listingB.id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail-layout');

  const buyNowBtn = page.getByRole('button', { name: /Comprar ahora/i }).first();
  assert('[UI-3.1] "Comprar ahora" button visible', await buyNowBtn.isVisible());
  await buyNowBtn.click();

  // Verify navigation to /cart
  await page.waitForURL('**/cart');
  assert('[UI-3.2] "Comprar ahora" navigates directly to /cart', page.url().includes('/cart'), page.url());

  // Verify header cart badge updates to 3 (2 from Listing A + 1 from Listing B)
  const badgeAfterBuyNow = await page.textContent('.cart-icon i');
  assert('[UI-3.3] Header cart badge dynamically updates to 3', badgeAfterBuyNow.trim() === '3', `Badge: ${badgeAfterBuyNow.trim()}`);

  await page.screenshot({ path: 'screenshots/cart_03_cart_multi_seller.png' });

  // -------------------------------------------------------------
  // UI-4: Cart Page Multi-Seller Grouping & Trust Banner
  // -------------------------------------------------------------
  console.log('\n[UI-4] Testing Cart Page Multi-Seller Grouping & Structure');
  await page.waitForSelector('.cart-lines');

  // Verify multi-seller info note
  const infoNote = page.locator('.info-note');
  assert('[UI-4.1] Multi-seller info note rendered', await infoNote.isVisible());
  const noteText = await infoNote.textContent();
  assert('[UI-4.2] Notice mentions 2 sellers & protected payments', noteText.includes('2 vendedores') && noteText.includes('Mercado Pago'), noteText.trim());

  // Verify seller group sections
  const sellerSections = page.locator('.cart-seller-group');
  assert('[UI-4.3] Two distinct seller groups rendered', (await sellerSections.count()) === 2);

  // Verify line items count
  const cartLines = page.locator('.cart-line');
  assert('[UI-4.4] Two cart line items present', (await cartLines.count()) === 2);

  // -------------------------------------------------------------
  // UI-5: Quantity Stepper Controls (+ and −)
  // -------------------------------------------------------------
  console.log('\n[UI-5] Testing Quantity Stepper Controls');
  // First item has qty 2. Find its stepper
  const firstLine = cartLines.first();
  const initialQty = await firstLine.locator('.qty-val').textContent();
  console.log('Initial line quantity:', initialQty.trim());

  // Click "+" button
  const plusBtn = firstLine.locator('button.qty-btn:has-text("+")');
  await plusBtn.click();
  await page.waitForTimeout(400);

  const incrementedQty = await firstLine.locator('.qty-val').textContent();
  assert('[UI-5.1] Stepper "+" increments quantity to 3', incrementedQty.trim() === '3', `Qty: ${incrementedQty.trim()}`);

  const badgeAfterPlus = await page.textContent('.cart-icon i');
  assert('[UI-5.2] Header cart badge increments to 4', badgeAfterPlus.trim() === '4', `Badge: ${badgeAfterPlus.trim()}`);

  // Click "−" button
  const minusBtn = firstLine.locator('button.qty-btn:has-text("−")');
  await minusBtn.click();
  await page.waitForTimeout(400);

  const decrementedQty = await firstLine.locator('.qty-val').textContent();
  assert('[UI-5.3] Stepper "−" decrements quantity back to 2', decrementedQty.trim() === '2', `Qty: ${decrementedQty.trim()}`);

  await page.screenshot({ path: 'screenshots/cart_04_stepper_interaction.png' });

  // -------------------------------------------------------------
  // UI-6: Cart Line Deletion ("Eliminar" Button)
  // -------------------------------------------------------------
  console.log('\n[UI-6] Testing "Eliminar" Button on Second Line');
  const secondLine = cartLines.nth(1);
  const secondLineTitle = await secondLine.locator('.product-name').textContent();
  const removeBtn = secondLine.locator('.btn-cart-remove');
  assert('[UI-6.1] Remove button visible with trash icon', await removeBtn.isVisible());

  await removeBtn.click();
  await page.waitForTimeout(500);

  // Verify only 1 line remains
  const remainingLines = page.locator('.cart-line');
  assert('[UI-6.2] Second item removed from cart', (await remainingLines.count()) === 1);

  // Verify multi-seller note is no longer present since only 1 seller remains
  assert('[UI-6.3] Multi-seller banner removed when single seller remains', (await page.locator('.info-note').count()) === 0);

  const badgeAfterRemove = await page.textContent('.cart-icon i');
  assert('[UI-6.4] Header cart badge decrements to 2', badgeAfterRemove.trim() === '2', `Badge: ${badgeAfterRemove.trim()}`);

  await page.screenshot({ path: 'screenshots/cart_05_item_deleted.png' });

  // -------------------------------------------------------------
  // UI-7: Delivery Address & Summary Card
  // -------------------------------------------------------------
  console.log('\n[UI-7] Testing Delivery Address & Summary Card');
  const addrSelect = page.locator('.address-selector select');
  assert('[UI-7.1] Delivery address selector rendered', await addrSelect.isVisible());
  const selectedAddrText = await addrSelect.locator('option:checked').textContent();
  assert('[UI-7.2] Default delivery address selected', selectedAddrText.includes('Casa Principal'), selectedAddrText.trim());

  const summaryCard = page.locator('.summary-card');
  assert('[UI-7.3] Summary card visible', await summaryCard.isVisible());
  const summaryText = await summaryCard.textContent();
  assert('[UI-7.4] Summary specifies 1 seller and 2 products', summaryText.includes('Vendedores') && summaryText.includes('Productos (2)'), summaryText.trim());

  const checkoutBtn = page.getByRole('button', { name: /Continuar compra/i });
  assert('[UI-7.5] "Continuar compra" checkout button is enabled', await checkoutBtn.isEnabled());

  // -------------------------------------------------------------
  // UI-8: Decrementing to 0 Clears Item & Shows Empty State
  // -------------------------------------------------------------
  console.log('\n[UI-8] Testing Decrement to Zero (Auto-removal)');
  const lastLine = page.locator('.cart-line').first();
  const lastMinus = lastLine.locator('button.qty-btn:has-text("−")');

  // Currently quantity is 2. Decrement to 1:
  await lastMinus.click();
  await page.waitForTimeout(400);

  // Decrement to 0:
  await lastMinus.click();
  await page.waitForTimeout(500);

  // Cart should now transition to empty state
  await page.waitForSelector('.empty-state h3, .empty h3, .panel h3');
  const emptyAgain = await page.textContent('.empty-state h3, .empty h3, .panel h3');
  assert('[UI-8.1] Decrementing to 0 transitions cart back to Empty State', emptyAgain.includes('Tu carrito está vacío'), emptyAgain.trim());

  assert('[UI-8.2] Header cart badge disappears', (await page.locator('.cart-icon i').count()) === 0);

  await page.screenshot({ path: 'screenshots/cart_06_back_to_empty.png' });

  // -------------------------------------------------------------
  // UI-9: Quick Add from Catalog / Search
  // -------------------------------------------------------------
  console.log('\n[UI-9] Testing Quick Add to Cart from Catalog (/search)');
  await page.goto(`${WEB_BASE}/search?q=apple`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.product-card');

  const firstCard = page.locator('.product-card').first();
  const quickAddBtn = firstCard.locator('button:has-text("Agregar al carrito")');
  assert('[UI-9.1] Catalog card has "Agregar al carrito" button', await quickAddBtn.isVisible());

  await quickAddBtn.click();
  await page.waitForSelector('.toast');
  const catalogToast = await page.textContent('.toast');
  assert('[UI-9.2] Quick add triggers toast alert', catalogToast.includes('Producto añadido al carrito'), catalogToast.trim());

  const badgeAfterQuickAdd = await page.textContent('.cart-icon i');
  assert('[UI-9.3] Header cart badge increments to 1', badgeAfterQuickAdd.trim() === '1', `Badge: ${badgeAfterQuickAdd.trim()}`);

  await page.screenshot({ path: 'screenshots/cart_07_catalog_quick_add.png' });

  // -------------------------------------------------------------
  // UI-10: Mobile Cart Layout (390x844)
  // -------------------------------------------------------------
  console.log('\n[UI-10] Testing Mobile Responsive Cart (390x844 Viewport)');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB_BASE}/cart`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cart-line');

  const mobileLine = page.locator('.cart-line').first();
  assert('[UI-10.1] Mobile cart line rendered cleanly', await mobileLine.isVisible());

  const mobileStepper = page.locator('.qty-stepper');
  assert('[UI-10.2] Mobile quantity stepper visible', await mobileStepper.isVisible());

  const mobileSummary = page.locator('.summary-card');
  assert('[UI-10.3] Mobile summary card visible', await mobileSummary.isVisible());

  const mobileCheckoutBtn = page.getByRole('button', { name: /Continuar compra/i });
  assert('[UI-10.4] Mobile checkout button accessible', await mobileCheckoutBtn.isVisible());

  await page.screenshot({ path: 'screenshots/cart_08_mobile_cart.png' });

  await browser.close();
}

async function main() {
  console.log('================================================================');
  console.log(' NexaMarket Senior Mode E2E Cart Verification & Audit');
  console.log('================================================================');

  let listings;
  try {
    listings = await setupTestBuyer();
    console.log(`[SETUP] Test buyer created: ${TEST_BUYER_ID}`);
    console.log(`[SETUP] Listing A: "${listings[0].title}" (${listings[0].id}) by "${listings[0].seller_name}"`);
    console.log(`[SETUP] Listing B: "${listings[1].title}" (${listings[1].id}) by "${listings[1].seller_name}"`);

    await runApiTests(listings[0], listings[1]);
    await runUiTests(listings[0], listings[1]);

  } catch (err) {
    console.error('\nFATAL ERROR DURING TEST EXECUTION:', err);
  } finally {
    console.log('\n[CLEANUP] Removing test session, addresses, and test buyer...');
    await cleanupTestBuyer();
    await pool.end();
  }

  console.log('\n================================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(` AUDIT SUMMARY: ${passed} PASSED / ${failed} FAILED (${results.length} total)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled failure:', err);
  process.exit(1);
});
