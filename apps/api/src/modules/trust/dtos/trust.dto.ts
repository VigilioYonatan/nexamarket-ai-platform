import { z } from "zod";
import { uuid } from "../../../shared/dto.js";

export const publishReviewDto = z
  .object({
    order_id: uuid,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10).max(2000),
  })
  .strict();

export type PublishReviewDto = z.infer<typeof publishReviewDto>;

export const moderateReviewDto = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();

export type ModerateReviewDto = z.infer<typeof moderateReviewDto>;

export const openTrustCaseDto = z
  .object({
    subject_type: z.enum(["SELLER", "LISTING", "REVIEW", "ORDER"]),
    subject_id: uuid,
    reason: z.string().trim().min(10).max(2000),
  })
  .strict();

export type OpenTrustCaseDto = z.infer<typeof openTrustCaseDto>;

export const resolveTrustCaseDto = z
  .object({
    status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
    resolution: z.string().trim().min(10).max(2000),
  })
  .strict();

export type ResolveTrustCaseDto = z.infer<typeof resolveTrustCaseDto>;
