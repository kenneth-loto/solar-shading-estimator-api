import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { ApiKeyGuard } from "../../common/guards/api-key.guard.js";
import { GetShadingDto } from "./dto/get-shading.dto.js";
import { ShadingService } from "./shading.service.js";

@Controller("shading")
export class ShadingController {
  constructor(private readonly shadingService: ShadingService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ResponseMessage("Shading loss calculated successfully")
  calculate(@Body() dto: GetShadingDto) {
    return this.shadingService.calculate(
      dto.latitude,
      dto.longitude,
      dto.horizonProfile,
    );
  }
}
