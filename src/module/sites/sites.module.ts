import { Module } from "@nestjs/common";
import { SitesController } from "./sites.controller.js";
import { SitesService } from "./sites.service.js";

@Module({
  providers: [SitesService],
  controllers: [SitesController],
})
export class SitesModule {}
