import axios, { type AxiosInstance } from 'axios';

/** Local-storage key shared by the API client and the future auth store. */
export const accessTokenStorageKey = 'flowpeek.access-token';

/** Create Flowpeek's authenticated API client for one configured API base URL. */
export function createApiClient(baseUrl: string, accessToken?: string | null): AxiosInstance {
  const client = axios.create({ baseURL: baseUrl });
  client.interceptors.request.use((request) => {
    request.headers.set('Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
    request.headers.set('Request-Source', 'web');
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
    return request;
  });
  return client;
}

/** Provide a typed Axios client with bearer authentication and browser timezone metadata. */
export function useApi(): AxiosInstance {
  const config = useRuntimeConfig();
  const accessToken = import.meta.client ? window.localStorage.getItem(accessTokenStorageKey) : null;
  return createApiClient(config.public.apiBaseUrl, accessToken);
}
