import { jest } from "@jest/globals";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { PvWattsResponse } from "./interfaces/pvwatts.interfaces.js";
import { PvWattsService } from "./pvwatts.service.js";

const mockPvWattsResponse: PvWattsResponse = {
  inputs: {
    api_key: "DEMO_KEY",
    lat: 40,
    lon: -105,
    system_capacity: 4,
    module_type: 0,
    array_type: 0,
    tilt: 20,
    azimuth: 180,
    losses: 14,
    timeframe: "monthly",
  },
  errors: [],
  warnings: [],
  version: "1.4.0",
  ssc_info: {},
  station_info: {
    location: 1,
    city: "Boulder",
    state: "CO",
    lat: 40.02,
    lon: -105.25,
    distance: 12,
    tz: -7,
  },
  outputs: {
    ac_monthly: [523, 590, 682, 674, 720, 717, 710, 675, 623, 586, 495, 488],
    poa_monthly: [120, 135, 168, 185, 210, 215, 220, 200, 175, 150, 125, 115],
    dc_monthly: [130, 148, 182, 198, 225, 230, 235, 215, 190, 162, 135, 124],
    solrad_monthly: [
      4.5, 5.2, 6.1, 6.5, 7.2, 7.5, 7.8, 7.0, 6.0, 5.0, 4.2, 3.8,
    ],
    ac_annual: 7683,
    solrad_annual: 5.9,
    capacity_factor: 21.9,
    kwh_per_kw: 1921,
  },
};

describe("PvWattsService", () => {
  let service: PvWattsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PvWattsService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn<() => Promise<unknown>>(),
            set: jest.fn<() => Promise<unknown>>(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === "PVWATTS_API_KEY") return "test-api-key";
              if (key === "PVWATTS_API_URL")
                return "https://developer.nlr.gov/api/pvwatts/v8";
              throw new Error(`Unknown key: ${key}`);
            },
          },
        },
      ],
    }).compile();

    service = module.get<PvWattsService>(PvWattsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("estimate", () => {
    it("returns PVWatts estimate on success", async () => {
      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockPvWattsResponse,
      } as Response);

      const result = await service.estimate(40, -105, 20, 180, 4);

      expect(result.ac_annual).toBe(7683);
      expect(result.ac_monthly).toHaveLength(12);
      expect(result.capacity_factor).toBe(21.9);
      expect(result.kwh_per_kw).toBe(1921);
      expect(result.station_info).toBeDefined();

      const callUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(callUrl).toContain("api_key=test-api-key");
      expect(callUrl).toContain("lat=40");
      expect(callUrl).toContain("lon=-105");
      expect(callUrl).toContain("tilt=20");
      expect(callUrl).toContain("azimuth=180");
      expect(callUrl).toContain("system_capacity=4");
      expect(callUrl).toContain("losses=14");
      expect(callUrl).toContain("timeframe=monthly");

      mockFetch.mockRestore();
    });

    it("uses custom losses value when provided", async () => {
      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockPvWattsResponse,
      } as Response);

      await service.estimate(40, -105, 20, 180, 4, 10);

      const callUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(callUrl).toContain("losses=10");

      mockFetch.mockRestore();
    });

    it("throws when PVWatts returns an error status", async () => {
      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      } as Response);

      await expect(service.estimate(40, -105, 20, 180, 4)).rejects.toThrow(
        "PVWatts API returned 400: Bad Request",
      );

      mockFetch.mockRestore();
    });

    it("throws when PVWatts returns errors in response body", async () => {
      const errorResponse = {
        ...mockPvWattsResponse,
        errors: ["Invalid parameter: latitude"],
      };

      const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      await expect(service.estimate(40, -105, 20, 180, 4)).rejects.toThrow(
        "PVWatts API error: Invalid parameter: latitude",
      );

      mockFetch.mockRestore();
    });
  });
});
