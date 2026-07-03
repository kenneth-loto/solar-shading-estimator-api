export interface NasaPowerResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    parameter: {
      ALLSKY_SFC_SW_DWN: Record<string, number | null>;
    };
    latitude: number;
    longitude: number;
    message?: string;
  };
  header: Record<string, unknown>;
  messages: string[];
}

export interface IrradianceResult {
  latitude: number;
  longitude: number;
  parameters: string[];
  data: Record<string, number | null>;
}
