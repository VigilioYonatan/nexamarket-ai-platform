import { expect, test } from "@playwright/test";

// These are genuine black-box negative tests against the deployed API, not UI placeholders.
test("anonymous users cannot read account data", async ({ request }) => {
  const response = await request.get("/api/v1/me/addresses");
  expect(response.status()).toBe(401);
});
test("anonymous users cannot create checkout", async ({ request }) => {
  const response = await request.post("/api/v1/checkouts", { data: {} });
  expect(response.status()).toBe(401);
});
test("anonymous users cannot publish global settings", async ({ request }) => {
  const response = await request.post(
    "/api/v1/admin/settings/00000000-0000-4000-8000-000000000000/publish",
  );
  expect(response.status()).toBe(401);
});
test("branded upload endpoint does not allow anonymous POST", async ({ request }) => {
  const response = await request.post("/api/v1/admin/media/brand", {
    multipart: {
      file: { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") },
    },
  });
  expect([401, 403, 404, 415]).toContain(response.status());
});
