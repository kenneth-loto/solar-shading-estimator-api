import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: "Resource not found" })
  message: string;

  @ApiProperty({ type: Object, nullable: true, example: null })
  data: null;
}

export class ValidationErrorItemDto {
  @ApiProperty({ example: "latitude" })
  field: string;

  @ApiProperty({
    example: "latitude must be between -90 and 90",
  })
  message: string;
}

export class EmptyResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "Site deleted successfully" })
  message: string;

  @ApiProperty({ type: Object, nullable: true, example: null })
  data: null;
}

export class ValidationErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: "Validation failed" })
  message: string;

  @ApiProperty({ type: [ValidationErrorItemDto] })
  errors: ValidationErrorItemDto[];
}
