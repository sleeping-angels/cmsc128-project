import { admin } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import type { UserRole } from '@repo/shared';

const ac = createAccessControl(defaultStatements);

const roles: Record<UserRole, ReturnType<typeof ac.newRole>> = {
  admin: ac.newRole(adminAc.statements),
  responder: ac.newRole({ user: [], session: [] }),
};

export const adminPlugin = admin({
  ac,
  roles,
  defaultRole: 'responder' satisfies UserRole,
  adminRoles: ['admin'] satisfies UserRole[],
});
