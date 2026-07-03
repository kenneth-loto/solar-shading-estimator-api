import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { PvWattsController } from "./pvwatts.controller.js";
import { PvWattsService } from "./pvwatts.service.js";

describe("PvWattsController", () => {
  let controller: PvWattsController;
  let service: jest.Mocked<PvWattsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PvWattsController],
      providers: [
        {
          provide: PvWattsService,
          useValue: {
            estimate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PvWattsController>(PvWattsController);
    service = module.get<PvWattsService>(
      PvWattsService,
    ) as jest.Mocked<PvWattsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("estimate", () => {
    it("calls service.estimate with query params", async () => {
      const dto = {
        latitude: 40,
        longitude: -105,
        tilt: 20,
        azimuth: 180,
        systemSize: 4,
      };

      const mockResult = {
        ac_annual: 7683,
        ac_monthly: [
          523, 590, 682, 674, 720, 717, 710, 675, 623, 586, 495, 488,
        ],
        capacity_factor: 21.9,
        kwh_per_kw: 1921,
        station_info: {},
      };

      service.estimate.mockResolvedValue(mockResult);

      const result = await controller.estimate(dto);

      expect(result).toEqual(mockResult);
      expect(service.estimate).toHaveBeenCalledWith(
        40,
        -105,
        20,
        180,
        4,
        undefined,
      );
    });

    it("passes optional losses param when provided", async () => {
      const dto = {
        latitude: 40,
        longitude: -105,
        tilt: 20,
        azimuth: 180,
        systemSize: 4,
        losses: 10,
      };

      service.estimate.mockResolvedValue({
        ac_annual: 7800,
        ac_monthly: [],
        capacity_factor: 22,
        kwh_per_kw: 1950,
        station_info: {},
      });

      await controller.estimate(dto);

      expect(service.estimate).toHaveBeenCalledWith(40, -105, 20, 180, 4, 10);
    });
  });
});
