import { Module } from "@nestjs/common";
import { AdminFlagsController, PublicFlagsController } from "./controllers/flags.controller.js";
import { FeatureFlagsService } from "./services/flags.service.js";

@Module({
  controllers: [PublicFlagsController, AdminFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FlagsModule {}
