import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Counter, collectDefaultMetrics, Histogram, Registry } from "prom-client";
import { z } from "zod";
import { cfg } from "../config.js";
import { PgStore } from "../infrastructure/db.js";
import { CurrentUser, type Principal, SessionGuard, ZodPipe } from "../shared/http.js";
import { CatalogService } from "./catalog.js";
import { FeatureFlagsService } from "./flags.js";

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: "nexa_" });
export const requests = new Counter({
  name: "nexa_http_requests_total",
  help: "HTTP request count",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});
export const latency = new Histogram({
  name: "nexa_http_request_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route"],
  registers: [registry],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
@Injectable()
export class SystemService {
  constructor(private readonly db: PgStore) {}
  async ready() {
    try {
      await this.db.query("SELECT 1");
      return { status: "ready", version: cfg.APP_VERSION };
    } catch {
      throw new ServiceUnavailableException({ code: "DATABASE_NOT_READY" });
    }
  }
  metrics(token: string | undefined) {
    if (!token || token !== cfg.INTERNAL_METRICS_TOKEN) throw new UnauthorizedException();
    return registry.metrics();
  }
}
@Controller()
export class HealthController {
  constructor(private readonly system: SystemService) {}
  @Get("health/live") live() {
    return { status: "ok", version: cfg.APP_VERSION };
  }
  @Get("health/ready") ready() {
    return this.system.ready();
  }
  @Get("internal/metrics") metrics(@Headers("authorization") token: string) {
    return this.system.metrics(token?.replace(/^Bearer /, ""));
  }
}
const assistantDto = z.object({ question: z.string().min(5).max(500) }).strict();
@Injectable()
export class AiService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly flags: FeatureFlagsService,
  ) {}
  async ask(question: string) {
    const terms = question
      .slice(0, 100)
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 4)
      .join(" ");
    const found = await this.catalog.list({ q: terms || question.split(/\s+/)[0] });
    const safeProducts = (found.items as Array<Record<string, unknown>>).slice(0, 6).map((p) => ({
      listing_id: p.listing_id,
      title: p.title,
      price_minor: p.price_minor,
      available: p.available,
      seller_name: p.seller_name,
      image_url: p.image_url,
    }));
    if (process.env.AI_ENABLED !== "true" || !(await this.flags.enabled("ai_shopping")))
      return {
        mode: "search_only",
        notice: "Modelo local desactivado. Resultados verificables del catálogo.",
        products: safeProducts,
      };
    try {
      const res = await fetch(`${cfg.AI_BASE_URL}/v1/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, products: safeProducts }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error("AI unavailable");
      const body = (await res.json()) as { answer?: string };
      return {
        mode: "local_llm",
        answer: String(body.answer ?? "").slice(0, 2000),
        products: safeProducts,
      };
    } catch {
      return {
        mode: "search_only",
        notice: "Asistente temporalmente no disponible; se muestran resultados verificados.",
        products: safeProducts,
      };
    }
  }
}
@Controller("api/v1/ai")
@UseGuards(SessionGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post("shopping/ask") ask(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(assistantDto)) d: { question: string },
  ) {
    return this.ai.ask(d.question);
  }
}
