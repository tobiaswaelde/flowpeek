<template>
  <div class="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-default p-4">
    <NuxtLink class="mt-auto flex items-center gap-3 text-xl font-semibold tracking-tight" to="/auth/signin">
      <span class="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-inverted">F</span>
      Flowpeek
    </NuxtLink>

    <UPageCard class="w-full max-w-md">
      <slot />
    </UPageCard>

    <div class="mb-auto flex flex-col items-center gap-2 text-center text-sm text-muted">
      <p>{{ $t('layout.readOnlyStatus') }}</p>
      <p>{{ $t('layout.copyright', { year: currentYear }) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>
