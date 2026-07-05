import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { ErrorResponseDto } from "../../common/dto/error-response.dto.js";
import { ApiKeyGuard } from "../../common/guards/api-key.guard.js";
import { AnalysisService } from "./analysis.service.js";
import { AnalysisResponseDto } from "./dto/analysis-response.dto.js";

@ApiTags("Analysis")
@Controller("sites")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post(":id/analysis")
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @Throttle({ default: { limit: 10 } })
  @ApiOperation({
    summary: "Run a full shading-adjusted production analysis",
    operationId: "analyzeSite",
    description:
      "Combines a PVWatts baseline with shading analysis to produce a realistic, shading-adjusted annual energy production estimate.",
  })
  @ApiOkResponse({
    description: "Analysis completed successfully",
    type: AnalysisResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid API key",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Site not found",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "Too many requests — rate limited",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Analysis completed successfully")
  async analyze(@Param("id") id: string) {
    return this.analysisService.analyze(id);
  }
}
