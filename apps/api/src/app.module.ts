import { Module } from "@nestjs/common";
import { DbModule } from "./infrastructure/db.js";
import { AccountModule } from "./modules/account/account.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CartModule } from "./modules/cart/cart.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { CheckoutModule } from "./modules/checkout/checkout.module.js";
import { CommercialModule } from "./modules/commercial/commercial.module.js";
import { FlagsModule } from "./modules/flags/flags.module.js";
import { MediaModule } from "./modules/media/media.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { OrdersModule } from "./modules/orders/orders.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module.js";
import { ReturnsModule } from "./modules/returns/returns.module.js";
import { SellerModule } from "./modules/seller/seller.module.js";
import { SupportModule } from "./modules/support/support.module.js";
import { SystemModule } from "./modules/system/system.module.js";
import { TrustModule } from "./modules/trust/trust.module.js";
import { AdminGuard, SellerGuard, SessionGuard } from "./shared/http.js";

@Module({
  imports: [
    DbModule,
    AccountModule,
    AdminModule,
    AuthModule,
    CartModule,
    CatalogModule,
    CheckoutModule,
    CommercialModule,
    FlagsModule,
    MediaModule,
    NotificationsModule,
    OrdersModule,
    PaymentsModule,
    RecommendationsModule,
    ReturnsModule,
    SellerModule,
    SupportModule,
    SystemModule,
    TrustModule,
  ],
  providers: [SessionGuard, SellerGuard, AdminGuard],
})
export class AppModule {}
