const COMPASS_DIRECTIONS: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function directionToAzimuth(direction: string): number {
  const az = COMPASS_DIRECTIONS[direction];

  if (az === undefined) {
    throw new Error(`Unknown compass direction: ${direction}`);
  }

  return az;
}

export function interpolateHorizonHeight(
  azimuth: number,
  horizonProfile: Array<{ direction: string; heightAngle: number }>,
): number {
  const entries = horizonProfile
    .map((e) => ({
      azimuth: directionToAzimuth(e.direction),
      height: e.heightAngle,
    }))
    .sort((a, b) => a.azimuth - b.azimuth);

  let lower = entries[entries.length - 1];
  let upper = entries[0];

  for (let i = 0; i < entries.length - 1; i++) {
    if (azimuth >= entries[i].azimuth && azimuth < entries[i + 1].azimuth) {
      lower = entries[i];
      upper = entries[i + 1];
      break;
    }
  }

  if (azimuth >= upper.azimuth) {
    lower = upper;
    upper = entries[0];
  }

  const lowerAz = lower.azimuth;
  let upperAz = upper.azimuth;

  if (upperAz < lowerAz) {
    upperAz += 360;
  }

  let adjAz = azimuth;
  if (adjAz < lowerAz) {
    adjAz += 360;
  }

  const fraction =
    upperAz === lowerAz ? 0 : (adjAz - lowerAz) / (upperAz - lowerAz);

  return lower.height + fraction * (upper.height - lower.height);
}
