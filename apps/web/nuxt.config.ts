/** Nuxt configuration for the Flowpeek single-page dashboard. */
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxtjs/i18n', '@nuxtjs/color-mode', '@pinia/nuxt', '@querry-kit/nuxt-ui'],
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1',
    },
  },
  ssr: false,
  srcDir: 'app',
  app: {
    head: {
      htmlAttrs: { class: 'h-full' },
      bodyAttrs: { class: 'h-full bg-default' },
      title: 'Flowpeek',
      titleTemplate: '%s · Flowpeek',
    },
  },
  colorMode: {
    fallback: 'dark',
    preference: 'dark',
  },
  i18n: {
    detectBrowserLanguage: {
      cookieKey: 'flowpeek-locale',
      fallbackLocale: 'en',
      redirectOn: 'root',
      useCookie: true,
    },
    defaultLocale: 'en',
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'de', file: 'de.json', name: 'Deutsch' },
      { code: 'es', file: 'es.json', name: 'Español' },
      { code: 'fr', file: 'fr.json', name: 'Français' },
      { code: 'it', file: 'it.json', name: 'Italiano' },
      { code: 'nl', file: 'nl.json', name: 'Nederlands' },
      { code: 'pl', file: 'pl.json', name: 'Polski' },
      { code: 'pt', file: 'pt.json', name: 'Português' },
    ],
    strategy: 'no_prefix',
    vueI18n: './i18n.config.ts',
  },
  ui: {
    colorMode: true,
  },
});
