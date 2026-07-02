import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator.js";

@Controller()
export class AppController {
  @Get()
  @Public()
  getRoot() {
    return {
      message: "Solar Shading Estimator API",
      docs: "Visit /docs for interactive documentation and endpoint details",
    };
  }
}
