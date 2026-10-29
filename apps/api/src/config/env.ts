import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  WEB_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.url(),
});

export const env = EnvSchema.parse(process.env);
