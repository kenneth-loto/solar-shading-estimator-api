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

- [x] 1. Site Management
- [x] 2. Irradiance Data Fetch (NASA POWER)
- [x] 3. Baseline Production Estimate (PVWatts)
- [x] 4. Simplified Shading Calculation
- [x] 5. Combined Analysis Endpoint
- [x] 6. Rate Limiting

---

## MVP Features

### 1. Site Management

Create and store a "site" — the thing a user runs analysis against.

**Tasks:**

- [x] Define `Site` entity/schema: name, latitude, longitude, panel tilt
      (degrees), panel azimuth (degrees, 0–360), system size (kW),
      horizon profile (JSON: array of `{ direction, heightAngle }`)
- [x] Set up Prisma with PostgreSQL, define `Site` model in `schema.prisma`
- [x] `POST /sites` — create
- [x] `GET /sites` — list
- [x] `GET /sites/:id` — get by id
- [x] `PATCH /sites/:id` — update
- [x] `DELETE /sites/:id` — delete
- [x] Add validation: lat/lon within valid ranges, tilt 0–90, azimuth 0–360,
      horizon profile heightAngle 0–90

**Notes:**

- No auth needed for MVP — single-user/demo scope. (Can add later.)

### 2. Irradiance Data Fetch (NASA POWER integration)

Pull historical solar irradiance for a site's coordinates.

**Tasks:**

- [x] Build `irradiance/` module wrapping the NASA POWER Daily API
      (lat/lon + date range in)
- [x] Implement caching via Nest's `CacheModule` (in-memory store for MVP),
      keyed by (lat/lon rounded to grid, date range)
- [x] Limit to daily resolution only for MVP (no hourly)

**Notes:**

- NASA discourages repeated identical requests for the same grid cell —
  caching is required, not optional.
- Hourly resolution is a stretch goal — more data, slower requests, not
  needed to prove the concept.

### 3. Baseline Production Estimate (PVWatts integration)

Get PVWatts' unshaded production estimate for a site.

**Tasks:**

- [x] Sign up for a personal PVWatts developer API key at
      `developer.nlr.gov` (don't rely on `DEMO_KEY`)
- [x] Store API key as an env var (never commit it)
- [x] Build `pvwatts/` module wrapping the PVWatts API call using site's
      tilt, azimuth, system size, lat/lon
- [x] Return monthly AC energy output (not hourly) for MVP

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

- [x] Design the horizon profile input shape: list of
      `{ direction: "E", heightAngle: 20 }` entries, 4–8 compass directions
      (N/NE/E/SE/S/SW/W/NW)
- [x] Add `suncalc` dependency for sun position (elevation + azimuth)
- [x] Pick sample days to run (e.g. solstices + equinoxes)
- [x] Standardize the pipeline on Local Solar Time (LST) — document this
      decision in code comments
- [x] For each daylight hour on each sample day: get sun position, compare
      elevation against the horizon profile in that direction
- [x] Mark hour as shaded/unshaded based on the comparison
- [x] Compute "% of daylight hours shaded" per sample day
- [x] Apply the shading loss % as a flat reduction to the PVWatts baseline

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

- [x] `POST /sites/:id/analysis` — orchestrates fetch → PVWatts →
      shading calc pipeline, using the site's stored horizon profile
- [x] Return combined report: baseline (unshaded) annual/monthly kWh,
      estimated shading loss %, adjusted (realistic) kWh estimate,
      sample-day shading breakdown

**Notes:**

- Runs synchronously for MVP (no queue). A queue (BullMQ) is a stretch
  goal if requests get slow or you want to batch multiple sites.

### 6. Rate Limiting

Protect external API quotas (PVWatts, NASA POWER) and the DB from abuse
on a publicly-deployed endpoint.

**Tasks:**

- [x] Install and configure `@nestjs/throttler`
- [x] Set a global default limit (e.g. 100 requests/min per IP) via
      `ThrottlerModule.forRoot()`
- [x] Apply a stricter limit on external-API-backed routes — `/irradiance`,
      `/pvwatts`, `/sites/:id/analysis` (e.g. 10 requests/min per IP) —
      since these are the ones that burn PVWatts/NASA quota, not just
      server CPU
- [x] Return a clean 429 with a `Retry-After` header (throttler default
      behavior — verify it's not swallowed by the response envelope
      interceptor)
- [x] Add a couple of tests confirming the stricter routes actually throttle

**Notes:**

- Chosen over Arcjet or similar: this is a single-instance API with no
  multi-tenant/bot-detection needs yet — `@nestjs/throttler` is in-process,
  zero external signup, and solves the actual problem (protecting a
  capped external API quota from being burned by one noisy client).
  Arcjet-style tooling is a reasonable "how I'd scale this" answer later,
  not a day-one need.
- Per-IP is fine for MVP (no auth, so no per-user concept yet). Revisit if
  an API-key gate gets added later.

---

## Implementation Notes (as-built deviations from plan)

- Coordinates rounded to nearest 0.5° (not raw lat/lon) before NASA POWER
  calls, to reduce cache misses and match NASA's grid resolution.
- NASA POWER URL and cache config moved to env vars (Joi-validated)
  instead of hardcoded.
- PVWatts `losses` exposed as an optional query param (default 14%,
  PVWatts standard) rather than hardcoded.
- All responses wrapped in a standard `{ statusCode, message, data }`
  envelope via a global interceptor.

## Hardening / Pre-Deploy Checklist

Flagged during plan-vs-implementation review. Do these before/alongside
deploying to Render.

- [x] **Verify `Site` model is actually defined in `schema.prisma`.**
      Checked — `prisma.config.ts` sets `schema: "prisma/"`, which picks up
      `.prisma` files recursively; `models/site.prisma` is included, migration
      exists, generated client has `Site`. Not actually broken — false alarm.
- [x] Add client-side date validation on `/irradiance` (`startDate` must
      be ≤ `endDate`) — `BadRequestException` thrown before hitting NASA.
- [x] Document the LST conversion as an approximation — comment added in
      `src/utils/date.ts` explaining mean solar time vs. equation of time.
- [x] Swagger/OpenAPI docs — added via `@nestjs/swagger`, available at
      `GET /docs`.
- [x] Add caching to the PVWatts client — same 24h TTL pattern as NASA
      POWER, keyed by `(lat, lon, tilt, azimuth, systemSize, losses)`.
- [x] Render deploy prep:
  - [x] `.env.example` created with all env vars and defaults
  - [x] `GET /health` endpoint added
  - [ ] Confirm build command includes `prisma generate` (or
        `bun run db:generate`) and `prisma migrate deploy` — noted as
        needed but confirm it's actually wired into Render's build
        command, not just known
  - [ ] Note: Render's free-tier Postgres expires after 90 days unless
        upgraded — fine for a portfolio demo, just know it in advance
- [x] Rate limiting via `@nestjs/throttler` (see Feature 6 above) —
      global 100/min, strict 10/min on external-API routes, 4 e2e tests
- [x] Optional: lightweight write-protection via a single shared API-key
      guard on mutating routes (`POST`/`PATCH`/`DELETE` on `/sites`) —
      `ApiKeyGuard` checks `x-api-key` header; skips enforcement when
      `API_KEY` env var is unset

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
