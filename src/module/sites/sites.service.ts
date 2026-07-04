import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, Site } from "../../generated/prisma/client.js";
import { PrismaService } from "../../lib/database/prisma.service.js";
import type { CreateSiteDto } from "./dto/create-site.dto.js";
import type { UpdateSiteDto } from "./dto/update-site.dto.js";

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSiteDto): Promise<Site> {
    return this.prisma.site.create({
      data: {
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        panelTilt: dto.panelTilt,
        panelAzimuth: dto.panelAzimuth,
        systemSize: dto.systemSize,
        horizonProfile: dto.horizonProfile as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(): Promise<Site[]> {
    return this.prisma.site.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Site> {
    const site = await this.prisma.site.findUnique({ where: { id } });

    if (!site) throw new NotFoundException(`Site ${id} not found`);

    return site;
  }

  async update(id: string, dto: UpdateSiteDto): Promise<Site> {
    await this.findById(id);

    const data: Prisma.SiteUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.panelTilt !== undefined && { panelTilt: dto.panelTilt }),
      ...(dto.panelAzimuth !== undefined && {
        panelAzimuth: dto.panelAzimuth,
      }),
      ...(dto.systemSize !== undefined && { systemSize: dto.systemSize }),
      ...(dto.horizonProfile !== undefined && {
        horizonProfile: dto.horizonProfile as unknown as Prisma.InputJsonValue,
      }),
    };

    return this.prisma.site.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);

    await this.prisma.site.delete({ where: { id } });
  }
}
