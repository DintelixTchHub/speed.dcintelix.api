# Speed-test API

This is the standalone Express API used by the browser-based speed test.

## Run locally

```bash
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default. Set `PORT` to change the port and `CORS_ORIGIN` to a comma-separated list of allowed frontend origins. The default CORS policy permits any origin.

Set `DATABASE_URL` to the Prisma Accelerate URL for application queries. Set `DIRECT_URL` to the underlying PostgreSQL connection string for migrations; `npm run db:deploy` uses `DIRECT_URL` when present.

For Render, use `npm install && npm run build:deploy` as the build command. This ensures migrations run only after the TypeScript build succeeds.

The `20261002010000_add_postgis_coordinates` migration was changed to clean up any partially applied PostGIS objects. Because the database has recorded an earlier attempt as failed, resolve that attempt once against the intended production database before redeploying:

```bash
npx prisma migrate resolve --rolled-back 20261002010000_add_postgis_coordinates
npm run db:deploy
```

Run these commands in an environment with `DIRECT_URL` set to the intended database's direct PostgreSQL connection string. Resolving the failed attempt as rolled back allows Prisma to rerun the idempotent cleanup migration; do not run this against a different database.

Routes:

- `GET /health` reports whether the API is running.
- `GET /api/speedtest/ping` returns an uncached response for latency samples.
- `GET /api/speedtest/download?size=10485760` streams up to 250 MiB of non-compressible bytes.
- `POST /api/speedtest/upload` consumes up to 250 MiB and reports the received byte count.

Set `NEXT_PUBLIC_API_URL=http://localhost:4000` in the frontend environment. All browser API requests are sent to this Express service; the Next.js app does not provide API route fallbacks.

PostgreSQL pool size and idle/connect timeouts can be tuned with `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, and `DB_POOL_CONNECTION_TIMEOUT_MS`. Pool limits should be sized against the database's total connection budget across all API instances.

`GET /api/isps/detect` looks up ISP and coarse location data for the connecting client IP. The raw IP is not returned to the browser or stored in analytics; the backend stores an HMAC-SHA-256 fingerprint using `IP_HASH_SECRET`. Configure a long random secret. When the API is behind a reverse proxy, set `TRUST_PROXY` to the number of trusted proxy hops (commonly `1`) so Express can identify the visitor IP correctly. Only trust proxies controlled by your deployment; incorrect values can expose the API to spoofed client IP headers. Without this setting, ISP and location lookup may identify the proxy or fail.

The Express service also owns the analytics and ISP APIs:

- `POST /api/speedtest/run` returns the configured test server metadata.
- `POST /api/speedtest/result` stores a completed speed-test result.
- `GET /api/isps` and `GET /api/isps/:id` return ISP data.
- `GET /api/analytics/{daily,distribution,isp-comparison,hourly,monthly,overview,isp-rankings,regional,devices,browsers,operating-systems,recent,history}` provide analytics.
- `POST /api/analytics/submit` stores an analytics record.
- `GET /api/analytics/rwanda`, `/rwanda/isp-rankings`, `/rwanda/cities`, and `/rwanda/isp-city-comparison` provide Rwanda-specific analytics.
- `GET` and `HEAD /api/ping` provide an uncached connectivity probe.