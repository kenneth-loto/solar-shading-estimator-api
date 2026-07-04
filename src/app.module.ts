import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor.js";
import { AppCacheModule } from "./lib/cache/cache.module.js";
import { envValidationSchema } from "./lib/config/env.validation.js";
import { PrismaModule } from "./lib/database/prisma.module.js";
import { AnalysisModule } from "./module/analysis/analysis.module.js";
import { IrradianceModule } from "./module/irradiance/irradiance.module.js";
import { PvWattsModule } from "./module/pvwatts/pvwatts.module.js";
import { ShadingModule } from "./module/shading/shading.module.js";
import { SitesModule } from "./module/sites/sites.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          limit: 100,
          ttl: 60_000,
        },
      ],
      errorMessage: "Too Many Requests",
    }),
    PrismaModule,
    AppCacheModule,
    SitesModule,
    IrradianceModule,
    PvWattsModule,
    ShadingModule,
    AnalysisModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useExisting: AllExceptionsFilter },
    AllExceptionsFilter,
    { provide: APP_INTERCEPTOR, useExisting: TransformInterceptor },
    TransformInterceptor,
    { provide: APP_GUARD, useExisting: ThrottlerGuard },
    ThrottlerGuard,
  ],
})
export class AppModule {}
