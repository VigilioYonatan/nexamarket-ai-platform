import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { addressDto, returnDto } from "../../../shared/dto.js";
import { CurrentUser, type Principal, parseUuid, SessionGuard, ZodPipe } from "../../../shared/http.js";
import type { AddressDto, ReturnDto } from "../dtos/account.dto.js";
import { AccountService } from "../services/account.service.js";

@Controller("api/v1/me")
@UseGuards(SessionGuard)
export class AccountController {
  constructor(private readonly svc: AccountService) {}

  @Patch("avatar")
  updateAvatar(
    @CurrentUser() p: Principal,
    @Body() body: { avatar_url: string },
  ) {
    return this.svc.updateAvatar(p.user_id, body.avatar_url);
  }

  @Get("addresses")
  addresses(@CurrentUser() p: Principal) {
    return this.svc.getAddresses(p.user_id);
  }

  @Post("addresses")
  addAddress(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(addressDto)) d: AddressDto,
  ) {
    return this.svc.addAddress(p.user_id, d);
  }

  @Delete("addresses/:id")
  deleteAddress(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.svc.deleteAddress(p.user_id, parseUuid(id));
  }

  @Get("favorites")
  favorites(@CurrentUser() p: Principal) {
    return this.svc.getFavorites(p.user_id);
  }

  @Post("favorites/:id")
  addFavorite(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.svc.addFavorite(p.user_id, parseUuid(id));
  }

  @Delete("favorites/:id")
  deleteFavorite(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.svc.deleteFavorite(p.user_id, parseUuid(id));
  }

  @Get("return-requests")
  returns(@CurrentUser() p: Principal) {
    return this.svc.getReturns(p.user_id);
  }

  @Post("orders/:id/return-requests")
  returnRequest(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(returnDto)) d: ReturnDto,
  ) {
    return this.svc.createReturn(p.user_id, parseUuid(id), d.reason, d.seller_order_id);
  }
}
