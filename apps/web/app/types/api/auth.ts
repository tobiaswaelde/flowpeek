import { z } from 'zod';

/** Roles that can be returned for an authenticated Flowpeek user. */
export const userRoles = ['SYSTEM_ADMIN', 'VIEWER', 'MANAGER'] as const;

/** Validate local sign-in credentials before submitting them to the API. */
export const signInRequestSchema = z.object({
  password: z.string().min(1),
  username: z.string().min(1).max(255),
});

/** Validate a password-change request before submitting it to the API. */
export const updatePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

/** Local sign-in request payload. */
export type SignInRequest = z.infer<typeof signInRequestSchema>;

/** Password-change request payload. */
export type UpdatePasswordRequest = z.infer<typeof updatePasswordRequestSchema>;

/** The safe authenticated-user payload returned by Flowpeek's auth endpoints. */
export interface AuthenticatedUser {
  id: string;
  role: (typeof userRoles)[number];
  username: string;
}

/** Successful local sign-in response. */
export interface AuthResult {
  accessToken: string;
  user: AuthenticatedUser;
}
