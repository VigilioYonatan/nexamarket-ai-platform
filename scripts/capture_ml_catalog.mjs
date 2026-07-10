import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

async function capture() {
  mkdirSync("screenshots/ml_catalog", { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Desktop context
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await desktopContext.newPage();

  console.log("Capturing Home Page Storefront...");
  await page.goto("http://localhost:5175/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "screenshots/ml_catalog/01_storefront_ml_categories.png" });

  console.log("Capturing PDP iPhone 16 Pro Max (Multi-image gallery & variants)...");
  await page.goto("http://localhost:5175/products/b2222222-2222-4222-8222-000000000010", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "screenshots/ml_catalog/02_pdp_iphone16_gallery.png" });

  console.log("Capturing PDP MacBook Pro 16 M3 Max...");
  await page.goto("http://localhost:5175/products/b1111111-1111-4111-8111-111111111111", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "screenshots/ml_catalog/03_pdp_macbook_gallery.png" });

  // Mobile context (iPhone 14 / 15 Pro)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log("Capturing Mobile PDP with responsive gallery...");
  await mobilePage.goto("http://localhost:5175/products/b2222222-2222-4222-8222-000000000010", {
    waitUntil: "networkidle",
  });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: "screenshots/ml_catalog/04_mobile_pdp_gallery.png" });

  console.log("All screenshots captured in screenshots/ml_catalog/");
  await browser.close();
}

capture().catch((e) => {
  console.error("Capture failed:", e);
  process.exit(1);
});
