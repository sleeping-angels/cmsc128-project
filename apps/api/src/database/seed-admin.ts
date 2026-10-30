/**
 * Creates an admin account, since public sign-up is disabled. Run with
 * `pnpm --filter api db:seed-admin <email> <password> <name>`.
 */
import { auth } from '../auth/auth.js';
import { pool } from './client.js';

const [email, password, name] = process.argv.slice(2);

if (!email || !password || !name) {
  console.error('Usage: db:seed-admin <email> <password> <name>');
  process.exit(1);
}

try {
  await auth.api.createUser({ body: { email, password, name, role: 'admin' } });
  console.log(`Created admin ${email}.`);
} finally {
  await pool.end();
}
