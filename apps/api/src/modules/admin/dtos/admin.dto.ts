import { z } from "zod";

export const sellerStatusDto = z.object({
  reason: z.string().trim().min(10).max(500),
}).strict();

export type SellerStatusDto = z.infer<typeof sellerStatusDto>;

export const categoryUpdateDto = z
  .object({
    image_url: z.string().trim().max(1000).nullable().optional(),
    icon: z.string().trim().max(50).nullable().optional(),
  })
  .strict();

export type CategoryUpdateDto = z.infer<typeof categoryUpdateDto>;
