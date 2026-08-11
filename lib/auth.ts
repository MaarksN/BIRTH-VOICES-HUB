const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawValue = parts.pop()?.split(';').shift();
    if (rawValue) {
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }
  return null;
};

export const auth = {
  getToken: () => {
    return getCookie('logged_in');
  },

  setToken: (_token: string, _user: unknown) => {
    // Deprecated for client-side write, cookies are set and managed by server httpOnly and secure flows.
  },

  logout: () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .finally(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/#/login';
        }
      });
  },
};

// Real logged-in user (id/email/role/tenantId) is not something the server ever hands to the
// client via a plain cookie — it lives behind GET /api/auth/me and is kept in
// `useSessionStore` (see fetchSession there). Nothing in this app should read a `user_info`
// cookie: no server route ever sets one, so that used to silently and permanently resolve to
// a fabricated fallback user everywhere it was read.

let sessionExpiryInstalled = false;

/**
 * Installs a one-time global fetch interceptor so any authenticated same-origin API call that
 * comes back 401 triggers a single 'session-expired' window event, regardless of which page
 * or which other agent's component made the call. App.tsx listens for this event to clear the
 * session and redirect to /login instead of leaving a page silently stuck on stale/null data.
 * Login/register/refresh calls are excluded so a failed login attempt never triggers a redirect
 * loop back to the login page it is already on.
 */
export function installSessionExpiryWatcher() {
  if (sessionExpiryInstalled || typeof window === 'undefined' || !window.fetch) return;
  sessionExpiryInstalled = true;

  const EXCLUDED_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? '';
      const isApiCall = url.startsWith('/api/') || url.includes('/api/');
      const isExcluded = EXCLUDED_PATHS.some((path) => url.includes(path));

      if (response.status === 401 && isApiCall && !isExcluded) {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    } catch {
      // Never let interceptor bookkeeping break the actual network call.
    }

    return response;
  };
}