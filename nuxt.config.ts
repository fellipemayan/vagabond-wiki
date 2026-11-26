// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
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
