import { computed, onBeforeUnmount, onMounted, ref, toRaw, type UnwrapNestedRefs } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

type FormState = Record<string, unknown>;

/**
 * Warns before abandoning a form whose state differs from its acknowledged snapshot.
 *
 * @param state The reactive form state to monitor.
 * @returns The dirty state and a function to acknowledge the current form values.
 */
export function useUnsavedChangesGuard<T extends FormState>(state: UnwrapNestedRefs<T>) {
  const { t } = useI18n();
  const snapshot = ref(serialize(state));
  const isDirty = computed(() => snapshot.value !== serialize(state));

  /** Marks the current form values as saved or intentionally discarded. */
  function reset(): void {
    snapshot.value = serialize(state);
  }

  /** Ask for confirmation before Nuxt router navigation. */
  onBeforeRouteLeave(() => !isDirty.value || window.confirm(t('forms.unsavedChanges')));

  /** Let the browser display its native warning before reload, closing, or external navigation. */
  function handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!isDirty.value) return;
    event.preventDefault();
    event.returnValue = true;
  }

  onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload));

  return { isDirty, reset };
}

function serialize(state: FormState): string {
  return JSON.stringify(toRaw(state));
}
