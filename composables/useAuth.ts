// composables/useAuth.ts
import { ref } from 'vue';
import { useCookie } from '#app';

export const useAuth = () => {
  const user = ref(null);
  const isAuthenticated = ref(false);

  const register = async (email, password, displayName) => {
    const apiHost = window.location.hostname === 'localhost' ? 'http://localhost:8787' : '';
    try {
      const response = await fetch(`${apiHost}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        user.value = { id: data.userId, name: displayName, role: 'player' };
        isAuthenticated.value = true;
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Edge authorization server offline.' };
    }
  };

  const login = async (email, password) => {
    const apiHost = window.location.hostname === 'localhost' ? 'http://localhost:8787' : '';
    try {
      const response = await fetch(`${apiHost}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        user.value = { id: data.userId, name: data.displayName, role: 'player' };
        isAuthenticated.value = true;
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Edge server verification failed.' };
    }
  };

  const checkSession = async () => {
    const apiHost = window.location.hostname === 'localhost' ? 'http://localhost:8787' : '';
    try {
      const response = await fetch(`${apiHost}/api/auth/me`);
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          user.value = {
            id: data.user.id,
            name: data.user.profile?.display_name || 'Producer',
            role: data.user.role
          };
          isAuthenticated.value = true;
          return true;
        }
      }
    } catch (e) {
      // Session verification failed or cookie missing
    }
    user.value = null;
    isAuthenticated.value = false;
    return false;
  };

  const logout = () => {
    // Clear cookies
    const cookie = useCookie('auth_token');
    cookie.value = null;
    user.value = null;
    isAuthenticated.value = false;
  };

  return {
    user,
    isAuthenticated,
    register,
    login,
    checkSession,
    logout
  };
};
