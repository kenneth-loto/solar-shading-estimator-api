import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from "../../common/dto/error-response.dto.js";
import { GetIrradianceDto } from "./dto/get-irradiance.dto.js";
import { IrradianceResponseDto } from "./dto/irradiance-response.dto.js";
import { IrradianceService } from "./irradiance.service.js";

@ApiTags("Irradiance")
@Throttle({ default: { limit: 10 } })
@Controller("irradiance")
export class IrradianceController {
  constructor(private readonly irradianceService: IrradianceService) {}

  @Get()
  @ApiOperation({
    summary: "Get historical irradiance data for a location",
    operationId: "getIrradiance",
    description:
      "Fetches historical solar irradiance data from NASA POWER for the specified coordinates and date range.",
  })
  @ApiOkResponse({
    description: "Irradiance data retrieved successfully",
    type: IrradianceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "Too many requests — rate limited",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Irradiance data retrieved successfully")
  getIrradiance(@Query() dto: GetIrradianceDto) {
    return this.irradianceService.getIrradiance(
      dto.latitude,
      dto.longitude,
      dto.startDate,
      dto.endDate,
    );
  }
}
