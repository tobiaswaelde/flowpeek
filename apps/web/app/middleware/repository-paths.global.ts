/** Redirect legacy repository detail URLs to the canonical URL-controlled dialog. */
export default defineNuxtRouteMiddleware((to) => {
  const legacyAdminMatch = /^\/admin\/repositories(?:\/([^/]+))?$/.exec(to.path);
  const legacyDetailMatch = /^\/repositories\/([^/]+)$/.exec(to.path);
  if (!legacyAdminMatch && !legacyDetailMatch) return;

  const repositoryId = legacyAdminMatch?.[1] ?? legacyDetailMatch?.[1];
  const query = repositoryId ? { ...to.query, repository: repositoryId } : to.query;
  return navigateTo({ hash: to.hash, path: '/repositories', query }, { redirectCode: 301, replace: true });
});
