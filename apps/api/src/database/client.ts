import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Postgres cancels any statement that runs longer, so a stuck query
  // fails the request instead of holding a connection forever.
  statement_timeout: 45_000,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
