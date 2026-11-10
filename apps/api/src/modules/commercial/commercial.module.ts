import { Module } from "@nestjs/common";
import {
  AdminCommercialController,
  SellerCommercialPolicyController,
} from "./controllers/commercial.controller.js";
import { CommercialService } from "./services/commercial.service.js";

@Module({
  controllers: [AdminCommercialController, SellerCommercialPolicyController],
  providers: [CommercialService],
  exports: [CommercialService],
})
export class CommercialModule {}
