import { Module } from "@nestjs/common";
import { SellerController, SellerOnboardingController } from "./controllers/seller.controller.js";
import { SellerService } from "./services/seller.service.js";

@Module({
  controllers: [SellerController, SellerOnboardingController],
  providers: [SellerService],
  exports: [SellerService],
})
export class SellerModule {}
