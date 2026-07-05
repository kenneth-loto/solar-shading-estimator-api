import { ApiProperty } from "@nestjs/swagger";

export class IrradianceDataDto {
  @ApiProperty({ example: 14.59 })
  latitude: number;

  @ApiProperty({ example: 121.03 })
  longitude: number;

  @ApiProperty({ example: ["ALLSKY_SFC_SW_DWN"] })
  parameters: string[];

  @ApiProperty({
    type: Object,
    example: { "20260301": 5.23, "20260302": null },
    description: "Daily irradiance values keyed by date (YYYYMMDD)",
  })
  data: Record<string, number | null>;
}

export class IrradianceResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Irradiance data retrieved successfully" })
  message: string;

  @ApiProperty({ type: IrradianceDataDto, nullable: true })
  data: IrradianceDataDto | null;
}
