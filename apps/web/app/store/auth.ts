import { defineStore } from 'pinia';
import { ref } from 'vue';

import { accessTokenStorageKey, useApi } from '~/composables/api/api';
import type { AuthResult, AuthenticatedUser } from '~/types/api/auth';

/** Manages local bearer-token persistence and the current authenticated user. */
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null);
  const initialized = ref(false);
  const user = ref<AuthenticatedUser | null>(null);

  /** Restore a stored token and verify it through the current-user endpoint. */
  async function initialize(): Promise<void> {
    if (initialized.value) return;
    initialized.value = true;
    accessToken.value = import.meta.client ? window.localStorage.getItem(accessTokenStorageKey) : null;
    if (accessToken.value) await refresh();
  }

  /** Sign in with local credentials and persist the resulting bearer token. */
  async function signIn(username: string, password: string): Promise<void> {
    const response = await useApi().post<AuthResult>('/auth/signin', { password, username });
    setSession(response.data);
  }

  /** Refresh the current user and clear an expired or invalid local session. */
  async function refresh(): Promise<void> {
    try {
      user.value = (await useApi().get<AuthenticatedUser>('/auth/me')).data;
    } catch {
      clearSession();
    }
  }

  /** Sign out locally even if the API is temporarily unreachable. */
  async function signOut(): Promise<void> {
    try {
      await useApi().post('/auth/signout');
    } finally {
      clearSession();
    }
  }

  function setSession(session: AuthResult): void {
    accessToken.value = session.accessToken;
    user.value = session.user;
    if (import.meta.client) window.localStorage.setItem(accessTokenStorageKey, session.accessToken);
  }

  function clearSession(): void {
    accessToken.value = null;
    user.value = null;
    if (import.meta.client) window.localStorage.removeItem(accessTokenStorageKey);
  }

  return { accessToken, clearSession, initialize, initialized, refresh, signIn, signOut, user };
});
