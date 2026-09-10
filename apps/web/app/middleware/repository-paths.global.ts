/** Redirect legacy administration URLs to the canonical top-level repository routes. */
export default defineNuxtRouteMiddleware((to) => {
  const match = /^\/admin\/repositories(?:\/(.+))?$/.exec(to.path);
  if (!match) return;

  const repositoryPath = match[1] ? `/repositories/${match[1]}` : '/repositories';
  return navigateTo({ hash: to.hash, path: repositoryPath, query: to.query }, { redirectCode: 301, replace: true });
});
