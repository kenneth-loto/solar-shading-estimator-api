import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import type { PrismaClient, Site } from "../../generated/prisma/client.js";
import { PrismaService } from "../../lib/database/prisma.service.js";
import { getWeeklySampleDays } from "../../utils/date.js";
import type { PvWattsResult } from "../pvwatts/interfaces/pvwatts.interfaces.js";
import { PvWattsService } from "./../pvwatts/pvwatts.service.js";
import type {
  HorizonProfileEntry,
  HourlyShadingResult,
} from "../shading/interfaces/shading.interfaces.js";
import { ShadingService } from "../shading/shading.service.js";
import { SitesService } from "../sites/sites.service.js";
import { AnalysisService } from "./analysis.service.js";

const mockSite: Site = {
  id: "site-1",
  name: "Test Roof",
  latitude: 40.02,
  longitude: -105.25,
  panelTilt: 30,
  panelAzimuth: 180,
  systemSize: 5,
  horizonProfile: [
    { direction: "S", heightAngle: 15 },
  ] as unknown as Site["horizonProfile"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeHourlyArray(value: number): number[] {
  return new Array(8760).fill(value);
}

const mockPvWattsResult: PvWattsResult = {
  ac_annual: 8760,
  ac_monthly: [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744],
  ac_hourly: makeHourlyArray(1),
  capacity_factor: 21.9,
  kwh_per_kw: 1921,
  station_info: { tz: -7 },
};

function makeEmptyShading(): HourlyShadingResult {
  const sampleDays = getWeeklySampleDays(2026);
  const dayResults: HourlyShadingResult["sampleDays"] = [];
  const shadedHoursPerDay: Set<number>[] = [];
  for (const day of sampleDays) {
    dayResults.push({
      name: day.name,
      date: day.date.toISOString().slice(0, 10),
      daylightHours: 12,
      shadedHours: 0,
      percentShaded: 0,
    });
    shadedHoursPerDay.push(new Set());
  }
  return { sampleDays: dayResults, averageShadingLoss: 0, shadedHoursPerDay };
}

function makeFullShading(): HourlyShadingResult {
  const sampleDays = getWeeklySampleDays(2026);
  const dayResults: HourlyShadingResult["sampleDays"] = [];
  const shadedHoursPerDay: Set<number>[] = [];
  for (const day of sampleDays) {
    dayResults.push({
      name: day.name,
      date: day.date.toISOString().slice(0, 10),
      daylightHours: 12,
      shadedHours: 12,
      percentShaded: 100,
    });
    const allHours = new Set<number>();
    for (let h = 0; h < 24; h++) allHours.add(h);
    shadedHoursPerDay.push(allHours);
  }
  return { sampleDays: dayResults, averageShadingLoss: 100, shadedHoursPerDay };
}

function makePartialShading(): HourlyShadingResult {
  const sampleDays = getWeeklySampleDays(2026);
  const dayResults: HourlyShadingResult["sampleDays"] = [];
  const shadedHoursPerDay: Set<number>[] = [];
  for (const day of sampleDays) {
    dayResults.push({
      name: day.name,
      date: day.date.toISOString().slice(0, 10),
      daylightHours: 12,
      shadedHours: 6,
      percentShaded: 50,
    });
    shadedHoursPerDay.push(new Set([0, 1, 2, 3, 4, 5]));
  }
  return { sampleDays: dayResults, averageShadingLoss: 50, shadedHoursPerDay };
}

const mockAnalysisRecord = {
  id: "analysis-1",
  siteId: "site-1",
  result: {
    siteId: "site-1",
    siteName: "Test Roof",
    baseline: mockPvWattsResult,
    shading: makeEmptyShading(),
    adjusted: {
      adjustedAnnual: 8760,
      adjustedMonthly: [
        744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744,
      ],
    },
  },
  createdAt: new Date("2026-07-08"),
};

function createMockPrismaService() {
  const mockAnalysis = {
    create: jest
      .fn<() => Promise<typeof mockAnalysisRecord>>()
      .mockResolvedValue(mockAnalysisRecord),
    findMany: jest
      .fn<() => Promise<(typeof mockAnalysisRecord)[]>>()
      .mockResolvedValue([mockAnalysisRecord]),
    findUnique: jest
      .fn<() => Promise<typeof mockAnalysisRecord | null>>()
      .mockResolvedValue(mockAnalysisRecord),
  };
  return { analysis: mockAnalysis } as unknown as jest.Mocked<
    Pick<PrismaClient, "analysis">
  >;
}

describe("AnalysisService", () => {
  let service: AnalysisService;
  let sitesService: jest.Mocked<SitesService>;
  let pvWattsService: jest.Mocked<PvWattsService>;
  let shadingService: jest.Mocked<ShadingService>;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        {
          provide: SitesService,
          useValue: { findById: jest.fn() },
        },
        {
          provide: PvWattsService,
          useValue: { estimate: jest.fn() },
        },
        {
          provide: ShadingService,
          useValue: { calculate: jest.fn(), calculateHourlyShading: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    sitesService = module.get<SitesService>(
      SitesService,
    ) as jest.Mocked<SitesService>;
    pvWattsService = module.get<PvWattsService>(
      PvWattsService,
    ) as jest.Mocked<PvWattsService>;
    shadingService = module.get<ShadingService>(
      ShadingService,
    ) as jest.Mocked<ShadingService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("analyze", () => {
    it("orchestrates fetch -> PVWatts -> shading -> combined result", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculateHourlyShading.mockReturnValue(makeEmptyShading());

      const result = await service.analyze("site-1");

      expect(result.siteId).toBe("site-1");
      expect(result.siteName).toBe("Test Roof");
      expect(result.baseline).toEqual(mockPvWattsResult);
      expect(result.shading).toBeDefined();
    });

    it("returns baseline output when no shading is present", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculateHourlyShading.mockReturnValue(makeEmptyShading());

      const result = await service.analyze("site-1");

      expect(result.adjusted.adjustedAnnual).toBe(8760);
      expect(result.adjusted.adjustedMonthly).toEqual([
        744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744,
      ]);
    });

    it("returns 0 adjusted kWh when all hours are shaded", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculateHourlyShading.mockReturnValue(makeFullShading());

      const result = await service.analyze("site-1");

      expect(result.adjusted.adjustedAnnual).toBe(0);
      expect(result.adjusted.adjustedMonthly).toEqual(
        mockPvWattsResult.ac_monthly.map(() => 0),
      );
    });

    it("zeroes out the first 6 LST hours when those are shaded", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculateHourlyShading.mockReturnValue(
        makePartialShading(),
      );

      const result = await service.analyze("site-1");

      expect(result.adjusted.adjustedAnnual).toBeGreaterThan(0);
      expect(result.adjusted.adjustedAnnual).toBeLessThan(8760);
    });

    it("passes correct site parameters to PVWatts and Shading", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculateHourlyShading.mockReturnValue(makeEmptyShading());

      await service.analyze("site-1");

      expect(pvWattsService.estimate).toHaveBeenCalledWith(
        40.02,
        -105.25,
        30,
        180,
        5,
      );
      expect(shadingService.calculateHourlyShading).toHaveBeenCalledWith(
        40.02,
        -105.25,
        mockSite.horizonProfile as unknown as HorizonProfileEntry[],
      );
    });

    it("persists the result to the database after computing", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculateHourlyShading.mockReturnValue(makeEmptyShading());

      await service.analyze("site-1");

      expect(prisma.analysis.create).toHaveBeenCalledTimes(1);
      expect(prisma.analysis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            siteId: "site-1",
            result: expect.objectContaining({
              siteId: "site-1",
              siteName: "Test Roof",
            }),
          }),
        }),
      );
    });
  });

  describe("findBySiteId", () => {
    it("returns analyses for a site ordered by createdAt desc", async () => {
      const records = await service.findBySiteId("site-1");

      expect(prisma.analysis.findMany).toHaveBeenCalledWith({
        where: { siteId: "site-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe("analysis-1");
    });
  });

  describe("findById", () => {
    it("returns an analysis by id", async () => {
      const record = await service.findById("analysis-1");

      expect(prisma.analysis.findUnique).toHaveBeenCalledWith({
        where: { id: "analysis-1" },
      });
      expect(record.id).toBe("analysis-1");
    });

    it("throws NotFoundException when analysis does not exist", async () => {
      prisma.analysis.findUnique.mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(
        "Analysis nonexistent not found",
      );
    });
  });
});
