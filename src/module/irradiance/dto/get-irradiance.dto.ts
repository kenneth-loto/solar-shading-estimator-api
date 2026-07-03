import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsString, Matches, Max, Min } from "class-validator";

export class GetIrradianceDto {
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

  @ApiProperty({
    description: "Start date in YYYYMMDD format",
    example: "20260301",
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: "startDate must be in YYYYMMDD format" })
  startDate: string;

  @ApiProperty({
    description: "End date in YYYYMMDD format",
    example: "20260331",
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: "endDate must be in YYYYMMDD format" })
  endDate: string;
}
