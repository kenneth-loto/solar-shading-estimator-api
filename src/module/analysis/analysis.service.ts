import { Injectable } from "@nestjs/common";
import { PvWattsService } from "./../pvwatts/pvwatts.service.js";
import type { HorizonProfileEntry } from "../shading/interfaces/shading.interfaces.js";
import { ShadingService } from "../shading/shading.service.js";
import { SitesService } from "../sites/sites.service.js";
import type { AnalysisResult } from "./interfaces/analysis.interfaces.js";

@Injectable()
export class AnalysisService {
  constructor(
    private readonly sitesService: SitesService,
    private readonly pvWattsService: PvWattsService,
    private readonly shadingService: ShadingService,
  ) {}

  async analyze(siteId: string): Promise<AnalysisResult> {
    const site = await this.sitesService.findById(siteId);

    const baseline = await this.pvWattsService.estimate(
      site.latitude,
      site.longitude,
      site.panelTilt,
      site.panelAzimuth,
      site.systemSize,
    );

    const shading = this.shadingService.calculate(
      site.latitude,
      site.longitude,
      site.horizonProfile as unknown as HorizonProfileEntry[],
    );

    const shadingFactor = 1 - shading.averageShadingLoss / 100;
    const adjustedAnnual = Math.round(baseline.ac_annual * shadingFactor);
    const adjustedMonthly = baseline.ac_monthly.map((m) =>
      Math.round(m * shadingFactor),
    );

    return {
      siteId: site.id,
      siteName: site.name,
      baseline,
      shading,
      adjusted: {
        adjustedAnnual,
        adjustedMonthly,
      },
    };
  }
}
