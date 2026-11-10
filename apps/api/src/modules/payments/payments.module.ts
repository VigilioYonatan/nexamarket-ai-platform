import { Module } from "@nestjs/common";
import {
  AdminPaymentController,
  MercadoPagoCallbackController,
  PaymentController,
  SellerMercadoPagoController,
} from "./controllers/payments.controller.js";
import { MercadoPagoService } from "./services/payments.service.js";

@Module({
  controllers: [
    PaymentController,
    SellerMercadoPagoController,
    MercadoPagoCallbackController,
    AdminPaymentController,
  ],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class PaymentsModule {}
