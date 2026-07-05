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
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { ResponseMessage } from "../../common/decorators/response-message.decorator.js";
import {
  EmptyResponseDto,
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from "../../common/dto/error-response.dto.js";
import { ApiKeyGuard } from "../../common/guards/api-key.guard.js";
import { CreateSiteDto } from "./dto/create-site.dto.js";
import {
  SiteListResponseDto,
  SiteResponseDto,
} from "./dto/site-response.dto.js";
import { UpdateSiteDto } from "./dto/update-site.dto.js";
import { SitesService } from "./sites.service.js";

@ApiTags("Sites")
@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ApiOperation({
    summary: "Create a new site",
    operationId: "createSite",
    description:
      "Creates a new site with location, panel configuration, and horizon profile. Requires an API key.",
  })
  @ApiOkResponse({
    description: "Site created successfully",
    type: SiteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid API key",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Resource already exists",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Site created successfully")
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: "List all sites",
    operationId: "listSites",
    description: "Retrieves all stored sites with their configurations.",
  })
  @ApiOkResponse({
    description: "Sites retrieved successfully",
    type: SiteListResponseDto,
  })
  @ResponseMessage("Sites retrieved successfully")
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a site by ID",
    operationId: "getSiteById",
    description: "Retrieves a single site by its unique ID.",
  })
  @ApiOkResponse({
    description: "Site retrieved successfully",
    type: SiteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Site not found",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Site retrieved successfully")
  findById(@Param("id") id: string) {
    return this.sitesService.findById(id);
  }

  @Patch(":id")
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ApiOperation({
    summary: "Update a site",
    operationId: "updateSite",
    description:
      "Updates an existing site's configuration fields. Requires an API key.",
  })
  @ApiOkResponse({
    description: "Site updated successfully",
    type: SiteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation failed",
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid API key",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Site not found",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Site updated successfully")
  update(@Param("id") id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(ApiKeyGuard)
  @ApiSecurity("api-key")
  @ApiOperation({
    summary: "Delete a site",
    operationId: "deleteSite",
    description:
      "Permanently deletes a site and all associated data. Requires an API key.",
  })
  @ApiOkResponse({
    description: "Site deleted successfully",
    type: EmptyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid API key",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Site not found",
    type: ErrorResponseDto,
  })
  @ResponseMessage("Site deleted successfully")
  delete(@Param("id") id: string) {
    return this.sitesService.delete(id);
  }
}
