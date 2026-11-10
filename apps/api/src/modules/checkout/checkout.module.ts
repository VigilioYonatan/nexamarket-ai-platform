import { Module } from "@nestjs/common";
import { CheckoutController } from "./controllers/checkout.controller.js";
import { CheckoutService } from "./services/checkout.service.js";

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
