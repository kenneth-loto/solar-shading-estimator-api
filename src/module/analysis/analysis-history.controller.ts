import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { ErrorResponseDto } from "../../common/dto/error-response.dto.js";
import { AnalysisService } from "./analysis.service.js";
import { AnalysisRecordResponseDto } from "./dto/analysis-record.dto.js";

@ApiTags("Analysis")
@Controller("analyses")
export class AnalysisHistoryController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get(":id")
  @ApiOperation({
    summary: "Get a single analysis by ID",
    operationId: "getAnalysisById",
    description: "Retrieves a past analysis result by its unique ID.",
  })
  @ApiOkResponse({
    description: "Analysis retrieved successfully",
    type: AnalysisRecordResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Analysis not found",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Analysis retrieved successfully")
  async getAnalysis(@Param("id") id: string) {
    return this.analysisService.findById(id);
  }
}
