import { z } from "zod";
import { uuid } from "../../../shared/dto.js";

export const ticketDto = z
  .object({
    order_id: uuid.optional(),
    category: z.enum(["ORDER", "PAYMENT", "RETURN", "ACCOUNT", "OTHER"]),
    subject: z.string().trim().min(5).max(150),
    message: z.string().trim().min(2).max(4000),
  })
  .strict();

export type TicketDto = z.infer<typeof ticketDto>;

export const ticketMessageDto = z
  .object({
    message: z.string().trim().min(2).max(4000),
  })
  .strict();

export type TicketMessageDto = z.infer<typeof ticketMessageDto>;

export const ticketStatusDto = z
  .object({
    status: z.enum(["OPEN", "WAITING_CUSTOMER", "WAITING_SUPPORT", "CLOSED"]),
  })
  .strict();

export type TicketStatusDto = z.infer<typeof ticketStatusDto>;
