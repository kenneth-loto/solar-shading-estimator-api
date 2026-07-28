export interface SampleDay {
  date: Date;
  name: string;
}

export function getSampleDays(year: number): SampleDay[] {
  return [
    { date: new Date(Date.UTC(year, 2, 20)), name: "Spring Equinox" },
    { date: new Date(Date.UTC(year, 5, 21)), name: "Summer Solstice" },
    { date: new Date(Date.UTC(year, 8, 22)), name: "Fall Equinox" },
    { date: new Date(Date.UTC(year, 11, 21)), name: "Winter Solstice" },
  ];
}

export function lstHourToUtc(
  date: Date,
  lstHour: number,
  longitude: number,
): Date {
  // NOTE: utc = lst - lon/15 approximates mean solar time but does not
  // account for the equation of time (~±16 min variation from Earth's
  // elliptical orbit + axial tilt). Fine for hourly-bucket shading
  // estimates — not precise enough for minute-level sun position.
  const utcOffset = lstHour - longitude / 15;
  const utcDate = new Date(date);

  utcDate.setUTCHours(0, 0, 0, 0);
  utcDate.setUTCMilliseconds(utcOffset * 3600 * 1000);

  return utcDate;
}

export function getWeeklySampleDays(year: number): SampleDay[] {
  const days: SampleDay[] = [];
  for (let week = 0; week < 52; week++) {
    const dayOfYear = week * 7;
    const date = new Date(Date.UTC(year, 0, 1 + dayOfYear));
    days.push({ date, name: `Week ${week + 1}` });
  }
  return days;
}

export function localStandardTimeToLST(
  hour: number,
  longitude: number,
  tz: number,
): number {
  const lst = hour + longitude / 15 - tz;
  const clamped = Math.round(lst) % 24;
  return clamped < 0 ? clamped + 24 : clamped;
}

export function findNearestSampleDay(
  date: Date,
  sampleDays: SampleDay[],
): SampleDay {
  let nearest = sampleDays[0];
  let minDiff = Math.abs(date.getTime() - sampleDays[0].date.getTime());

  for (const day of sampleDays) {
    const diff = Math.abs(date.getTime() - day.date.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      nearest = day;
    }
  }

  return nearest;
}
