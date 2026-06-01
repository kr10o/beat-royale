// server/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { hashPassword, verifyPassword } from './crypto';
import { getProvider, buildRedirectUri, buildAuthorizeUrl, exchangeCode } from './oauth';

export interface Env {
  DB: D1Database;
  LOBBY_CACHE: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  BATTLE_LOBBY: DurableObjectNamespace;
  JWT_SECRET: string;
  // Optional OAuth credentials (set via `wrangler secret put ...`).
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  // Where to send the browser after OAuth completes (the Nuxt app origin).
  FRONTEND_ORIGIN?: string;
}

interface JwtPayload {
  id: string;
  role: string;
  exp: number;
}

const app = new Hono<{ Bindings: Env }>();

// The frontend is deployed separately (Cloudflare Pages), so allow credentialed
// cross-origin requests by reflecting the request Origin.
app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

function getSecret(c: { env: Env }): string {
  // In production JWT_SECRET MUST be set (see README). The dev fallback only
  // applies when running locally without a configured secret.
  return c.env.JWT_SECRET || 'local_dev_only_secret';
}

// Cookie attributes adapt to context: cross-site (https) needs SameSite=None;
// local http dev (same-site localhost) uses Lax so the cookie is stored.
function authCookieOpts(c: { req: { url: string } }) {
  const isHttps = new URL(c.req.url).protocol === 'https:';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? 'None' : 'Lax') as 'None' | 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  };
}

async function issueSession(c: any, userId: string, role: string) {
  const token = await sign(
    { id: userId, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 },
    getSecret(c)
  );
  setCookie(c, 'auth_token', token, authCookieOpts(c));
  return token;
}

async function getUser(c: any): Promise<JwtPayload | null> {
  const token = getCookie(c, 'auth_token');
  if (!token) return null;
  try {
    return (await verify(token, getSecret(c), 'HS256')) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post('/api/auth/register', async (c) => {
  const { email, password, displayName } = await c.req.json();
  if (!email || !password || !displayName) {
    return c.json({ success: false, error: 'email, password and displayName are required' }, 400);
  }
  const userId = crypto.randomUUID();
  try {
    const passwordHash = await hashPassword(password);
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash) VALUES (?,?,?)`
    ).bind(userId, email, passwordHash).run();

    await c.env.DB.prepare(
      `INSERT INTO profiles (user_id, display_name, elo_ranking, win_count, loss_count, prestige_title, preferences_json)
       VALUES (?,?,1200,0,0,'Rookie','{}')`
    ).bind(userId, displayName).run();

    await issueSession(c, userId, 'player');
    return c.json({ success: true, userId, displayName });
  } catch (err: any) {
    // UNIQUE constraint → email/display name already taken.
    return c.json({ success: false, error: err.message }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  try {
    const user = await c.env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<any>();
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401);
    }
    const profile = await c.env.DB.prepare(`SELECT * FROM profiles WHERE user_id = ?`).bind(user.id).first<any>();
    await issueSession(c, user.id, user.role || 'player');
    return c.json({ success: true, userId: user.id, displayName: profile?.display_name || 'Producer' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/auth/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' });
  return c.json({ success: true });
});

app.get('/api/auth/me', async (c) => {
  const payload = await getUser(c);
  if (!payload) return c.json({ authenticated: false }, 401);
  const profile = await c.env.DB.prepare(`SELECT * FROM profiles WHERE user_id = ?`).bind(payload.id).first();
  return c.json({ authenticated: true, user: { id: payload.id, role: payload.role, profile } });
});

// ---------------------------------------------------------------------------
// OAuth (generic authorization-code flow; see server/src/oauth.ts)
// ---------------------------------------------------------------------------
app.get('/api/auth/oauth/:provider', async (c) => {
  const name = c.req.param('provider');
  const cfg = getProvider(name);
  if (!cfg) return c.json({ error: 'Unknown provider' }, 404);

  const clientId = (c.env as any)[cfg.clientIdVar];
  if (!clientId) {
    return c.json({ error: `${name} OAuth is not configured on this deployment` }, 501);
  }
  const origin = new URL(c.req.url).origin;
  const redirectUri = buildRedirectUri(origin, name);
  const state = crypto.randomUUID();
  // Stash state for CSRF validation on callback.
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: authCookieOpts(c).secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });
  return c.redirect(buildAuthorizeUrl(name, cfg, clientId, redirectUri, state));
});

async function handleOAuthCallback(c: any, name: string, code: string | undefined, state: string | undefined) {
  const cfg = getProvider(name);
  if (!cfg) return c.json({ error: 'Unknown provider' }, 404);
  if (!code) return c.json({ error: 'Missing authorization code' }, 400);

  const savedState = getCookie(c, 'oauth_state');
  if (state && savedState && state !== savedState) {
    return c.json({ error: 'Invalid OAuth state' }, 400);
  }

  const clientId = (c.env as any)[cfg.clientIdVar];
  const clientSecret = (c.env as any)[cfg.clientSecretVar];
  if (!clientId || !clientSecret) {
    return c.json({ error: `${name} OAuth is not configured` }, 501);
  }

  const origin = new URL(c.req.url).origin;
  const redirectUri = buildRedirectUri(origin, name);

  try {
    const oauthUser = await exchangeCode(name, cfg, clientId, clientSecret, code, redirectUri);

    // Upsert by (oauth_provider, oauth_id), falling back to email.
    let user: any = await c.env.DB.prepare(
      `SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?`
    ).bind(name, oauthUser.oauthId).first();

    if (!user && oauthUser.email) {
      user = await c.env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(oauthUser.email).first();
    }

    let userId: string;
    if (user) {
      userId = user.id;
      await c.env.DB.prepare(`UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?`)
        .bind(name, oauthUser.oauthId, userId).run();
    } else {
      userId = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, oauth_provider, oauth_id) VALUES (?,?,?,?)`
      ).bind(userId, oauthUser.email || `${name}_${oauthUser.oauthId}@oauth.local`, name, oauthUser.oauthId).run();
      const displayName = `${oauthUser.displayName}`.slice(0, 36);
      await c.env.DB.prepare(
        `INSERT INTO profiles (user_id, display_name, elo_ranking, win_count, loss_count, prestige_title, preferences_json)
         VALUES (?,?,1200,0,0,'Rookie','{}')`
      ).bind(userId, `${displayName}_${userId.slice(0, 4)}`).run();
    }

    await issueSession(c, userId, user?.role || 'player');
    const frontend = c.env.FRONTEND_ORIGIN || new URL(c.req.url).origin;
    return c.redirect(`${frontend}/profile/${userId}`);
  } catch (err: any) {
    return c.json({ error: `OAuth failed: ${err.message}` }, 502);
  }
}

