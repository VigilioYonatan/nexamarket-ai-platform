import { z } from "zod";

export const assistantDto = z.object({
  question: z.string().min(5).max(500),
}).strict();

export type AssistantDto = z.infer<typeof assistantDto>;
