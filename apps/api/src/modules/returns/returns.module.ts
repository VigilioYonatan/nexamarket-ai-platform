import { Module } from "@nestjs/common";
import { AdminReturnsController } from "./controllers/returns.controller.js";
import { ReturnsService } from "./services/returns.service.js";

@Module({
  controllers: [AdminReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
