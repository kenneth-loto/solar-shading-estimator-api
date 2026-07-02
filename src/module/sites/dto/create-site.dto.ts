import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class HorizonProfileEntry {
  @IsString()
  @IsNotEmpty()
  direction: string;

  @IsNumber()
  @Min(0)
  @Max(90)
  heightAngle: number;
}

export class CreateSiteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0)
  @Max(90)
  panelTilt: number;

  @IsNumber()
  @Min(0)
  @Max(360)
  panelAzimuth: number;

  @IsNumber()
  @Min(0)
  systemSize: number;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => HorizonProfileEntry)
  horizonProfile: HorizonProfileEntry[];
}
