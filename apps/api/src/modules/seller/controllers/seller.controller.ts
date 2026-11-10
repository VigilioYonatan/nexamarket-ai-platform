import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  CurrentUser,
  type Principal,
  parseUuid,
  SellerGuard,
  SessionGuard,
  ZodPipe,
} from "../../../shared/http.js";
import {
  type AdjustStockDto,
  adjustStockDto,
  type ApplySellerDto,
  applySellerDto,
  type CreateProductDto,
  createProductDto,
  type ShipOrderDto,
  shipOrderDto,
} from "../dtos/seller.dto.js";
import { SellerService } from "../services/seller.service.js";

@Controller("api/v1/seller")
@UseGuards(SessionGuard)
export class SellerOnboardingController {
  constructor(private readonly sellers: SellerService) {}

  @Post("applications")
  apply(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(applySellerDto)) d: ApplySellerDto,
  ) {
    return this.sellers.apply(p.user_id, d);
  }

  @Get("application")
  application(@CurrentUser() p: Principal) {
    return this.sellers.application(p.user_id);
  }
}

@Controller("api/v1/seller")
@UseGuards(SessionGuard, SellerGuard)
export class SellerController {
  constructor(private readonly sellers: SellerService) {}

  @Get("listings")
  list(@CurrentUser() p: Principal) {
    return this.sellers.list(p.seller_id!);
  }

  @Post("listings")
  create(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(createProductDto)) d: CreateProductDto,
  ) {
    return this.sellers.create(p.seller_id!, d);
  }

  @Post("listings/:id/publish")
  publish(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.sellers.publish(p.seller_id!, parseUuid(id));
  }

  @Post("listings/:id/pause")
  pause(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.sellers.pause(p.seller_id!, parseUuid(id));
  }

  @Post("inventory/:id/adjustments")
  adjust(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(adjustStockDto)) d: AdjustStockDto,
  ) {
    return this.sellers.adjust(p.seller_id!, parseUuid(id), d);
  }

  @Get("orders")
  orders(@CurrentUser() p: Principal) {
    return this.sellers.orders(p.seller_id!);
  }

  @Post("orders/:id/ship")
  ship(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(shipOrderDto)) b: ShipOrderDto,
  ) {
    return this.sellers.markShipped(p.seller_id!, parseUuid(id), b.tracking_number);
  }

  @Get("analytics/summary")
  summary(@CurrentUser() p: Principal) {
    return this.sellers.summary(p.seller_id!);
  }
}
