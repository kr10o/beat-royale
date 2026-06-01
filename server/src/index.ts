// server/src/index.ts
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';

export interface Env {
  DB: D1Database;
  LOBBY_CACHE: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  BATTLE_LOBBY: DurableObjectNamespace;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Basic health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Authentication Flow utilizing HttpOnly JWTs
app.post('/api/auth/register', async (c) => {
  const { email, password, displayName } = await c.req.json();
  const userId = crypto.randomUUID();
  const jwtSecret = c.env.JWT_SECRET || 'fallback_secret_for_local_dev';
  
  try {
    // Insert into user database
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash) VALUES (?,?,?)`
    ).bind(userId, email, password).run();

    // Initialize display profile
    await c.env.DB.prepare(
      `INSERT INTO profiles (user_id, display_name, elo_ranking, win_count, loss_count, prestige_title, preferences_json) VALUES (?,?,1200,0,0,'Rookie','{}')`
    ).bind(userId, displayName).run();

    const token = await sign({ 
        id: userId, 
        role: 'player',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 
    }, jwtSecret);
    
    setCookie(c, 'auth_token', token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'Strict',
        path: '/'
    });

    return c.json({ success: true, userId, displayName });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Session verification
app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const jwtSecret = c.env.JWT_SECRET || 'fallback_secret_for_local_dev';
  
  try {
    const user = await c.env.DB.prepare(
      `SELECT * FROM users WHERE email = ?`
    ).bind(email).first<any>();

    if (!user || user.password_hash !== password) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401);
    }

    const profile = await c.env.DB.prepare(
      `SELECT * FROM profiles WHERE user_id = ?`
    ).bind(user.id).first<any>();

    const token = await sign({ 
        id: user.id, 
        role: user.role || 'player',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 
    }, jwtSecret);
    
    setCookie(c, 'auth_token', token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'Strict',
        path: '/'
    });

    return c.json({ success: true, userId: user.id, displayName: profile?.display_name || 'Producer' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/api/auth/me', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) return c.json({ authenticated: false }, 401);
  
  try {
    const jwtSecret = c.env.JWT_SECRET || 'fallback_secret_for_local_dev';
    const payload = await verify(token, jwtSecret);
    
    const profile = await c.env.DB.prepare(
      `SELECT * FROM profiles WHERE user_id = ?`
    ).bind(payload.id).first();

    return c.json({ authenticated: true, user: { id: payload.id, role: payload.role, profile } });
  } catch (e) {
    return c.json({ authenticated: false }, 401);
  }
});

// Profile Data Fetching (Action/Loader APIs for Nuxt 3)
app.get('/api/profiles/:id', async (c) => {
  const userId = c.req.param('id');
  try {
    const profile = await c.env.DB.prepare(
        `SELECT * FROM profiles WHERE user_id = ?`
    ).bind(userId).first();
    return profile ? c.json(profile) : c.notFound();
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// WebSocket Upgrade Routing
app.get('/api/lobby/:lobbyId', async (c) => {
  const lobbyId = c.req.param('lobbyId');
  const upgradeHeader = c.req.header('Upgrade');
  
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const id = c.env.BATTLE_LOBBY.idFromName(lobbyId);
  const lobbyObject = c.env.BATTLE_LOBBY.get(id);
  
  return lobbyObject.fetch(c.req.raw);
});

// Direct-to-Cloud Uploads bypassing Worker Memory Constraints
app.get('/api/upload/presigned', async (c) => {
  const objectName = `mixdowns/${crypto.randomUUID()}.webm`;
  
  // Target: https://c6b09964fc8c5ff3cece241a047e7669.r2.cloudflarestorage.com/beat-royale-assets
  const accountId = 'c6b09964fc8c5ff3cece241a047e7669';
  const bucketName = 'beat-royale-assets';
  const uploadUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectName}?signed=mock_signature`;
  
  return c.json({ uploadUrl, objectKey: objectName });
});

export default app;
export { BattleLobbyDO } from './lobby';
