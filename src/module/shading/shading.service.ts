import { Injectable } from "@nestjs/common";
import { getPosition } from "suncalc";
import {
  getSampleDays,
  getWeeklySampleDays,
  lstHourToUtc,
} from "../../utils/date.js";
import { interpolateHorizonHeight } from "../../utils/math.js";
import type {
  HorizonProfileEntry,
  HourlyShadingResult,
  ShadingResult,
} from "./interfaces/shading.interfaces.js";

@Injectable()
export class ShadingService {
  calculate(
    latitude: number,
    longitude: number,
    horizonProfile: HorizonProfileEntry[],
  ): ShadingResult {
    const sampleDays = getSampleDays(new Date().getFullYear());
    const dayResults = sampleDays.map((day) => {
      let shadedCount = 0;
      let daylightCount = 0;

      for (let lstHour = 0; lstHour < 24; lstHour++) {
        const utcDate = lstHourToUtc(day.date, lstHour, longitude);
        const pos = getPosition(utcDate, latitude, longitude);

        if (pos.altitude > 0) {
          daylightCount++;
          const horizonHeight = interpolateHorizonHeight(
            pos.azimuth,
            horizonProfile,
          );

          if (pos.altitude < horizonHeight) {
            shadedCount++;
          }
        }
      }

      const percentShaded =
        daylightCount > 0
          ? Math.round((shadedCount / daylightCount) * 10000) / 100
          : 0;

      return {
        name: day.name,
        date: day.date.toISOString().slice(0, 10),
        daylightHours: daylightCount,
        shadedHours: shadedCount,
        percentShaded,
      };
    });

    const totalPercent = dayResults.reduce(
      (sum, d) => sum + d.percentShaded,
      0,
    );
    const averageShadingLoss =
      dayResults.length > 0
        ? Math.round((totalPercent / dayResults.length) * 100) / 100
        : 0;

    return {
      sampleDays: dayResults,
      averageShadingLoss,
    };
  }

  calculateHourlyShading(
    latitude: number,
    longitude: number,
    horizonProfile: HorizonProfileEntry[],
  ): HourlyShadingResult {
    const year = new Date().getFullYear();
    const sampleDays = getWeeklySampleDays(year);
    const shadedHoursPerDay: Set<number>[] = [];
    const dayResults: ShadingResult["sampleDays"] = [];

    for (const day of sampleDays) {
      const shaded = new Set<number>();
      let shadedCount = 0;
      let daylightCount = 0;

      for (let lstHour = 0; lstHour < 24; lstHour++) {
        const utcDate = lstHourToUtc(day.date, lstHour, longitude);
        const pos = getPosition(utcDate, latitude, longitude);

        if (pos.altitude > 0) {
          daylightCount++;
          const horizonHeight = interpolateHorizonHeight(
            pos.azimuth,
            horizonProfile,
          );

          if (pos.altitude < horizonHeight) {
            shadedCount++;
            shaded.add(lstHour);
          }
        }
      }

      const percentShaded =
        daylightCount > 0
          ? Math.round((shadedCount / daylightCount) * 10000) / 100
          : 0;

      dayResults.push({
        name: day.name,
        date: day.date.toISOString().slice(0, 10),
        daylightHours: daylightCount,
        shadedHours: shadedCount,
        percentShaded,
      });
      shadedHoursPerDay.push(shaded);
    }

    const totalPercent = dayResults.reduce(
      (sum, d) => sum + d.percentShaded,
      0,
    );
    const averageShadingLoss =
      dayResults.length > 0
        ? Math.round((totalPercent / dayResults.length) * 100) / 100
        : 0;

    return {
      sampleDays: dayResults,
      averageShadingLoss,
      shadedHoursPerDay,
    };
  }
}
