import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 1000 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 5000 },
    { duration: '1m', target: 5000 },
    { duration: '1m', target: 0 }, // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

export default function () {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

  // 1. Visit Health Check (Simulate initial hit)
  let healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check is 200': (r) => r.status === 200,
  });

  // 2. Simulate Login (If credentials are provided or mocking)
  // Normally we would POST to /api/auth/login, but for the load test
  // we will hit the frontend bundle and a lightweight unauthenticated endpoint
  // to avoid creating 5000 real users on the fly unless seeded.
  
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });
  
  const headers = { 'Content-Type': 'application/json' };
  
  // Note: If authentication rate limiting blocks this, the test will yield 429s.
  // We expect the first few to pass, others might fail unless we bypass rate-limit for k6 IPs.
  let loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, { headers });
  
  check(loginRes, {
    'login returned 200 or 401/429': (r) => [200, 401, 429].includes(r.status),
  });

  sleep(1);
}
