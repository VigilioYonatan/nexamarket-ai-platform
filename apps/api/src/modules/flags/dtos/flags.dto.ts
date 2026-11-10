import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

export const flagName = z.enum(["reviews", "support", "ai_shopping", "public_promotions"]);
export type FlagName = z.infer<typeof flagName>;

export const flagDto = z.object({ enabled: z.boolean() }).strict();
export type FlagDto = z.infer<typeof flagDto>;

export function parseFlag(value: string): FlagName {
  const r = flagName.safeParse(value);
  if (!r.success) throw new BadRequestException({ code: "UNKNOWN_FLAG" });
  return r.data;
}
