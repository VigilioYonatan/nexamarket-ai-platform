import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from "@nestjs/common";
import { cfg } from "../../../config.js";
import { CurrentUser, type Principal, SessionGuard, ZodPipe } from "../../../shared/http.js";
import { type AssistantDto, assistantDto } from "../dtos/system.dto.js";
import { AiService, SystemService } from "../services/system.service.js";

@Controller()
export class HealthController {
  constructor(private readonly system: SystemService) {}

  @Get("health/live")
  live() {
    return { status: "ok", version: cfg.APP_VERSION };
  }

  @Get("health/ready")
  ready() {
    return this.system.ready();
  }

  @Get("internal/metrics")
  metrics(@Headers("authorization") token: string) {
    return this.system.metrics(token?.replace(/^Bearer /, ""));
  }
}

@Controller("api/v1/ai")
@UseGuards(SessionGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("shopping/ask")
  ask(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(assistantDto)) d: AssistantDto,
  ) {
    return this.ai.ask(d.question);
  }
}
