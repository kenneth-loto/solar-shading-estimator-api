import { ApiProperty } from "@nestjs/swagger";

export class PvWattsDataDto {
  @ApiProperty({ example: 6200 })
  ac_annual: number;

  @ApiProperty({
    example: [450, 480, 520, 550, 600, 620, 630, 610, 580, 530, 470, 420],
  })
  ac_monthly: number[];

  @ApiProperty({ example: 0.18 })
  capacity_factor: number;

  @ApiProperty({ example: 1400 })
  kwh_per_kw: number;

  @ApiProperty({ type: Object, example: {} })
  station_info: Record<string, never>;
}

export class PvWattsResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "PVWatts estimate retrieved successfully" })
  message: string;

  @ApiProperty({ type: PvWattsDataDto, nullable: true })
  data: PvWattsDataDto | null;
}
