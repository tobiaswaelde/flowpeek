import { ref } from 'vue';

/** Track independent asynchronous UI actions by stable keys. */
export function usePendingActions() {
  const pendingKeys = ref<ReadonlySet<string>>(new Set());

  /** Return whether the keyed action is currently awaiting completion. */
  function isPending(key: string): boolean {
    return pendingKeys.value.has(key);
  }

  /** Run an action once while exposing its pending state to the initiating control. */
  async function run<T>(key: string, action: () => Promise<T>): Promise<T | undefined> {
    if (isPending(key)) return undefined;

    pendingKeys.value = new Set([...pendingKeys.value, key]);
    try {
      return await action();
    } finally {
      const nextPendingKeys = new Set(pendingKeys.value);
      nextPendingKeys.delete(key);
      pendingKeys.value = nextPendingKeys;
    }
  }

  return { isPending, run };
}
