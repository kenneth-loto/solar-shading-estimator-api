import {
  findNearestSampleDay,
  getWeeklySampleDays,
  localStandardTimeToLST,
} from "./date.js";

describe("localStandardTimeToLST", () => {
  it("converts standard time to LST at Boulder (lon=-105.25, tz=-7)", () => {
    const lst = localStandardTimeToLST(14, -105.25, -7);
    expect(lst).toBe(14);
  });

  it("converts standard time to LST at Manila (lon=121.03, tz=8)", () => {
    const lst = localStandardTimeToLST(14, 121.03, 8);
    expect(lst).toBe(14);
  });

  it("wraps around negative LST to 0-23 range", () => {
    const lst = localStandardTimeToLST(0, -150, 0);
    expect(lst).toBeGreaterThanOrEqual(0);
    expect(lst).toBeLessThan(24);
  });
});

describe("getWeeklySampleDays", () => {
  it("returns 52 sample days", () => {
    const days = getWeeklySampleDays(2026);
    expect(days).toHaveLength(52);
  });

  it("starts on Jan 1", () => {
    const days = getWeeklySampleDays(2026);
    expect(days[0].date.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("last sample day is day 357 of the year", () => {
    const days = getWeeklySampleDays(2026);
    const last = days[51];
    expect(last.date.toISOString().slice(0, 10)).toBe("2026-12-24");
    expect(last.name).toBe("Week 52");
  });
});

describe("findNearestSampleDay", () => {
  it("picks the nearer sample day when date is between two", () => {
    const sampleDays = getWeeklySampleDays(2026);
    const jan4 = new Date(Date.UTC(2026, 0, 4));
    const nearest = findNearestSampleDay(jan4, sampleDays);
    expect(nearest.name).toBe("Week 1");
  });

  it("picks week 2 for Jan 8", () => {
    const sampleDays = getWeeklySampleDays(2026);
    const jan8 = new Date(Date.UTC(2026, 0, 8));
    const nearest = findNearestSampleDay(jan8, sampleDays);
    expect(nearest.name).toBe("Week 2");
  });

  it("picks week 2 for Jan 5 (exactly midway, picks last encountered)", () => {
    const sampleDays = getWeeklySampleDays(2026);
    const jan5 = new Date(Date.UTC(2026, 0, 5));
    const nearest = findNearestSampleDay(jan5, sampleDays);
    expect(nearest.name).toBe("Week 2");
  });
});
