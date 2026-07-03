import type { PvWattsResult } from "../../pvwatts/interfaces/pvwatts.interfaces.js";
import type { ShadingResult } from "../../shading/interfaces/shading.interfaces.js";

export interface AdjustedResult {
  adjustedAnnual: number;
  adjustedMonthly: number[];
}

export interface AnalysisResult {
  siteId: string;
  siteName: string;
  baseline: PvWattsResult;
  shading: ShadingResult;
  adjusted: AdjustedResult;
}
