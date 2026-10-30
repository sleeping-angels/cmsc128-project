import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  WEB_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.url(),
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
  BETTER_AUTH_SECRET: z.string().min(32),
  /** Parent domain shared by web and api in production, e.g. .example.com */
  COOKIE_DOMAIN: z.string().optional(),
  NOMINATIM_URL: z.url().default('https://nominatim.openstreetmap.org'),
  /** Messenger is disabled unless all three are set. */
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_PAGE_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_VERIFY_TOKEN: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
