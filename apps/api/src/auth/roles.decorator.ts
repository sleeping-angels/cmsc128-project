import { Roles as BaseRoles } from '@thallesp/nestjs-better-auth';
import type { UserRole } from '@repo/shared';

/** Restricts a route or controller to users whose `user.role` is one of `roles`. */
export const Roles = (roles: UserRole[]) => BaseRoles(roles);
