import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  PvWattsResponse,
  PvWattsResult,
} from "./interfaces/pvwatts.interfaces.js";

@Injectable()
export class PvWattsService {
  private readonly logger = new Logger(PvWattsService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(configService: ConfigService) {
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
    const url = `${this.apiUrl}.json?api_key=${this.apiKey}&lat=${latitude}&lon=${longitude}&system_capacity=${systemSize}&module_type=0&array_type=0&tilt=${tilt}&azimuth=${azimuth}&losses=${losses}&timeframe=monthly`;

    this.logger.log(
      `Fetching PVWatts estimate for lat=${latitude}, lon=${longitude}`,
    );

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();

      throw new Error(`PVWatts API returned ${response.status}: ${body}`);
    }

    const raw = (await response.json()) as PvWattsResponse;

    if (raw.errors.length > 0) {
      throw new Error(`PVWatts API error: ${raw.errors.join(", ")}`);
    }

    return {
      ac_annual: raw.outputs.ac_annual,
      ac_monthly: raw.outputs.ac_monthly,
      capacity_factor: raw.outputs.capacity_factor,
      kwh_per_kw: raw.outputs.kwh_per_kw,
      station_info: raw.station_info,
    };
  }
}
