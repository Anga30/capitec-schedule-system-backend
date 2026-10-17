import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

process.env.BOOKING_RATE_LIMIT_MAX = '5';
process.env.PUBLIC_READ_RATE_LIMIT_MAX = '300';

jest.unstable_mockModule('../../modules/branches/branches.repository.js', () => ({
  findActiveBranches: jest.fn().mockResolvedValue([]),
}));

const { default: app } = await import('../../app.js');
let server;
let baseUrl;

beforeAll(async () => {
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function request(method, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('API rate limits', () => {
  it('allows five booking attempts, then returns a rate-limit response', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request('POST', '/api/bookings', {});
      expect(response.status).toBe(400);
      await response.arrayBuffer();
    }

    const limitedResponse = await request('POST', '/api/bookings', {});

    expect(limitedResponse.status).toBe(429);
    expect(await limitedResponse.json()).toEqual({
      error: 'Too many booking attempts. Please wait before trying again.',
    });
    expect(limitedResponse.headers.get('ratelimit')).toBeTruthy();
  });

  it('allows 300 public reads, then returns a rate-limit response', async () => {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const response = await request('GET', '/api/branches');
      expect(response.status).toBe(200);
      await response.arrayBuffer();
    }

    const limitedResponse = await request('GET', '/api/branches');

    expect(limitedResponse.status).toBe(429);
    expect(await limitedResponse.json()).toEqual({
      error: 'Too many requests. Please wait before checking availability again.',
    });
    expect(limitedResponse.headers.get('ratelimit')).toBeTruthy();
  });
});
