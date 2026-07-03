import { Module } from "@nestjs/common";
import { IrradianceController } from "./irradiance.controller.js";
import { IrradianceService } from "./irradiance.service.js";

@Module({
  controllers: [IrradianceController],
  providers: [IrradianceService],
})
export class IrradianceModule {}
