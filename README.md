# Beat Battle Royale

Edge-native, browser-based multiplayer DAW battle platform. A **Nuxt 3** frontend and a separate
**Hono on Cloudflare Workers** backend (D1, KV, R2, Durable Objects) that hosts live battle lobbies.

> Architecture note: the frontend and backend are **two separate deployments** (a Cloudflare Pages
> app and a Worker). They are wired together at runtime via configuration — see
> [Connecting the two deployments](#connecting-the-two-deployments). They are intentionally *not*
> merged into a single Nitro server.

## Layout

```
.                      Nuxt 3 frontend (Pages)
├─ pages/              landing, register, battle/[lobbyId], profile/[id]
├─ components/         auth / battle / dashboard UI
├─ composables/        useAuth, useLobby, useApi (API base + ws URL)
├─ stores/             Pinia user store
├─ public/             daw-app.html iframe + tone/jszip engines, service worker
└─ server/             Hono Worker (deployed separately)
   ├─ src/index.ts     routes: auth, oauth, profiles, inventory, social, battles, upload, ws
   ├─ src/lobby.ts     BattleLobbyDO — authoritative, persisted battle state machine
   ├─ src/crypto.ts    PBKDF2 password hashing (WebCrypto)
   ├─ src/oauth.ts     generic OAuth2 provider configs
   ├─ src/rating.ts    Elo rating update
   └─ db/schema.sql    D1 schema
```

## Backend (Worker)

```bash
cd server
npm install

# 1. Create the D1 schema (local dev DB)
npx wrangler d1 execute beat-royale --local --file=./db/schema.sql

# 2. Provide a JWT secret for local dev (NEVER commit this file)
echo 'JWT_SECRET = "dev-secret-change-me"' > .dev.vars

# 3. Run
npx wrangler dev          # http://localhost:8787
curl http://localhost:8787/api/health   # {"status":"ok"}
```

Bindings (`server/wrangler.jsonc`): D1 `DB`, KV `LOBBY_CACHE`, R2 `ASSETS_BUCKET`, Durable Object
`BATTLE_LOBBY`. The D1 binding name **must** be `DB` (the code reads `c.env.DB`).

### Production secrets

```bash
npx wrangler secret put JWT_SECRET            # required
# Optional OAuth (any provider you enable):
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
# ...GOOGLE_*, SPOTIFY_*, APPLE_* likewise
# Optional: where to send the browser after OAuth (your Pages origin)
npx wrangler secret put FRONTEND_ORIGIN
```

Providers without configured credentials return HTTP 501 instead of crashing.

### Deploy

```bash
cd server
npx wrangler d1 execute beat-royale --remote --file=./db/schema.sql   # once
npx wrangler deploy
```

## Frontend (Nuxt)

```bash
npm install
npm run dev               # http://localhost:3000
```

In dev, the API base defaults to `http://localhost:8787` (same-site as localhost, so the auth cookie
is sent). Build/deploy as a Cloudflare Pages project (`npm run build`, preset `cloudflare-pages`).

## Connecting the two deployments

The frontend reads its API origin from `runtimeConfig.public.apiBase` (`composables/useApi.ts`).

| Env | `NUXT_PUBLIC_API_BASE` |
| --- | --- |
| local dev | unset (defaults to `http://localhost:8787`) |
| production | the Worker origin, e.g. `https://beat-battle-royale.<account>.workers.dev` |

Because the two run on different sites in production, the auth cookie is issued with
`SameSite=None; Secure` and all browser calls use `credentials: 'include'`. For first-party cookies
you may alternatively put the Worker on a subdomain of the Pages domain via a Workers route.

## Battle flow

1. Host opens `/battle/:lobbyId`, clicks **START** → frontend `POST /api/battles` (creates the row,
   sets `host_id`/producers), then sends `HOST_START_BATTLE` over the WebSocket.
2. `BattleLobbyDO` enters `producing`, sets a 10-minute alarm, and persists phase/timer to storage.
3. On alarm → `voting` (60s); spectators type `1`/`2` in chat to vote (one vote per user id).
4. On the next alarm → `finished`: the DO writes `winner_id` to the battle row and applies an Elo
   update + win/loss to both producers' profiles (when both producer ids are known).

State is persisted in Durable Object storage so the flow survives WebSocket hibernation.
