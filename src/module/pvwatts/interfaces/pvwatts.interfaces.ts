export interface PvWattsResponse {
  inputs: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  version: string;
  ssc_info: Record<string, unknown>;
  station_info: Record<string, unknown>;
  outputs: PvWattsOutputs;
}

export interface PvWattsOutputs {
  ac_monthly: number[];
  poa_monthly: number[];
  dc_monthly: number[];
  solrad_monthly: number[];
  ac_hourly: number[];
  ac_annual: number;
  solrad_annual: number;
  capacity_factor: number;
  kwh_per_kw: number;
}

export interface PvWattsResult {
  ac_annual: number;
  ac_monthly: number[];
  ac_hourly?: number[];
  capacity_factor: number;
  kwh_per_kw: number;
  station_info: Record<string, unknown>;
}
