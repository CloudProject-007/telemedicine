import type { Role } from '@prisma/client';

/** The authenticated principal attached to a request / socket. */
export interface AuthUser {
  id: string;
  role: Role;
}
