import { z } from "zod";

export const reviewReturnDto = z
  .object({
    decision: z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED"]),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();

export type ReviewReturnDto = z.infer<typeof reviewReturnDto>;
