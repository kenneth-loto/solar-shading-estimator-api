import { Controller, Get, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthResponseDto } from "./app/dto/health-response.dto.js";
import { RootResponseDto } from "./app/dto/root-response.dto.js";
import { Public } from "./common/decorators/public.decorator.js";

@ApiTags("App")
@Controller()
export class AppController {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: "Get API status and documentation link",
    operationId: "getRoot",
    description:
      "Returns a welcome message and the URL to the hosted API documentation site.",
  })
  @ApiOkResponse({
    description: "API status and documentation link",
    type: RootResponseDto,
  })
  getRoot() {
    return {
      message: "Solar Shading Estimator API",
      docs: this.configService.get<string>("DOCS_URL"),
    };
  }

  @Get("health")
  @Public()
  @ApiOperation({
    summary: "Health check",
    operationId: "healthCheck",
    description: "Returns a simple status check to confirm the API is running.",
  })
  @ApiOkResponse({
    description: "Health check status",
    type: HealthResponseDto,
  })
  health() {
    return { status: "ok" };
  }
}
