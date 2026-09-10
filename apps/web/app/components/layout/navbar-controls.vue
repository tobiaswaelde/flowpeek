<template>
  <UButton
    aria-keyshortcuts="Control+K Meta+K"
    color="neutral"
    icon="i-lucide-search"
    variant="outline"
    :aria-label="$t('commandPalette.open')"
    @click="showCommandPalette"
  >
    <span class="hidden lg:inline">{{ $t('commandPalette.open') }}</span>
    <template #trailing>
      <span class="hidden items-center gap-0.5 lg:flex">
        <UKbd value="meta" />
        <UKbd>K</UKbd>
      </span>
    </template>
  </UButton>
  <LayoutUserMenu />
</template>

<script setup lang="ts">
import { useCommandPalette } from '~/composables/app/command-palette';

const { show: showCommandPalette } = useCommandPalette();
</script>
