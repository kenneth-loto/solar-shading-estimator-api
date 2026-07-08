import { ApiProperty } from "@nestjs/swagger";

export class AnalysisRecordDataDto {
  @ApiProperty({ example: "clx..." })
  id: string;

  @ApiProperty({ example: "clx..." })
  siteId: string;

  @ApiProperty({ example: "2026-07-08T00:00:00.000Z" })
  createdAt: string;

  @ApiProperty({
    description:
      "Full analysis result (baseline, shading, adjusted) as stored at run time",
    example: {
      siteId: "clx...",
      siteName: "Makati Roof",
      baseline: {
        ac_annual: 6200,
        ac_monthly: [
          450, 480, 520, 550, 600, 620, 630, 610, 580, 530, 470, 420,
        ],
        capacity_factor: 0.18,
        kwh_per_kw: 1400,
        station_info: {},
      },
      shading: {
        sampleDays: [
          {
            name: "Summer Solstice",
            date: "2026-06-21",
            daylightHours: 15,
            shadedHours: 3,
            percentShaded: 20,
          },
        ],
        averageShadingLoss: 18.75,
      },
      adjusted: {
        adjustedAnnual: 5040,
        adjustedMonthly: [
          366, 390, 423, 448, 488, 504, 512, 496, 472, 431, 382, 342,
        ],
      },
    },
  })
  result: Record<string, unknown>;
}

export class AnalysisRecordListResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Analysis history retrieved successfully" })
  message: string;

  @ApiProperty({ type: [AnalysisRecordDataDto] })
  data: AnalysisRecordDataDto[];
}

export class AnalysisRecordResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Analysis retrieved successfully" })
  message: string;

  @ApiProperty({ type: AnalysisRecordDataDto, nullable: true })
  data: AnalysisRecordDataDto | null;
}
