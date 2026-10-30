import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Roles } from './roles.decorator.js';
import { adminPlugin } from './roles.js';

@Controller('probe')
class ProbeController {
  @Get('any')
  any() {
    return { ok: true };
  }

  @Get('admin')
  @Roles(['admin'])
  admin() {
    return { ok: true };
  }
}

describe('role guards', () => {
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
    plugins: [adminPlugin],
  });
  let app: INestApplication;

  const signUp = async (email: string) => {
    const res = await auth.api.signUpEmail({
      body: { email, password: 'password1234', name: email },
      returnHeaders: true,
    });
    return res.headers.get('set-cookie')!;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.forRoot({ auth })],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a session', async () => {
    const res = await request(app.getHttpServer()).get('/probe/any');
    expect(res.status).toBe(401);
  });

  it('defaults new users to responder', async () => {
    const cookie = await signUp('responder@example.com');
    const user = store.user!.find((u) => u.email === 'responder@example.com');
    expect(user?.role).toBe('responder');

    const server = app.getHttpServer();
    expect(
      (await request(server).get('/probe/any').set('Cookie', cookie)).status,
    ).toBe(200);
    expect(
      (await request(server).get('/probe/admin').set('Cookie', cookie)).status,
    ).toBe(403);
  });

  it('allows admins through admin-only routes', async () => {
    const cookie = await signUp('admin@example.com');
    store.user!.find((u) => u.email === 'admin@example.com')!.role = 'admin';

    const res = await request(app.getHttpServer())
      .get('/probe/admin')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
  });
});
