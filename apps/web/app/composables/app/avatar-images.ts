import { useApi } from '~/composables/api/api';

const avatarImagePromises = new Map<string, Promise<string | undefined>>();

/** Load authenticated avatar blobs once per user image version. */
export function useAvatarImages() {
  const api = useApi();

  /** Resolve an avatar blob URL or return undefined for the initials fallback. */
  function load(userId: string, avatarUpdatedAt?: string | null): Promise<string | undefined> {
    if (!avatarUpdatedAt || !import.meta.client) return Promise.resolve(undefined);
    const cacheKey = `${userId}:${avatarUpdatedAt}`;
    const cached = avatarImagePromises.get(cacheKey);
    if (cached) return cached;

    const request = api
      .get<Blob>(`/users/${userId}/avatar`, {
        params: { version: avatarUpdatedAt },
        responseType: 'blob',
      })
      .then(({ data }) => URL.createObjectURL(data))
      .catch(() => undefined);
    avatarImagePromises.set(cacheKey, request);
    return request;
  }

  return { load };
}
