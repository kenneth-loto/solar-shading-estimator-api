---
name: nestjs-security
description: Secure a NestJS API against real-world threats — HTTP security headers, CORS, rate limiting, CSRF, and input validation. Covers both public APIs and authenticated services.
---

NestJS ships with almost no security defaults. `app.use(helmet())` is not called for you. CORS is not locked down. Rate limiting doesn't exist unless you add it. The result is the kind of F-grade security posture a scanner gives you the moment it hits a fresh NestJS app: missing headers, a wildcard CORS policy, no rate limiting, and stack traces leaking in error responses.

This skill covers what to enable, why it matters, and — crucially — when each measure applies. A public CDN and an authenticated API have different threat models. Cargo-culting the same config for both is the mistake this skill helps you avoid.

## Middleware order — the rule that breaks everything silently

**Helmet and CORS must be registered before any routes.** NestJS builds its middleware chain in registration order. If `app.use(helmet())` appears after routes are defined, those routes respond without the security headers — no error, no warning, just unprotected responses.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware FIRST — before anything else
  app.use(helmet());
  app.enableCors({ ... });

  // Everything else after
  app.useGlobalPipes(new ValidationPipe({ ... }));
  await app.listen(3000);
}
```

### Fastify note

If your app uses the Fastify adapter instead of Express, `app.use()` is not available. Helmet and cookie-based middleware must be registered via `app.register()`:

```typescript
import fastifyHelmet from "@fastify/helmet";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
await app.register(fastifyHelmet);
```

Every code example in this skill uses the Express API (`app.use()`). If you're on Fastify, translate `app.use(X)` → `await app.register(X)` and install the Fastify-specific package variants.

## Helmet — HTTP security headers

A single line fixes every missing header from a security scanner:

```typescript
import helmet from "helmet";

app.use(helmet());
```

Install: `bun add helmet` (or `npm install helmet`).

What `helmet()` with defaults sets — and what each header actually prevents:

| Header | What it prevents |
|---|---|
| `Strict-Transport-Security` | HTTPS downgrade attacks — forces browsers to use HTTPS for `max-age` seconds |
| `X-Frame-Options: SAMEORIGIN` | Clickjacking — prevents your app being embedded in an iframe on another domain |
| `X-Content-Type-Options: nosniff` | MIME sniffing — stops browsers guessing content type and executing a `.txt` as JS |
| `Referrer-Policy` | Leaking your URL path/query in the `Referer` header to third parties |
| `X-DNS-Prefetch-Control` | Some timing side-channel attacks via DNS prefetching |
| `X-Powered-By` removal | Removes `X-Powered-By: Express` — stops advertising your stack to scanners |

### Content Security Policy (CSP)

CSP is the most complex header Helmet manages and the one most likely to break things if misconfigured. Handle it separately from the base `helmet()` call.

**Case 1 — Pure JSON API (no HTML, no browser rendering).**
Helmet's default CSP is designed for HTML documents. A pure API that only serves JSON doesn't need script/style source policies. However, disabling CSP entirely (`contentSecurityPolicy: false`) causes compliance scanners to grade you down even though JSON can't execute inline scripts.

Set a hyper-restrictive fallback that explicitly signals "this endpoint serves no executable content":

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],     // block everything by default
        frameAncestors: ["'none'"], // equivalent to X-Frame-Options: DENY
      },
    },
  }),
);
```

This gets you an A+ on security scanners without touching JSON delivery at all.

**Case 2 — App serving HTML or Swagger UI.**
Swagger's UI loads scripts and styles from the same origin. Use a permissive-enough policy to not break it, but explicit enough to block third-party script injection:

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger needs this
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  }),
);
```

**Case 3 — Full frontend app (NestJS serving HTML pages).**
Use nonces instead of `'unsafe-inline'` — nonces generate a per-request random token that only your server-generated HTML knows about:

```typescript
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(32).toString("hex");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      },
    },
  }),
);
```

**Validate your CSP:** use [CSP Evaluator](https://csp-evaluator.withgoogle.com/) — Helmet performs very little validation itself. A typo in a directive silently produces an invalid header with no error.

## CORS

CORS is not a security feature for your server — it's a browser enforcement mechanism that stops a browser from letting `evil.com` call your API using the visitor's cookies or credentials. Requests from `curl`, Postman, or server-to-server calls bypass CORS entirely. Understanding this prevents both over-securing (blocking legitimate server calls) and under-securing (thinking CORS protects against non-browser threats).

### Never use the default `enableCors()`

`app.enableCors()` with no arguments, or `enableCors({ origin: '*' })`, sends `Access-Control-Allow-Origin: *` on every response. This tells browsers any site can make credentialed cross-origin calls to your API. Scanners will flag it — correctly — as a lax policy.

### Authenticated API — explicit allowlist

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowlist = new Set([
      "https://app.example.com",
      "https://admin.example.com",
    ]);

    // Allow server-to-server requests (no Origin header)
    if (!origin) return callback(null, true);

    if (allowlist.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // required if frontend sends cookies or Authorization header
});
```

