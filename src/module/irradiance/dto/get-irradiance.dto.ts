import { Type } from "class-transformer";
import { IsNumber, IsString, Matches, Max, Min } from "class-validator";

export class GetIrradianceDto {
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

  @IsString()
  @Matches(/^\d{8}$/, { message: "startDate must be in YYYYMMDD format" })
  startDate: string;

  @IsString()
  @Matches(/^\d{8}$/, { message: "endDate must be in YYYYMMDD format" })
  endDate: string;
}
