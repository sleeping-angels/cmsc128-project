import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '../config/env.js';
import { db } from '../database/client.js';
import * as schema from '../database/schema/index.js';
import { adminPlugin } from './roles.js';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_URL],
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
  plugins: [adminPlugin],
  advanced: {
    crossSubDomainCookies: {
      enabled: Boolean(env.COOKIE_DOMAIN),
      domain: env.COOKIE_DOMAIN,
    },
  },
});
