import { jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { Prisma, Site } from "../../generated/prisma/client.js";
import { SitesController } from "./sites.controller.js";
import { SitesService } from "./sites.service.js";

const mockSite: Site = {
  id: "site-1",
  name: "Test Roof",
  latitude: 40.7128,
  longitude: -74.006,
  panelTilt: 30,
  panelAzimuth: 180,
  systemSize: 5,
  horizonProfile: [
    { direction: "S", heightAngle: 15 },
  ] as unknown as Prisma.JsonValue,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("SitesController", () => {
  let controller: SitesController;
  let service: jest.Mocked<SitesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitesController],
      providers: [
        {
          provide: SitesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();

    controller = module.get<SitesController>(SitesController);
    service = module.get<SitesService>(
      SitesService,
    ) as jest.Mocked<SitesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("calls service.create with the dto", async () => {
      const dto = {
        name: "Test Roof",
        latitude: 40.7128,
        longitude: -74.006,
        panelTilt: 30,
        panelAzimuth: 180,
        systemSize: 5,
        horizonProfile: [{ direction: "S", heightAngle: 15 }],
      };

      service.create.mockResolvedValue(mockSite);

      const result = await controller.create(dto);

      expect(result).toEqual(mockSite);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("findAll", () => {
    it("calls service.findAll", async () => {
      service.findAll.mockResolvedValue([mockSite]);

      const result = await controller.findAll();

      expect(result).toEqual([mockSite]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("calls service.findById with the id", async () => {
      service.findById.mockResolvedValue(mockSite);

      const result = await controller.findById("site-1");

      expect(result).toEqual(mockSite);
      expect(service.findById).toHaveBeenCalledWith("site-1");
    });
  });

  describe("update", () => {
    it("calls service.update with id and dto", async () => {
      const dto = { name: "Updated Roof" };
      service.update.mockResolvedValue({ ...mockSite, name: "Updated Roof" });

      const result = await controller.update("site-1", dto);

      expect(result.name).toBe("Updated Roof");
      expect(service.update).toHaveBeenCalledWith("site-1", dto);
    });
  });

  describe("delete", () => {
    it("calls service.delete with the id", async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete("site-1");

      expect(service.delete).toHaveBeenCalledWith("site-1");
    });
  });
});
