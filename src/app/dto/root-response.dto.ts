import { ApiProperty } from "@nestjs/swagger";

export class RootDataDto {
  @ApiProperty({ example: "Solar Shading Estimator API" })
  message: string;

  @ApiProperty({ example: "https://your-docs-site.com" })
  docs: string;
}

export class RootResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Success" })
  message: string;

  @ApiProperty({ type: RootDataDto, nullable: true })
  data: RootDataDto | null;
}
