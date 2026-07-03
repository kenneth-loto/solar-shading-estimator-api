import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { ApiKeyGuard } from "../../common/guards/api-key.guard.js";
import { AnalysisService } from "./analysis.service.js";

@Controller("sites")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post(":id/analysis")
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @Throttle({ default: { limit: 10 } })
  @ResponseMessage("Analysis completed successfully")
  async analyze(@Param("id") id: string) {
    return this.analysisService.analyze(id);
  }
}
