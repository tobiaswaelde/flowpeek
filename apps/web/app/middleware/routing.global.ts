import { useAuthStore } from '~/store/auth';

/** Redirect unauthenticated users to sign-in while keeping the auth route public. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return;
  const auth = useAuthStore();
  await auth.initialize();

  const isAuthRoute = to.path.startsWith('/auth/');
  if (!auth.user && !isAuthRoute) return navigateTo('/auth/signin');
  if (auth.user && isAuthRoute) return navigateTo('/');
});
