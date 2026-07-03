import { Module } from "@nestjs/common";
import { ShadingController } from "./shading.controller.js";
import { ShadingService } from "./shading.service.js";

@Module({
  controllers: [ShadingController],
  providers: [ShadingService],
  exports: [ShadingService],
})
export class ShadingModule {}
