import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.configService.get<string>("API_KEY");

    if (!apiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headerKey = request.headers["x-api-key"];

    if (!headerKey || headerKey !== apiKey) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    return true;
  }
}
