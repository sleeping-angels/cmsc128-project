import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import type { ReportDetail } from '@repo/shared';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
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
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

vi.mock('../config/env.js', () => ({ env: {} }));

const id = '0b9a3f4e-8c1d-4e2a-9f6b-1c2d3e4f5a6b';
const at = new Date('2026-10-29T08:30:00.000Z');

const detail: ReportDetail = {
  id,
  status: 'pending',
  isProxy: false,
  incidentType: null,
  severity: 'high',
  barangay: null,
  locationText: null,
  location: null,
  incidentAt: null,
  sourceChannel: 'messenger',
  parsedAutomatically: false,
  parseConfidence: null,
  resident: { id, name: 'Pedro Cruz', contactNumber: '09171234567' },
  creator: null,
  victims: [],
  messages: [
    {
      id,
      direction: 'inbound',
      senderId: null,
      body: 'tulong',
      attachments: null,
      createdAt: at,
    },
  ],
  createdAt: at,
  updatedAt: at,
};

describe('/triage/reports', () => {
  let app: INestApplication;
  const reports = {
    findDetail: vi.fn(),
    findFeed: vi.fn(),
    summarize: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: reports },
        { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
        // Same global pipe as AppModule, so the params DTO validates the ID.
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    reports.findDetail.mockReset();
    reports.findFeed.mockReset();
    reports.summarize.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the report with the contact number and messages', async () => {
    reports.findDetail.mockResolvedValue(detail);
    const res = await request(app.getHttpServer()).get(`/triage/reports/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.resident.contactNumber).toBe('09171234567');
    expect(res.body.messages[0].createdAt).toBe(at.toISOString());
    expect(reports.findDetail).toHaveBeenCalledWith(id);
  });

  it('returns 404 for an unknown report', async () => {
    reports.findDetail.mockResolvedValue(null);
    const res = await request(app.getHttpServer()).get(`/triage/reports/${id}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 without querying for a malformed ID', async () => {
    const res = await request(app.getHttpServer()).get(
      '/triage/reports/not-a-uuid',
    );
    expect(res.status).toBe(400);
    expect(reports.findDetail).not.toHaveBeenCalled();
  });

  it('lists feed items with the first message', async () => {
    const { resident, victims, messages, ...rest } = detail;
    reports.findFeed.mockResolvedValue([
      {
        ...rest,
        resident: { id: resident!.id, name: resident!.name },
        victimCount: victims.length,
        firstMessage: messages[0]!.body,
      },
    ]);
    const res = await request(app.getHttpServer()).get('/triage/reports');
    expect(res.status).toBe(200);
    expect(res.body[0].firstMessage).toBe('tulong');
    expect(res.body[0].createdAt).toBe(at.toISOString());
  });

  it('returns the summary instead of treating "summary" as an ID', async () => {
    const summary = {
      openByStatus: { pending: 2, validated: 1, dispatched: 0 },
      openBySeverity: { low: 0, moderate: 1, high: 1, critical: 0, unrated: 1 },
      newToday: 3,
    };
    reports.summarize.mockResolvedValue(summary);
    const res = await request(app.getHttpServer()).get(
      '/triage/reports/summary',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(summary);
    expect(reports.findDetail).not.toHaveBeenCalled();
  });
});
