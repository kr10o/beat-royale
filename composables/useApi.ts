// composables/useApi.ts
// Centralizes the (separately deployed) Hono Worker API base + WebSocket URL.
import { useRuntimeConfig } from '#app';

export const useApi = () => {
  const apiBase = (useRuntimeConfig().public.apiBase as string) || '';

  // Build the ws(s):// URL for a lobby from the configured http(s) apiBase.
  const lobbyWsUrl = (lobbyId: string): string => {
    const httpBase = apiBase || (typeof window !== 'undefined' ? window.location.origin : '');
    const wsBase = httpBase.replace(/^http/, 'ws');
    return `${wsBase}/api/lobby/${lobbyId}`;
  };

  // Absolute URL for an OAuth provider entrypoint on the Worker.
  const oauthUrl = (provider: string): string => `${apiBase}/api/auth/oauth/${provider}`;

  return { apiBase, lobbyWsUrl, oauthUrl };
};
