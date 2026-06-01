// composables/useAuth.ts
import { ref } from 'vue';
import { useApi } from './useApi';

export interface AuthUser {
  id: string;
  name: string;
  role: string;
}

interface AuthResult {
  success: boolean;
  userId?: string;
  displayName?: string;
  error?: string;
  message?: string;
}

export const useAuth = () => {
  const { apiBase } = useApi();
  const user = ref<AuthUser | null>(null);
  const isAuthenticated = ref(false);

  // `credentials: 'include'` is required so the HttpOnly auth cookie is sent
  // to the separately-deployed Worker origin.
  const api = (path: string, init: RequestInit = {}) =>
    fetch(`${apiBase}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

  const register = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    try {
      const response = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = (await response.json()) as AuthResult;
      if (response.ok && data.success) {
        user.value = { id: data.userId!, name: displayName, role: 'player' };
        isAuthenticated.value = true;
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Edge authorization server offline.' };
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as AuthResult;
      if (response.ok && data.success) {
        user.value = { id: data.userId!, name: data.displayName || 'Producer', role: 'player' };
        isAuthenticated.value = true;
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Edge server verification failed.' };
    }
  };

  const checkSession = async (): Promise<boolean> => {
    try {
      const response = await api('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          user.value = {
            id: data.user.id,
            name: data.user.profile?.display_name || 'Producer',
            role: data.user.role,
          };
          isAuthenticated.value = true;
          return true;
        }
      }
    } catch {
      // Session verification failed or cookie missing.
    }
    user.value = null;
    isAuthenticated.value = false;
    return false;
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear the HttpOnly cookie server-side.
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort; clear local state regardless.
    }
    user.value = null;
    isAuthenticated.value = false;
  };

  return { user, isAuthenticated, register, login, checkSession, logout };
};
