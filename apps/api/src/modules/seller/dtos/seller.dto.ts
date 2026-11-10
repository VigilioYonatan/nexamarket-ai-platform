import { z } from "zod";

export const applySellerDto = z.object({
  display_name: z.string().trim().min(3).max(80),
  legal_name: z.string().trim().min(3).max(120),
  tax_id: z.string().trim().min(8).max(30),
});

export type ApplySellerDto = z.infer<typeof applySellerDto>;

export const createProductDto = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(5000),
  category_id: z.string().uuid(),
  image_url: z.string().url().max(1000).optional(),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  gtin: z.string().trim().max(30).optional(),
  price_minor: z.number().int().min(1).max(999999999),
  quantity: z.number().int().min(0).max(10000),
});

export type CreateProductDto = z.infer<typeof createProductDto>;

export const adjustStockDto = z.object({
  delta: z.number().int().min(-10000).max(10000),
  reason: z.string().trim().min(3).max(100),
  expected_version: z.number().int().min(0),
});

export type AdjustStockDto = z.infer<typeof adjustStockDto>;

export const shipOrderDto = z
  .object({
    tracking_number: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9 -]{4,80}$/),
  })
  .strict();

export type ShipOrderDto = z.infer<typeof shipOrderDto>;
