import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Cache } from "cache-manager";
import { roundToHalf } from "../../utils/math.js";
import type {
  IrradianceResult,
  NasaPowerResponse,
} from "./interfaces/irradiance.interfaces.js";

@Injectable()
export class IrradianceService {
  private readonly logger = new Logger(IrradianceService.name);
  private readonly nasaPowerApiUrl: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    configService: ConfigService,
  ) {
    this.nasaPowerApiUrl = configService.getOrThrow("NASA_POWER_API_URL");
  }

  async getIrradiance(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
  ): Promise<IrradianceResult> {
    if (startDate > endDate) {
      throw new BadRequestException("startDate must not be after endDate");
    }

    const roundedLat = roundToHalf(latitude);
    const roundedLon = roundToHalf(longitude);

    const cacheKey = `nasa_power:${roundedLat}:${roundedLon}:${startDate}:${endDate}`;

    const cached = await this.cacheManager.get<IrradianceResult>(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.log(`Cache miss for ${cacheKey} — fetching from NASA POWER`);

    const raw = await this.fetchFromNasa(
      roundedLat,
      roundedLon,
      startDate,
      endDate,
    );

    const result: IrradianceResult = {
      latitude: raw.properties.latitude,
      longitude: raw.properties.longitude,
      parameters: Object.keys(raw.properties.parameter),
      data: raw.properties.parameter.ALLSKY_SFC_SW_DWN,
    };

    await this.cacheManager.set(cacheKey, result, 86_400_000);

    return result;
  }

  private async fetchFromNasa(
    lat: number,
    lon: number,
    startDate: string,
    endDate: string,
  ): Promise<NasaPowerResponse> {
    const url = `${this.nasaPowerApiUrl}?parameters=ALLSKY_SFC_SW_DWN&community=RE&format=JSON&start=${startDate}&end=${endDate}&latitude=${lat}&longitude=${lon}`;

    this.logger.log(`Fetching ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();

      throw new Error(`NASA POWER API returned ${response.status}: ${body}`);
    }

    return response.json() as Promise<NasaPowerResponse>;
  }
}
