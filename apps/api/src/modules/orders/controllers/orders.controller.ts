import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type Principal, parseUuid, SessionGuard } from "../../../shared/http.js";
import { OrdersService } from "../services/orders.service.js";

@Controller("api/v1/me/orders")
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser() p: Principal) {
    return this.orders.list(p.user_id);
  }

  @Get(":id")
  detail(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.orders.detail(p.user_id, parseUuid(id));
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.orders.cancel(p.user_id, parseUuid(id));
  }

  @Post(":order_id/sellers/:seller_order_id/confirm-delivery")
  confirmDelivery(
    @CurrentUser() p: Principal,
    @Param("order_id") order_id: string,
    @Param("seller_order_id") seller_order_id: string,
  ) {
    return this.orders.confirmDelivery(
      p.user_id,
      parseUuid(order_id),
      parseUuid(seller_order_id),
    );
  }
}
