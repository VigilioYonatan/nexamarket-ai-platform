import { z } from "zod";

export const addCartDto = z.object({
  listing_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});

export type AddCartDto = z.infer<typeof addCartDto>;

export const editCartDto = z.object({
  quantity: z.number().int().min(1).max(100),
});

export type EditCartDto = z.infer<typeof editCartDto>;
