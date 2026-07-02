import { jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Prisma, Site } from "../../generated/prisma/client.js";
import { PrismaService } from "../../lib/database/prisma.service.js";
import type { CreateSiteDto } from "./dto/create-site.dto.js";
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

const mockPrisma = {
  site: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<PrismaService["site"]>,
};

describe("SitesService", () => {
  let service: SitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("creates a site", async () => {
      const dto: CreateSiteDto = {
        name: "Test Roof",
        latitude: 40.7128,
        longitude: -74.006,
        panelTilt: 30,
        panelAzimuth: 180,
        systemSize: 5,
        horizonProfile: [{ direction: "S", heightAngle: 15 }],
      };

      mockPrisma.site.create.mockResolvedValue(mockSite);

      const result = await service.create(dto);

      expect(result).toEqual(mockSite);
      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          latitude: dto.latitude,
          longitude: dto.longitude,
          panelTilt: dto.panelTilt,
          panelAzimuth: dto.panelAzimuth,
          systemSize: dto.systemSize,
          horizonProfile: expect.any(Object),
        },
      });
    });
  });

  describe("findAll", () => {
    it("returns all sites ordered by created date", async () => {
      mockPrisma.site.findMany.mockResolvedValue([mockSite]);

      const result = await service.findAll();

      expect(result).toEqual([mockSite]);
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findById", () => {
    it("returns the site when found", async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);

      const result = await service.findById("site-1");

      expect(result).toEqual(mockSite);
    });

    it("throws NotFoundException when not found", async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("updates and returns the site", async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.site.update.mockResolvedValue({
        ...mockSite,
        name: "Updated Roof",
      });

      const result = await service.update("site-1", { name: "Updated Roof" });

      expect(result.name).toBe("Updated Roof");
    });

    it("throws NotFoundException when site does not exist", async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { name: "Nope" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("delete", () => {
    it("deletes the site when found", async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.site.delete.mockResolvedValue(mockSite);

      await service.delete("site-1");

      expect(mockPrisma.site.delete).toHaveBeenCalledWith({
        where: { id: "site-1" },
      });
    });

    it("throws NotFoundException when site does not exist", async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.delete("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
