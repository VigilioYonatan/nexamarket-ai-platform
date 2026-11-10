import { Module } from "@nestjs/common";
import { CartController } from "./controllers/cart.controller.js";
import { CartService } from "./services/cart.service.js";

@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
