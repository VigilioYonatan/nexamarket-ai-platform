import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type Principal, parseUuid, SessionGuard } from "../../../shared/http.js";
import { NotificationsService } from "../services/notifications.service.js";

@Controller("api/v1/me/notifications")
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() p: Principal) {
    return this.notifications.list(p.user_id);
  }

  @Get("unread")
  unread(@CurrentUser() p: Principal) {
    return this.notifications.unread(p.user_id);
  }

  @Patch(":id/read")
  read(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.notifications.markRead(p.user_id, parseUuid(id));
  }
}
