import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { DB } from '../database/database.module.js';
import { HealthController } from './health.controller.js';

vi.mock('../config/env.js', () => ({ env: {} }));

describe('GET /health', () => {
  let app: INestApplication;
  const db = { execute: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DB, useValue: db }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    db.execute.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok when the database answers', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 when the database is unreachable', async () => {
    db.execute.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error' });
  });
});