app.get('/api/auth/oauth/:provider/callback', async (c) =>
  handleOAuthCallback(c, c.req.param('provider'), c.req.query('code'), c.req.query('state'))
);
// Apple posts the callback as form_post.
app.post('/api/auth/oauth/:provider/callback', async (c) => {
  const body = await c.req.parseBody();
  return handleOAuthCallback(c, c.req.param('provider'), body.code as string, body.state as string);
});

// ---------------------------------------------------------------------------
// Profiles / Inventory / Social
// ---------------------------------------------------------------------------
app.get('/api/profiles/:id', async (c) => {
  try {
    const profile = await c.env.DB.prepare(
      `SELECT p.*, u.role, u.created_at FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`
    ).bind(c.req.param('id')).first();
    return profile ? c.json(profile) : c.notFound();
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/inventory/:userId', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM inventory WHERE user_id = ? ORDER BY unlocked_at DESC`
    ).bind(c.req.param('userId')).all();
    return c.json({ items: results ?? [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/social/:userId', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT sg.target_id, sg.relationship_type, sg.created_at, p.display_name, p.elo_ranking
         FROM social_graph sg LEFT JOIN profiles p ON p.user_id = sg.target_id
        WHERE sg.user_id = ?`
    ).bind(c.req.param('userId')).all();
    return c.json({ connections: results ?? [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/social/:userId', async (c) => {
  const me = await getUser(c);
  if (!me || me.id !== c.req.param('userId')) return c.json({ error: 'Unauthorized' }, 401);
  const { targetId, relationshipType } = await c.req.json();
  if (!targetId || !relationshipType) return c.json({ error: 'targetId and relationshipType required' }, 400);
  try {
    await c.env.DB.prepare(
      `INSERT INTO social_graph (user_id, target_id, relationship_type) VALUES (?,?,?)
       ON CONFLICT(user_id, target_id) DO UPDATE SET relationship_type = excluded.relationship_type`
    ).bind(me.id, targetId, relationshipType).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Battles
// ---------------------------------------------------------------------------
app.post('/api/battles', async (c) => {
  const me = await getUser(c);
  if (!me) return c.json({ error: 'Authentication required' }, 401);
  const { lobbyId, lobbyName, producer1Id, producer2Id, prizePoolCents } = await c.req.json();
  // Battle id == lobby id so the Durable Object can persist results against it.
  const id = lobbyId || crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO battles (id, lobby_name, host_id, producer_1_id, producer_2_id, status, prize_pool_cents)
       VALUES (?,?,?,?,?, 'pending', ?)
       ON CONFLICT(id) DO UPDATE SET
         lobby_name = excluded.lobby_name,
         host_id = excluded.host_id,
         producer_1_id = excluded.producer_1_id,
         producer_2_id = excluded.producer_2_id`
    ).bind(id, lobbyName || id, me.id, producer1Id || null, producer2Id || null, prizePoolCents || 0).run();
    return c.json({ success: true, battleId: id });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/api/battles/:id', async (c) => {
  try {
    const battle = await c.env.DB.prepare(`SELECT * FROM battles WHERE id = ?`).bind(c.req.param('id')).first();
    return battle ? c.json(battle) : c.notFound();
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Live lobby WebSocket upgrade → Durable Object
// ---------------------------------------------------------------------------
app.get('/api/lobby/:lobbyId', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }
  const id = c.env.BATTLE_LOBBY.idFromName(c.req.param('lobbyId'));
  return c.env.BATTLE_LOBBY.get(id).fetch(c.req.raw);
});

// ---------------------------------------------------------------------------
// R2 uploads — Worker-proxied PUT (writes straight into the bucket).
// The client first GETs an upload ticket, then PUTs the audio blob to it.
// ---------------------------------------------------------------------------
app.get('/api/upload/presigned', (c) => {
  const objectKey = `mixdowns/${crypto.randomUUID()}.webm`;
  const origin = new URL(c.req.url).origin;
  return c.json({ uploadUrl: `${origin}/api/upload/${objectKey}`, objectKey });
});

app.put('/api/upload/*', async (c) => {
  const objectKey = c.req.path.replace(/^\/api\/upload\//, '');
  if (!objectKey) return c.json({ error: 'Missing object key' }, 400);
  try {
    const body = await c.req.arrayBuffer();
    await c.env.ASSETS_BUCKET.put(objectKey, body, {
      httpMetadata: { contentType: c.req.header('Content-Type') || 'application/octet-stream' },
    });
    return c.json({ success: true, objectKey });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
export { BattleLobbyDO } from './lobby';
