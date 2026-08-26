/** The safe authenticated-user payload returned by Flowpeek's auth endpoints. */
export interface AuthenticatedUser {
  id: string;
  role: 'SYSTEM_ADMIN' | 'VIEWER' | 'MANAGER';
  username: string;
}

/** Successful local sign-in response. */
export interface AuthResult {
  accessToken: string;
  user: AuthenticatedUser;
}
