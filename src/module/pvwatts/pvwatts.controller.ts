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
import { GetPvWattsDto } from "./dto/get-pvwatts.dto.js";
import { PvWattsResponseDto } from "./dto/pvwatts-response.dto.js";
import { PvWattsService } from "./pvwatts.service.js";

@ApiTags("PvWatts")
@Throttle({ default: { limit: 10 } })
@Controller("pvwatts")
export class PvWattsController {
  constructor(private readonly pvWattsService: PvWattsService) {}

  @Get()
  @ApiOperation({
    summary: "Get baseline PV production estimate from PVWatts",
    operationId: "getPvWattsEstimate",
    description:
      "Returns a baseline (unshaded) annual and monthly AC production estimate from the PVWatts API.",
  })
  @ApiOkResponse({
    description: "PVWatts estimate retrieved successfully",
    type: PvWattsResponseDto,
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
  @ResponseMessage("PVWatts estimate retrieved successfully")
  estimate(@Query() dto: GetPvWattsDto) {
    return this.pvWattsService.estimate(
      dto.latitude,
      dto.longitude,
      dto.tilt,
      dto.azimuth,
      dto.systemSize,
      dto.losses,
    );
  }
}
