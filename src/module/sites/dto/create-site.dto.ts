import { ApiProperty } from "@nestjs/swagger";
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
  @ApiProperty({ description: "Compass direction", example: "S" })
  @IsString()
  @IsNotEmpty()
  direction: string;

  @ApiProperty({
    description: "Horizon height angle in degrees (0–90)",
    example: 30,
  })
  @IsNumber()
  @Min(0)
  @Max(90)
  heightAngle: number;
}

export class CreateSiteDto {
  @ApiProperty({ example: "Makati Roof" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Latitude (-90 to 90)", example: 14.59 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: "Longitude (-180 to 180)", example: 121.03 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: "Panel tilt in degrees (0–90)", example: 30 })
  @IsNumber()
  @Min(0)
  @Max(90)
  panelTilt: number;

  @ApiProperty({
    description: "Panel azimuth in degrees (0–360)",
    example: 180,
  })
  @IsNumber()
  @Min(0)
  @Max(360)
  panelAzimuth: number;

  @ApiProperty({ description: "System size in kW", example: 5 })
  @IsNumber()
  @Min(0)
  systemSize: number;

  @ApiProperty({
    description: "Horizon profile (4–16 entries)",
    type: [HorizonProfileEntry],
    example: [
      { direction: "N", heightAngle: 15 },
      { direction: "E", heightAngle: 10 },
      { direction: "S", heightAngle: 5 },
      { direction: "W", heightAngle: 10 },
    ],
  })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => HorizonProfileEntry)
  horizonProfile: HorizonProfileEntry[];
}
