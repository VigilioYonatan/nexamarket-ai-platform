import { z } from "zod";

export const recommendationParamSchema = z.object({
  id: z.string().uuid(),
});

export type RecommendationParamDto = z.infer<typeof recommendationParamSchema>;
