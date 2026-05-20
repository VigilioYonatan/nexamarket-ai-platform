import { Module } from "@nestjs/common";
import { DbModule } from "./infrastructure/db.js";
import { AccountController, AccountService } from "./modules/account.js";
import { AdminController, AdminService, PublicSettingsController } from "./modules/admin.js";
import { AuthController, AuthService } from "./modules/auth.js";
import { CartController, CartService } from "./modules/cart.js";
import { CatalogController, CatalogService } from "./modules/catalog.js";
import { CheckoutController, CheckoutService } from "./modules/checkout.js";
import {
  AdminCommercialController,
  CommercialService,
  SellerCommercialPolicyController,
} from "./modules/commercial.js";
import {
  AdminFlagsController,
  FeatureFlagsService,
  PublicFlagsController,
} from "./modules/flags.js";
import { AdminMediaController, MediaService, SellerMediaController } from "./modules/media.js";
import { NotificationsController, NotificationsService } from "./modules/notifications.js";
import { OrdersController, OrdersService } from "./modules/orders.js";
import {
  AdminPaymentController,
  MercadoPagoCallbackController,
  MercadoPagoService,
  PaymentController,
  SellerMercadoPagoController,
} from "./modules/payments.js";
import { RecommendationService, RecommendationsController } from "./modules/recommendations.js";
import { AdminReturnsController, ReturnsService } from "./modules/returns.js";
import { SellerController, SellerOnboardingController, SellerService } from "./modules/seller.js";
import { AdminSupportController, MySupportController, SupportService } from "./modules/support.js";
import { AiController, AiService, HealthController, SystemService } from "./modules/system.js";
import { AdminTrustController, PublicReviewsController, TrustService } from "./modules/trust.js";
import { AdminGuard, SellerGuard, SessionGuard } from "./shared/http.js";
@Module({
  imports: [DbModule],
  providers: [
    SessionGuard,
    SellerGuard,
    AdminGuard,
    AuthService,
    CatalogService,
    CartService,
    CheckoutService,
    OrdersService,
    MercadoPagoService,
    SellerService,
    AdminService,
    AccountService,
    SystemService,
    AiService,
    MediaService,
    CommercialService,
    TrustService,
    SupportService,
    NotificationsService,
    FeatureFlagsService,
    ReturnsService,
    RecommendationService,
  ],
  controllers: [
    AuthController,
    CatalogController,
    CartController,
    CheckoutController,
    OrdersController,
    PaymentController,
    SellerMercadoPagoController,
    MercadoPagoCallbackController,
    AdminPaymentController,
    SellerController,
    SellerOnboardingController,
    AdminController,
    PublicSettingsController,
    AccountController,
    HealthController,
    AiController,
    AdminMediaController,
    SellerMediaController,
    AdminCommercialController,
    SellerCommercialPolicyController,
    PublicReviewsController,
    AdminTrustController,
    MySupportController,
    AdminSupportController,
    NotificationsController,
    PublicFlagsController,
    AdminFlagsController,
    AdminReturnsController,
    RecommendationsController,
  ],
})
export class AppModule {}
