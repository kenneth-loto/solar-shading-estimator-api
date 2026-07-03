import { jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AnalysisController } from "./analysis.controller.js";
import { AnalysisService } from "./analysis.service.js";
import type { AnalysisResult } from "./interfaces/analysis.interfaces.js";

const mockResult: AnalysisResult = {
  siteId: "site-1",
  siteName: "Test Roof",
  baseline: {
    ac_annual: 7683,
    ac_monthly: [523, 590, 682, 674, 720, 717, 710, 675, 623, 586, 495, 488],
    capacity_factor: 21.9,
    kwh_per_kw: 1921,
    station_info: {},
  },
  shading: {
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
  },
  adjusted: {
    adjustedAnnual: 4737,
    adjustedMonthly: [
      322, 364, 421, 416, 444, 442, 438, 416, 384, 361, 305, 301,
    ],
  },
};

describe("AnalysisController", () => {
  let controller: AnalysisController;
  let service: jest.Mocked<AnalysisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [
        {
          provide: AnalysisService,
          useValue: { analyze: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();

    controller = module.get<AnalysisController>(AnalysisController);
    service = module.get<AnalysisService>(
      AnalysisService,
    ) as jest.Mocked<AnalysisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("analyze", () => {
    it("calls service.analyze with the site id from params", async () => {
      service.analyze.mockResolvedValue(mockResult);

      const result = await controller.analyze("site-1");

      expect(result).toEqual(mockResult);
      expect(service.analyze).toHaveBeenCalledWith("site-1");
    });

    it("passes different site id correctly", async () => {
      service.analyze.mockResolvedValue(mockResult);

      await controller.analyze("site-42");

      expect(service.analyze).toHaveBeenCalledWith("site-42");
    });
  });
});
