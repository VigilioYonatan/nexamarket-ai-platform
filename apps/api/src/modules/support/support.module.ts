import { Module } from "@nestjs/common";
import { FlagsModule } from "../flags/flags.module.js";
import { AdminSupportController, MySupportController } from "./controllers/support.controller.js";
import { SupportService } from "./services/support.service.js";

@Module({
  imports: [FlagsModule],
  controllers: [MySupportController, AdminSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
