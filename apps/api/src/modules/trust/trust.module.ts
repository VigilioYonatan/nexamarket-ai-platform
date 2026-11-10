import { Module } from "@nestjs/common";
import { FlagsModule } from "../flags/flags.module.js";
import { AdminTrustController, PublicReviewsController } from "./controllers/trust.controller.js";
import { TrustService } from "./services/trust.service.js";

@Module({
  imports: [FlagsModule],
  controllers: [PublicReviewsController, AdminTrustController],
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}
