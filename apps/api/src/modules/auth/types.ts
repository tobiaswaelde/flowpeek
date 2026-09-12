import type { UserRole } from '../../generated/prisma/client.js';

export interface AuthenticatedUser {
  avatarUpdatedAt?: Date | null;
  firstName?: string | null;
  id: string;
  lastName?: string | null;
  role: UserRole;
  username: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthenticatedUser;
}
