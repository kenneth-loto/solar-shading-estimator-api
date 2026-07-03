import { Controller, Get, Query } from "@nestjs/common";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { GetPvWattsDto } from "./dto/get-pvwatts.dto.js";
import { PvWattsService } from "./pvwatts.service.js";

@Controller("pvwatts")
export class PvWattsController {
  constructor(private readonly pvWattsService: PvWattsService) {}

  @Get()
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
