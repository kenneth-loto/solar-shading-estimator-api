import { Module } from "@nestjs/common";
import { PvWattsModule } from "../pvwatts/pvwatts.module.js";
import { ShadingModule } from "../shading/shading.module.js";
import { SitesModule } from "../sites/sites.module.js";
import { AnalysisController } from "./analysis.controller.js";
import { AnalysisService } from "./analysis.service.js";

@Module({
  imports: [SitesModule, PvWattsModule, ShadingModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
