import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { cfg } from "../../../config.js";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  parseUuid,
  SellerGuard,
  SessionGuard,
  ZodPipe,
} from "../../../shared/http.js";
import { type PayDto, submitPaymentDto } from "../dtos/payments.dto.js";
import { MercadoPagoService } from "../services/payments.service.js";

@Controller("api/v1")
@UseGuards(SessionGuard)
export class PaymentController {
  constructor(private readonly payments: MercadoPagoService) {}

  @Post("payment-attempts")
  pay(
    @CurrentUser() p: Principal,
    @Headers("idempotency-key") key: string,
    @Body(new ZodPipe(submitPaymentDto)) d: PayDto,
  ) {
    return this.payments.pay(p.user_id, d, key);
  }

  @Get("payment-attempts/:id")
  get(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.payments.getAttempt(p.user_id, parseUuid(id));
  }

  @Get("payments/public-config")
  publicConfig() {
    return { public_key: cfg.MP_PUBLIC_KEY, provider: "MERCADO_PAGO", currency: "PEN" };
  }
}

@Controller("api/v1/seller/mercado-pago")
@UseGuards(SessionGuard, SellerGuard)
export class SellerMercadoPagoController {
  constructor(private readonly mp: MercadoPagoService) {}

  @Post("authorize")
  url(@CurrentUser() p: Principal) {
    return this.mp.sellerOauthUrl(p.seller_id!);
  }

  @Post("disconnect")
  disconnect(@CurrentUser() p: Principal) {
    return this.mp.disconnectSeller(p.seller_id!);
  }
}

@Controller("integrations/mercado-pago")
export class MercadoPagoCallbackController {
  constructor(private readonly mp: MercadoPagoService) {}

  @Get("oauth/callback")
  oauth(@Query("code") code: string, @Query("state") state: string) {
    return this.mp.oauthCallback(code, state);
  }

  @Post("webhooks")
  webhook(
    @Req() req: Request,
    @Headers("x-signature") signature: string,
    @Headers("x-request-id") requestId: string,
    @Query("data.id") dataId: string,
  ) {
    const body = req.body as {
      type?: string;
      id?: string | number;
      action?: string;
      user_id?: string | number;
      data?: { id?: string | number };
    };
    return this.mp.acceptWebhook({ signature, requestId, dataId, body });
  }
}

@Controller("api/v1/admin/payments")
@UseGuards(SessionGuard, AdminGuard)
export class AdminPaymentController {
  constructor(private readonly payments: MercadoPagoService) {}

  @Get("reconciliation-queue")
  list() {
    return this.payments.reconciliationQueue();
  }

  @Get("ledger-health")
  ledger() {
    return this.payments.ledgerHealth();
  }

  @Post("payment-attempts/:id/reconcile")
  reconcile(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
  ) {
    return this.payments.reconcileByAdmin(p.user_id, parseUuid(id));
  }
}
