# Solar Shading Estimator API

## What this is

A backend API that estimates realistic solar panel energy production for a
given site by combining real solar/weather data with a simplified model of
nearby shading obstructions (buildings, trees, etc).

Most solar estimator tools assume a clear, unobstructed roof. This API
answers a more practical question: **how much does shading from the
surroundings actually cut into expected output?** It pulls historical
irradiance data from NASA POWER, gets a baseline production estimate from
PVWatts, then applies a shading model based on a rough obstruction profile
stored per site.

## Why it exists

Standard solar calculators (PVWatts, etc.) assume an unobstructed
installation. Real-world rooftops have chimneys, nearby buildings, trees,
and other obstructions that reduce actual output. This API bridges that gap
— wrapping authoritative solar data sources under a shading model that
produces a more realistic estimate for a given location.

## Tech stack

- **Backend:** NestJS (TypeScript)
- **Database:** PostgreSQL via [Prisma](https://www.prisma.io/) ORM
- **Caching:** Nest's `CacheModule` (in-memory store for MVP; pluggable
  to a hosted store like Upstash later without a rewrite)
- **API docs:** Swagger/OpenAPI via `@nestjs/swagger` (disabled in production)
- **Rate limiting:** `@nestjs/throttler` (per-IP, stricter limits on
  routes that call PVWatts/NASA POWER to protect external API quotas)
- **Deployment:** [Render](https://render.com/) — web service + managed
  Postgres add-on
- **External data sources:**
  - [NASA POWER API](https://power.larc.nasa.gov/) — historical solar
    irradiance and meteorology data for any coordinate. Free, no API key.
  - [PVWatts API](https://developer.nlr.gov/docs/solar/pvwatts/) — baseline
    (unshaded) solar production estimates. Requires a free developer API
    key (1,000 requests/hour limit). Hosted by the National Laboratory of
    the Rockies (NLR), formerly NREL.
- **Solar position math:** [`suncalc`](https://github.com/mourner/suncalc)
  for sun elevation/azimuth calculations, rather than hand-rolled
  astronomy — keeps the focus on backend architecture.
- **Frontend:** none for MVP — this is an API-first project. A minimal
  frontend may be added later (see Limitations).

## What it does (MVP)

1. Store a "site" — a location plus basic panel setup (tilt, azimuth,
   system size).
2. Pull historical solar irradiance for that location from NASA POWER.
3. Get a baseline (unshaded) production estimate from PVWatts.
4. Apply a simplified shading model based on a rough obstruction profile
   stored on the site (e.g., "there's something 20° tall to the east").
5. Return a combined report: baseline output, estimated shading loss %,
   and an adjusted, more realistic production estimate.

## What it does NOT do (limitations / out of scope)

This is a simplified estimator, not a professional solar design tool.
Deliberately left out for now:

- **No real 3D geometry.** Obstructions are described as a rough
  "blocked up to X° in direction Y" profile, not actual building shapes or
  LIDAR data.
- **No per-panel modeling.** A site is treated as one point with one
  array — not individual panels with individual shading.
- **No full-year hourly simulation.** Shading is estimated using a handful
  of sample days (e.g. solstices/equinox), not all 8,760 hours of the year.
- **No partial/soft shading.** An hour is treated as either shaded or not —
  no modeling of partial panel coverage or tree canopy density.
- **Flat shading-loss approximation.** Shading loss is applied as a flat
  percentage of monthly kWh output. In reality, irradiance is much
  stronger at midday than at sunrise/sunset, so "X% of daylight hours
  shaded" doesn't map 1:1 to "X% less energy produced." This is a known,
  intentional simplification for MVP.
- **Local Solar Time (LST) throughout.** Sun-position and irradiance data
  are reconciled using Local Solar Time rather than each site's civil
  timezone, to keep the pipeline internally consistent. Note: the LST
  conversion used is an approximation (mean solar time based on
  longitude) and doesn't account for the equation of time, so true solar
  noon can drift by up to ~16 minutes depending on the date.
- **No authentication.** Single-user/demo scope for now.
- **No frontend (yet).** Consume the API directly.

If you're looking for a production-grade solar design tool, this isn't
that — it's meant to demonstrate the concept and the backend engineering
around it, not replace tools like Aurora Solar or Helioscope.

### Live Demo

- **API**: [solar-shading-estimator-api.onrender.com](https://solar-shading-estimator-api.onrender.com)

> **Note:** Hosted on Render's free tier — the service sleeps after 15 minutes of inactivity. If the first request hangs, it's waking up (~30 seconds). Just wait and retry.

## License

MIT — see [LICENSE](LICENSE).
