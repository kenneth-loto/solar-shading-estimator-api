import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  app.set("trust proxy", true);

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

  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Solar Shading Estimator API")
      .setDescription(
        "Estimate realistic solar energy production by combining NASA POWER irradiance data, PVWatts baseline estimates, and a simplified sun-position vs. obstruction shading model.\n\nWrite endpoints (`POST`, `PATCH`, `DELETE`) require an API key. Request one from the API administrator, then click the **Authorize** button below to set it.",
      )
      .setVersion("1.0")
      .addSecurity("api-key", {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description:
          "API key for write access. Request one from the API administrator.",
      })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup("docs", app, document);
  }

  await app.listen(configService.getOrThrow("PORT"));
}
bootstrap();
