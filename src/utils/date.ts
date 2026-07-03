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
