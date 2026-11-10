import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard, CurrentUser, type Principal, SessionGuard, ZodPipe } from "../../../shared/http.js";
import { type CommissionDto, commissionDto } from "../dtos/commercial.dto.js";
import { CommercialService } from "../services/commercial.service.js";

@Controller("api/v1/admin/commissions")
@UseGuards(SessionGuard, AdminGuard)
export class AdminCommercialController {
  constructor(private readonly service: CommercialService) {}

  @Get()
  get() {
    return this.service.current();
  }

  @Get("history")
  history() {
    return this.service.history();
  }

  @Post()
  publish(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(commissionDto)) d: CommissionDto,
  ) {
    return this.service.publish(p.user_id, d.commission_bps);
  }
}

@Controller("api/v1/seller/commercial-policy")
@UseGuards(SessionGuard)
export class SellerCommercialPolicyController {
  constructor(private readonly service: CommercialService) {}

  @Get()
  get() {
    return this.service.current();
  }
}
