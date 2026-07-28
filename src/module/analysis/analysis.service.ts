import { Injectable, NotFoundException } from "@nestjs/common";
import type { Analysis, Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../lib/database/prisma.service.js";
import {
  findNearestSampleDay,
  getWeeklySampleDays,
  localStandardTimeToLST,
} from "../../utils/date.js";
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

    const hourlyShading = this.shadingService.calculateHourlyShading(
      site.latitude,
      site.longitude,
      site.horizonProfile as unknown as HorizonProfileEntry[],
    );

    const { shadedHoursPerDay, ...shadingForResult } = hourlyShading;

    const tz = (baseline.station_info as Record<string, unknown>).tz as
      | number
      | undefined;

    if (!baseline.ac_hourly?.length) {
      const shadingFactor = 1 - shadingForResult.averageShadingLoss / 100;
      const adjustedAnnual = Math.round(baseline.ac_annual * shadingFactor);
      const adjustedMonthly = baseline.ac_monthly.map((m) =>
        Math.round(m * shadingFactor),
      );

      const result: AnalysisResult = {
        siteId: site.id,
        siteName: site.name,
        baseline,
        shading: shadingForResult,
        adjusted: { adjustedAnnual, adjustedMonthly },
      };

      await this.prisma.analysis.create({
        data: {
          siteId: site.id,
          result: result as unknown as Prisma.InputJsonValue,
        },
      });

      return result;
    }

    const year = new Date().getFullYear();
    const sampleDays = getWeeklySampleDays(year);
    const adjustedHourly = new Array<number>(baseline.ac_hourly.length);
    let totalAdjusted = 0;

    for (let i = 0; i < baseline.ac_hourly.length; i++) {
      const dayOfYear = Math.floor(i / 24);
      const localStdHour = i % 24;
      const calendarDate = new Date(Date.UTC(year, 0, 1 + dayOfYear));
      const lstHour = localStandardTimeToLST(
        localStdHour,
        site.longitude,
        tz ?? 0,
      );
      const nearestDay = findNearestSampleDay(calendarDate, sampleDays);
      const dayIndex = hourlyShading.sampleDays.findIndex(
        (d) => d.date === nearestDay.date.toISOString().slice(0, 10),
      );

      if (
        dayIndex >= 0 &&
        hourlyShading.shadedHoursPerDay[dayIndex].has(lstHour)
      ) {
        adjustedHourly[i] = 0;
      } else {
        adjustedHourly[i] = baseline.ac_hourly[i];
      }
      totalAdjusted += adjustedHourly[i];
    }

    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let hourIndex = 0;
    const adjustedMonthly: number[] = [];
    for (const dim of daysInMonth) {
      let monthSum = 0;
      for (let d = 0; d < dim; d++) {
        for (let h = 0; h < 24; h++) {
          monthSum += adjustedHourly[hourIndex];
          hourIndex++;
        }
      }
      adjustedMonthly.push(Math.round(monthSum));
    }

    const adjustedAnnual = Math.round(totalAdjusted);

    const result: AnalysisResult = {
      siteId: site.id,
      siteName: site.name,
      baseline,
      shading: shadingForResult,
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
