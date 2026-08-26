<template>
  <div class="flex min-h-screen flex-col bg-default">
    <main class="flex flex-1 items-center justify-center p-6">
      <div class="w-full max-w-md">
        <NuxtLink
          class="mb-8 flex items-center justify-center gap-3 text-xl font-semibold tracking-tight"
          to="/auth/signin"
        >
          <span class="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-inverted">F</span>
          Flowpeek
        </NuxtLink>
        <slot />
      </div>
    </main>
    <footer class="p-6 text-center text-sm text-muted">{{ $t('layout.readOnlyStatus') }}</footer>
  </div>
</template>
