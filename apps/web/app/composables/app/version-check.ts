import { computed } from 'vue';

import { useEzRepoApi } from '~/composables/api/ezrepo-api';

/** Load and compare the installed ezRepo version with the latest GitHub release. */
export function useVersionCheck() {
  const api = useEzRepoApi();
  const current = useRuntimeConfig().public.appVersion;
  const latest = useState<string | null>('latest-app-version', () => null);
  const loaded = useState('latest-app-version-loaded', () => false);

  /** Load the latest version once for the current application session. */
  async function load(): Promise<void> {
    if (loaded.value) return;

    try {
      latest.value = (await api.version()).data.latest;
    } catch {
      latest.value = null;
    } finally {
      loaded.value = true;
    }
  }

  const updateAvailable = computed(() => Boolean(latest.value) && compareSemver(latest.value!, current) > 0);

  return { current, latest, load, updateAvailable };
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
