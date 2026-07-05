import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from "../../common/dto/error-response.dto.js";
import { ApiKeyGuard } from "../../common/guards/api-key.guard.js";
import { GetShadingDto } from "./dto/get-shading.dto.js";
import { ShadingResponseDto } from "./dto/shading-response.dto.js";
import { ShadingService } from "./shading.service.js";

@ApiTags("Shading")
@Controller("shading")
export class ShadingController {
  constructor(private readonly shadingService: ShadingService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ApiOperation({
    summary: "Calculate shading loss for a horizon profile",
    operationId: "calculateShadingLoss",
    description:
      "Calculates the percentage of daylight hours blocked by obstructions for a given horizon profile.",
  })
  @ApiOkResponse({
    description: "Shading loss calculated successfully",
    type: ShadingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid API key",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Shading loss calculated successfully")
  calculate(@Body() dto: GetShadingDto) {
    return this.shadingService.calculate(
      dto.latitude,
      dto.longitude,
      dto.horizonProfile,
    );
  }
}
