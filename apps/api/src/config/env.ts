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
});

export const env = EnvSchema.parse(process.env);
