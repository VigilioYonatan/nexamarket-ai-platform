import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module.js";
import { FlagsModule } from "../flags/flags.module.js";
import { AiController, HealthController } from "./controllers/system.controller.js";
import { AiService, SystemService } from "./services/system.service.js";

@Module({
  imports: [CatalogModule, FlagsModule],
  controllers: [HealthController, AiController],
  providers: [SystemService, AiService],
  exports: [SystemService, AiService],
})
export class SystemModule {}
