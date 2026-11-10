import { z } from "zod";

export const devLoginDto = z.object({
  role: z.enum(["BUYER", "SELLER", "ADMIN"]).optional(),
  email: z.string().email().optional(),
  name: z.string().trim().min(1).max(100).optional(),
});

export type DevLoginDto = z.infer<typeof devLoginDto>;

export const authCallbackQueryDto = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type AuthCallbackQueryDto = z.infer<typeof authCallbackQueryDto>;
