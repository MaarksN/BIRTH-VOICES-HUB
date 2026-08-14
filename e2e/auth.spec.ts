import { test, expect } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:3000';
const mutationHeaders = { Origin: ORIGIN };

test('registration creates a usable authenticated session that can logout and login again', async ({ request }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-${unique}@birthvoices.test`;
  const password = 'E2E-Strong-Password-2026';

  const register = await request.post('/api/auth/register', {
    headers: mutationHeaders,
    data: {
      email,
      password,
      companyName: `E2E Tenant ${unique}`,
    },
  });
  expect(register.status()).toBe(200);

  const meAfterRegister = await request.get('/api/auth/me');
  expect(meAfterRegister.status()).toBe(200);
  const registeredSession = await meAfterRegister.json() as {
    user?: { email?: string; tenantId?: string; role?: string };
  };
  expect(registeredSession.user?.email).toBe(email);
  expect(registeredSession.user?.tenantId).toBeTruthy();
  expect(registeredSession.user?.role).toBe('admin');

  const logout = await request.post('/api/auth/logout', { headers: mutationHeaders });
  expect(logout.status()).toBe(200);

  const meAfterLogout = await request.get('/api/auth/me');
  expect(meAfterLogout.status()).toBe(401);

  const login = await request.post('/api/auth/login', {
    headers: mutationHeaders,
    data: { email, password },
  });
  expect(login.status()).toBe(200);

  const meAfterLogin = await request.get('/api/auth/me');
  expect(meAfterLogin.status()).toBe(200);
  const loggedInSession = await meAfterLogin.json() as {
    user?: { email?: string; tenantId?: string; role?: string };
  };
  expect(loggedInSession.user?.email).toBe(email);
  expect(loggedInSession.user?.tenantId).toBe(registeredSession.user?.tenantId);
  expect(loggedInSession.user?.role).toBe('admin');
});
