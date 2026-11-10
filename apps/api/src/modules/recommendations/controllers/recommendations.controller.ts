import { Controller, Get, Param } from "@nestjs/common";
import { parseUuid } from "../../../shared/http.js";
import { RecommendationService } from "../services/recommendations.service.js";

@Controller("api/v1/recommendations")
export class RecommendationsController {
  constructor(private readonly recs: RecommendationService) {}

  @Get("trending")
  trending() {
    return this.recs.trending();
  }

  @Get("similar/:id")
  similar(@Param("id") id: string) {
    return this.recs.similar(parseUuid(id));
  }
}
