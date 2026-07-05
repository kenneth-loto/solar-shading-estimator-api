import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { buildSwaggerConfig } from "./swagger.config.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  app.set("trust proxy", true);

  if (process.env.NODE_ENV === "production") {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        },
      }),
    );
  } else {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
            frameAncestors: ["'none'"],
            connectSrc: ["'self'"],
          },
        },
      }),
    );
  }

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    );
    next();
  });

  const allowedOrigins = configService.get<string>("ALLOWED_ORIGINS", "*");
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const origins = allowedOrigins.split(",").map((origin) => origin.trim());

      if (origins.includes("*") || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    credentials: true,
  });

  app.useBodyParser("json", { limit: "10kb" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          field: error.property,
          message: error.constraints
            ? Object.values(error.constraints)[0]
            : "Invalid value",
        }));

        return new BadRequestException({
          message: "Validation failed",
          errors: result,
        });
      },
    }),
  );

  app.enableShutdownHooks();

  const swaggerConfig = buildSwaggerConfig();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use("/openapi.json", (_req: Request, res: Response) => {
    res.json(document);
  });

  if (process.env.NODE_ENV !== "production") {
    app.use("/docs", apiReference({ content: document }));
  }

  await app.listen(configService.getOrThrow("PORT"));
}
bootstrap();
