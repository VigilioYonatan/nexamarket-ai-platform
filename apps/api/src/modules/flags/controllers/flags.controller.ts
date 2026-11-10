import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard, CurrentUser, type Principal, SessionGuard, ZodPipe } from "../../../shared/http.js";
import { type FlagDto, flagDto, parseFlag } from "../dtos/flags.dto.js";
import { FeatureFlagsService } from "../services/flags.service.js";

@Controller("api/v1/features")
export class PublicFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  list() {
    return this.flags.publicFlags();
  }
}

@Controller("api/v1/admin/features")
@UseGuards(SessionGuard, AdminGuard)
export class AdminFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  list() {
    return this.flags.list();
  }

  @Patch(":name")
  update(
    @CurrentUser() p: Principal,
    @Param("name") name: string,
    @Body(new ZodPipe(flagDto)) dto: FlagDto,
  ) {
    return this.flags.update(p.user_id, parseFlag(name), dto.enabled);
  }
}
