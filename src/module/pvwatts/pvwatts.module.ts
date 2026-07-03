import { Module } from "@nestjs/common";
import { PvWattsController } from "./pvwatts.controller.js";
import { PvWattsService } from "./pvwatts.service.js";

@Module({
  controllers: [PvWattsController],
  providers: [PvWattsService],
  exports: [PvWattsService],
})
export class PvWattsModule {}
