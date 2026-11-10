import { z } from "zod";

export const addressDto = z.object({
  label: z.string().trim().min(2).max(40),
  recipient: z.string().trim().min(2).max(80),
  line1: z.string().trim().min(5).max(140),
  city: z.string().trim().min(2).max(60),
  region: z.string().trim().min(2).max(60),
  postal_code: z.string().trim().min(4).max(20),
  phone: z.string().trim().min(6).max(25),
});

export type AddressDto = z.infer<typeof addressDto>;

export const returnDto = z.object({
  reason: z.string().trim().min(10).max(500),
  seller_order_id: z.string().uuid().optional(),
});

export type ReturnDto = z.infer<typeof returnDto>;

export const avatarUpdateDto = z.object({
  avatar_url: z.string().url().max(1000),
});

export type AvatarUpdateDto = z.infer<typeof avatarUpdateDto>;
