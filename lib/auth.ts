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

  setToken: (token: string, user: any) => {
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

  getUser: () => {
    const userStr = getCookie('user_info');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
};