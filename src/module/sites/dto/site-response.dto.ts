import { ApiProperty } from "@nestjs/swagger";
import { HorizonProfileEntry } from "./create-site.dto.js";

export class SiteDataDto {
  @ApiProperty({ example: "clx..." })
  id: string;

  @ApiProperty({ example: "Makati Roof" })
  name: string;

  @ApiProperty({ example: 14.59 })
  latitude: number;

  @ApiProperty({ example: 121.03 })
  longitude: number;

  @ApiProperty({ example: 30 })
  panelTilt: number;

  @ApiProperty({ example: 180 })
  panelAzimuth: number;

  @ApiProperty({ example: 5 })
  systemSize: number;

  @ApiProperty({ type: [HorizonProfileEntry] })
  horizonProfile: HorizonProfileEntry[];

  @ApiProperty({ example: "2026-07-04T00:00:00.000Z" })
  createdAt: string;

  @ApiProperty({ example: "2026-07-04T00:00:00.000Z" })
  updatedAt: string;
}

export class SiteResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Sites retrieved successfully" })
  message: string;

  @ApiProperty({ type: SiteDataDto, nullable: true })
  data: SiteDataDto | null;
}

export class SiteListResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Sites retrieved successfully" })
  message: string;

  @ApiProperty({ type: [SiteDataDto] })
  data: SiteDataDto[];
}
