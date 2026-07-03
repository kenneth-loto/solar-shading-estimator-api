import { jest } from "@jest/globals";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { NasaPowerResponse } from "./interfaces/irradiance.interfaces.js";
import { IrradianceService } from "./irradiance.service.js";

const mockNasaResponse: NasaPowerResponse = {
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [-105.5, 40.5],
  },
  properties: {
    parameter: {
      ALLSKY_SFC_SW_DWN: {
        "20230101": 3.45,
        "20230102": 4.12,
        "20230103": 5.01,
      },
    },
    latitude: 40.5,
    longitude: -105.5,
  },
  header: { title: "NASA POWER Daily Point Service" },
  messages: [],
};

const mockCache = {
  get: jest.fn<() => Promise<unknown>>(),
  set: jest.fn<() => Promise<unknown>>(),
  del: jest.fn(),
  reset: jest.fn(),
  wrap: jest.fn(),
};

describe("IrradianceService", () => {
  let service: IrradianceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IrradianceService,
        { provide: CACHE_MANAGER, useValue: mockCache },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (_key: string) =>
              "https://power.larc.nasa.gov/api/temporal/daily/point",
          },
        },
      ],
    }).compile();

    service = module.get<IrradianceService>(IrradianceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getIrradiance", () => {
    it("returns cached data on subsequent calls", async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockNasaResponse,
      } as Response);

      const result1 = await service.getIrradiance(
        40.4,
        -105.3,
        "20230101",
        "20230103",
      );

      expect(result1.latitude).toBe(40.5);
      expect(result1.longitude).toBe(-105.5);
      expect(result1.data).toEqual(
        mockNasaResponse.properties.parameter.ALLSKY_SFC_SW_DWN,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockCache.get.mockResolvedValue(result1);

      const result2 = await service.getIrradiance(
        40.4,
        -105.3,
        "20230101",
        "20230103",
      );

      expect(result2).toEqual(result1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockRestore();
    });

    it("fetches from NASA POWER on cache miss", async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockNasaResponse,
      } as Response);

      const result = await service.getIrradiance(
        40.4,
        -105.3,
        "20230101",
        "20230103",
      );

      expect(result.parameters).toEqual(["ALLSKY_SFC_SW_DWN"]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith(
        "nasa_power:40.5:-105.5:20230101:20230103",
        expect.any(Object),
        86_400_000,
      );

      mockFetch.mockRestore();
    });

    it("rounds coordinates to nearest 0.5", async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockNasaResponse,
      } as Response);

      await service.getIrradiance(40.123, -105.456, "20230101", "20230103");

      const callUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(callUrl).toContain("latitude=40");
      expect(callUrl).toContain("longitude=-105.5");

      mockFetch.mockRestore();
    });

    it("throws when NASA POWER returns an error", async () => {
      mockCache.get.mockResolvedValue(null);

      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      } as Response);

      await expect(
        service.getIrradiance(40, -105, "20230101", "20230103"),
      ).rejects.toThrow("NASA POWER API returned 500: Internal Server Error");

      mockFetch.mockRestore();
    });
  });
});
