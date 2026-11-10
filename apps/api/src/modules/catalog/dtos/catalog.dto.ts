import { z } from "zod";

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(80).optional().default(""),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).optional().default("relevance"),
  page: z.union([z.string(), z.number()]).optional().default(1),
});

export type CatalogQueryDto = z.infer<typeof catalogQuerySchema>;

export const productDetailParamSchema = z.object({
  id: z.string().uuid(),
});

export type ProductDetailParamDto = z.infer<typeof productDetailParamSchema>;
