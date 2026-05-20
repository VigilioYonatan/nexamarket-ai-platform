import { validGtin } from "@nexa/domain";
import { z } from "zod";
export const uuid = z.string().uuid();
export const addCartDto = z
  .object({ listing_id: uuid, quantity: z.number().int().min(1).max(100) })
  .strict();
export type AddCartDto = z.infer<typeof addCartDto>;
export const editCartDto = z.object({ quantity: z.number().int().min(1).max(100) }).strict();
export const createCheckoutDto = z.object({ address_id: uuid.optional() }).strict();
export const submitPaymentDto = z
  .object({
    seller_order_id: uuid,
    token: z.string().min(5).max(512),
    payment_method_id: z.string().min(1).max(64),
    installments: z.number().int().min(1).max(48),
    issuer_id: z.string().max(64).optional(),
    identification_type: z.string().max(12).optional(),
    identification_number: z.string().max(40).optional(),
  })
  .strict();
export const applySellerDto = z
  .object({
    display_name: z.string().trim().min(3).max(120),
    legal_name: z.string().trim().min(3).max(160),
    tax_id: z.string().trim().min(6).max(24),
  })
  .strict();
export const createProductDto = z
  .object({
    title: z.string().trim().min(5).max(200),
    description: z.string().trim().min(10).max(4000),
    brand: z.string().trim().min(2).max(100).optional(),
    model: z.string().trim().min(2).max(120).optional(),
    gtin: z.string().refine(validGtin, "GTIN inválido").optional(),
    category_id: uuid,
    image_url: z
      .string()
      .regex(/^\/media\/products\/[0-9a-f-]{36}\.webp$/i)
      .optional(),
    price_minor: z.number().int().min(1).max(100000000),
    quantity: z.number().int().min(0).max(100000),
  })
  .strict();
export const adjustStockDto = z
  .object({
    delta: z
      .number()
      .int()
      .min(-10000)
      .max(10000)
      .refine((n) => n !== 0),
    expected_version: z.number().int().nonnegative(),
    reason: z.enum(["RECEIPT", "CORRECTION", "DAMAGE"]),
  })
  .strict();
export const themeDto = z
  .object({
    primary: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    radius: z.number(),
    font: z.string(),
    brand_name: z.string().min(2).max(60).optional(),
    logo_url: z.string().max(130).optional(),
    hero_title: z.string().max(100).optional(),
    hero_subtitle: z.string().max(240).optional(),
  })
  .strict();
export const addressDto = z
  .object({
    label: z.string().min(1).max(60),
    recipient: z.string().min(2).max(120),
    line1: z.string().min(5).max(180),
    city: z.string().min(2).max(100),
    region: z.string().min(2).max(100),
    postal_code: z.string().max(16),
    phone: z.string().min(6).max(30),
  })
  .strict();
export const returnDto = z
  .object({ seller_order_id: uuid.optional(), reason: z.string().trim().min(10).max(1000) })
  .strict();
export const reviewDto = z
  .object({
    order_id: uuid,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10).max(2000),
  })
  .strict();
