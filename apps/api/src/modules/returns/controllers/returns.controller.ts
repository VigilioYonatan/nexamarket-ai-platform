import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard, CurrentUser, type Principal, parseUuid, SessionGuard, ZodPipe } from "../../../shared/http.js";
import { type ReviewReturnDto, reviewReturnDto } from "../dtos/returns.dto.js";
import { ReturnsService } from "../services/returns.service.js";

@Controller("api/v1/admin/returns")
@UseGuards(SessionGuard, AdminGuard)
export class AdminReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  queue() {
    return this.returns.queue();
  }

  @Patch(":id")
  decide(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(reviewReturnDto)) dto: ReviewReturnDto,
  ) {
    return this.returns.decide(p.user_id, parseUuid(id), dto);
  }
}
