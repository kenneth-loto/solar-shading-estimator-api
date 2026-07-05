import { ApiProperty } from "@nestjs/swagger";

export class SampleDayDto {
  @ApiProperty({ example: "Spring Equinox" })
  name: string;

  @ApiProperty({ example: "2026-03-20" })
  date: string;

  @ApiProperty({ example: 12 })
  daylightHours: number;

  @ApiProperty({ example: 3 })
  shadedHours: number;

  @ApiProperty({ example: 25 })
  percentShaded: number;
}

export class ShadingDataDto {
  @ApiProperty({ type: [SampleDayDto] })
  sampleDays: SampleDayDto[];

  @ApiProperty({ example: 18.75 })
  averageShadingLoss: number;
}

export class ShadingResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Shading loss calculated successfully" })
  message: string;

  @ApiProperty({ type: ShadingDataDto, nullable: true })
  data: ShadingDataDto | null;
}
