# Solar Shading Estimator API — MVP Plan

## Goal

Given a site location and basic panel/obstruction info, estimate realistic solar
energy production by combining NASA POWER irradiance data, PVWatts production
estimates, and a simplified sun-position vs. obstruction check.

Scope is intentionally narrow: **one site = one point, one array, coarse
obstruction model.** No 3D geometry, no per-panel modeling, no LIDAR.

---

## Finalized Decisions

- **Horizon profile lives on the `Site`, not per-analysis-request.**
  Obstructions are a physical property of the location (same category as
  tilt/azimuth) — they don't change between analysis runs. The analysis
  endpoint just takes a `siteId`.
- **Database: Prisma + PostgreSQL**, provisioned via Render's managed
  Postgres. Chosen up front (rather than SQLite) since deployment target
  is Render — avoids a later migration.
- **Cache: in-memory for MVP**, via Nest's `CacheModule`
  (`@nestjs/cache-manager`) rather than a raw hand-rolled `Map`.
  `cache-manager` supports pluggable stores, so swapping in a hosted Redis
  (e.g. Upstash) later — if cold-starts/restarts on Render become an
  issue — is a config change, not a rewrite. No Redis/Upstash for MVP.
- **Deployment target: Render.** Web service (Nest API) + managed Postgres
  add-on.

---

## Overall Progress

- [ ] 1. Site Management
- [ ] 2. Irradiance Data Fetch (NASA POWER)
- [ ] 3. Baseline Production Estimate (PVWatts)
- [ ] 4. Simplified Shading Calculation
- [ ] 5. Combined Analysis Endpoint

---

## MVP Features

### 1. Site Management

Create and store a "site" — the thing a user runs analysis against.

**Tasks:**

- [ ] Define `Site` entity/schema: name, latitude, longitude, panel tilt
      (degrees), panel azimuth (degrees, 0–360), system size (kW),
      horizon profile (JSON: array of `{ direction, heightAngle }`)
- [ ] Set up Prisma with PostgreSQL, define `Site` model in `schema.prisma`
- [ ] `POST /sites` — create
- [ ] `GET /sites` — list
- [ ] `GET /sites/:id` — get by id
- [ ] `PATCH /sites/:id` — update
- [ ] `DELETE /sites/:id` — delete
- [ ] Add validation: lat/lon within valid ranges, tilt 0–90, azimuth 0–360,
      horizon profile heightAngle 0–90

**Notes:**

- No auth needed for MVP — single-user/demo scope. (Can add later.)

### 2. Irradiance Data Fetch (NASA POWER integration)

Pull historical solar irradiance for a site's coordinates.

**Tasks:**

- [ ] Build `irradiance/` module wrapping the NASA POWER Daily API
      (lat/lon + date range in)
- [ ] Implement caching via Nest's `CacheModule` (in-memory store for MVP),
      keyed by (lat/lon rounded to grid, date range)
- [ ] Limit to daily resolution only for MVP (no hourly)

**Notes:**

- NASA discourages repeated identical requests for the same grid cell —
  caching is required, not optional.
- Hourly resolution is a stretch goal — more data, slower requests, not
  needed to prove the concept.

### 3. Baseline Production Estimate (PVWatts integration)

Get PVWatts' unshaded production estimate for a site.

**Tasks:**

- [ ] Sign up for a personal PVWatts developer API key at
      `developer.nlr.gov` (don't rely on `DEMO_KEY`)
- [ ] Store API key as an env var (never commit it)
- [ ] Build `pvwatts/` module wrapping the PVWatts API call using site's
      tilt, azimuth, system size, lat/lon
- [ ] Return monthly AC energy output (not hourly) for MVP

**Notes:**

- This becomes your "if nothing were blocking the sun" baseline number.
- Rate limit is 1,000 requests/hour per key — the shared `DEMO_KEY` has a
  much lower limit.
- PVWatts is now hosted by the National Laboratory of the Rockies (NLR),
  formerly NREL (renamed Dec 2025).

### 4. Simplified Shading Calculation

The core original logic — the part you're actually building, not just
wrapping.

**Tasks:**

- [ ] Design the horizon profile input shape: list of
      `{ direction: "E", heightAngle: 20 }` entries, 4–8 compass directions
      (N/NE/E/SE/S/SW/W/NW)
- [ ] Add `suncalc` dependency for sun position (elevation + azimuth)
- [ ] Pick sample days to run (e.g. solstices + equinoxes)
- [ ] Standardize the pipeline on Local Solar Time (LST) — document this
      decision in code comments
- [ ] For each daylight hour on each sample day: get sun position, compare
      elevation against the horizon profile in that direction
- [ ] Mark hour as shaded/unshaded based on the comparison
- [ ] Compute "% of daylight hours shaded" per sample day
- [ ] Apply the shading loss % as a flat reduction to the PVWatts baseline

**Notes:**

- Use `suncalc` (MIT licensed) instead of hand-rolling solar position
  formulas — azimuth requires quadrant correction that's an easy, subtle
  bug source (e.g. sun position mirrored in the afternoon). The goal here
  is Nest/backend architecture, not astronomy. Hand-rolling it is a fine
  stretch goal later if you want the math practice.
- LST matters because NASA POWER's hourly API can return either UTC or
  LST, and PVWatts responses carry a fixed station timezone offset. If sun
  position and irradiance data aren't in the same time reference, "shaded
  hours" and "irradiance at that hour" silently describe two different
  points in the day — numbers still look plausible but are wrong.
- Known simplification: a flat shading-loss % applied to monthly kWh isn't
  physically precise, since irradiance is stronger at midday than at
  sunrise/sunset. This is an accepted MVP simplification — be ready to
  explain it if asked.
- Explicitly skipped for MVP: partial shading, tree canopy density/leaf-out,
  moving obstructions, per-panel shading, full 365-day hourly simulation.

### 5. Combined Analysis Endpoint

Tie it together into one result.

**Tasks:**

- [ ] `POST /sites/:id/analysis` — orchestrates fetch → PVWatts →
      shading calc pipeline, using the site's stored horizon profile
- [ ] Return combined report: baseline (unshaded) annual/monthly kWh,
      estimated shading loss %, adjusted (realistic) kWh estimate,
      sample-day shading breakdown

**Notes:**

- Runs synchronously for MVP (no queue). A queue (BullMQ) is a stretch
  goal if requests get slow or you want to batch multiple sites.

---

## Explicitly Out of Scope for MVP

- Authentication / multi-user accounts
- Hourly-resolution PVWatts (monthly is enough)
- Full 365-day hour-by-hour simulation (sample days only)
- Real 3D geometry / building footprints / LIDAR
- Partial/soft shading, tree seasonality
- Frontend (API + Swagger docs only for MVP; frontend is a stretch goal)
- Persistent historical tracking / comparing sites over time
- Caching infrastructure beyond a simple in-memory or DB cache

## Stretch Goals (post-MVP, in rough priority order)

- [ ] Minimal frontend (location input + a couple of charts)
- [ ] Hourly PVWatts resolution
- [ ] BullMQ queue for batch site analysis
- [ ] Persisted analysis history per site
- [ ] Finer-grained horizon profile (more than 8 directions)

## Suggested Nest Module Breakdown

- `sites/` — CRUD, validation (includes horizon profile as part of Site)
- `prisma/` — Prisma service/client wiring (Postgres via Render)
- `irradiance/` — NASA POWER client + `CacheModule` caching
- `pvwatts/` — PVWatts client
- `shading/` — solar position math + horizon comparison (pure logic, no
  external calls — easiest to unit test)
- `analysis/` — orchestrates the above into one report
