import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor.js";
import { AppCacheModule } from "./lib/cache/cache.module.js";
import { envValidationSchema } from "./lib/config/env.validation.js";
import { PrismaModule } from "./lib/database/prisma.module.js";
import { IrradianceModule } from "./module/irradiance/irradiance.module.js";
import { PvWattsModule } from "./module/pvwatts/pvwatts.module.js";
import { SitesModule } from "./module/sites/sites.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AppCacheModule,
    SitesModule,
    IrradianceModule,
    PvWattsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
