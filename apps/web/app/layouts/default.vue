<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default px-6 py-4">
      <NuxtLink class="text-lg font-semibold" to="/">Flowpeek</NuxtLink>
    </header>
    <main class="mx-auto w-full max-w-7xl px-6 py-8">
      <slot />
    </main>
  </div>
</template>
