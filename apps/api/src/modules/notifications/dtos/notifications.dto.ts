import { z } from "zod";

export const notificationParamSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationParamDto = z.infer<typeof notificationParamSchema>;
