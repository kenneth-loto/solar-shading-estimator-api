import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class GetPvWattsDto {
  @ApiProperty({ description: "Latitude (-90 to 90)", example: 14.59 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: "Longitude (-180 to 180)", example: 121.03 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: "Panel tilt in degrees (0–90)", example: 30 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(90)
  tilt: number;

  @ApiProperty({
    description: "Panel azimuth in degrees (0–360, 180 = south)",
    example: 180,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  azimuth: number;

  @ApiProperty({ description: "System size in kW", example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  systemSize: number;

  @ApiProperty({
    description: "System losses percent (default 14)",
    example: 14,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  losses?: number;
}
