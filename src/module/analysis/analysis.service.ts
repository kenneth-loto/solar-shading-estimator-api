import { Injectable, NotFoundException } from "@nestjs/common";
import type { Analysis, Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../lib/database/prisma.service.js";
import { PvWattsService } from "./../pvwatts/pvwatts.service.js";
import type { HorizonProfileEntry } from "../shading/interfaces/shading.interfaces.js";
import { ShadingService } from "../shading/shading.service.js";
import { SitesService } from "../sites/sites.service.js";
import type { AnalysisResult } from "./interfaces/analysis.interfaces.js";

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
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

    const result: AnalysisResult = {
      siteId: site.id,
      siteName: site.name,
      baseline,
      shading,
      adjusted: {
        adjustedAnnual,
        adjustedMonthly,
      },
    };

    await this.prisma.analysis.create({
      data: {
        siteId: site.id,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });

    return result;
  }

  async findBySiteId(siteId: string): Promise<Analysis[]> {
    return this.prisma.analysis.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<Analysis> {
    const record = await this.prisma.analysis.findUnique({ where: { id } });

    if (!record) throw new NotFoundException(`Analysis ${id} not found`);

    return record;
  }
}
