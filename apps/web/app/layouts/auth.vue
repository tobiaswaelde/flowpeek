<template>
  <div class="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-default p-4">
    <NuxtLink aria-label="ezRepo" class="mt-auto font-display text-2xl font-bold" to="/auth/signin">
      <span class="text-primary">ez</span>
      <span class="tracking-tight text-highlighted">Repo</span>
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
