import { Module } from "@nestjs/common";
import { NotificationsController } from "./controllers/notifications.controller.js";
import { NotificationsService } from "./services/notifications.service.js";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
