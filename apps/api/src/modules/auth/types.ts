import type { UserRole } from '../../generated/prisma/client.js';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  username: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthenticatedUser;
}
