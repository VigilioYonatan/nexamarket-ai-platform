import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://localhost:5175";
const ASSETS_DIR = path.resolve("docs/assets");
const VIDEOS_DIR = path.resolve("docs/assets/videos");
const FRAMES_ROOT = path.resolve("docs/assets/videos/_frames");

fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(FRAMES_ROOT, { recursive: true });

async function injectDemoOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById("showcase-demo-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "showcase-demo-cursor";
    Object.assign(cursor.style, {
      position: "fixed",
      left: "720px",
      top: "450px",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      background: "rgba(37, 99, 235, 0.28)",
      border: "2.5px solid #38bdf8",
      boxShadow: "0 0 16px rgba(56, 189, 248, 0.85)",
      pointerEvents: "none",
      zIndex: "999999",
      transform: "translate(-50%, -50%) scale(1)",
      transition: "left 240ms cubic-bezier(0.22,1,0.36,1), top 240ms cubic-bezier(0.22,1,0.36,1), transform 140ms ease, background 140ms ease",
    });
    document.body.appendChild(cursor);

    const caption = document.createElement("div");
    caption.id = "showcase-demo-caption";
    Object.assign(caption.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(9, 9, 11, 0.92)",
      color: "#ffffff",
      padding: "10px 20px",
      borderRadius: "999px",
      border: "1px solid rgba(56, 189, 248, 0.45)",
      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "14px",
      fontWeight: "700",
      letterSpacing: "0.01em",
      pointerEvents: "none",
      zIndex: "999999",
      whiteSpace: "nowrap",
    });
    caption.textContent = "NexaMarket AI · Recorrido en vivo";
    document.body.appendChild(caption);
  });
}

async function moveCursorAndCaption(page, selector, stepText, click = false) {
  await injectDemoOverlay(page);
  await page.evaluate((txt) => {
    const cap = document.getElementById("showcase-demo-caption");
    if (cap) cap.textContent = txt;
  }, stepText);

  if (selector) {
    const loc = page.locator(selector).first();
    if ((await loc.count()) > 0) {
      const box = await loc.boundingBox();
      if (box) {
        const cx = Math.round(box.x + box.width / 2);
        const cy = Math.round(box.y + box.height / 2);
        await page.evaluate(
          ({ x, y }) => {
            const c = document.getElementById("showcase-demo-cursor");
            if (c) {
              c.style.left = `${x}px`;
              c.style.top = `${y}px`;
            }
          },
          { x: cx, y: cy },
        );
        await page.waitForTimeout(260);
        if (click) {
          await page.evaluate(() => {
            const c = document.getElementById("showcase-demo-cursor");
            if (c) {
              c.style.transform = "translate(-50%, -50%) scale(0.75)";
              c.style.background = "rgba(16, 185, 129, 0.65)";
              c.style.borderColor = "#10b981";
            }
          });
          await page.waitForTimeout(120);
          await loc.click({ force: true });
          await page.evaluate(() => {
            const c = document.getElementById("showcase-demo-cursor");
            if (c) {
              c.style.transform = "translate(-50%, -50%) scale(1)";
              c.style.background = "rgba(37, 99, 235, 0.28)";
              c.style.borderColor = "#38bdf8";
            }
          });
        }
      }
    }
  }
}

async function loginRole(page, role) {
  await page.evaluate(async (r) => {
    await fetch("/auth/dev-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: r }),
    });
  }, role);
}

async function setThemeMode(page, mode) {
  await page.evaluate((m) => {
    localStorage.setItem("nexa_color_mode", m);
    document.documentElement.dataset.theme = m;
    document.documentElement.style.colorScheme = m;
  }, mode);
}

