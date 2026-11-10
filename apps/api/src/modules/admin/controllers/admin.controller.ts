import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { type ThemeTokens } from "@nexa/domain";
import { themeDto } from "../../../shared/dto.js";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  parseUuid,
  SessionGuard,
  ZodPipe,
} from "../../../shared/http.js";
import {
  type CategoryUpdateDto,
  categoryUpdateDto,
  type SellerStatusDto,
  sellerStatusDto,
} from "../dtos/admin.dto.js";
import { AdminService } from "../services/admin.service.js";

@Controller("api/v1/settings")
export class PublicSettingsController {
  constructor(private readonly admin: AdminService) {}

  @Get("theme")
  get() {
    return this.admin.settings();
  }
}

@Controller("api/v1/admin")
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("settings/drafts")
  drafts() {
    return this.admin.drafts();
  }

  @Post("settings/drafts")
  draft(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(themeDto)) body: ThemeTokens,
  ) {
    return this.admin.draft(p.user_id, body);
  }

  @Post("settings/drafts/:id/publish")
  publish(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.admin.publish(p.user_id, parseUuid(id));
  }

  @Post("settings/versions/:id/rollback")
  rollback(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.admin.rollback(p.user_id, parseUuid(id));
  }

  @Get("seller-applications")
  applications() {
    return this.admin.sellerApplications();
  }

  @Post("seller-applications/:id/approve")
  approveSeller(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.admin.approveSeller(p.user_id, parseUuid(id));
  }

  @Post("seller-applications/:id/reject")
  rejectSeller(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(sellerStatusDto)) b: SellerStatusDto,
  ) {
    return this.admin.rejectApplication(p.user_id, parseUuid(id), b.reason);
  }

  @Get("sellers")
  sellers() {
    return this.admin.sellers();
  }

  @Post("sellers/:id/suspend")
  suspendSeller(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(sellerStatusDto)) b: SellerStatusDto,
  ) {
    return this.admin.suspendSeller(p.user_id, parseUuid(id), b.reason);
  }

  @Get("orders")
  orders() {
    return this.admin.orders();
  }

  @Get("audit-events")
  audit() {
    return this.admin.audit();
  }

  @Get("users")
  users() {
    return this.admin.users();
  }

  @Patch("categories/:id")
  updateCategory(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(categoryUpdateDto)) b: CategoryUpdateDto,
  ) {
    return this.admin.updateCategory(p.user_id, parseUuid(id), b);
  }
}
