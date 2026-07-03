import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { ApiKeyGuard } from "../../common/guards/api-key.guard.js";
import { CreateSiteDto } from "./dto/create-site.dto.js";
import { UpdateSiteDto } from "./dto/update-site.dto.js";
import { SitesService } from "./sites.service.js";

@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ResponseMessage("Site created successfully")
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Get()
  @ResponseMessage("Sites retrieved successfully")
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(":id")
  @ResponseMessage("Site retrieved successfully")
  findById(@Param("id") id: string) {
    return this.sitesService.findById(id);
  }

  @Patch(":id")
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ResponseMessage("Site updated successfully")
  update(@Param("id") id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ResponseMessage("Site deleted successfully")
  delete(@Param("id") id: string) {
    return this.sitesService.delete(id);
  }
}
