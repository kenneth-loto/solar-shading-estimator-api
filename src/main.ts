import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set("trust proxy", true);

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

  const configService = app.get(ConfigService);
  await app.listen(configService.getOrThrow("PORT"));
}
bootstrap();
