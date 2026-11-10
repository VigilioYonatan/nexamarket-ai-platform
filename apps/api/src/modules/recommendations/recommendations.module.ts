import { Module } from "@nestjs/common";
import { RecommendationsController } from "./controllers/recommendations.controller.js";
import { RecommendationService } from "./services/recommendations.service.js";

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationsModule {}
