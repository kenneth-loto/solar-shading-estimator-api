import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Cache } from "cache-manager";
import type {
  PvWattsResponse,
  PvWattsResult,
} from "./interfaces/pvwatts.interfaces.js";

@Injectable()
export class PvWattsService {
  private readonly logger = new Logger(PvWattsService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    configService: ConfigService,
  ) {
    this.apiKey = configService.getOrThrow("PVWATTS_API_KEY");
    this.apiUrl = configService.getOrThrow("PVWATTS_API_URL");
  }

  async estimate(
    latitude: number,
    longitude: number,
    tilt: number,
    azimuth: number,
    systemSize: number,
    losses = 14,
  ): Promise<PvWattsResult> {
    const cacheKey = `pvwatts:hourly:${latitude}:${longitude}:${tilt}:${azimuth}:${systemSize}:${losses}`;

    const cached = await this.cacheManager.get<PvWattsResult>(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.log(`Cache miss for ${cacheKey} — fetching from PVWatts`);

    const url = `${this.apiUrl}.json?api_key=${this.apiKey}&lat=${latitude}&lon=${longitude}&system_capacity=${systemSize}&module_type=0&array_type=0&tilt=${tilt}&azimuth=${azimuth}&losses=${losses}&timeframe=hourly`;

    const redactedUrl = url.replace(this.apiKey, "[REDACTED]");

    this.logger.log(`Fetching ${redactedUrl}`);

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();

      throw new BadGatewayException(
        `PVWatts API returned ${response.status}: ${body}`,
      );
    }

    const raw = (await response.json()) as PvWattsResponse;

    if (raw.errors.length > 0) {
      throw new BadGatewayException(
        `PVWatts API error: ${raw.errors.join(", ")}`,
      );
    }

    const result: PvWattsResult = {
      ac_annual: raw.outputs.ac_annual,
      ac_monthly: raw.outputs.ac_monthly,
      ac_hourly: raw.outputs.ac_hourly,
      capacity_factor: raw.outputs.capacity_factor,
      kwh_per_kw: raw.outputs.kwh_per_kw,
      station_info: raw.station_info,
    };

    await this.cacheManager.set(cacheKey, result, 86_400_000);

    return result;
  }
}
