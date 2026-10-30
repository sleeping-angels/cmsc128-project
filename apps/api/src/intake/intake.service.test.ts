import type { ReportFeedItem } from '@repo/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../database/client.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { IntakeService } from './intake.service.js';
import { findFeedItem, insertReport } from './reports.js';

vi.mock('../config/env.js', () => ({ env: {} }));
vi.mock('./reports.js', () => ({
  insertReport: vi.fn(),
  findFeedItem: vi.fn(),
}));

const id = '0b9a3f4e-8c1d-4e2a-9f6b-1c2d3e4f5a6b';
const createdAt = new Date('2026-10-29T08:30:00.000Z');
const item: ReportFeedItem = {
  id,
  status: 'pending',
  isProxy: false,
  incidentType: null,
  severity: null,
  barangay: null,
  locationText: null,
  location: null,
  incidentAt: null,
  sourceChannel: 'messenger',
  parsedAutomatically: false,
  parseConfidence: null,
  resident: { id, name: null },
  victimCount: 0,
  createdAt,
  updatedAt: createdAt,
};

describe('IntakeService.createReport', () => {
  it('saves the report and pushes it to the feed', async () => {
    vi.mocked(insertReport).mockResolvedValue({ id, trackingToken: 'tok' });
    vi.mocked(findFeedItem).mockResolvedValue(item);
    const realtime = { toDashboard: vi.fn() };
    const intake = new IntakeService(
      {} as Database,
      realtime as unknown as RealtimeService,
    );

    const input = { residentId: id, sourceChannel: 'messenger' } as const;
    await expect(intake.createReport(input)).resolves.toEqual({
      id,
      trackingToken: 'tok',
    });
    expect(insertReport).toHaveBeenCalledWith({}, input);
    expect(realtime.toDashboard).toHaveBeenCalledWith('report:created', {
      ...item,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  });
});
