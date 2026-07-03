import { Type } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class GetPvWattsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(90)
  tilt: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  azimuth: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  systemSize: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  losses?: number;
}
