import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { AnalysisService } from "./analysis.service.js";
import { AnalysisHistoryController } from "./analysis-history.controller.js";

const mockRecord = {
  id: "analysis-1",
  siteId: "site-1",
  result: {
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
  },
  createdAt: new Date("2026-07-08"),
};

describe("AnalysisHistoryController", () => {
  let controller: AnalysisHistoryController;
  let service: jest.Mocked<AnalysisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisHistoryController],
      providers: [
        {
          provide: AnalysisService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AnalysisHistoryController>(
      AnalysisHistoryController,
    );
    service = module.get<AnalysisService>(
      AnalysisService,
    ) as jest.Mocked<AnalysisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAnalysis", () => {
    it("calls service.findById with the analysis id from params", async () => {
      service.findById.mockResolvedValue(mockRecord);

      const result = await controller.getAnalysis("analysis-1");

      expect(result).toEqual(mockRecord);
      expect(service.findById).toHaveBeenCalledWith("analysis-1");
    });

    it("passes different analysis id correctly", async () => {
      service.findById.mockResolvedValue(mockRecord);

      await controller.getAnalysis("analysis-42");

      expect(service.findById).toHaveBeenCalledWith("analysis-42");
    });
  });
});
