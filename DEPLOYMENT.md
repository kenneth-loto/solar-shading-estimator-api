# Deploy

## How it works

```
Push to main → GHA (lint → typecheck → test → image) → GHCR → Render deploy hook
```

The runner stage in the Dockerfile has **no secrets baked in** — secrets are mounted at runtime via Docker Compose secrets or Render environment variables.

## GitHub Secrets

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret               | Required | Notes                                        |
| -------------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`       | ✅       | PostgreSQL connection string                 |
| `PVWATTS_API_KEY`    | ✅       | NREL PVWatts API key                         |
| `RENDER_DEPLOY_HOOK` | ✅       | From Render dashboard → Settings → Deploy Hook |

## Render Setup

### 1. Create the service

1. **Render Dashboard → New → Web Service**
2. **Source:** Select **Existing Image**
3. **Image:** `ghcr.io/kenneth-loto/solar-shading-estimator-api:latest`
4. **Registry:** GitHub Container Registry (GHCR)
5. **Service Name:** `solar-shading-estimator-api` (or your preference)

### 2. GHCR Credentials

Render needs a token to pull a private GHCR image:

1. GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Create a token with scope `read:packages`
3. Render → **Your Service → Settings → Registry Credentials**
4. Add:
   - **Username:** `kenneth-loto`
   - **Password:** (the PAT you just created)

**Alternatively**, make the package **public** after the first push:

- Go to **github.com → Packages → solar-shading-estimator-api → Package settings → Change visibility → Public**

### 3. Environment Variables

Render Dashboard → **Your Service → Environment**:

| Variable             | Masked |
| -------------------- | ------ |
| `DATABASE_URL`       | ✅     |
| `PVWATTS_API_KEY`    | ✅     |
| `API_KEY`            | ✅     |
| `NODE_ENV`           | No     |
| `ALLOWED_ORIGINS`    | No     |

Set `NODE_ENV` to `production`. `ALLOWED_ORIGINS` defaults to `*`.

### 4. Deploy Hook

1. Render Dashboard → **Your Service → Settings → Deploy Hook** → generate a hook URL
2. Copy it to GitHub → **Settings → Secrets and variables → Actions** as `RENDER_DEPLOY_HOOK`

## Trigger a deploy

Push to `main`:

```bash
git push origin main
```

Or trigger manually from **GitHub → Actions → CI → Run workflow** (select `main` branch).

## Health check

Once deployed, hit the root endpoint:

```bash
curl https://solar-shading-estimator-api.onrender.com/
# {"message":"Solar Shading Estimator API","docs":"Visit /docs for interactive documentation and endpoint details"}
```

## Local build (same image)

```bash
docker compose build
docker compose up
```

Create a `secrets/` directory in the project root with a text file for each secret matching the service names in `docker-compose.yml`:

```
secrets/
  database_url.txt
  pvwatts_api_key.txt
  api_key.txt
  allowed_origins.txt
```
