import { chromium } from "playwright";

async function scrapeCategoryProducts() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    locale: "es-PE",
  });
  const page = await context.newPage();

  const categories = [
    { cat: "computacion", url: "https://www.mercadolibre.com.pe/c/computacion" },
    { cat: "audio-video", url: "https://www.mercadolibre.com.pe/c/electronica-audio-y-video" },
    { cat: "camaras", url: "https://www.mercadolibre.com.pe/c/camaras-y-accesorios" },
    { cat: "gaming", url: "https://www.mercadolibre.com.pe/c/consolas-y-videojuegos" },
  ];

  const allItems = [];

  for (const { cat, url } of categories) {
    try {
      console.log(`Scraping category: ${cat}...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
      // Scroll to trigger lazy loading
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(1500);

      const items = await page.evaluate((categoryName) => {
        const results = [];
        const seenTitles = new Set();
        // Look for cards, items, links
        const cards = document.querySelectorAll(
          ".poly-card, .ui-search-result, .ui-recommendations-card, .andes-card, a[href*='/p/MPE'], a[href*='articulo.mercadolibre.com.pe']"
        );

        for (const el of cards) {
          const title =
            el.querySelector(".poly-component__title, h2, h3, img[alt]")?.textContent?.trim() ||
            el.querySelector("img")?.alt ||
            (el.tagName === "A" ? el.textContent.trim() : "");
          
          const priceEl =
            el.querySelector(".andes-money-amount__fraction, .price-tag-fraction") ||
            el.closest("div")?.parentElement?.querySelector(".andes-money-amount__fraction");
          const price = priceEl?.textContent?.trim();

          const prevPriceEl =
            el.querySelector(".andes-money-amount--previous .andes-money-amount__fraction") ||
            el.closest("div")?.parentElement?.querySelector(".andes-money-amount--previous .andes-money-amount__fraction");
          const previousPrice = prevPriceEl?.textContent?.trim();

          const img =
            el.querySelector("img")?.src ||
            el.querySelector("img")?.getAttribute("data-src") ||
            el.querySelector("img")?.getAttribute("data-zoom");

          const link = (el.tagName === "A" ? el.href : el.querySelector("a")?.href) || "";

          if (title && title.length > 5 && !seenTitles.has(title)) {
            seenTitles.add(title);
            results.push({
              category: categoryName,
              title,
              price,
              previousPrice,
              img,
              link,
            });
          }
        }
        return results;
      }, cat);

      console.log(`Found ${items.length} items in ${cat}`);
      allItems.push(...items);
    } catch (e) {
      console.error(`Error in ${cat}:`, e.message);
    }
  }

  console.log(`\nTOTAL SCRAPED ITEMS: ${allItems.length}`);
  console.log("Sample 5 items:\n", JSON.stringify(allItems.slice(0, 5), null, 2));

  await browser.close();
}

scrapeCategoryProducts();
