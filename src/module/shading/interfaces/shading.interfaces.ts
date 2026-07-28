export interface HorizonProfileEntry {
  direction: string;
  heightAngle: number;
}

export interface SampleDayResult {
  name: string;
  date: string;
  daylightHours: number;
  shadedHours: number;
  percentShaded: number;
}

export interface ShadingResult {
  sampleDays: SampleDayResult[];
  averageShadingLoss: number;
}

export interface HourlyShadingResult {
  sampleDays: SampleDayResult[];
  averageShadingLoss: number;
  shadedHoursPerDay: Set<number>[];
}
