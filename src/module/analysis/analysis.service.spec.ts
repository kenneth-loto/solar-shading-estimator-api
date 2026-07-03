import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import type { Site } from "../../generated/prisma/client.js";
import type { PvWattsResult } from "../pvwatts/interfaces/pvwatts.interfaces.js";
import { PvWattsService } from "./../pvwatts/pvwatts.service.js";
import type {
  HorizonProfileEntry,
  ShadingResult,
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

const mockPvWattsResult: PvWattsResult = {
  ac_annual: 7683,
  ac_monthly: [523, 590, 682, 674, 720, 717, 710, 675, 623, 586, 495, 488],
  capacity_factor: 21.9,
  kwh_per_kw: 1921,
  station_info: {},
};

const mockShadingResult: ShadingResult = {
  sampleDays: [
    {
      name: "Summer Solstice",
      date: "2026-06-21",
      daylightHours: 15,
      shadedHours: 3,
      percentShaded: 20,
    },
    {
      name: "Winter Solstice",
      date: "2026-12-21",
      daylightHours: 9,
      shadedHours: 6,
      percentShaded: 66.67,
    },
    {
      name: "Spring Equinox",
      date: "2026-03-20",
      daylightHours: 12,
      shadedHours: 4,
      percentShaded: 33.33,
    },
    {
      name: "Fall Equinox",
      date: "2026-09-22",
      daylightHours: 12,
      shadedHours: 4,
      percentShaded: 33.33,
    },
  ],
  averageShadingLoss: 38.33,
};

describe("AnalysisService", () => {
  let service: AnalysisService;
  let sitesService: jest.Mocked<SitesService>;
  let pvWattsService: jest.Mocked<PvWattsService>;
  let shadingService: jest.Mocked<ShadingService>;

  beforeEach(async () => {
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
          useValue: { calculate: jest.fn() },
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
      shadingService.calculate.mockReturnValue(mockShadingResult);

      const result = await service.analyze("site-1");

      expect(result.siteId).toBe("site-1");
      expect(result.siteName).toBe("Test Roof");
      expect(result.baseline).toEqual(mockPvWattsResult);
      expect(result.shading).toEqual(mockShadingResult);
    });

    it("computes adjusted annual and monthly kWh correctly", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculate.mockReturnValue(mockShadingResult);

      const result = await service.analyze("site-1");

      const factor = 1 - 38.33 / 100;
      const expectedAnnual = Math.round(7683 * factor);
      const expectedMonthly = mockPvWattsResult.ac_monthly.map((m) =>
        Math.round(m * factor),
      );

      expect(result.adjusted.adjustedAnnual).toBe(expectedAnnual);
      expect(result.adjusted.adjustedMonthly).toEqual(expectedMonthly);
    });

    it("passes correct site parameters to PVWatts and Shading", async () => {
      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculate.mockReturnValue(mockShadingResult);

      await service.analyze("site-1");

      expect(pvWattsService.estimate).toHaveBeenCalledWith(
        40.02,
        -105.25,
        30,
        180,
        5,
      );
      expect(shadingService.calculate).toHaveBeenCalledWith(
        40.02,
        -105.25,
        mockSite.horizonProfile as unknown as HorizonProfileEntry[],
      );
    });

    it("returns 0 shading loss when horizon is flat", async () => {
      const flatShading: ShadingResult = {
        sampleDays: [
          {
            name: "Summer Solstice",
            date: "2026-06-21",
            daylightHours: 15,
            shadedHours: 0,
            percentShaded: 0,
          },
          {
            name: "Winter Solstice",
            date: "2026-12-21",
            daylightHours: 9,
            shadedHours: 0,
            percentShaded: 0,
          },
          {
            name: "Spring Equinox",
            date: "2026-03-20",
            daylightHours: 12,
            shadedHours: 0,
            percentShaded: 0,
          },
          {
            name: "Fall Equinox",
            date: "2026-09-22",
            daylightHours: 12,
            shadedHours: 0,
            percentShaded: 0,
          },
        ],
        averageShadingLoss: 0,
      };

      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculate.mockReturnValue(flatShading);

      const result = await service.analyze("site-1");

      expect(result.adjusted.adjustedAnnual).toBe(mockPvWattsResult.ac_annual);
      expect(result.adjusted.adjustedMonthly).toEqual(
        mockPvWattsResult.ac_monthly,
      );
    });

    it("returns 0 adjusted kWh when shading is 100%", async () => {
      const fullShading: ShadingResult = {
        sampleDays: [
          {
            name: "Summer Solstice",
            date: "2026-06-21",
            daylightHours: 15,
            shadedHours: 15,
            percentShaded: 100,
          },
          {
            name: "Winter Solstice",
            date: "2026-12-21",
            daylightHours: 9,
            shadedHours: 9,
            percentShaded: 100,
          },
          {
            name: "Spring Equinox",
            date: "2026-03-20",
            daylightHours: 12,
            shadedHours: 12,
            percentShaded: 100,
          },
          {
            name: "Fall Equinox",
            date: "2026-09-22",
            daylightHours: 12,
            shadedHours: 12,
            percentShaded: 100,
          },
        ],
        averageShadingLoss: 100,
      };

      sitesService.findById.mockResolvedValue(mockSite);
      pvWattsService.estimate.mockResolvedValue(mockPvWattsResult);
      shadingService.calculate.mockReturnValue(fullShading);

      const result = await service.analyze("site-1");

      expect(result.adjusted.adjustedAnnual).toBe(0);
      expect(result.adjusted.adjustedMonthly).toEqual(
        mockPvWattsResult.ac_monthly.map(() => 0),
      );
    });
  });
});
