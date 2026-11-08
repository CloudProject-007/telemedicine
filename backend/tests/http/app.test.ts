import { Role } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { signAccessToken } from '../../src/shared/auth/jwt';
import { PATIENT_ID } from '../helpers/fixtures';

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock('../../src/infrastructure/prisma', () => ({
  prisma: { $queryRaw: mocks.queryRaw },
  isPrismaError: () => false,
}));

const app = createApp();
const patientToken = signAccessToken({ id: PATIENT_ID, role: Role.PATIENT });

beforeEach(() => {
  mocks.queryRaw.mockResolvedValue([{ '?column?': 1 }]);
});

describe('health', () => {
  it('reports liveness', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('reports readiness when the database is up', async () => {
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ready', database: 'up' });
  });

  it('returns 503 when the database is down', async () => {
    mocks.queryRaw.mockRejectedValue(new Error('connection refused'));
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});

describe('error handling', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/nope');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 with details for invalid bodies', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(response.body.error.details)).toBe(true);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Malformed JSON body');
  });

  it('sets a request id header', async () => {
    const response = await request(app).get('/health').set('X-Request-Id', 'abc-123');
    expect(response.headers['x-request-id']).toBe('abc-123');
  });
});

describe('authentication and authorization', () => {
  it('requires a token', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/v1/doctors')).status).toBe(401);
    expect((await request(app).get('/api/v1/appointments')).status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(response.status).toBe(401);
  });

  it('forbids patients from admin and doctor-only endpoints', async () => {
    const auth = { Authorization: `Bearer ${patientToken}` };
    expect((await request(app).post('/api/v1/doctors').set(auth).send({})).status).toBe(403);
    expect((await request(app).post('/api/v1/slots').set(auth).send({})).status).toBe(403);
    expect(
      (await request(app).put('/api/v1/appointments/x/prescription').set(auth).send({})).status,
    ).toBe(403);
  });
});
