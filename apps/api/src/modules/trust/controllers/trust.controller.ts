import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  parseUuid,
  SessionGuard,
  ZodPipe,
} from "../../../shared/http.js";
import {
  type ModerateReviewDto,
  moderateReviewDto,
  type OpenTrustCaseDto,
  openTrustCaseDto,
  type PublishReviewDto,
  publishReviewDto,
  type ResolveTrustCaseDto,
  resolveTrustCaseDto,
} from "../dtos/trust.dto.js";
import { TrustService } from "../services/trust.service.js";

@Controller("api/v1/products/:listing_id/reviews")
export class PublicReviewsController {
  constructor(private readonly trust: TrustService) {}

  @Get()
  list(@Param("listing_id") id: string) {
    return this.trust.listReviews(parseUuid(id));
  }

  @Post()
  @UseGuards(SessionGuard)
  create(
    @CurrentUser() user: Principal,
    @Param("listing_id") id: string,
    @Body(new ZodPipe(publishReviewDto)) data: PublishReviewDto,
  ) {
    return this.trust.publishReview(user.user_id, parseUuid(id), data);
  }
}

@Controller("api/v1/admin/trust")
@UseGuards(SessionGuard, AdminGuard)
export class AdminTrustController {
  constructor(private readonly trust: TrustService) {}

  @Get("reviews/pending")
  reviews() {
    return this.trust.pendingReviews();
  }

  @Patch("reviews/:id")
  moderate(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(moderateReviewDto)) dto: ModerateReviewDto,
  ) {
    return this.trust.moderateReview(p.user_id, parseUuid(id), dto);
  }

  @Get("cases")
  cases() {
    return this.trust.cases();
  }

  @Post("cases")
  open(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(openTrustCaseDto)) dto: OpenTrustCaseDto,
  ) {
    return this.trust.openCase(p.user_id, dto);
  }

  @Patch("cases/:id")
  decide(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(resolveTrustCaseDto)) dto: ResolveTrustCaseDto,
  ) {
    return this.trust.decideCase(p.user_id, parseUuid(id), dto);
  }
}
