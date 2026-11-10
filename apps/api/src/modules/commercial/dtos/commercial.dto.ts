import { z } from "zod";

export const commissionDto = z.object({
  commission_bps: z.number().int().min(0).max(3000),
}).strict();

export type CommissionDto = z.infer<typeof commissionDto>;
