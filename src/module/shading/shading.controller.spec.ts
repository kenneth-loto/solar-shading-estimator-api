import { jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { ShadingResult } from "./interfaces/shading.interfaces.js";
import { ShadingController } from "./shading.controller.js";
import { ShadingService } from "./shading.service.js";

describe("ShadingController", () => {
  let controller: ShadingController;
  let service: jest.Mocked<ShadingService>;

  const mockResult: ShadingResult = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShadingController],
      providers: [
        {
          provide: ShadingService,
          useValue: {
            calculate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();

    controller = module.get<ShadingController>(ShadingController);
    service = module.get<ShadingService>(
      ShadingService,
    ) as jest.Mocked<ShadingService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("calculate", () => {
    it("calls service.calculate with body params", async () => {
      const dto = {
        latitude: 40.02,
        longitude: -105.25,
        horizonProfile: [
          { direction: "N", heightAngle: 10 },
          { direction: "E", heightAngle: 15 },
          { direction: "S", heightAngle: 20 },
          { direction: "W", heightAngle: 15 },
        ],
      };

      service.calculate.mockReturnValue(mockResult);

      const result = await controller.calculate(dto);

      expect(result).toEqual(mockResult);
      expect(service.calculate).toHaveBeenCalledWith(
        40.02,
        -105.25,
        dto.horizonProfile,
      );
    });

    it("passes 4-direction horizon profile correctly", async () => {
      const dto = {
        latitude: 0,
        longitude: 0,
        horizonProfile: [
          { direction: "N", heightAngle: 0 },
          { direction: "E", heightAngle: 0 },
          { direction: "S", heightAngle: 0 },
          { direction: "W", heightAngle: 0 },
        ],
      };

      service.calculate.mockReturnValue(mockResult);

      await controller.calculate(dto);

      expect(service.calculate).toHaveBeenCalledWith(0, 0, dto.horizonProfile);
    });
  });
});
