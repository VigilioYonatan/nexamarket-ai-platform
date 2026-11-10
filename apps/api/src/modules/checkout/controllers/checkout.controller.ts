import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type Principal, parseUuid, SessionGuard, ZodPipe } from "../../../shared/http.js";
import { type CreateCheckoutDto, createCheckoutDto } from "../dtos/checkout.dto.js";
import { CheckoutService } from "../services/checkout.service.js";

@Controller("api/v1/checkouts")
@UseGuards(SessionGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post()
  create(
    @CurrentUser() p: Principal,
    @Headers("idempotency-key") key: string,
    @Body(new ZodPipe(createCheckoutDto)) dto: CreateCheckoutDto,
  ) {
    return this.checkout.create(p.user_id, key, dto.address_id);
  }

  @Get(":id")
  get(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.checkout.get(p.user_id, parseUuid(id));
  }
}