Pull the allowlist from config/env — hardcoding production URLs in source is a deployment smell:

```typescript
const allowedOrigins = new Set(
  configService.getOrThrow<string>("ALLOWED_ORIGINS").split(","),
);
```

### Public API — controlled openness

A public API that intentionally serves any client (e.g., a public data endpoint, an open SDK) can allow `*` — but be explicit and intentional about it, not accidental:

```typescript
app.enableCors({
  origin: "*",
  methods: ["GET"],             // public reads only
  allowedHeaders: ["Content-Type"],
  credentials: false,           // credentials + wildcard is invalid anyway
});
```

Wildcard + `credentials: true` is a browser error — they're mutually exclusive.

## Rate limiting

Rate limiting prevents brute-force attacks on auth endpoints, API abuse, and denial-of-service via request flooding. Without it, an attacker can hammer `/auth/login` indefinitely with no consequence.

Install: `bun add @nestjs/throttler`

### Global setup

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,    // 1 second
        limit: 10,    // max 10 requests per second
      },
      {
        name: "medium",
        ttl: 60_000,  // 1 minute
        limit: 100,   // max 100 requests per minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

Registering via `APP_GUARD` applies rate limiting globally. Use `@SkipThrottle()` on public health-check endpoints or internal routes that don't need it.

### Per-endpoint overrides

Auth endpoints need stricter limits than general API endpoints:

```typescript
import { Throttle, SkipThrottle } from "@nestjs/throttler";

// Stricter limit on login — 5 attempts per 15 minutes
@Throttle({ short: { ttl: 900_000, limit: 5 } })
@Post("login")
login(@Body() dto: LoginDto) { ... }

// Skip throttling for health checks
@SkipThrottle()
@Get("health")
health() { return { status: "ok" }; }
```

### The proxy trap — critical for Render, Railway, Cloudflare

Behind a proxy or load balancer, `req.ip` is the proxy's IP — not the real client's IP. Without fixing this, `ThrottlerGuard` sees every request as coming from the same IP (the load balancer). One user hitting the limit locks out your entire user base.

**Step 1 — trust the proxy in NestJS/Express:**

```typescript
const app = await NestFactory.create(AppModule);
app.set("trust proxy", true); // or specific IPs: "loopback, linklocal, uniquelocal"
```

**Step 2 — override the tracker to use the forwarded IP:**

```typescript
import { ThrottlerGuard } from "@nestjs/throttler";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const forwarded = req.headers?.["x-forwarded-for"];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded as string)?.split(",")[0]?.trim() ?? req.ip;
    return ip as string;
  }
}
```

Register `CustomThrottlerGuard` via `APP_GUARD` instead of the base `ThrottlerGuard`.

**Don't trust `X-Forwarded-For` blindly on apps exposed directly to the internet** — the header can be spoofed. Only trust it when you've verified that your hosting platform (Render, Cloudflare, etc.) strips and re-adds it, which major platforms do. If unsure, check your platform's docs on proxy headers.

## CSRF

CSRF (Cross-Site Request Forgery) tricks a logged-in user's browser into making a request to your API using their existing credentials. Whether you need CSRF protection depends entirely on how your app manages auth state.

### Decision tree

**Using `Authorization: Bearer <token>` headers?**
CSRF is not needed. Browsers don't automatically attach `Authorization` headers to cross-origin requests — only cookies are sent automatically. An attacker can't forge a request that includes a token they can't access.

**Using cookies for session state?**
CSRF protection is mandatory. The browser automatically sends cookies with every request to your domain, including forged ones. You need either:
- SameSite cookie flags (preferred, simpler)
- Double-submit CSRF token (traditional, more compatible)

### SameSite cookies — the simpler path

Setting `SameSite=Strict` or `SameSite=Lax` on session cookies prevents the browser from sending them on cross-origin requests. This is built into the cookie standard and requires no additional library:

```typescript
// When setting session/auth cookies
res.cookie("session", token, {
  httpOnly: true,     // JS can't access the cookie
  secure: true,       // HTTPS only
  sameSite: "strict", // never sent on cross-origin requests
});
```

`SameSite=Lax` allows cookies on top-level navigations (clicking a link) but blocks them on sub-resource requests (fetch, XHR) from other origins — a good middle ground for most apps.

### Double-submit CSRF token — for cross-origin POST support

If your app needs to support cross-origin cookie-authenticated POST requests (e.g., a separate frontend domain), use the double-submit pattern with `csrf-csrf`:

```
bun add csrf-csrf cookie-parser
```

```typescript
import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";

app.use(cookieParser());

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => configService.getOrThrow("CSRF_SECRET"),
  cookieName: "__Host-csrf",
  cookieOptions: { secure: true, sameSite: "strict" },
});

app.use(doubleCsrfProtection);
```

**Token delivery — two options depending on cookie config:**

- `httpOnly: false` on the CSRF cookie (the default for most CSRF libraries) — browser JS can read the cookie directly. Axios and Fetch interceptors can inject it into the `x-csrf-token` header automatically without a dedicated endpoint. This is the simpler client-side integration.
- `httpOnly: true` — JS can't read the cookie, so you must expose a GET endpoint that returns the token in a JSON body, and the client reads it from there on app startup:

```typescript
@Get("csrf-token")
getCsrfToken(@Req() req: Request) {
  return { token: req.csrfToken() };
}
```

Note: `httpOnly` on a CSRF token cookie is counterproductive — JS must be able to read it to include it in headers. Reserve `httpOnly: true` for your session/auth cookies, not the CSRF token cookie.

## Input validation as a security boundary

`ValidationPipe` is not just developer convenience — it's a perimeter defense. Without `whitelist: true`, extra fields in request bodies pass through to services and can trigger unintended database operations (mass assignment). Without payload size limits, a single large request can exhaust memory.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // strip unknown properties
    forbidNonWhitelisted: true,   // throw 400 on unknown properties
    transform: true,              // coerce types to DTO class instances
  }),
);
```

### Payload size limits

NestJS registers its own `json` and `urlencoded` body parsers internally when using the Express adapter. Adding `express.json()` on top causes double-parsing, which leads to empty `req.body` or hanging requests. Use the NestJS-native method instead:

```typescript
import { NestExpressApplication } from "@nestjs/platform-express";

