import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  parseUuid,
  SessionGuard,
  ZodPipe,
} from "../../../shared/http.js";
import {
  type TicketDto,
  ticketDto,
  type TicketMessageDto,
  ticketMessageDto,
  type TicketStatusDto,
  ticketStatusDto,
} from "../dtos/support.dto.js";
import { SupportService } from "../services/support.service.js";

@Controller("api/v1/me/support")
@UseGuards(SessionGuard)
export class MySupportController {
  constructor(private readonly support: SupportService) {}

  @Get("tickets")
  list(@CurrentUser() p: Principal) {
    return this.support.listMine(p.user_id);
  }

  @Post("tickets")
  create(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(ticketDto)) d: TicketDto,
  ) {
    return this.support.create(p.user_id, d);
  }

  @Get("tickets/:id")
  detail(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.support.detail(p.user_id, parseUuid(id));
  }

  @Post("tickets/:id/messages")
  reply(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(ticketMessageDto)) dto: TicketMessageDto,
  ) {
    return this.support.addMessage(p.user_id, parseUuid(id), dto);
  }
}

@Controller("api/v1/admin/support")
@UseGuards(SessionGuard, AdminGuard)
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get("tickets")
  queue() {
    return this.support.queue();
  }

  @Get("tickets/:id")
  detail(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.support.detail(p.user_id, parseUuid(id), true);
  }

  @Post("tickets/:id/messages")
  reply(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(ticketMessageDto)) dto: TicketMessageDto,
  ) {
    return this.support.addMessage(p.user_id, parseUuid(id), dto, true);
  }

  @Patch("tickets/:id/status")
  status(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(ticketStatusDto)) dto: TicketStatusDto,
  ) {
    return this.support.updateStatus(p.user_id, parseUuid(id), dto);
  }
}