async function main() {
  console.log("Launching Chromium headless 2x Retina pipeline...");
  const browser = await chromium.launch({ headless: true });

  // =========================================================================
  // 1. STATIC 2X RETINA SCREENSHOTS (1440x900, deviceScaleFactor: 2)
  // =========================================================================
  const darkCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const darkPage = await darkCtx.newPage();

  // 01: Storefront Home (Dark Mode)
  await darkPage.goto(BASE_URL, { waitUntil: "networkidle" });
  await setThemeMode(darkPage, "dark");
  await loginRole(darkPage, "BUYER");
  await darkPage.reload({ waitUntil: "networkidle" });
  await darkPage.waitForTimeout(600);
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "01-hero-storefront-dark.png") });
  console.log("Captured 01-hero-storefront-dark.png");

  // 02: Storefront Home (Light Mode)
  const lightCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const lightPage = await lightCtx.newPage();
  await lightPage.goto(BASE_URL, { waitUntil: "networkidle" });
  await setThemeMode(lightPage, "light");
  await loginRole(lightPage, "BUYER");
  await lightPage.reload({ waitUntil: "networkidle" });
  await lightPage.waitForTimeout(600);
  await lightPage.screenshot({ path: path.join(ASSETS_DIR, "02-storefront-light.png") });
  console.log("Captured 02-storefront-light.png");

  // 03: Catalog & Search Filters (Dark Mode)
  await darkPage.goto(`${BASE_URL}/search`, { waitUntil: "networkidle" });
  await darkPage.waitForTimeout(500);
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "03-catalog-search-filters.png") });
  console.log("Captured 03-catalog-search-filters.png");

  // 04: Product Detail & Luxury Verified Reviews
  const firstProductHref = await darkPage
    .locator("a.product-name")
    .first()
    .getAttribute("href");
  const pdpUrl = firstProductHref ? `${BASE_URL}${firstProductHref}` : `${BASE_URL}/search`;
  await darkPage.goto(pdpUrl, { waitUntil: "networkidle" });
  await darkPage.waitForTimeout(500);
  const reviewsEl = darkPage.locator(".reviews-section").first();
  if ((await reviewsEl.count()) > 0) {
    await reviewsEl.scrollIntoViewIfNeeded();
    await darkPage.waitForTimeout(400);
  }
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "04-product-detail-reviews.png") });
  console.log("Captured 04-product-detail-reviews.png");

  // 05: Cart & Multi-Seller Split Checkout
  await darkPage.goto(`${BASE_URL}/cart`, { waitUntil: "networkidle" });
  await darkPage.waitForTimeout(500);
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "05-cart-checkout-split.png") });
  console.log("Captured 05-cart-checkout-split.png");

  // 06: Seller Center Portal
  await loginRole(darkPage, "SELLER");
  await darkPage.goto(`${BASE_URL}/seller`, { waitUntil: "networkidle" });
  await darkPage.waitForTimeout(600);
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "06-seller-center-portal.png") });
  console.log("Captured 06-seller-center-portal.png");

  // 07: Senior Admin Console Overview (Sidebar + KPI Cards + Interactive Charts)
  await loginRole(darkPage, "ADMIN");
  await darkPage.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  await darkPage.waitForTimeout(800);
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "07-admin-dashboard-overview.png") });
  console.log("Captured 07-admin-dashboard-overview.png");

  // 08: Senior Admin Console — Users & Roles Directory with Avatars
  const usersNavBtn = darkPage.locator("button.sidebar-nav-item:has-text('Cuentas de usuario')").first();
  if ((await usersNavBtn.count()) > 0) {
    await usersNavBtn.click();
    await darkPage.waitForTimeout(700);
  }
  const usersSection = darkPage.locator(".users-admin-section").first();
  if ((await usersSection.count()) > 0) {
    await usersSection.scrollIntoViewIfNeeded();
    await darkPage.waitForTimeout(300);
  }
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "08-admin-users-governance.png") });
  console.log("Captured 08-admin-users-governance.png");

  // 09: Nexa AI Shopping Assistant
  await darkPage.goto(`${BASE_URL}/ai`, { waitUntil: "networkidle" });
  await darkPage.waitForTimeout(500);
  const aiChip = darkPage.locator(".chip").first();
  if ((await aiChip.count()) > 0) {
    await aiChip.click();
    await darkPage.waitForTimeout(700);
  }
  await darkPage.screenshot({ path: path.join(ASSETS_DIR, "09-nexa-ai-assistant.png") });
  console.log("Captured 09-nexa-ai-assistant.png");

  await darkCtx.close();
  await lightCtx.close();

  // =========================================================================
  // 2. INTERACTIVE VIDEO & GIF DEMO 1: Storefront, Theme Switch, PDP & Reviews
  // =========================================================================
  const demo1FramesDir = path.join(FRAMES_ROOT, "demo1");
  fs.mkdirSync(demo1FramesDir, { recursive: true });
  const demo1VideoTemp = path.join(FRAMES_ROOT, "video_temp_1");
  fs.mkdirSync(demo1VideoTemp, { recursive: true });

  const vCtx1 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    recordVideo: { dir: demo1VideoTemp, size: { width: 1280, height: 800 } },
  });
  const vPage1 = await vCtx1.newPage();
  await vPage1.goto(BASE_URL, { waitUntil: "networkidle" });
  await setThemeMode(vPage1, "dark");
  await loginRole(vPage1, "BUYER");
  await vPage1.reload({ waitUntil: "networkidle" });
  await vPage1.waitForTimeout(400);

  let fIdx1 = 1;
  const snap1 = async () => {
    const p = path.join(demo1FramesDir, `frame_${String(fIdx1++).padStart(3, "0")}.png`);
    await vPage1.screenshot({ path: p });
  };

  await moveCursorAndCaption(
    vPage1,
    ".brand",
    "1/5 · Tienda oficial NexaMarket AI en Modo Oscuro con logo adaptable",
    false,
  );
  await snap1();

  await moveCursorAndCaption(
    vPage1,
    ".header-actions button.icon-button",
    "2/5 · Cambio instantáneo a Modo Claro (el logo y superficies se adaptan en vivo)",
    true,
  );
  await vPage1.waitForTimeout(350);
  await snap1();

  await moveCursorAndCaption(
    vPage1,
    ".header-actions button.icon-button",
    "3/5 · Regreso a Modo Oscuro y selección de producto verificado",
    true,
  );
  await vPage1.waitForTimeout(350);
  await snap1();

  await moveCursorAndCaption(
    vPage1,
    ".product-card a.product-name",
    "4/5 · Abriendo ficha técnica del producto con galería y stock en tiempo real",
    true,
  );
  await vPage1.waitForTimeout(500);
  await snap1();

  const revSec = vPage1.locator(".reviews-section").first();
  if ((await revSec.count()) > 0) {
    await revSec.scrollIntoViewIfNeeded();
    await vPage1.waitForTimeout(350);
  }
  await moveCursorAndCaption(
    vPage1,
    ".reviews-summary-card",
    "5/5 · Opiniones de compradores verificados con puntuación 4.9★ y filtro interactivo",
    false,
  );
  await snap1();

  const video1Obj = vPage1.video();
  await vCtx1.close();
  if (video1Obj) {
    const v1Path = await video1Obj.path();
    fs.copyFileSync(v1Path, path.join(VIDEOS_DIR, "demo-shopping-and-reviews.webm"));
    console.log("Saved demo-shopping-and-reviews.webm");
  }

  // =========================================================================
  // 3. INTERACTIVE VIDEO & GIF DEMO 2: Senior Admin Console, Charts & Users
  // =========================================================================
  const demo2FramesDir = path.join(FRAMES_ROOT, "demo2");
  fs.mkdirSync(demo2FramesDir, { recursive: true });
  const demo2VideoTemp = path.join(FRAMES_ROOT, "video_temp_2");
  fs.mkdirSync(demo2VideoTemp, { recursive: true });

  const vCtx2 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    recordVideo: { dir: demo2VideoTemp, size: { width: 1280, height: 800 } },
  });
  const vPage2 = await vCtx2.newPage();
  await vPage2.goto(BASE_URL, { waitUntil: "networkidle" });
  await setThemeMode(vPage2, "dark");
  await loginRole(vPage2, "ADMIN");
  await vPage2.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  await vPage2.waitForTimeout(500);

  let fIdx2 = 1;
  const snap2 = async () => {
    const p = path.join(demo2FramesDir, `frame_${String(fIdx2++).padStart(3, "0")}.png`);
    await vPage2.screenshot({ path: p });
  };

  await moveCursorAndCaption(
    vPage2,
    ".dashboard-chart-card",
    "1/5 · Consola Ejecutiva: Gráficos dinámicos de ingresos GMV y KPIs en tiempo real",
    false,
  );
  await snap2();

  await moveCursorAndCaption(
    vPage2,
    "button.chart-period-btn:has-text('1 Año')",
    "2/5 · Serie anual interactiva: proyección de ventas GMV (S/ 913,100) y ticket promedio",
    true,
  );
  await vPage2.waitForTimeout(350);
  await snap2();

  const dualRow = vPage2.locator(".admin-charts-dual-row").first();
  if ((await dualRow.count()) > 0) {
    await dualRow.scrollIntoViewIfNeeded();
    await vPage2.waitForTimeout(300);
  }
  await moveCursorAndCaption(
    vPage2,
    ".donut-svg-wrap",
    "3/5 · Distribución de órdenes en tiempo real y adquisición mensual de compradores y tiendas",
    false,
  );
  await snap2();

  await moveCursorAndCaption(
    vPage2,
    "button.sidebar-nav-item:has-text('Cuentas de usuario')",
    "4/5 · Directorio de Cuentas de Usuario con fotos de perfil, roles y conteo de compras",
    true,
  );
  await vPage2.waitForTimeout(550);
  const uTable = vPage2.locator(".users-admin-section").first();
  if ((await uTable.count()) > 0) {
    await uTable.scrollIntoViewIfNeeded();
    await vPage2.waitForTimeout(250);
  }
  await snap2();

  await moveCursorAndCaption(
    vPage2,
    ".dashboard-hamburger-btn",
    "5/5 · Menú Hamburguesa (☰): colapsado compacto de la barra lateral para máxima área útil",
    true,
  );
  await vPage2.waitForTimeout(400);
  await snap2();

  const video2Obj = vPage2.video();
  await vCtx2.close();
  if (video2Obj) {
    const v2Path = await video2Obj.path();
    fs.copyFileSync(v2Path, path.join(VIDEOS_DIR, "demo-admin-console-and-charts.webm"));
    console.log("Saved demo-admin-console-and-charts.webm");
  }

  // =========================================================================
  // 4. INTERACTIVE VIDEO & GIF DEMO 3: Seller Center & Nexa AI Assistant
  // =========================================================================
  const demo3FramesDir = path.join(FRAMES_ROOT, "demo3");
  fs.mkdirSync(demo3FramesDir, { recursive: true });
  const demo3VideoTemp = path.join(FRAMES_ROOT, "video_temp_3");
  fs.mkdirSync(demo3VideoTemp, { recursive: true });

  const vCtx3 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    recordVideo: { dir: demo3VideoTemp, size: { width: 1280, height: 800 } },
  });
  const vPage3 = await vCtx3.newPage();
  await vPage3.goto(BASE_URL, { waitUntil: "networkidle" });
  await setThemeMode(vPage3, "dark");
  await loginRole(vPage3, "SELLER");
  await vPage3.goto(`${BASE_URL}/seller`, { waitUntil: "networkidle" });
  await vPage3.waitForTimeout(500);

  let fIdx3 = 1;
  const snap3 = async () => {
    const p = path.join(demo3FramesDir, `frame_${String(fIdx3++).padStart(3, "0")}.png`);
    await vPage3.screenshot({ path: p });
  };

  await moveCursorAndCaption(
    vPage3,
    ".seller-connect",
    "1/4 · Seller Center: Estado de conexión con Mercado Pago y métricas del comercio",
    false,
  );
  await snap3();

  await moveCursorAndCaption(
    vPage3,
    "button.sidebar-nav-item:has-text('Métricas de Venta')",
    "2/4 · Consulta de inventario publicado, control de stock y analítica del vendedor",
    true,
  );
  await vPage3.waitForTimeout(450);
  await snap3();

  await vPage3.goto(`${BASE_URL}/ai`, { waitUntil: "networkidle" });
  await vPage3.waitForTimeout(400);
  await moveCursorAndCaption(
    vPage3,
    ".chip",
    "3/4 · Asistente Nexa AI: consulta conversacional sobre el catálogo en tiempo real",
    true,
  );
  await vPage3.waitForTimeout(600);
  await snap3();

  await moveCursorAndCaption(
    vPage3,
    ".product-card",
    "4/4 · Recomendación inteligente con stock verificado (sin acceso a datos de tarjetas)",
    false,
  );
  await snap3();

  const video3Obj = vPage3.video();
  await vCtx3.close();
  if (video3Obj) {
    const v3Path = await video3Obj.path();
    fs.copyFileSync(v3Path, path.join(VIDEOS_DIR, "demo-seller-and-ai-assistant.webm"));
    console.log("Saved demo-seller-and-ai-assistant.webm");
  }

  await browser.close();
  console.log("Playwright capture pipeline completed successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
