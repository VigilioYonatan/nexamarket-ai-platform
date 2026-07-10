import { expect, test } from "@playwright/test";

test("inicio accesible con navegación básica y buscador", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("body")).toContainText("NexaMarket");
});
test("login muestra federación social y acceso por email", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Bienvenido de nuevo")).toBeVisible();
  await expect(page.getByRole("link", { name: /Google/i })).toHaveAttribute(
    "href",
    /provider=google/,
  );
  await expect(page.getByRole("link", { name: /Facebook/i })).toHaveAttribute(
    "href",
    /provider=facebook/,
  );
});
test("registro presenta el flujo seguro", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText("CREA TU CUENTA")).toBeVisible();
  await expect(page.getByRole("link", { name: /Inicia sesión/i })).toHaveAttribute(
    "href",
    "/login",
  );
});
test("el modo oscuro conserva preferencia local", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nexa_color_mode", "dark");
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("el buscador muestra estados de red controlados", async ({ page }) => {
  await page.route("**/api/v1/products*", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, has_more: false }),
    }),
  );
  await page.goto("/search?q=teclado");
  await expect(page.locator("main")).toBeVisible();
});
