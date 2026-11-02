/**
 * Creates a dashboard account, since public sign-up is disabled. Run with
 * `pnpm --filter api db:seed-user <email> <password> <name> [role]`; the role
 * defaults to admin.
 */
import { userRoleSchema } from '@repo/shared';
import { auth } from '../auth/auth.js';
import { pool } from './client.js';

const [email, password, name, roleArg = 'admin'] = process.argv.slice(2);
const role = userRoleSchema.safeParse(roleArg);

if (!email || !password || !name || !role.success) {
  console.error(
    `Usage: db:seed-user <email> <password> <name> [${userRoleSchema.options.join('|')}]`,
  );
  process.exit(1);
}

try {
  await auth.api.createUser({
    body: { email, password, name, role: role.data },
  });
  console.log(`Created ${role.data} ${email}.`);
} finally {
  await pool.end();
}
