import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RealtimeModule } from './realtime.module.js';
import { RealtimeService } from './realtime.service.js';

vi.mock('../config/env.js', () => ({
  env: { WEB_URL: 'http://localhost:5173' },
}));

describe('realtime gateway', () => {
  const store: Record<string, Record<string, unknown>[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const auth = betterAuth({
    secret: 'test-secret-test-secret-test-secret',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter(store),
    emailAndPassword: { enabled: true },
  });
  let app: INestApplication;
  let url: string;
  const sockets: Socket[] = [];

  const connect = (cookie?: string) => {
    const socket = io(url, {
      transports: ['websocket'],
      extraHeaders: cookie ? { cookie } : {},
      reconnection: false,
    });
    sockets.push(socket);
    return socket;
  };

  const signUp = async (email: string) => {
    const res = await auth.api.signUpEmail({
      body: { email, password: 'password1234', name: email },
      returnHeaders: true,
    });
    return {
      cookie: res.headers.get('set-cookie')!,
      userId: res.response.user.id,
    };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.forRoot({ auth }), RealtimeModule],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    await app.listen(0);
    url = await app.getUrl();
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  });

  it('rejects connections without a session', async () => {
    const error = await new Promise<Error>((resolve) =>
      connect().on('connect_error', resolve),
    );
    expect(error.message).toBe('UNAUTHORIZED');
  });

  it('delivers dashboard and user events to signed-in clients', async () => {
    const a = await signUp('a@example.com');
    const b = await signUp('b@example.com');
    const socketA = connect(a.cookie);
    const socketB = connect(b.cookie);
    await Promise.all(
      [socketA, socketB].map(
        (s) => new Promise<void>((resolve) => s.on('connect', resolve)),
      ),
    );

    const realtime = app.get(RealtimeService);
    const received = new Promise((resolve) => socketB.on('ping', resolve));
    realtime.toDashboard('ping', { n: 1 });
    expect(await received).toEqual({ n: 1 });

    const bDirect = vi.fn();
    socketB.on('direct', bDirect);
    const direct = new Promise((resolve) => socketA.on('direct', resolve));
    realtime.toUser(a.userId, 'direct', { n: 2 });
    expect(await direct).toEqual({ n: 2 });
    expect(bDirect).not.toHaveBeenCalled();
  });
});
