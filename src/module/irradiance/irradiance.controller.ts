import { Controller, Get, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { GetIrradianceDto } from "./dto/get-irradiance.dto.js";
import { IrradianceService } from "./irradiance.service.js";

@Throttle({ default: { limit: 10 } })
@Controller("irradiance")
export class IrradianceController {
  constructor(private readonly irradianceService: IrradianceService) {}

  @Get()
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