const app = await NestFactory.create<NestExpressApplication>(AppModule);

// Native NestJS method — no conflict with the built-in parser
app.useBodyParser("json", { limit: "10kb" });
app.useBodyParser("urlencoded", { limit: "10kb", extended: true });
```

The `NestExpressApplication` generic is required — `useBodyParser` is not available on the base `INestApplication` type.

For file uploads, handle size limits at the file handler level (multer's `limits` option), not globally.

## Information leakage

What your API reveals in error responses is as important as what it reveals in successful ones.

### Never expose stack traces in production

A global exception filter (covered in `nestjs-patterns`) is the right place to enforce this. The filter should return a consistent, minimal error shape regardless of what the actual exception is:

```typescript
// In production, the filter returns this — not the real exception
response.status(500).json({
  statusCode: 500,
  message: "Internal server error",
  // no stack, no exception class, no query that failed
});
```

Log the full exception server-side. Return nothing useful to the client.

### Avoid error enumeration

Don't differentiate "user not found" from "wrong password" in login responses. Both should return the same 401 with the same message. Different messages let attackers enumerate valid usernames.

```typescript
// Wrong — leaks whether the email exists
if (!user) throw new NotFoundException("User not found");
if (!validPassword) throw new UnauthorizedException("Wrong password");

// Correct — same response regardless
throw new UnauthorizedException("Invalid credentials");
```

### Don't serve Swagger in production

Swagger's UI exposes your entire API surface, all endpoints, all parameter names, all response shapes. In production this is a free reconnaissance tool.

```typescript
// main.ts
if (process.env.NODE_ENV !== "production") {
  const config = new DocumentBuilder().setTitle("API").setVersion("1.0").build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
}
```

### Remove `X-Powered-By`

Helmet does this automatically. If you're not using Helmet for some reason, do it manually:

```typescript
app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
});
```

## Public API vs authenticated API

Not every measure applies to every app. Use this to decide what to enable:

| Measure | Public API | Authenticated API |
|---|---|---|
| Helmet (base) | ✅ Always | ✅ Always |
| CSP `'none'` fallback | ✅ JSON-only | ✅ JSON-only |
| CSP explicit policy | If serving HTML | If serving HTML/Swagger |
| CORS allowlist | Depends on intent | ✅ Always |
| CORS wildcard | Only if intentionally public | ❌ Never |
| Rate limiting | ✅ Always (abuse prevention) | ✅ Always (brute force) |
| CSRF protection | Not needed (no cookies) | Only if using cookies |
| `SameSite` cookies | N/A | ✅ Always |
| ValidationPipe | ✅ Always | ✅ Always |
| Payload size limits | ✅ Always | ✅ Always |
| No stack traces in prod | ✅ Always | ✅ Always |
| No Swagger in prod | ✅ Always | ✅ Always |
| Error enumeration protection | N/A | ✅ Auth endpoints |

## Pre-deploy security checklist

Run through this before deploying. In order of impact:

1. `app.use(helmet())` is the first middleware registered in `main.ts`
2. CSP is either explicitly configured or set to `defaultSrc: ["'none'"]` for pure APIs
3. `app.enableCors()` specifies an explicit `origin` allowlist — not `*` unless intentional
4. `ThrottlerModule` is imported and `ThrottlerGuard` registered via `APP_GUARD`
5. `app.set("trust proxy", true)` is set if deployed behind a proxy/CDN
6. `CustomThrottlerGuard` overrides `getTracker()` to use `X-Forwarded-For`
7. `ValidationPipe` is global with `whitelist: true` and `forbidNonWhitelisted: true`
8. Payload size limits set via `app.useBodyParser()` — not `express.json()` directly
9. Global exception filter returns generic messages in production — no stack traces
10. Swagger is gated behind `NODE_ENV !== "production"`
11. Auth endpoints return the same message for "user not found" and "wrong password"
12. Session/auth cookies have `httpOnly: true`, `secure: true`, `sameSite: "strict"`

Run your app through [securityheaders.com](https://securityheaders.com) after deploying. An A or A+ on headers means steps 1–3 are correct.

## Anti-patterns

- **`app.enableCors()` with no config or `origin: '*'`.** This is the default posture that gets flagged by every scanner. Always provide an explicit origin allowlist for authenticated APIs.
- **Registering Helmet after route definitions.** Routes registered before `app.use(helmet())` respond without security headers. Helmet first, always.
- **`contentSecurityPolicy: false` on a pure JSON API.** Technically safe but scanners still flag it. Use `defaultSrc: ["'none'"]` instead — same effect for JSON, better scanner score.
- **Relying on CORS for server-to-server security.** CORS is enforced by browsers only. Non-browser clients ignore it entirely. Auth your server-to-server calls with API keys or mTLS.
- **No `trust proxy` on a hosted platform.** Every user on Render/Railway/Cloudflare appears to be the same IP. One user hitting the rate limit blocks everyone.
- **Using `express.json()` directly to set body size limits.** NestJS already registers its own parser — adding another causes double-parsing and empty `req.body`. Use `app.useBodyParser()` instead.
- **Returning stack traces in production error responses.** Every line of a stack trace is reconnaissance. Log it, don't send it.
- **Swagger enabled in production.** A free map of your entire API surface for anyone who finds the `/docs` route.
- **Differentiating "user not found" from "wrong password".** Attackers use this to enumerate valid usernames. Return the same message for both.
- **`httpOnly: true` on the CSRF token cookie.** The CSRF token must be readable by JS to be included in request headers — `httpOnly` defeats its own purpose here. Use `httpOnly: true` on session cookies, not CSRF cookies.
