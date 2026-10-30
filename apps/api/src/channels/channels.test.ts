import { createHmac } from 'node:crypto';
import { createMemoryState } from '@chat-adapter/state-memory';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { BOT, createBot } from './bot.js';
import { ChannelsModule } from './channels.module.js';
import { ChannelsService } from './channels.service.js';
import { MessageLogService } from './message-log.service.js';

vi.mock('../config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://localhost/unused',
    FACEBOOK_APP_SECRET: 'app-secret',
    FACEBOOK_PAGE_ACCESS_TOKEN: 'page-token',
    FACEBOOK_VERIFY_TOKEN: 'verify-token',
  },
}));

const webhook = (mid: string, message: Record<string, unknown>) =>
  JSON.stringify({
    object: 'page',
    entry: [
      {
        id: 'page-1',
        time: 1793331600000,
        messaging: [
          {
            sender: { id: 'psid-1' },
            recipient: { id: 'page-1' },
            timestamp: 1793331600000,
            message: { mid, ...message },
          },
        ],
      },
    ],
  });

describe('channels', () => {
  const auth = betterAuth({
    secret: 'test-secret-test-secret-test-secret',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
    }),
  });
  const log = {
    recordInbound: vi.fn(),
    recordOutbound: vi.fn(),
    findExternalId: vi.fn(),
  };
  const graph = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(
      Response.json(
        url.includes('/me/messages') && init
          ? { recipient_id: 'psid-1', message_id: 'm_out' }
          : { id: 'page-1', name: 'MIGO' },
      ),
    ),
  );
  const realFetch = globalThis.fetch;
  let app: INestApplication;
  let channels: ChannelsService;

  beforeAll(async () => {
    vi.stubGlobal('fetch', (input: string | URL, init?: RequestInit) =>
      String(input).startsWith('https://graph.facebook.com')
        ? graph(String(input), init)
        : realFetch(input, init),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRoot({ auth, bodyParser: { rawBody: true } }),
        ChannelsModule,
      ],
    })
      .overrideProvider(BOT)
      .useValue(createBot(createMemoryState()))
      .overrideProvider(MessageLogService)
      .useValue(log)
      .compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    await app.init();
    channels = app.get(ChannelsService);
  });

  afterEach(() => vi.clearAllMocks());

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  const post = (body: string) =>
    request(app.getHttpServer())
      .post('/webhooks/messenger')
      .set('content-type', 'application/json')
      .set(
        'x-hub-signature-256',
        `sha256=${createHmac('sha256', 'app-secret').update(body).digest('hex')}`,
      )
      .send(body);

  it('answers the verification challenge without a session', async () => {
    const res = await request(app.getHttpServer())
      .get('/webhooks/messenger')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-token',
        'hub.challenge': 'challenge-1',
      });
    expect(res.status).toBe(200);
    expect(res.text).toBe('challenge-1');
  });

  it('404s an unconfigured platform', async () => {
    const res = await request(app.getHttpServer()).post('/webhooks/web');
    expect(res.status).toBe(404);
  });

  it('saves a message before answering, then runs handlers', async () => {
    const handler = vi.fn(() => Promise.resolve());
    channels.onMessage(handler);
    log.recordInbound.mockResolvedValue({
      messageId: 'msg-1',
      residentId: 'r-1',
    });

    const res = await post(
      webhook('m_1', {
        text: ' Baha sa Tacas ',
        attachments: [
          {
            type: 'location',
            payload: { coordinates: { lat: 10.64, long: 122.23 } },
          },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(log.recordInbound).toHaveBeenCalledWith({
      channel: 'messenger',
      senderExternalId: 'psid-1',
      externalId: 'm_1',
      body: 'Baha sa Tacas',
      attachments: [{ type: 'location', lng: 122.23, lat: 10.64 }],
    });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'messenger:psid-1' }),
      expect.objectContaining({ text: ' Baha sa Tacas ' }),
      { messageId: 'msg-1', residentId: 'r-1' },
    );
  });

  it('skips handlers for a redelivered message', async () => {
    const handler = vi.fn(() => Promise.resolve());
    channels.onMessage(handler);
    log.recordInbound.mockResolvedValue(null);

    expect((await post(webhook('m_1', { text: 'Baha' }))).status).toBe(200);
    expect(handler).not.toHaveBeenCalled();
  });

  it('fails the delivery when the save fails, and accepts the retry', async () => {
    log.recordInbound.mockRejectedValue(new Error('db down'));
    expect((await post(webhook('m_2', { text: 'Sunog' }))).status).toBe(500);

    log.recordInbound.mockResolvedValue({
      messageId: 'msg-2',
      residentId: 'r-1',
    });
    expect((await post(webhook('m_2', { text: 'Sunog' }))).status).toBe(200);
  });

  it('sends to a resident and saves the message', async () => {
    log.findExternalId.mockResolvedValue('psid-1');
    log.recordOutbound.mockResolvedValue('msg-3');

    const id = await channels.send('r-1', 'messenger', 'Natanggap namin.');

    expect(id).toBe('msg-3');
    const [, init] = graph.mock.calls.find(
      ([url, init]) => url.includes('/me/messages') && init?.method === 'POST',
    )!;
    expect(JSON.parse(init!.body as string)).toMatchObject({
      recipient: { id: 'psid-1' },
      message: { text: 'Natanggap namin.' },
    });
    expect(log.recordOutbound).toHaveBeenCalledWith({
      residentId: 'r-1',
      channel: 'messenger',
      body: 'Natanggap namin.',
      externalId: 'm_out',
    });
  });
});
