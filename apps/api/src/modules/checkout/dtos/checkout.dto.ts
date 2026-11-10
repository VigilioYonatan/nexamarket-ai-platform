import { z } from "zod";

export const createCheckoutDto = z.object({
  address_id: z.string().uuid().optional(),
});

export type CreateCheckoutDto = z.infer<typeof createCheckoutDto>;
