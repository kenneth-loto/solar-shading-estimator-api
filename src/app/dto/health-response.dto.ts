import { ApiProperty } from "@nestjs/swagger";

export class HealthStatusDto {
  @ApiProperty({ example: "ok" })
  status: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "OK" })
  message: string;

  @ApiProperty({ type: HealthStatusDto, nullable: true })
  data: HealthStatusDto | null;
}
