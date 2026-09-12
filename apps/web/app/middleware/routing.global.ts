import { useApi } from '~/composables/api/api';
import { useAuthStore } from '~/store/auth';
import type { SetupStatus } from '~/types/api/auth';

/** Redirect unauthenticated users to sign-in while keeping the auth route public. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return;
  const setupPath = '/auth/setup';
  const auth = useAuthStore();
  await auth.initialize();

  const isAuthRoute = to.path.startsWith('/auth/');
  if (auth.user && isAuthRoute) return navigateTo('/');
  if (auth.user) return;

  const setupStatus = (await useApi().get<SetupStatus>('/auth/setup-status')).data;
  if (!setupStatus.initialized) {
    if (to.path !== setupPath) return navigateTo(setupPath);
    return;
  }
  if (to.path === setupPath) return navigateTo('/auth/signin');
  if (!isAuthRoute) return navigateTo('/auth/signin');
});
