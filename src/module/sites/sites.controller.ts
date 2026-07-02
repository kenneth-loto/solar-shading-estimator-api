import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import { CreateSiteDto } from "./dto/create-site.dto.js";
import { UpdateSiteDto } from "./dto/update-site.dto.js";
import { SitesService } from "./sites.service.js";

@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
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
  @ResponseMessage("Site updated successfully")
  update(@Param("id") id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(id, dto);
  }

  @Delete(":id")
  @ResponseMessage("Site deleted successfully")
  delete(@Param("id") id: string) {
    return this.sitesService.delete(id);
  }
}
