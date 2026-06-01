// server/src/oauth.ts
// Generic OAuth2 authorization-code flow for the producer SSO providers.
// Client id/secret are read from Worker secrets/vars; a provider with missing
// credentials degrades gracefully (returns a clear error instead of crashing).

export interface NormalizedOAuthUser {
  oauthId: string;
  email: string | null;
  displayName: string;
}

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userUrl: string;
  scope: string;
  clientIdVar: string;
  clientSecretVar: string;
  // Maps the provider's /userinfo payload to our normalized shape.
  normalize: (raw: any) => NormalizedOAuthUser;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  discord: {
    authUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    scope: 'identify email',
    clientIdVar: 'DISCORD_CLIENT_ID',
    clientSecretVar: 'DISCORD_CLIENT_SECRET',
    normalize: (u) => ({
      oauthId: String(u.id),
      email: u.email ?? null,
      displayName: u.global_name || u.username || `discord_${u.id}`,
    }),
  },
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    clientIdVar: 'GOOGLE_CLIENT_ID',
    clientSecretVar: 'GOOGLE_CLIENT_SECRET',
    normalize: (u) => ({
      oauthId: String(u.sub),
      email: u.email ?? null,
      displayName: u.name || u.email || `google_${u.sub}`,
    }),
  },
  spotify: {
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    userUrl: 'https://api.spotify.com/v1/me',
    scope: 'user-read-email user-read-private',
    clientIdVar: 'SPOTIFY_CLIENT_ID',
    clientSecretVar: 'SPOTIFY_CLIENT_SECRET',
    normalize: (u) => ({
      oauthId: String(u.id),
      email: u.email ?? null,
      displayName: u.display_name || u.id || `spotify_${u.id}`,
    }),
  },
  apple: {
    // Apple uses form_post + a JWT client secret; the redirect works, token
    // exchange requires APPLE_CLIENT_SECRET to be a pre-signed client-secret JWT.
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    userUrl: '', // Apple returns identity in the id_token, not a userinfo endpoint.
    scope: 'name email',
    clientIdVar: 'APPLE_CLIENT_ID',
    clientSecretVar: 'APPLE_CLIENT_SECRET',
    normalize: (u) => ({
      oauthId: String(u.sub),
      email: u.email ?? null,
      displayName: u.email ? u.email.split('@')[0] : `apple_${u.sub}`,
    }),
  },
};

export function getProvider(name: string): ProviderConfig | null {
  return PROVIDERS[name] ?? null;
}

export function buildRedirectUri(origin: string, provider: string): string {
  return `${origin}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthorizeUrl(
  provider: string,
  cfg: ProviderConfig,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: cfg.scope,
    state,
  });
  if (provider === 'apple') params.set('response_mode', 'form_post');
  return `${cfg.authUrl}?${params.toString()}`;
}

function decodeJwtPayload(jwt: string): any {
  const part = jwt.split('.')[1];
  if (!part) return {};
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(b64));
}

// Exchanges an authorization code for the normalized OAuth user.
export async function exchangeCode(
  provider: string,
  cfg: ProviderConfig,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<NormalizedOAuthUser> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed (${tokenRes.status})`);
  }
  const token: any = await tokenRes.json();

  // Apple / OIDC providers embed identity in the id_token.
  if (provider === 'apple' || (!cfg.userUrl && token.id_token)) {
    return cfg.normalize(decodeJwtPayload(token.id_token));
  }

  const userRes = await fetch(cfg.userUrl, {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' },
  });
  if (!userRes.ok) {
    throw new Error(`Userinfo fetch failed (${userRes.status})`);
  }
  return cfg.normalize(await userRes.json());
}
