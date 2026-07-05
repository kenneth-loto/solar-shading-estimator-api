import { ApiProperty } from "@nestjs/swagger";

export class BaselineDto {
  @ApiProperty({ example: 6200 })
  ac_annual: number;

  @ApiProperty({
    type: [Number],
    example: [450, 480, 520, 550, 600, 620, 630, 610, 580, 530, 470, 420],
    description: "Monthly AC production (12 values, Jan–Dec)",
  })
  ac_monthly: number[];

  @ApiProperty({ example: 0.18 })
  capacity_factor: number;

  @ApiProperty({ example: 1400 })
  kwh_per_kw: number;

  @ApiProperty({
    example: {},
    description: "Metadata about the NASA/PVWatts weather station used",
  })
  station_info: Record<string, unknown>;
}

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

export class ShadingDto {
  @ApiProperty({ type: [SampleDayDto] })
  sampleDays: SampleDayDto[];

  @ApiProperty({ example: 18.75 })
  averageShadingLoss: number;
}

export class AdjustedDto {
  @ApiProperty({ example: 5040 })
  adjustedAnnual: number;

  @ApiProperty({
    type: [Number],
    example: [366, 390, 423, 448, 488, 504, 512, 496, 472, 431, 382, 342],
    description: "Monthly shading-adjusted AC production (12 values, Jan–Dec)",
  })
  adjustedMonthly: number[];
}

export class AnalysisDataDto {
  @ApiProperty({ example: "clx..." })
  siteId: string;

  @ApiProperty({ example: "Makati Roof" })
  siteName: string;

  @ApiProperty({ type: BaselineDto })
  baseline: BaselineDto;

  @ApiProperty({ type: ShadingDto })
  shading: ShadingDto;

  @ApiProperty({ type: AdjustedDto })
  adjusted: AdjustedDto;
}

export class AnalysisResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Analysis completed successfully" })
  message: string;

  @ApiProperty({ type: AnalysisDataDto, nullable: true })
  data: AnalysisDataDto | null;
}
