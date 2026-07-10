export const auth = {
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  setToken: (token: string, user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user_info', JSON.stringify(user));
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      window.location.href = '/#/login';
    }
  },

  getUser: () => {
      if (typeof window !== 'undefined') {
          const u = localStorage.getItem('user_info');
          return u ? JSON.parse(u) : null;
      }
      return null;
  }
};