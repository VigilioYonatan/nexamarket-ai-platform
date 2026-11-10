import { Module } from "@nestjs/common";
import { AdminController, PublicSettingsController } from "./controllers/admin.controller.js";
import { AdminService } from "./services/admin.service.js";

@Module({
  controllers: [AdminController, PublicSettingsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
