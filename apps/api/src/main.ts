import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module.js";
import { cfg } from "./config.js";
import { latency, requests } from "./modules/system.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(cookieParser());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("NexaMarket Commercial API")
    .setDescription("NexaMarket self-hosted multi-seller marketplace REST API contracts")
    .setVersion(cfg.APP_VERSION)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get("/openapi.json", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(document);
  });

  app.use(
    "/reference",
    apiReference({
      spec: {
        content: document,
      },
      pageTitle: "NexaMarket API Reference",
      theme: "default",
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Cache-Control",
      req.url.startsWith("/api/v1/settings") ? "public, max-age=30" : "no-store",
    );
    res.on("finish", () => {
      const route = (req.route?.path as string | undefined) ?? "_unmatched";
      const label = route.length > 100 ? "_long" : route;
      requests.inc({ method: req.method, route: label, status: String(res.statusCode) });
      latency.observe(
        { method: req.method, route: label },
        Number(process.hrtime.bigint() - started) / 1e9,
      );
      // Never log cookies/body/headers, payment tokens, email or URLs with query parameters.
      if (res.statusCode >= 500)
        console.error(
          JSON.stringify({
            level: "error",
            msg: "http_error",
            method: req.method,
            route: label,
            status: res.statusCode,
          }),
        );
    });
    next();
  });
  app.enableShutdownHooks();
  await app.listen(cfg.PORT, "0.0.0.0");
  console.log(JSON.stringify({ event: "api_started", port: cfg.PORT, version: cfg.APP_VERSION }));
}
bootstrap().catch((e) => {
  console.error("Failed to bootstrap API:", e instanceof Error ? e.message : "unknown");
  process.exit(1);
});
