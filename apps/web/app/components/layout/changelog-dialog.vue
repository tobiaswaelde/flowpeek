<template>
  <UModal v-model:open="open" :title="$t('changelog.title')" scrollable :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="space-y-6">
        <section v-for="release in releases" :key="release.version" class="space-y-3">
          <div class="flex items-center gap-2">
            <h2 class="font-mono text-base font-semibold">v{{ release.version }}</h2>
            <UBadge v-if="release.version === current" color="primary" variant="subtle" size="sm">
              {{ $t('changelog.current') }}
            </UBadge>
          </div>
          <ul class="list-disc space-y-1 pl-5 text-sm text-muted">
            <li v-for="item in release.items" :key="item">{{ item }}</li>
          </ul>
        </section>
        <p v-if="releases.length === 0" class="text-sm text-muted">{{ $t('changelog.empty') }}</p>
        <UButton
          to="https://github.com/tobiaswaelde/ezrepo/releases"
          target="_blank"
          color="neutral"
          variant="outline"
          icon="i-tabler-external-link"
          :label="$t('changelog.viewAll')"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import changelog from '../../../../../CHANGELOG.md?raw';

interface ChangelogRelease {
  items: string[];
  version: string;
}

const open = defineModel<boolean>('open', { default: false });
const current = useRuntimeConfig().public.appVersion;
const releases = changelog.split('\n').reduce<ChangelogRelease[]>((result, line) => {
  const version = line.match(/^## (\d+\.\d+\.\d+)$/)?.[1];
  if (version) result.push({ items: [], version });
  else if (line.startsWith('- ') && result.length) result.at(-1)!.items.push(line.slice(2));
  return result;
}, []);
</script>
