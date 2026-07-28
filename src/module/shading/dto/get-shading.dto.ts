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

export class ShadingHorizonProfileEntry {
  @ApiProperty({
    description: "Compass direction (N, NE, E, SE, S, SW, W, NW)",
    example: "S",
  })
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

export class GetShadingDto {
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

  @ApiProperty({
    description: "Horizon profile (4–16 compass direction entries)",
    type: [ShadingHorizonProfileEntry],
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
  @Type(() => ShadingHorizonProfileEntry)
  horizonProfile: ShadingHorizonProfileEntry[];
}
