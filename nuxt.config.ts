// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  app: {
    head: {
      title: 'VagaTools — Vagabond RPG Wiki',
      titleTemplate: '%s | VagaTools',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
  css: ['~/assets/css/theme.css'],
  runtimeConfig: {
    public: {
      sanityProjectId: '',
      sanityDataset: 'production',
      sanityApiVersion: '2025-02-01',
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
