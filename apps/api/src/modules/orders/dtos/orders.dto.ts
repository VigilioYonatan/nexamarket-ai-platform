import { z } from "zod";

export const orderParamSchema = z.object({
  id: z.string().uuid(),
});

export type OrderParamDto = z.infer<typeof orderParamSchema>;

export const deliveryConfirmParamSchema = z.object({
  order_id: z.string().uuid(),
  seller_order_id: z.string().uuid(),
});

export type DeliveryConfirmParamDto = z.infer<typeof deliveryConfirmParamSchema>;
