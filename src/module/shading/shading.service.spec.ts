import { Test, TestingModule } from "@nestjs/testing";
import type { HorizonProfileEntry } from "./interfaces/shading.interfaces.js";
import { ShadingService } from "./shading.service.js";

describe("ShadingService", () => {
  let service: ShadingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShadingService],
    }).compile();

    service = module.get<ShadingService>(ShadingService);
  });

  describe("calculate", () => {
    const boulder: [number, number] = [40.02, -105.25];
    const fullHorizon: HorizonProfileEntry[] = [
      { direction: "N", heightAngle: 0 },
      { direction: "E", heightAngle: 0 },
      { direction: "S", heightAngle: 0 },
      { direction: "W", heightAngle: 0 },
    ];

    it("returns 4 sample days with correct result shape", () => {
      const result = service.calculate(...boulder, fullHorizon);

      expect(result.sampleDays).toHaveLength(4);
      expect(result.averageShadingLoss).toBeGreaterThanOrEqual(0);
      expect(result.averageShadingLoss).toBeLessThanOrEqual(100);

      for (const day of result.sampleDays) {
        expect(day).toMatchObject({
          name: expect.any(String),
          date: expect.any(String),
          daylightHours: expect.any(Number),
          shadedHours: expect.any(Number),
          percentShaded: expect.any(Number),
        });
        expect(day.daylightHours).toBeGreaterThan(0);
        expect(day.shadedHours).toBeGreaterThanOrEqual(0);
        expect(day.percentShaded).toBeGreaterThanOrEqual(0);
        expect(day.percentShaded).toBeLessThanOrEqual(100);
      }
    });

    it("returns 0% shading loss with flat horizon (all 0° height)", () => {
      const result = service.calculate(...boulder, fullHorizon);

      expect(result.averageShadingLoss).toBe(0);
      for (const day of result.sampleDays) {
        expect(day.percentShaded).toBe(0);
      }
    });

    it("returns 100% shading loss with full obstruction (all 90° height)", () => {
      const obstructed: HorizonProfileEntry[] = [
        { direction: "N", heightAngle: 90 },
        { direction: "E", heightAngle: 90 },
        { direction: "S", heightAngle: 90 },
        { direction: "W", heightAngle: 90 },
      ];

      const result = service.calculate(...boulder, obstructed);

      expect(result.averageShadingLoss).toBe(100);
      for (const day of result.sampleDays) {
        expect(day.percentShaded).toBe(100);
      }
    });

    it("returns higher shading loss in winter than summer for a southern obstruction", () => {
      const southObstruction: HorizonProfileEntry[] = [
        { direction: "N", heightAngle: 0 },
        { direction: "E", heightAngle: 0 },
        { direction: "S", heightAngle: 30 },
        { direction: "W", heightAngle: 0 },
      ];

      const result = service.calculate(...boulder, southObstruction);

      const summerSolstice = result.sampleDays.find(
        (d) => d.name === "Summer Solstice",
      );
      const winterSolstice = result.sampleDays.find(
        (d) => d.name === "Winter Solstice",
      );

      expect(summerSolstice).toBeDefined();
      expect(winterSolstice).toBeDefined();
      expect(winterSolstice?.percentShaded).toBeGreaterThan(
        summerSolstice?.percentShaded ?? 0,
      );
    });

    it("handles 8-direction horizon profile correctly", () => {
      const eightDirection: HorizonProfileEntry[] = [
        { direction: "N", heightAngle: 10 },
        { direction: "NE", heightAngle: 15 },
        { direction: "E", heightAngle: 20 },
        { direction: "SE", heightAngle: 25 },
        { direction: "S", heightAngle: 30 },
        { direction: "SW", heightAngle: 25 },
        { direction: "W", heightAngle: 20 },
        { direction: "NW", heightAngle: 15 },
      ];

      const result = service.calculate(...boulder, eightDirection);

      expect(result.sampleDays).toHaveLength(4);
      expect(result.averageShadingLoss).toBeGreaterThan(0);
      expect(result.averageShadingLoss).toBeLessThan(100);
    });

    it("works at the equator where sun path is more uniform", () => {
      const equator: [number, number] = [0, 0];
      const equatorialHorizon: HorizonProfileEntry[] = [
        { direction: "N", heightAngle: 0 },
        { direction: "E", heightAngle: 0 },
        { direction: "S", heightAngle: 0 },
        { direction: "W", heightAngle: 0 },
      ];

      const result = service.calculate(...equator, equatorialHorizon);

      expect(result.averageShadingLoss).toBe(0);
      expect(result.sampleDays).toHaveLength(4);
    });
  });
});
