import { useAuthStore } from '~/store/auth';

/** Keep system-administration forms inaccessible to non-administrative users. */
export default defineNuxtRouteMiddleware(() => {
  if (!import.meta.client) return;
  if (useAuthStore().user?.role !== 'SYSTEM_ADMIN') return navigateTo('/');
});
