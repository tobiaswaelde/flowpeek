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

/** Validate editable personal identity fields before submitting them to the API. */
export const updateProfileRequestSchema = z.object({
  currentPassword: z.string().optional(),
  firstName: z.string().trim().max(255),
  lastName: z.string().trim().max(255),
  username: z.string().trim().min(1).max(255),
});

/** Local sign-in request payload. */
export type SignInRequest = z.infer<typeof signInRequestSchema>;

/** Password-change request payload. */
export type UpdatePasswordRequest = z.infer<typeof updatePasswordRequestSchema>;

/** Browser form state validated before a personal profile update. */
export type UpdateProfileForm = z.infer<typeof updateProfileRequestSchema>;

/** Current-user profile update accepted by the API. */
export interface UpdateProfileRequest {
  currentPassword?: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
}

/** The safe authenticated-user payload returned by Flowpeek's auth endpoints. */
export interface AuthenticatedUser {
  avatarUpdatedAt: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  role: (typeof userRoles)[number];
  username: string;
}

/** Successful local sign-in response. */
export interface AuthResult {
  accessToken: string;
  user: AuthenticatedUser;
}
