import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { IrradianceController } from "./irradiance.controller.js";
import { IrradianceService } from "./irradiance.service.js";

describe("IrradianceController", () => {
  let controller: IrradianceController;
  let service: jest.Mocked<IrradianceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IrradianceController],
      providers: [
        {
          provide: IrradianceService,
          useValue: {
            getIrradiance: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IrradianceController>(IrradianceController);
    service = module.get<IrradianceService>(
      IrradianceService,
    ) as jest.Mocked<IrradianceService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getIrradiance", () => {
    it("calls service.getIrradiance with query params", async () => {
      const dto = {
        latitude: 40.4,
        longitude: -105.3,
        startDate: "20230101",
        endDate: "20230103",
      };

      const mockResult = {
        latitude: 40.5,
        longitude: -105.5,
        parameters: ["ALLSKY_SFC_SW_DWN"],
        data: { "20230101": 3.45 },
      };

      service.getIrradiance.mockResolvedValue(mockResult);

      const result = await controller.getIrradiance(dto);

      expect(result).toEqual(mockResult);
      expect(service.getIrradiance).toHaveBeenCalledWith(
        40.4,
        -105.3,
        "20230101",
        "20230103",
      );
    });
  });
});
