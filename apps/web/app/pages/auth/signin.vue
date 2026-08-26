<script setup lang="ts">
definePageMeta({ layout: 'auth', title: 'Sign in' });
</script>

<template>
  <UCard class="w-full max-w-md">
    <template #header>
      <h1 class="text-xl font-semibold">{{ $t('auth.signIn') }}</h1>
    </template>
    <p class="text-muted">{{ $t('auth.signInPlaceholder') }}</p>
  </UCard>
</template>
