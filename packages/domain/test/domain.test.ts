import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceOrder,
  assertCanReserve,
  assertCartBound,
  assertRefundAllowed,
  cartTotal,
  contrastRatio,
  defaultTheme,
  inventoryAvailable,
  lineTotal,
  moderateReview,
  uniqueSellerGroups,
  validateJournal,
  validateTheme,
  validGtin,
} from "../src/index.ts";

describe("Inventario y dinero", () => {
  it("reserva exactamente una unidad", () => {
    assert.equal(inventoryAvailable(1, 0), 1);
    assert.doesNotThrow(() => assertCanReserve(1, 0, 1));
  });
  it("rechaza sobreventa", () =>
    assert.throws(() => assertCanReserve(1, 1, 1), { code: "INSUFFICIENT_STOCK" }));
  it("rechaza cantidad no entera o no positiva", () => {
    for (const q of [0, -1, 1.2, Infinity]) assert.throws(() => lineTotal(100, q));
  });
  it("usa unidades menores enteras", () =>
    assert.equal(
      cartTotal([
        { unit_price_minor: 29990, quantity: 2 },
        { unit_price_minor: 1, quantity: 3 },
      ]),
      59983,
    ));
  it("evita overflow y dinero negativo", () => {
    assert.throws(() => lineTotal(Number.MAX_SAFE_INTEGER, 2));
    assert.throws(() => lineTotal(-100, 1));
  });
  it("rechaza inventario imposible", () => assert.throws(() => inventoryAvailable(0, 1)));
});
describe("Estados y contabilidad", () => {
  it("aprueba transición explícita", () =>
    assert.equal(advanceOrder("AWAITING_PAYMENT", "PAID"), "PAID"));
  it("no permite entrega sin pago", () =>
    assert.throws(() => advanceOrder("AWAITING_PAYMENT", "SHIPPED")));
  it("no permite segundo reembolso por encima de cobrado", () =>
    assert.throws(() => assertRefundAllowed(100, 80, 21)));
  it("acepta reembolso parcial válido", () =>
    assert.doesNotThrow(() => assertRefundAllowed(100, 80, 20)));
  it("ledger balanceado por moneda", () =>
    assert.doesNotThrow(() =>
      validateJournal([
        { currency: "PEN", amount_minor: 100 },
        { currency: "PEN", amount_minor: -100 },
      ]),
    ));
  it("ledger rechaza monedas desbalanceadas", () =>
    assert.throws(() =>
      validateJournal([
        { currency: "PEN", amount_minor: 100 },
        { currency: "USD", amount_minor: -100 },
      ]),
    ));
});
describe("Configuración y agrupación", () => {
  it("tema inicial WCAG", () => assert.doesNotThrow(() => validateTheme(defaultTheme)));
  it("contraste invertido es simétrico", () =>
    assert.equal(contrastRatio("#000000", "#FFFFFF"), contrastRatio("#FFFFFF", "#000000")));
  it("rechaza contraste malo y fuentes sin allowlist", () => {
    assert.throws(() => validateTheme({ ...defaultTheme, text: "#FFFFFF" }));
    assert.throws(() => validateTheme({ ...defaultTheme, font: "url(https://evil)" }));
  });
  it("agrupa carrito por vendedor", () => {
    const g = uniqueSellerGroups([
      { seller_id: "a", id: 1 },
      { seller_id: "b", id: 2 },
      { seller_id: "a", id: 3 },
    ]);
    assert.deepEqual(
      g.get("a")?.map((i) => i.id),
      [1, 3],
    );
  });
});

describe("GTIN verificable y catálogo canónico", () => {
  it("acepta GTIN-13 con dígito GS1 válido", () => assert.equal(validGtin("4006381333931"), true));
  it("acepta GTIN-12 y GTIN-8 válidos", () => {
    assert.equal(validGtin("036000291452"), true);
    assert.equal(validGtin("96385074"), true);
  });
  it("no acepta dígitos de control falsificados", () =>
    assert.equal(validGtin("4006381333932"), false));
  it("no acepta códigos no numéricos ni longitud arbitraria", () => {
    for (const code of ["", "1234567", "0000AAA00000", " 4006381333931", "123456789012345"])
      assert.equal(validGtin(code), false);
  });
});

describe("Carrito y moderación", () => {
  it("acumula unidades dentro del máximo y el stock", () =>
    assert.equal(assertCartBound(2, 3, 10), 5));
  it("no permite exceder 100 unidades por publicación", () =>
    assert.throws(() => assertCartBound(99, 2, 500), {
      code: "CART_QUANTITY_EXCEEDS_STOCK_OR_LIMIT",
    }));
  it("no permite saltar el límite por reintentos al añadir", () =>
    assert.throws(() => assertCartBound(8, 3, 10), {
      code: "CART_QUANTITY_EXCEEDS_STOCK_OR_LIMIT",
    }));
  it("rechaza números decimales, negativos o no finitos", () => {
    for (const n of [1.2, Infinity, -1, NaN]) assert.throws(() => assertCartBound(n, 1, 5));
  });
  it("rechaza incremento cero y disponibilidad negativa", () => {
    assert.throws(() => assertCartBound(1, 0, 9));
    assert.throws(() => assertCartBound(1, 1, -3));
  });
  it("solo modera una reseña pendiente", () => {
    assert.equal(moderateReview("PENDING", "APPROVED"), "APPROVED");
    assert.equal(moderateReview("PENDING", "REJECTED"), "REJECTED");
  });
  it("evita moderación repetida", () => {
    assert.throws(() => moderateReview("APPROVED", "REJECTED"), { code: "REVIEW_NOT_PENDING" });
    assert.throws(() => moderateReview("REJECTED", "APPROVED"), { code: "REVIEW_NOT_PENDING" });
  });
});
